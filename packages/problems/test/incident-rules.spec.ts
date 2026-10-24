import { describe, expect, it } from 'vitest';
import { simulate, type Design, type Workload } from '@sdp/engine';
import { acceptedComponents, diagnose } from '../src/incidents/diagnosis.js';
import { applyFault, type Fault } from '../src/incidents/faults.js';
import { evaluateFix } from '../src/incidents/fix.js';
import { buildIncidentSnapshot, snapshotsEqual } from '../src/incidents/snapshot.js';
import { candidateFaults, findAmbiguousFaults } from '../src/incidents/uniqueness.js';

const workload: Workload = { rps: 800, readWriteRatio: 0.8, payloadBytes: 1024, peakMultiplier: 1 };

// Design de exemplo (não é conteúdo de incidente — só exercita as regras).
const design: Design = {
  nodes: [
    { id: 'lb', type: 'load_balancer', replicas: 2 },
    { id: 'app', type: 'app_server', replicas: 4 },
    { id: 'cache', type: 'cache', replicas: 2, cacheHitRate: 0.9 },
    { id: 'db', type: 'sql_primary', replicas: 2 },
  ],
  edges: [
    { id: 'e1', from: 'lb', to: 'app', kind: 'read', weight: 1 },
    { id: 'e2', from: 'app', to: 'cache', kind: 'read', weight: 1 },
    { id: 'e3', from: 'cache', to: 'db', kind: 'read', weight: 1 },
  ],
  entryNodeIds: ['lb'],
};

const snapshotFor = (fault: Fault) => buildIncidentSnapshot(design, simulate(applyFault(design, fault), workload));

describe('buildIncidentSnapshot (lista branca — SC-003)', () => {
  it('só tem utilização, status e carga por componente; latência, throughput e violações do sistema', () => {
    const snapshot = snapshotFor({ type: 'cache-cold', target: 'cache' });
    expect(Object.keys(snapshot)).toEqual(['nodes', 'path', 'violations']);
    for (const node of Object.values(snapshot.nodes)) expect(Object.keys(node).sort()).toEqual(['offeredLoad', 'status', 'utilization']);
    const serialized = JSON.stringify(snapshot);
    for (const leak of ['replicas', 'capacity', 'cacheHitRate', 'capacityFactor', 'edges', 'entryNodeIds']) expect(serialized).not.toContain(leak);
  });

  it('componente removido pela falha e componente sem carga aparecem iguais ("sem tráfego")', () => {
    const removed = snapshotFor({ type: 'node-down', target: 'db', lostInstances: 2 });
    expect(removed.nodes.db).toEqual({ utilization: 0, status: 'no-traffic', offeredLoad: 0 });
    const cut = snapshotFor({ type: 'partition', target: 'db', cutFrom: 'cache' });
    expect(cut.nodes.db).toEqual(removed.nodes.db);
  });

  it('latência infinita vira null (JSON não tem Infinity)', () => {
    const saturated = snapshotFor({ type: 'pool-exhausted', target: 'app', capacityFactor: 0.1 });
    expect(saturated.path.latency.p99).toBeNull();
    expect(JSON.parse(JSON.stringify(saturated))).toEqual(saturated);
  });

  it('o estado normal e o estado com a falha diferem (o sintoma aparece)', () => {
    const normal = buildIncidentSnapshot(design, simulate(design, workload));
    expect(snapshotsEqual(normal, snapshotFor({ type: 'cache-cold', target: 'cache' }))).toBe(false);
  });
});

