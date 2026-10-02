import { describe, expect, it } from 'vitest';
import { hashDesign } from '../src/design-hash.js';
import { NARRATOR_PROMPT_VERSION } from '../src/prompt.js';
import type { Design, Workload } from '@sdp/engine';

const workload: Workload = { rps: 1000, readWriteRatio: 0.9, payloadBytes: 500, peakMultiplier: 1 };

function design(overrides: Partial<Design> = {}): Design {
  return {
    nodes: [
      { id: 'app-1', type: 'app_server', replicas: 2 },
      { id: 'db-1', type: 'sql_primary', replicas: 1 },
    ],
    edges: [{ id: 'e1', from: 'app-1', to: 'db-1', kind: 'write', weight: 1 }],
    entryNodeIds: ['app-1'],
    ...overrides,
  };
}

describe('hashDesign', () => {
  it('é determinístico — mesmo par (Design, Workload), sempre o mesmo hash', async () => {
    const a = await hashDesign(design(), workload);
    const b = await hashDesign(design(), workload);
    expect(a).toBe(b);
  });

  it('nodes/edges em ordem diferente geram o MESMO hash — canonicalização por id', async () => {
    const reordered = design({
      nodes: [
        { id: 'db-1', type: 'sql_primary', replicas: 1 },
        { id: 'app-1', type: 'app_server', replicas: 2 },
      ],
    });
    const a = await hashDesign(design(), workload);
    const b = await hashDesign(reordered, workload);
    expect(a).toBe(b);
  });

  it('designs logicamente diferentes geram hashes diferentes', async () => {
    const changed = design({ nodes: [{ id: 'app-1', type: 'app_server', replicas: 4 }] });
    const a = await hashDesign(design(), workload);
    const b = await hashDesign(changed, workload);
    expect(a).not.toBe(b);
  });

  it('mesmo design com workloads diferentes (rps diferente) gera hashes diferentes', async () => {
    const otherWorkload: Workload = { ...workload, rps: 2000 };
    const a = await hashDesign(design(), workload);
    const b = await hashDesign(design(), otherWorkload);
    expect(a).not.toBe(b);
  });

  it('devolve um hash hexadecimal de 64 caracteres (SHA-256)', async () => {
    const hash = await hashDesign(design(), workload);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('promptVersion diferente gera hash diferente pro mesmo design/workload (research.md §1.6)', async () => {
    const a = await hashDesign(design(), workload, 1);
    const b = await hashDesign(design(), workload, 2);
    expect(a).not.toBe(b);
  });

  it('sem promptVersion explícito, usa a versão atual do prompt — mesmo hash que passá-la explicitamente', async () => {
    const a = await hashDesign(design(), workload);
    const b = await hashDesign(design(), workload, NARRATOR_PROMPT_VERSION);
    expect(a).toBe(b);
  });
});
