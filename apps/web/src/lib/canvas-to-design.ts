/**
 * Mapper canvas → engine — apps/web/src/lib/canvas-to-design.ts
 *
 * Fronteira crítica entre o vocabulário do canvas (FlowNode/FlowEdge) e o vocabulário do engine
 * (Design/Workload). Funções puras, nunca lançam exceção (mesma garantia de simulate(), FR-019 do
 * engine) — entrada malformada produz um Design estruturalmente vazio-mas-válido; é o próprio
 * simulate() quem reporta a violação correspondente.
 *
 * Contrato completo: specs/canvas-submissao-m1/contracts/canvas-engine-boundary.md
 */

import type { Design, DesignEdge, DesignNode, NodeId, Workload } from '@sdp/engine';
import type { FlowEdge, FlowNode } from './canvas-types';
import type { Problem } from '@sdp/problems';

/**
 * Traduz o canvas montado pelo usuário para o Design que o engine consome.
 *
 * - Nós Cliente nunca entram em Design.nodes (não são ComponentType, regra 3 do contrato).
 * - Arestas partindo de um Cliente nunca entram em Design.edges — só alimentam entryNodeIds
 *   (regras 2 e 4 do contrato).
 * - Pesos de aresta são repassados sem normalização própria — normalizar é responsabilidade
 *   exclusiva do engine (regra 5 do contrato, FR-018 de M0).
 */
export function toDesign(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): Design {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const designNodes: DesignNode[] = nodes
    .filter((node): node is Extract<FlowNode, { kind: 'component' }> => node.kind === 'component')
    .map((node) => {
      const designNode: DesignNode = {
        id: node.id,
        type: node.componentType,
        replicas: node.replicas,
      };
      return node.componentType === 'cache' && node.cacheHitRate !== undefined
        ? { ...designNode, cacheHitRate: node.cacheHitRate }
        : designNode;
    });

  const designEdges: DesignEdge[] = edges
    .filter((edge) => nodesById.get(edge.source)?.kind === 'component')
    .map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      kind: edge.kind,
      weight: edge.weight ?? 1,
    }));

  const entryNodeIds: NodeId[] = [
    ...new Set(
      edges
        .filter((edge) => nodesById.get(edge.source)?.kind === 'client')
        .map((edge) => edge.target)
        .filter((targetId) => nodesById.get(targetId)?.kind === 'component'),
    ),
  ];

  return { nodes: designNodes, edges: designEdges, entryNodeIds };
}

/**
 * Traduz a escala do problema para o Workload que o engine consome — conversão DAU → RPS
 * (research.md §5). Determinística: mesmo Problem, mesmo Workload, sempre.
 */
export function toWorkload(problem: Problem): Workload {
  const { dau, requestsPerUserPerDay, readWriteRatio, avgPayloadBytes, peakMultiplier } = problem.scale;
  const averageRps = (dau * requestsPerUserPerDay) / 86_400;

  return {
    rps: averageRps * peakMultiplier,
    readWriteRatio,
    payloadBytes: avgPayloadBytes,
    peakMultiplier,
  };
}

/**
 * Workload manual do botão "Simular" — usa só o rps escolhido livremente pelo usuário no canvas
 * (sandbox ou dentro de um desafio), sem vir da escala de nenhum `Problem`. Puramente exploratório:
 * nunca conta pra rubrica nem pra progressão travada (só `toWorkload(problem)`, usado por
 * "Submeter", faz isso) — ver `canvas.tsx`.
 *
 * `readWriteRatio`/`payloadBytes`/`peakMultiplier` são placeholders estruturais: nenhum cálculo
 * do engine hoje lê esses três campos de `Workload` (só `workload.rps`, conferido em
 * `packages/engine/src/index.ts`) — valores fixos aqui não influenciam `simulate()` de forma
 * nenhuma. Se um cálculo futuro passar a consumi-los, valerá revisitar isto.
 */
export function toManualWorkload(rps: number): Workload {
  return { rps, readWriteRatio: 0.8, payloadBytes: 1024, peakMultiplier: 1 };
}