describe('diagnose', () => {
  it('par certo; componente certo e tipo errado; componente errado', () => {
    const fault: Fault = { type: 'cache-cold', target: 'cache' };
    expect(diagnose(fault, 'cache', 'cache-cold')).toBe('correct');
    expect(diagnose(fault, 'cache', 'node-down')).toBe('right-component');
    expect(diagnose(fault, 'db', 'cache-cold')).toBe('wrong');
    expect(diagnose(fault, 'db', 'node-down')).toBe('wrong');
  });

  it('zona caída: vale o tipo com qualquer componente; tipo errado nunca diz "componente certo"', () => {
    const fault: Fault = { type: 'zone-down', target: 'db', zone: 0 };
    expect(acceptedComponents(fault)).toBeNull();
    expect(diagnose(fault, 'lb', 'zone-down')).toBe('correct');
    expect(diagnose(fault, 'db', 'node-down')).toBe('wrong');
  });

  it('partição: qualquer uma das duas pontas', () => {
    const fault: Fault = { type: 'partition', target: 'db', cutFrom: 'cache' };
    expect(diagnose(fault, 'db', 'partition')).toBe('correct');
    expect(diagnose(fault, 'cache', 'partition')).toBe('correct');
    expect(diagnose(fault, 'app', 'partition')).toBe('wrong');
  });
});

describe('busca de unicidade (gate 1, SC-001)', () => {
  it('gera falhas pra todo componente e todo tipo aplicável', () => {
    const types = new Set(candidateFaults(design).map((f) => f.type));
    expect(types).toEqual(new Set(['node-down', 'zone-down', 'partition', 'cache-cold', 'pool-exhausted']));
    expect(candidateFaults(design).filter((f) => f.type === 'cache-cold').map((f) => f.target)).toEqual(['cache']);
  });

  it('acusa uma causa ambígua: app perder 2 de 4 instâncias e o pool do app cair a 50% dão a mesma tela', () => {
    const ambiguous = findAmbiguousFaults(design, workload, { type: 'node-down', target: 'app', lostInstances: 2 });
    expect(ambiguous).toContainEqual({ type: 'pool-exhausted', target: 'app', capacityFactor: 0.5 });
  });

  it('não confunde remover o db com cortar cache→db: o corte deixa o db órfão (violação visível)', () => {
    const ambiguous = findAmbiguousFaults(design, workload, { type: 'node-down', target: 'db', lostInstances: 2 });
    expect(ambiguous).not.toContainEqual({ type: 'partition', target: 'db', cutFrom: 'cache' });
  });

  it('não acusa o próprio par plantado nem diagnósticos equivalentes', () => {
    const planted: Fault = { type: 'zone-down', target: 'app', zone: 0 };
    expect(findAmbiguousFaults(design, workload, planted).some((f) => f.type === 'zone-down')).toBe(false);
  });
});

describe('evaluateFix', () => {
  const fault: Fault = { type: 'node-down', target: 'app', lostInstances: 3 };
  const criterion = { maxP99Ms: 200, minThroughputRps: workload.rps };
  const withAppReplicas = (replicas: number): Design => ({ ...design, nodes: design.nodes.map((n) => (n.id === 'app' ? { ...n, replicas } : n)) });

  it('o design original não resolve (a falha continua ativa)', () => {
    expect(evaluateFix(design, design, fault, criterion, workload).resolved).toBe(false);
  });

  it('mais réplicas no alvo resolvem com a falha ativa', () => {
    expect(evaluateFix(withAppReplicas(8), design, fault, criterion, workload)).toEqual({ resolved: true, failing: [] });
  });

  it('apagar o alvo não resolve', () => {
    const withoutApp: Design = {
      nodes: design.nodes.filter((n) => n.id !== 'app'),
      edges: design.edges.filter((e) => e.from !== 'app' && e.to !== 'app'),
      entryNodeIds: ['lb'],
    };
    expect(evaluateFix(withoutApp, design, fault, criterion, workload).failing).toContain('target-unreachable');
  });

  it('cortar o caminho até um componente cria órfão novo', () => {
    const cut: Design = { ...withAppReplicas(8), edges: design.edges.filter((e) => e.id !== 'e3') };
    expect(evaluateFix(cut, design, fault, criterion, workload).failing).toContain('new-orphans');
  });
});
