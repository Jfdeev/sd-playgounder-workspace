import { describe, expect, it } from 'vitest';
import { COMPONENT_CATALOG, getComponentSpec } from '../../src/catalog/components.js';

const EXPECTED_TYPES = [
  // 11 originais (M0/M1)
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
  // 23 novos "limpos" — M1.5 US2
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
  // 10 de Observability/Network — M1.5 US3
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
] as const;

describe('COMPONENT_CATALOG (FR-014)', () => {
  it('contém exatamente os 44 tipos de componente esperados', () => {
    const keys = Object.keys(COMPONENT_CATALOG).sort();
    expect(keys).toEqual([...EXPECTED_TYPES].sort());
  });

  it.each(EXPECTED_TYPES)('%s tem specs verificáveis válidas', (type) => {
    const spec = COMPONENT_CATALOG[type];
    expect(spec.maxThroughputRps).toBeGreaterThan(0);
    expect(spec.baseLatencyMs.p50).toBeGreaterThan(0);
    expect(spec.baseLatencyMs.p99).toBeGreaterThanOrEqual(spec.baseLatencyMs.p50);
    expect(spec.monthlyCostUsd).toBeGreaterThan(0);
  });

  it('getComponentSpec retorna a mesma spec presente no catálogo', () => {
    expect(getComponentSpec('cache')).toBe(COMPONENT_CATALOG.cache);
  });

  // Plausibilidade por arquétipo (research.md §2, M1.5 US2) — cada componente novo herda a ordem
  // de grandeza de uma âncora existente, não um número solto. Estas asserções provam a relação
  // relativa, não valores absolutos (que continuam ilustrativos, D5).
  describe('plausibilidade por arquétipo (research.md §2)', () => {
    it('Kafka/Event Stream (mensageria de altíssimo throughput) ficam na ordem de grandeza do CDN', () => {
      const order = (n: number) => Math.floor(Math.log10(n));
      expect(order(COMPONENT_CATALOG.kafka.maxThroughputRps)).toBe(order(COMPONENT_CATALOG.cdn.maxThroughputRps));
      expect(order(COMPONENT_CATALOG.event_stream.maxThroughputRps)).toBeGreaterThanOrEqual(
        order(COMPONENT_CATALOG.queue.maxThroughputRps) + 1,
      );
    });

    it('pipeline de IA (LLM Gateway/Orchestrator) é bem mais lento que App Server — chamada de LLM custa centenas de ms', () => {
      expect(COMPONENT_CATALOG.llm_gateway.baseLatencyMs.p99).toBeGreaterThan(
        COMPONENT_CATALOG.app_server.baseLatencyMs.p99 * 5,
      );
      expect(COMPONENT_CATALOG.orchestrator.baseLatencyMs.p99).toBeGreaterThan(
        COMPONENT_CATALOG.llm_gateway.baseLatencyMs.p99,
      );
    });

    it('Serverless tem monthlyCostUsd menor que App Server (cobrança por invocação, não por instância fixa)', () => {
      expect(COMPONENT_CATALOG.serverless.monthlyCostUsd).toBeLessThan(COMPONENT_CATALOG.app_server.monthlyCostUsd);
    });

    it('Data Warehouse tem throughput bem menor que SQL Primary — otimizado pra consulta agregada, não OLTP', () => {
      expect(COMPONENT_CATALOG.data_warehouse.maxThroughputRps).toBeLessThan(
        COMPONENT_CATALOG.sql_primary.maxThroughputRps,
      );
    });

    // FR-006 / Clarifications 2026-08-25: VPC/Subnet são topologicamente containers, não hops de
    // processamento — a spec MUST refletir capacidade alta o bastante pra nunca virarem gargalo em
    // designs razoáveis. Prova mecânica (não um valor solto): maxThroughputRps de cada um precisa
    // ser >= o maior valor de QUALQUER outro componente do catálogo.
    it('VPC e Subnet têm capacidade >= a de qualquer outro componente do catálogo (FR-006 — nunca gargalo)', () => {
      const maxOfOthers = (excluded: keyof typeof COMPONENT_CATALOG) =>
        Math.max(
          ...EXPECTED_TYPES.filter((type) => type !== excluded).map((type) => COMPONENT_CATALOG[type].maxThroughputRps),
        );

      expect(COMPONENT_CATALOG.vpc.maxThroughputRps).toBeGreaterThanOrEqual(maxOfOthers('vpc'));
      expect(COMPONENT_CATALOG.subnet.maxThroughputRps).toBeGreaterThanOrEqual(maxOfOthers('subnet'));
    });
  });
});
