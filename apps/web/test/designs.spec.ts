import { describe, expect, it } from 'vitest';
import { canvasDesignOf } from '../src/lib/canvas-to-design';
import { DESIGN_LIMITS } from '../src/lib/gamification/design-validation';
import { safeReturnPath } from '../src/lib/designs/return-path';
import { canonicalSavedCanvas, contentHash, fromSavedCanvas, toSavedCanvas, type SavedCanvas } from '../src/lib/designs/saved-canvas';
import { toSharedDesignView } from '../src/lib/designs/shared-view';
import { normalizeDesignName, validateSavedCanvas } from '../src/lib/designs/validate-saved-canvas';

const canvasNodes = [
  { id: 'c', position: { x: 0, y: 10 }, data: { kind: 'client' as const, variant: 'web' as const } },
  {
    id: 'app',
    position: { x: 200, y: 10 },
    data: { kind: 'component' as const, componentType: 'app_server' as const, replicas: 3, result: { status: 'saturated' as const, isBottleneck: true } },
  },
  { id: 'cache', position: { x: 400, y: 10 }, data: { kind: 'component' as const, componentType: 'cache' as const, replicas: 2, cacheHitRate: 0.8 } },
];
const canvasEdges = [
  { id: 'e0', source: 'c', target: 'app', data: { kind: 'read' as const } },
  { id: 'e1', source: 'app', target: 'cache', data: { kind: 'read' as const, weight: 3 } },
];

