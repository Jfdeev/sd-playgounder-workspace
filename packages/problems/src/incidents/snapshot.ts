import type { Design, NodeId, NodeStatus, SimulationResult, ViolationType } from '@sdp/engine';

/**
 * O que o usuário vê do estado "durante o incidente" (M3, gate 4 — lista branca aprovada): por
 * componente, utilização, status e carga que chega; do sistema, latência, throughput e violações.
 * Montado campo a campo a partir do design **original** (os componentes que a tela mostra) e do
 * resultado do engine sobre o design com a falha — nunca réplicas, capacidade, taxa de acerto nem o
 * design com falha. Os valores são arredondados como na tela: é este mesmo objeto que a busca de
 * unicidade compara, então "reproduz a tela" significa exatamente "reproduz o que o usuário vê".
 */

export type SnapshotNodeStatus = NodeStatus | 'no-traffic';

export type IncidentSnapshot = {
  nodes: Record<NodeId, { utilization: number; status: SnapshotNodeStatus; offeredLoad: number }>;
  /** `null` = infinito (algum componente do caminho saturado) — JSON não representa Infinity. */
  path: { latency: { p50: number | null; p95: number | null; p99: number | null }; throughputRps: number };
  violations: { type: ViolationType; nodeIds: NodeId[] }[];
};

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const finiteOrNull = (value: number) => (Number.isFinite(value) ? round(value, 1) : null);

export function buildIncidentSnapshot(originalDesign: Design, result: SimulationResult): IncidentSnapshot {
  const nodes: IncidentSnapshot['nodes'] = {};
  for (const { id } of originalDesign.nodes) {
    const node = result.nodes[id];
    // Componente removido pela falha e componente que parou de receber carga ficam iguais na tela.
    nodes[id] =
      !node || node.offeredLoad === 0
        ? { utilization: 0, status: 'no-traffic', offeredLoad: 0 }
        : { utilization: round(node.utilization, 2), status: node.status, offeredLoad: Math.round(node.offeredLoad) };
  }
  const { latency, throughputRps } = result.path;
  return {
    nodes,
    path: {
      latency: { p50: finiteOrNull(latency.p50), p95: finiteOrNull(latency.p95), p99: finiteOrNull(latency.p99) },
      throughputRps: Math.round(throughputRps),
    },
    violations: result.violations
      .map((v) => ({ type: v.type, nodeIds: [...v.nodeIds].sort() }))
      .sort((a, b) => `${a.type}${a.nodeIds.join()}`.localeCompare(`${b.type}${b.nodeIds.join()}`)),
  };
}

export function snapshotsEqual(a: IncidentSnapshot, b: IncidentSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
