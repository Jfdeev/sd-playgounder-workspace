import { simulate, type Design, type Workload } from '@sdp/engine';
import { diagnose } from './diagnosis.js';
import { applyFault, type Fault } from './faults.js';
import { buildIncidentSnapshot, snapshotsEqual } from './snapshot.js';
import type { Zone } from './zones.js';

/**
 * "O engine identifica a mesma causa que o autor plantou" (M3, gate 1, aprovado pelo autor): aplica
 * toda falha que o formulário de diagnóstico permite — todo componente × todo tipo, varrendo os
 * parâmetros de cada tipo — e devolve as que reproduzem exatamente a tela do incidente mas seriam um
 * diagnóstico **diferente** do plantado. Lista vazia = o incidente tem uma resposta só e dá pra chegar
 * nela raciocinando sobre o que a tela mostra.
 */

const POOL_FACTORS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const ZONES: Zone[] = [0, 1, 2];

export function candidateFaults(design: Design): Fault[] {
  const candidates: Fault[] = [];
  for (const node of design.nodes) {
    for (let lost = 1; lost <= node.replicas; lost += 1) candidates.push({ type: 'node-down', target: node.id, lostInstances: lost });
    for (const zone of ZONES) candidates.push({ type: 'zone-down', target: node.id, zone });
    for (const edge of design.edges) {
      if (edge.to === node.id) candidates.push({ type: 'partition', target: node.id, cutFrom: edge.from });
    }
    if (node.type === 'cache') candidates.push({ type: 'cache-cold', target: node.id });
    for (const capacityFactor of POOL_FACTORS) candidates.push({ type: 'pool-exhausted', target: node.id, capacityFactor });
  }
  return candidates;
}

/** Falhas que produzem a mesma tela do incidente mas não seriam aceitas como o diagnóstico plantado. */
export function findAmbiguousFaults(design: Design, workload: Workload, planted: Fault): Fault[] {
  const snapshotOf = (fault: Fault) => buildIncidentSnapshot(design, simulate(applyFault(design, fault), workload));
  const target = snapshotOf(planted);
  return candidateFaults(design).filter(
    (candidate) => snapshotsEqual(snapshotOf(candidate), target) && diagnose(planted, candidate.target, candidate.type) !== 'correct',
  );
}