describe('SavedCanvas', () => {
  const saved = toSavedCanvas(canvasNodes, canvasEdges, 'github');

  it('guarda o canvas inteiro sem o efêmero (resultado da simulação)', () => {
    expect(saved.nodes.map((n) => n.id)).toEqual(['c', 'app', 'cache']);
    expect(JSON.stringify(saved)).not.toContain('result');
    expect(saved.nodes[2]!.data).toEqual({ kind: 'component', componentType: 'cache', replicas: 2, cacheHitRate: 0.8 });
    expect(saved.edges[1]!.data).toEqual({ kind: 'read', weight: 3 });
    expect(saved.loadedPresetId).toBe('github');
  });

  it('ida e volta preserva o Design do engine e as posições (SC-001/SC-005)', () => {
    const reopened = fromSavedCanvas(saved);
    expect(canvasDesignOf(reopened.nodes, reopened.edges)).toEqual(canvasDesignOf(canvasNodes, canvasEdges));
    expect(reopened.nodes.map((n) => n.position)).toEqual(canvasNodes.map((n) => n.position));
    expect(reopened.nodes.map((n) => n.type)).toEqual(['client', 'component', 'component']);
    expect(reopened.edges.every((e) => e.type === 'typed')).toBe(true);
  });

  it('aresta sem dados vira leitura', () => {
    expect(toSavedCanvas(canvasNodes, [{ id: 'x', source: 'c', target: 'app' }], null).edges[0]!.data).toEqual({ kind: 'read' });
  });

  it('hash ignora a ordem e muda quando o conteúdo muda', async () => {
    const reordered: SavedCanvas = { ...saved, nodes: [...saved.nodes].reverse(), edges: [...saved.edges].reverse() };
    expect(canonicalSavedCanvas(reordered)).toBe(canonicalSavedCanvas(saved));
    expect(await contentHash(reordered)).toBe(await contentHash(saved));
    const moved = toSavedCanvas(canvasNodes.map((n) => (n.id === 'app' ? { ...n, position: { x: 201, y: 10 } } : n)), canvasEdges, 'github');
    expect(await contentHash(moved)).not.toBe(await contentHash(saved));
    expect(await contentHash(saved)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('validateSavedCanvas (FR-010)', () => {
  const valid = () => JSON.parse(JSON.stringify(toSavedCanvas(canvasNodes, canvasEdges, null)));

  it('aceita canvas válido e descarta campos extras', () => {
    const raw = valid();
    raw.nodes[1].data.capacityFactor = 1000;
    raw.extra = 'x';
    const result = validateSavedCanvas(raw);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain('capacityFactor');
  });

  it('aceita rascunho: sem conexões e sem Cliente', () => {
    expect(validateSavedCanvas({ nodes: [valid().nodes[1]], edges: [], loadedPresetId: null }).ok).toBe(true);
  });

  it.each([
    ['fora do formato', null],
    ['canvas vazio', { nodes: [], edges: [] }],
    ['posição inválida', (() => { const r = valid(); r.nodes[0].position.x = Number.NaN; return r; })()],
    ['variante de cliente', (() => { const r = valid(); r.nodes[0].data.variant = 'tv'; return r; })()],
    ['tipo de nó', (() => { const r = valid(); r.nodes[0].data.kind = 'robot'; return r; })()],
    ['componente desconhecido', (() => { const r = valid(); r.nodes[1].data.componentType = 'mainframe'; return r; })()],
    ['réplicas', (() => { const r = valid(); r.nodes[1].data.replicas = 0; return r; })()],
    ['taxa de acerto', (() => { const r = valid(); r.nodes[2].data.cacheHitRate = 2; return r; })()],
    ['ids repetidos', (() => { const r = valid(); r.nodes[2].id = 'app'; return r; })()],
    ['conexão para inexistente', (() => { const r = valid(); r.edges[1].target = 'x'; return r; })()],
    ['conexão proibida', (() => { const r = valid(); r.edges.push({ id: 'e9', source: 'cache', target: 'app', data: { kind: 'read' } }); return r; })()],
    ['tipo de conexão', (() => { const r = valid(); r.edges[0].data.kind = 'teleport'; return r; })()],
    ['peso', (() => { const r = valid(); r.edges[1].data.weight = -1; return r; })()],
    ['ids de conexão repetidos', (() => { const r = valid(); r.edges[1].id = 'e0'; return r; })()],
    ['preset inválido', (() => { const r = valid(); r.loadedPresetId = ''; return r; })()],
    ['componentes demais', { nodes: Array.from({ length: DESIGN_LIMITS.maxNodes + 1 }, (_, i) => ({ id: `n${i}`, position: { x: 0, y: 0 }, data: { kind: 'client', variant: 'web' } })), edges: [] }],
  ])('recusa: %s', (_label, raw) => {
    expect(validateSavedCanvas(raw).ok).toBe(false);
  });
});

describe('normalizeDesignName', () => {
  it('tira espaços e limita a 80', () => {
    expect(normalizeDesignName('  Meu encurtador ')).toEqual({ ok: true, name: 'Meu encurtador' });
    expect(normalizeDesignName('   ').ok).toBe(false);
    expect(normalizeDesignName('a'.repeat(81)).ok).toBe(false);
    expect(normalizeDesignName(3).ok).toBe(false);
  });
});

describe('safeReturnPath (open redirect)', () => {
  it.each(['/app', '/app/d/abc-DEF_123', '/app/progresso'])('aceita %s', (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', '/app//evil.com', '/app/../entrar', '/apple', '/entrar', '/app/d/x?y=1', 42, null])(
    'recusa %s → /app',
    (path) => {
      expect(safeReturnPath(path)).toBe('/app');
    },
  );
});

describe('toSharedDesignView (FR-009, SC-004)', () => {
  const base = {
    name: 'Meu encurtador',
    contextKind: 'challenge' as const,
    contextId: 'url-shortener',
    version: { number: 2, createdAt: new Date('2026-10-25T12:00:00Z'), content: toSavedCanvas(canvasNodes, canvasEdges, null) },
  };

  it('mostra o apelido só se o perfil estiver visível', () => {
    expect(toSharedDesignView({ ...base, owner: { nickname: 'fulano', isPublic: true } }).ownerNickname).toBe('fulano');
    expect(toSharedDesignView({ ...base, owner: { nickname: 'fulano', isPublic: false } }).ownerNickname).toBeNull();
    expect(toSharedDesignView({ ...base, owner: { nickname: null, isPublic: true } }).ownerNickname).toBeNull();
  });

  it('nunca carrega e-mail, id da conta nem token, mesmo se vierem junto', () => {
    const leaky = { ...base, owner: { nickname: 'fulano', isPublic: true, email: 'a@b.com', userId: 'u1' }, shareToken: 'tok', userId: 'u1' };
    const json = JSON.stringify(toSharedDesignView(leaky));
    for (const leak of ['a@b.com', 'userId', 'u1', 'tok', 'email']) expect(json).not.toContain(leak);
    expect(toSharedDesignView(leaky).version.createdAt).toBe('2026-10-25T12:00:00.000Z');
  });
});
