import { describe, expect, it } from 'vitest';
import {
  REFERENCE_ARCHITECTURES,
  getReferenceArchitecture,
  toDesign,
  validateReferenceArchitecture,
  type ReferenceArchitecture,
} from '../src/reference-architectures.js';

/** Preset mínimo válido — cada teste abaixo quebra exatamente um invariante a partir dele. */
const VALID: ReferenceArchitecture = {
  id: 'fixture',
  company: 'Fixture',
  summary: 'Preset de teste.',
  sources: [{ id: 's1', title: 'Fonte', publisher: 'Fixture', url: 'https://example.com/a', accessedAt: '2026-10-03' }],
  nodes: [
    { id: 'app', type: 'app_server', replicas: 2, label: 'App', sourceIds: ['s1'], replicasIllustrative: true, explanation: { text: 'Existe.', sourceIds: ['s1'] } },
    { id: 'db', type: 'sql_primary', replicas: 2, label: 'DB', sourceIds: ['s1'], replicasIllustrative: true, explanation: { text: 'Guarda.', sourceIds: ['s1'] } },
  ],
  edges: [
    { id: 'e1', from: 'app', to: 'db', kind: 'write', weight: 1, basis: 'inferida', sourceIds: [], note: 'Colapsa um proxy.' },
  ],
  entryNodeIds: ['app'],
  limitations: ['A aresta e1 é inferida.'],
};

function broken(patch: (preset: ReferenceArchitecture) => ReferenceArchitecture): string[] {
  return validateReferenceArchitecture(patch(structuredClone(VALID) as ReferenceArchitecture));
}

describe('validateReferenceArchitecture — cada invariante de fato é acusado', () => {
  it('a fixture base é válida (senão os testes abaixo passariam no vácuo)', () => {
    expect(validateReferenceArchitecture(VALID)).toEqual([]);
  });

  it('1. ids duplicados', () => {
    expect(broken((p) => ({ ...p, nodes: [p.nodes[0]!, { ...p.nodes[1]!, id: 'app' }] }))).not.toEqual([]);
    expect(broken((p) => ({ ...p, edges: [p.edges[0]!, { ...p.edges[0]! }] }))).not.toEqual([]);
  });

  it('2. nó sem explicação, sem fonte, ou com fonte inexistente', () => {
    expect(broken((p) => ({ ...p, nodes: [{ ...p.nodes[0]!, explanation: { text: ' ', sourceIds: ['s1'] } }, p.nodes[1]!] }))).not.toEqual([]);
    expect(broken((p) => ({ ...p, nodes: [{ ...p.nodes[0]!, sourceIds: [] }, p.nodes[1]!] }))).not.toEqual([]);
    expect(broken((p) => ({ ...p, nodes: [{ ...p.nodes[0]!, sourceIds: ['nao-existe'] }, p.nodes[1]!] }))).not.toEqual([]);
  });

  it('3. aresta afirmada sem fonte, ou inferida sem note', () => {
    expect(broken((p) => ({ ...p, edges: [{ ...p.edges[0]!, basis: 'afirmada', sourceIds: [] }] }))).not.toEqual([]);
    expect(broken((p) => ({ ...p, edges: [{ id: 'e1', from: 'app', to: 'db', kind: 'write', weight: 1, basis: 'inferida', sourceIds: [] }] }))).not.toEqual([]);
  });

  it('4. aresta inferida que não aparece nas limitações', () => {
    expect(broken((p) => ({ ...p, limitations: ['Outra coisa qualquer.'] }))).not.toEqual([]);
    // "e10" não cita "e1"
    expect(broken((p) => ({ ...p, limitations: ['A aresta e10 é inferida.'] }))).not.toEqual([]);
  });

  it('5. sem limitações, ou entrada que não é nó do preset', () => {
    expect(broken((p) => ({ ...p, limitations: [] }))).not.toEqual([]);
    expect(broken((p) => ({ ...p, entryNodeIds: ['fantasma'] }))).not.toEqual([]);
  });

  it('6. réplicas reais sem a fonte do número', () => {
    expect(broken((p) => ({ ...p, nodes: [{ ...p.nodes[0]!, replicasIllustrative: false }, p.nodes[1]!] }))).not.toEqual([]);
    expect(
      broken((p) => ({ ...p, nodes: [{ ...p.nodes[0]!, replicasIllustrative: false, replicasSourceId: 's1' }, p.nodes[1]!] })),
    ).toEqual([]);
  });

  it('7. URL sem https ou data não ISO', () => {
    expect(broken((p) => ({ ...p, sources: [{ ...p.sources[0]!, url: 'http://example.com' }] }))).not.toEqual([]);
    expect(broken((p) => ({ ...p, sources: [{ ...p.sources[0]!, accessedAt: '03/10/2026' }] }))).not.toEqual([]);
  });
});

describe('REFERENCE_ARCHITECTURES', () => {
  it.each(REFERENCE_ARCHITECTURES.map((p) => [p.company, p] as const))('%s: obedece a todos os invariantes', (_company, preset) => {
    expect(validateReferenceArchitecture(preset)).toEqual([]);
  });

  it('ids de preset únicos e resolvíveis', () => {
    const ids = REFERENCE_ARCHITECTURES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getReferenceArchitecture(id)?.id).toBe(id);
    expect(getReferenceArchitecture('nao-existe')).toBeUndefined();
  });

  it('o catálogo tem exatamente os 5 presets aprovados pelo autor', () => {
    expect(REFERENCE_ARCHITECTURES.map((p) => p.id)).toEqual(['github', 'discord', 'ifood-search', 'nubank-defense', 'netflix']);
  });

  it('o único número de réplicas com fonte é o do ScyllaDB do Discord (72 nós)', () => {
    const sourced = REFERENCE_ARCHITECTURES.flatMap((p) => p.nodes.filter((n) => !n.replicasIllustrative).map((n) => `${p.id}/${n.id}=${n.replicas}`));
    expect(sourced).toEqual(['discord/scylladb=72']);
  });

  it('o MVP (GitHub) está no catálogo com os 6 componentes e as 6 conexões aprovados', () => {
    const github = getReferenceArchitecture('github')!;
    expect(github.nodes.map((n) => n.id)).toEqual([
      'rails-monolith', 'mysql-primary', 'mysql-read-replicas', 'git-fileservers', 'push-events', 'push-workers',
    ]);
    expect(github.edges.filter((e) => e.basis === 'inferida').map((e) => e.id)).toEqual(['e3', 'e4', 'e6']);
  });
});

describe('toDesign', () => {
  it('preserva ids, tipos, réplicas, arestas e entradas; descarta explicação, fonte e basis', () => {
    const design = toDesign(VALID);
    expect(design).toEqual({
      nodes: [
        { id: 'app', type: 'app_server', replicas: 2 },
        { id: 'db', type: 'sql_primary', replicas: 2 },
      ],
      edges: [{ id: 'e1', from: 'app', to: 'db', kind: 'write', weight: 1 }],
      entryNodeIds: ['app'],
    });
  });

  it('devolve cópias — mutar o design não altera o preset', () => {
    const design = toDesign(VALID);
    design.entryNodeIds.push('x');
    expect(VALID.entryNodeIds).toEqual(['app']);
  });
});
