import { describe, expect, it } from 'vitest';
import type { ComponentType } from '@sdp/engine';
import { CATEGORY_OF, PALETTE_CATEGORY_ORDER, type PaletteCategory } from '../src/lib/component-categories';
import type { ConnectableKind } from '../src/lib/connection-rules';

// Espelha exatamente os 44 ComponentType (11 de M0/M1 + 33 de M1.5 US2/US3 — mesma lista de
// connection-rules.spec.ts / canvas-ui-catalog.spec.ts).
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
  'metrics',
  'logs',
  'tracing',
  'alerting',
  'health_check',
  'vpc',
  'subnet',
  'nat_gateway',
  'vpn',
  'service_mesh',
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

  // TypeScript já garante que CATEGORY_OF[type] é ALGUMA PaletteCategory válida (Record
  // exaustivo) — mas não garante que seja a CERTA: um valor errado (ex. dns em 'Storage' em vez
  // de 'Traffic & Edge') compila, some no build, e mostra o componente sob o cabeçalho errado na
  // paleta (SC-001). Sem verificação visual disponível (auth bloqueia o browser), este teste é a
  // única coisa que pegaria isso.
  it('cada componente novo de M1.5 US2 cai na categoria certa (tabela do spec)', () => {
    // Traffic & Edge
    expect(CATEGORY_OF.dns).toBe('Traffic & Edge');
    expect(CATEGORY_OF.waf).toBe('Traffic & Edge');
    expect(CATEGORY_OF.ingress).toBe('Traffic & Edge');
    expect(CATEGORY_OF.rate_limiter).toBe('Traffic & Edge');
    // Compute
    expect(CATEGORY_OF.serverless).toBe('Compute');
    expect(CATEGORY_OF.auth_service).toBe('Compute');
    expect(CATEGORY_OF.search).toBe('Compute');
    expect(CATEGORY_OF.scheduler).toBe('Compute');
    expect(CATEGORY_OF.notifications).toBe('Compute');
    expect(CATEGORY_OF.analytics).toBe('Compute');
    // Storage
    expect(CATEGORY_OF.data_warehouse).toBe('Storage');
    expect(CATEGORY_OF.vector_db).toBe('Storage');
    // Messaging
    expect(CATEGORY_OF.pubsub).toBe('Messaging');
    expect(CATEGORY_OF.event_stream).toBe('Messaging');
    expect(CATEGORY_OF.kafka).toBe('Messaging');
    // AI & Agents
    expect(CATEGORY_OF.llm_gateway).toBe('AI & Agents');
    expect(CATEGORY_OF.orchestrator).toBe('AI & Agents');
    expect(CATEGORY_OF.tool_registry).toBe('AI & Agents');
    expect(CATEGORY_OF.memory_fabric).toBe('AI & Agents');
    expect(CATEGORY_OF.safety_mesh).toBe('AI & Agents');
    // External
    expect(CATEGORY_OF.third_party_api).toBe('External');
    expect(CATEGORY_OF.payment).toBe('External');
    expect(CATEGORY_OF.email).toBe('External');
  });

  it('cada componente novo de M1.5 US3 cai na categoria certa (tabela do spec)', () => {
    // Observability
    expect(CATEGORY_OF.metrics).toBe('Observability');
    expect(CATEGORY_OF.logs).toBe('Observability');
    expect(CATEGORY_OF.tracing).toBe('Observability');
    expect(CATEGORY_OF.alerting).toBe('Observability');
    expect(CATEGORY_OF.health_check).toBe('Observability');
    // Network
    expect(CATEGORY_OF.vpc).toBe('Network');
    expect(CATEGORY_OF.subnet).toBe('Network');
    expect(CATEGORY_OF.nat_gateway).toBe('Network');
    expect(CATEGORY_OF.vpn).toBe('Network');
    expect(CATEGORY_OF.service_mesh).toBe('Network');
  });
});
