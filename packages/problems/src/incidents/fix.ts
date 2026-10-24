import { simulate, type Design, type NodeId, type Workload } from '@sdp/engine';
import { applyFault, type Fault } from './faults.js';

/**
 * Critério do fix (M3, US3, research.md §6): o design submetido é avaliado pelo engine **com a falha
 * ainda aplicada**. Checagens mecânicas e com nomes fixos — o usuário vê quais falharam, nunca os
 * limites internos além do que o alerta já disse. `component-removed`: o fix pode acrescentar e
 * reforçar componentes, nunca remover os que a arquitetura já tinha (apagar o banco "resolve" uma zona
 * caída sem resolver nada — achado nos rascunhos). `component-down` exige que a arquitetura sobreviva à
 * falha sem perder componente inteiro (zona caída, nó caído por completo); as duas últimas barram
 * "consertos" que só apagam o componente problemático ou cortam o caminho até ele.
 */

export type FixCriterion = {
  maxP99Ms: number;
  minThroughputRps: number;
};

export const FIX_CHECKS = [
  'p99',
  'saturation',
  'throughput',
  'component-removed',
  'component-down',
  'target-unreachable',
  'new-orphans',
] as const;
export type FixCheck = (typeof FIX_CHECKS)[number];

function orphanIds(design: Design, workload: Workload): Set<NodeId> {
  return new Set(
    simulate(design, workload)
      .violations.filter((v) => v.type === 'orphan-node')
      .flatMap((v) => v.nodeIds),
  );
}

export function evaluateFix(
  submitted: Design,
  original: Design,
  fault: Fault,
  criterion: FixCriterion,
  workload: Workload,
): { resolved: boolean; failing: FixCheck[] } {
  const faulted = applyFault(submitted, fault);
  const result = simulate(faulted, workload);
  const failing: FixCheck[] = [];

  if (!(result.path.latency.p99 <= criterion.maxP99Ms)) failing.push('p99');
  if (Object.values(result.nodes).some((node) => node.status === 'saturated')) failing.push('saturation');
  if (result.path.throughputRps < criterion.minThroughputRps) failing.push('throughput');
  const submittedIds = new Set(submitted.nodes.map((node) => node.id));
  if (original.nodes.some((node) => !submittedIds.has(node.id))) failing.push('component-removed');
  const survivors = new Set(faulted.nodes.map((node) => node.id));
  if (submitted.nodes.some((node) => !survivors.has(node.id))) failing.push('component-down');

  const targetNode = result.nodes[fault.target];
  const targetOrphan = result.violations.some((v) => v.type === 'orphan-node' && v.nodeIds.includes(fault.target));
  if (fault.type !== 'zone-down' && (!targetNode || targetOrphan)) failing.push('target-unreachable');

  const before = orphanIds(original, workload);
  if ([...orphanIds(faulted, workload)].some((id) => !before.has(id))) failing.push('new-orphans');

  return { resolved: failing.length === 0, failing };
}
