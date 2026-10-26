import { describe, expect, it } from 'vitest';
import { simulate, type Design } from '@sdp/engine';
import { applyFault } from '../src/incidents/faults.js';
import { evaluateFix } from '../src/incidents/fix.js';
import { INCIDENTS } from '../src/incidents/public.js';
import { getIncidentSecret, PUBLIC_IDS, SECRET_IDS } from '../src/incidents/secret.js';
import { buildIncidentSnapshot, snapshotsEqual } from '../src/incidents/snapshot.js';
import { findAmbiguousFaults } from '../src/incidents/uniqueness.js';
import { getIncident } from '../src/incidents/public.js';
import * as publicApi from '../src/index.js';

/**
 * Os 5 incidentes aprovados (M3) rodam aqui as checagens que os aprovaram no rascunho — viram
 * regressão: se o engine, uma falha ou um incidente mudar e quebrar alguma, este teste acusa.
 */

const without = (design: Design, id: string): Design => ({
  nodes: design.nodes.filter((n) => n.id !== id),
  edges: design.edges.filter((e) => e.from !== id && e.to !== id),
  entryNodeIds: design.entryNodeIds.filter((e) => e !== id),
});

describe('catálogo de incidentes', () => {
  it('5 incidentes, um por tipo de falha, cada público com seu segredo (SC-001)', () => {
    expect(INCIDENTS).toHaveLength(5);
    expect([...PUBLIC_IDS].sort()).toEqual([...SECRET_IDS].sort());
    expect(new Set(SECRET_IDS.map((id) => getIncidentSecret(id)!.fault.type))).toEqual(
      new Set(['node-down', 'zone-down', 'partition', 'cache-cold', 'pool-exhausted']),
    );
  });

  it('o índice público do pacote não expõe a parte secreta', () => {
    expect(Object.keys(publicApi)).not.toContain('getIncidentSecret');
  });

  it('título e alerta nunca nomeiam o tipo de falha plantado', () => {
    const giveaways: Record<string, RegExp> = {
      'cache-cold': /cache (frio|vazio)/i,
      'node-down': /caí|caiu|instância/i,
      partition: /parti|firewall|isolad/i,
      'zone-down': /zona/i,
      'pool-exhausted': /pool|conex/i,
    };
    for (const incident of INCIDENTS) {
      const { fault } = getIncidentSecret(incident.id)!;
      expect(`${incident.title} ${incident.alert}`).not.toMatch(giveaways[fault.type]!);
    }
  });
});

describe.each(INCIDENTS.map((incident) => [incident.id, incident] as const))('incidente %s', (id, incident) => {
  const secret = getIncidentSecret(id)!;
  const normal = buildIncidentSnapshot(incident.design, simulate(incident.design, incident.workload));
  const during = buildIncidentSnapshot(incident.design, simulate(applyFault(incident.design, secret.fault), incident.workload));

  it('estado normal sem componente saturado e diferente do estado durante (SC-002)', () => {
    expect(Object.values(normal.nodes).some((n) => n.status === 'saturated')).toBe(false);
    expect(snapshotsEqual(normal, during)).toBe(false);
  });

  it('só a causa plantada reproduz a tela (SC-001, gate 1)', () => {
    expect(findAmbiguousFaults(incident.design, incident.workload, secret.fault)).toEqual([]);
  });

  it('o fix de referência resolve; o original e o sem o componente afetado, não (SC-005)', () => {
    const fix = (design: Design) => evaluateFix(design, incident.design, secret.fault, secret.fixCriterion, incident.workload);
    expect(fix(secret.referenceFix)).toEqual({ resolved: true, failing: [] });
    expect(fix(incident.design).resolved).toBe(false);
    expect(fix(without(incident.design, secret.fault.target)).resolved).toBe(false);
  });

  it('getIncident resolve pelo id', () => {
    expect(getIncident(id)).toBe(incident);
  });
});
