/**
 * Score por dimensão — packages/engine/src/scores/calculate.ts
 *
 * Substitui `placeholderScores()` (FR-020 de M0). Fórmulas aprovadas pelo autor em
 * `specs/avaliacao-biblioteca-m2/research.md` §1 (2026-09-23) — Constitution VI: score por
 * dimensão é um modelo novo, sem fórmula pré-aprovada em `docs/product-context.md` §7, então cada
 * agregação abaixo precisou de aprovação explícita antes de ser codificada.
 *
 * Escala 0-100 nas 7 dimensões, inteiro, clampado — nunca somadas/combinadas numa nota única em
 * lugar nenhum (Constitution V). Três dimensões (Consistência, Complexidade operacional,
 * Segurança) são proxies estruturais — o engine não modela quórum, operabilidade real nem
 * segurança de verdade — documentado explicitamente, nunca apresentado como medição precisa.
 */

import { getComponentSpec } from '../catalog/components.js';
import type { Design, Dimension, NodeId, NodeResult, Violation } from '../types.js';

export type CalculateScoresParams = {
  design: Design;
  /** Ids dos nós no caminho crítico, na ordem de `findCriticalPath` (index.ts). */
  pathNodeIds: readonly NodeId[];
  nodes: Record<NodeId, NodeResult>;
  violations: readonly Violation[];
  cost: { monthlyTotal: number; byNode: Record<NodeId, number> };
  /** p99 do caminho crítico já calculado (`path.latency.p99`). */
  latencyP99Ms: number;
  /** Limiar de latência extraído da rubrica do problema ativo — `null` fora de um desafio. */
  latencyBudgetMs: number | null;
  /** Custo mensal da `referenceSolution` do problema ativo, na mesma escala — `null` fora de um desafio. */
  referenceCostUsd: number | null;
};

const SECURITY_COMPONENT_TYPES = new Set(['waf', 'rate_limiter', 'auth_service']);
const SECURITY_POINTS_PER_COMPONENT = 30;
const SECURITY_SCORE_WITHOUT_ANY = 10;

const OPERATIONAL_COST_PER_NODE = 3;
const OPERATIONAL_COST_PER_VIOLATION = 5;

const CONSISTENCY_SCORE_EVENTUAL = 60;
const CONSISTENCY_SCORE_STRONG = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number): number {
  return Math.round(value);
}

/** Escalabilidade: quanto mais perto da saturação o nó mais utilizado do caminho, menor o score. */
function scaleScore(pathNodeIds: readonly NodeId[], nodes: Record<NodeId, NodeResult>): number {
  if (pathNodeIds.length === 0) return 100; // sem caminho, nada limitando — folga total

  const maxUtilization = Math.max(...pathNodeIds.map((id) => nodes[id]?.utilization ?? 0));
  return clamp(round(100 - maxUtilization * 100), 0, 100);
}

/**
 * Disponibilidade: fórmula série/paralelo já prescrita em `docs/product-context.md` §7 —
 * `A_nó = 1 − (1 − a)^réplicas`, `A_caminho = Π A_nó`. Um nó marcado como SPOF (violação já
 * detectada por `detectSpof`) tem sua disponibilidade efetiva zerada antes da multiplicação — um
 * ponto único de falha não deveria "salvar a média" do resto do caminho.
 */
function availabilityScore(
  design: Design,
  pathNodeIds: readonly NodeId[],
  violations: readonly Violation[],
): number {
  if (pathNodeIds.length === 0) return 100; // produto vazio — nada no caminho pra falhar

  const spofNodeIds = new Set(violations.filter((v) => v.type === 'spof').flatMap((v) => v.nodeIds));
  const designNodeById = new Map(design.nodes.map((node) => [node.id, node]));

  const pathAvailability = pathNodeIds.reduce((product, nodeId) => {
    if (spofNodeIds.has(nodeId)) return product * 0;

    const designNode = designNodeById.get(nodeId);
    if (!designNode) return product;

    const { availability } = getComponentSpec(designNode.type);
    const nodeAvailability = 1 - (1 - availability) ** designNode.replicas;
    return product * nodeAvailability;
  }, 1);

  return clamp(round(pathAvailability * 100), 0, 100);
}

/**
 * Latência: normalizada contra o limiar já autorado na rubrica do problema — p99 igual ao limiar
 * pontua 100; acima, cai proporcionalmente. Sem limiar (fora de um desafio), não há uma base justa
 * de comparação — retorna 0 em vez de inventar um limiar genérico.
 */
function latencyScore(latencyP99Ms: number, latencyBudgetMs: number | null): number {
  if (latencyBudgetMs === null || latencyBudgetMs <= 0) return 0;
  return clamp(round(100 - (latencyP99Ms / latencyBudgetMs - 1) * 100), 0, 100);
}

/**
 * Custo: normalizado contra o custo da `referenceSolution` do problema — custo igual pontua 100;
 * mais caro cai proporcionalmente; mais barato nunca ultrapassa 100 (economizar à custa de menos
 * réplicas já se reflete em Escalabilidade/Disponibilidade mais baixas, não deveria também inflar
 * Custo). Sem referência (fora de um desafio), retorna 0.
 */
function costScore(monthlyTotal: number, referenceCostUsd: number | null): number {
  if (referenceCostUsd === null || referenceCostUsd <= 0) return 0;
  return clamp(round(100 - (monthlyTotal / referenceCostUsd - 1) * 100), 0, 100);
}

/** Consistência: proxy binário — presença de aresta de replicação assíncrona vs. ausência. */
function consistencyScore(design: Design): number {
  const hasReplication = design.edges.some((edge) => edge.kind === 'replication');
  return hasReplication ? CONSISTENCY_SCORE_EVENTUAL : CONSISTENCY_SCORE_STRONG;
}

/** Complexidade operacional: proxy estrutural — mais nós e mais violações, menor o score. */
function operationalComplexityScore(design: Design, violations: readonly Violation[]): number {
  const nodePenalty = Math.min(design.nodes.length * OPERATIONAL_COST_PER_NODE, 100);
  const violationPenalty = violations.length * OPERATIONAL_COST_PER_VIOLATION;
  return clamp(round(100 - nodePenalty - violationPenalty), 0, 100);
}

/** Segurança: proxy estrutural — presença de componentes de segurança conhecidos no design. */
function securityScore(design: Design): number {
  const presentCount = design.nodes.filter((node) => SECURITY_COMPONENT_TYPES.has(node.type)).length;
  if (presentCount === 0) return SECURITY_SCORE_WITHOUT_ANY;
  return clamp(presentCount * SECURITY_POINTS_PER_COMPONENT, 0, 100);
}

export function calculateScores(params: CalculateScoresParams): Record<Dimension, number> {
  const { design, pathNodeIds, nodes, violations, cost, latencyP99Ms, latencyBudgetMs, referenceCostUsd } = params;

  return {
    escalabilidade: scaleScore(pathNodeIds, nodes),
    disponibilidade: availabilityScore(design, pathNodeIds, violations),
    latencia: latencyScore(latencyP99Ms, latencyBudgetMs),
    custo: costScore(cost.monthlyTotal, referenceCostUsd),
    consistencia: consistencyScore(design),
    complexidade_operacional: operationalComplexityScore(design, violations),
    seguranca: securityScore(design),
  };
}
