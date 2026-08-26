import { describe, expect, it } from 'vitest';
import type { ComponentType } from '@sdp/engine';
import { CATEGORY_OF, PALETTE_CATEGORY_ORDER, type PaletteCategory } from '../src/lib/component-categories';
import type { ConnectableKind } from '../src/lib/connection-rules';

// Espelha exatamente os 11 ComponentType de M0/M1 (mesma lista de connection-rules.spec.ts /
// canvas-ui-catalog.spec.ts) — cresce junto quando M1.5 US2/US3 adicionarem componentes novos.
const ALL_COMPONENT_TYPES: readonly ComponentType[] = [
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
];
const ALL_KINDS: readonly ConnectableKind[] = ['client', ...ALL_COMPONENT_TYPES];

const EXPECTED_CATEGORIES: readonly PaletteCategory[] = [
  'Client',
  'Traffic & Edge',
  'Compute',
  'Storage',
  'Messaging',
  'Observability',
  'Network',
  'AI & Agents',
  'External',
];

describe('component-categories (FR-001)', () => {
  it('PALETTE_CATEGORY_ORDER tem exatamente as 9 categorias, na mesma ordem da tabela do spec', () => {
    expect(PALETTE_CATEGORY_ORDER).toEqual(EXPECTED_CATEGORIES);
  });

  it('CATEGORY_OF mapeia todo ConnectableKind atual pra uma categoria válida', () => {
    for (const kind of ALL_KINDS) {
      expect(EXPECTED_CATEGORIES).toContain(CATEGORY_OF[kind]);
    }
  });

  it('client sempre cai em "Client"', () => {
    expect(CATEGORY_OF.client).toBe('Client');
  });

  it('cada componente existente de M0/M1 cai na categoria certa (tabela do spec)', () => {
    expect(CATEGORY_OF.load_balancer).toBe('Traffic & Edge');
    expect(CATEGORY_OF.api_gateway).toBe('Traffic & Edge');
    expect(CATEGORY_OF.cdn).toBe('Traffic & Edge');
    expect(CATEGORY_OF.app_server).toBe('Compute');
    expect(CATEGORY_OF.worker).toBe('Compute');
    expect(CATEGORY_OF.cache).toBe('Storage');
    expect(CATEGORY_OF.sql_primary).toBe('Storage');
    expect(CATEGORY_OF.sql_replica).toBe('Storage');
    expect(CATEGORY_OF.nosql_kv).toBe('Storage');
    expect(CATEGORY_OF.object_storage).toBe('Storage');
    expect(CATEGORY_OF.queue).toBe('Messaging');
  });
});
