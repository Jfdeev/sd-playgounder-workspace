import { describe, expect, it } from 'vitest';
import { COMPONENT_UI, CLIENT_UI, EDGE_KIND_UI, NODE_STATUS_UI } from '../src/lib/canvas-ui-catalog';

/**
 * `canvas-ui-catalog.ts` é dado puro (sem branches/funções), por isso a métrica de cobertura de
 * `pnpm test:coverage` só conta as declarações como "cobertas" se o módulo for de fato importado
 * por algum teste — sem isso ficava 0% e derrubava o threshold global de 90% (src/lib/**). Este
 * teste é, ao mesmo tempo, um smoke test real: garante que cada `ComponentType`/`EdgeKind` do
 * engine (`@sdp/engine`) tem uma entrada de UI — se alguém adicionar um 12º ComponentType ao
 * engine e esquecer de dar a ele um ícone/rótulo aqui, este teste quebra.
 */
describe('canvas-ui-catalog', () => {
  // Espelha exatamente os 34 ComponentType de packages/engine/src/types.ts — os 11 de M0/M1 +
  // os 23 novos "limpos" de M1.5 US2 (ver docs/product-context.md §10 e
  // specs/catalogo-expandido-m1-5/spec.md).
  const ALL_COMPONENT_TYPES = [
    'load_balancer',
    'api_gateway',
    'app_server',
    'worker',
    'cache',
    'sql_primary',
    'sql_replica',
    'nosql_kv',
    'queue',
    'object_storage',
    'cdn',
    'dns',
    'waf',
    'ingress',
    'rate_limiter',
    'serverless',
    'auth_service',
    'search',
    'scheduler',
    'notifications',
    'analytics',
    'data_warehouse',
    'vector_db',
    'pubsub',
    'event_stream',
    'kafka',
    'llm_gateway',
    'orchestrator',
    'tool_registry',
    'memory_fabric',
    'safety_mesh',
    'third_party_api',
    'payment',
    'email',
  ] as const;

  const ALL_CLIENT_VARIANTS = ['mobile', 'web', 'desktop'] as const;
  const ALL_EDGE_KINDS = ['read', 'write', 'async', 'replication'] as const;
  const ALL_NODE_STATUSES = ['healthy', 'warning', 'saturated'] as const;

  it('COMPONENT_UI tem uma entrada com label, icon e description para cada um dos 34 ComponentType', () => {
    expect(Object.keys(COMPONENT_UI).sort()).toEqual([...ALL_COMPONENT_TYPES].sort());
    for (const type of ALL_COMPONENT_TYPES) {
      expect(COMPONENT_UI[type].label).toBeTruthy();
      expect(COMPONENT_UI[type].icon).toBeDefined();
      expect(COMPONENT_UI[type].description.length).toBeGreaterThan(20);
    }
  });

  it('CLIENT_UI tem uma entrada para cada uma das 3 variantes de Cliente (mobile/web/desktop)', () => {
    expect(Object.keys(CLIENT_UI).sort()).toEqual([...ALL_CLIENT_VARIANTS].sort());
    for (const variant of ALL_CLIENT_VARIANTS) {
      expect(CLIENT_UI[variant].label).toBeTruthy();
      expect(CLIENT_UI[variant].icon).toBeDefined();
      expect(CLIENT_UI[variant].description.length).toBeGreaterThan(20);
    }
  });

  it('EDGE_KIND_UI tem uma entrada para cada um dos 4 EdgeKind', () => {
    expect(Object.keys(EDGE_KIND_UI).sort()).toEqual([...ALL_EDGE_KINDS].sort());
    for (const kind of ALL_EDGE_KINDS) {
      expect(EDGE_KIND_UI[kind].label).toBeTruthy();
      expect(EDGE_KIND_UI[kind].colorClass).toBeTruthy();
    }
  });

  it('NODE_STATUS_UI tem uma entrada para cada um dos 3 NodeStatus', () => {
    expect(Object.keys(NODE_STATUS_UI).sort()).toEqual([...ALL_NODE_STATUSES].sort());
    for (const status of ALL_NODE_STATUSES) {
      expect(NODE_STATUS_UI[status].label).toBeTruthy();
      expect(NODE_STATUS_UI[status].colorClass).toBeTruthy();
    }
  });

  it('gargalo (saturated) usa uma cor visualmente distinta de healthy/warning (FR-009 — destaque vermelho)', () => {
    expect(NODE_STATUS_UI.saturated.colorClass).toContain('red');
    expect(NODE_STATUS_UI.healthy.colorClass).not.toContain('red');
    expect(NODE_STATUS_UI.warning.colorClass).not.toContain('red');
  });
});
