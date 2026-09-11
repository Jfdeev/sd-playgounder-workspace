/**
 * Catálogo de componentes — packages/engine/src/catalog/components.ts
 *
 * Dado versionado. Valores ILUSTRATIVOS (D5 — tabela fixa, não preço real de cloud;
 * ver specs/engine-puro-m0/research.md §5). Plausíveis e redondos, não benchmarks reais
 * (docs/product-context.md §4: "não é simulador de produção").
 *
 * FR-014.
 */

import type { ComponentType } from '../types.js';

export type ComponentSpec = {
  /** μ — capacidade de serviço máxima por instância (rps). */
  maxThroughputRps: number;
  /** Latência base (sem fila), em ms. */
  baseLatencyMs: { p50: number; p99: number };
  /** Custo mensal por instância, em USD. */
  monthlyCostUsd: number;
};

export const COMPONENT_CATALOG: Record<ComponentType, ComponentSpec> = {
  load_balancer: {
    maxThroughputRps: 10_000,
    baseLatencyMs: { p50: 1, p99: 3 },
    monthlyCostUsd: 50,
  },
  api_gateway: {
    maxThroughputRps: 5_000,
    baseLatencyMs: { p50: 2, p99: 6 },
    monthlyCostUsd: 40,
  },
  app_server: {
    maxThroughputRps: 500,
    baseLatencyMs: { p50: 20, p99: 80 },
    monthlyCostUsd: 30,
  },
  worker: {
    maxThroughputRps: 200,
    baseLatencyMs: { p50: 50, p99: 200 },
    monthlyCostUsd: 25,
  },
  cache: {
    maxThroughputRps: 50_000,
    baseLatencyMs: { p50: 0.5, p99: 2 },
    monthlyCostUsd: 60,
  },
  sql_primary: {
    maxThroughputRps: 1_000,
    baseLatencyMs: { p50: 5, p99: 25 },
    monthlyCostUsd: 120,
  },
  sql_replica: {
    maxThroughputRps: 1_000,
    baseLatencyMs: { p50: 5, p99: 25 },
    monthlyCostUsd: 100,
  },
  nosql_kv: {
    maxThroughputRps: 8_000,
    baseLatencyMs: { p50: 2, p99: 8 },
    monthlyCostUsd: 80,
  },
  queue: {
    maxThroughputRps: 3_000,
    baseLatencyMs: { p50: 3, p99: 10 },
    monthlyCostUsd: 45,
  },
  object_storage: {
    maxThroughputRps: 2_000,
    baseLatencyMs: { p50: 15, p99: 60 },
    monthlyCostUsd: 20,
  },
  cdn: {
    maxThroughputRps: 100_000,
    baseLatencyMs: { p50: 0.2, p99: 1 },
    monthlyCostUsd: 70,
  },

  // Traffic & Edge — arquétipo "Filtro/borda de alta capacidade" (âncora: load_balancer).
  // M1.5 US2, research.md §2.
  dns: {
    maxThroughputRps: 20_000,
    baseLatencyMs: { p50: 0.5, p99: 2 },
    monthlyCostUsd: 10,
  },
  waf: {
    maxThroughputRps: 8_000,
    baseLatencyMs: { p50: 2, p99: 6 },
    monthlyCostUsd: 60,
  },
  ingress: {
    maxThroughputRps: 10_000,
    baseLatencyMs: { p50: 1, p99: 4 },
    monthlyCostUsd: 40,
  },
  rate_limiter: {
    maxThroughputRps: 12_000,
    baseLatencyMs: { p50: 0.5, p99: 2 },
    monthlyCostUsd: 20,
  },

  // Compute — arquétipo "Cômputo de propósito específico" (âncora: app_server). M1.5 US2,
  // research.md §2. Serverless: monthlyCostUsd menor (cobrança por invocação, não por instância
  // fixa) e p99 maior (cold start).
  serverless: {
    maxThroughputRps: 400,
    baseLatencyMs: { p50: 30, p99: 250 },
    monthlyCostUsd: 15,
  },
  auth_service: {
    maxThroughputRps: 600,
    baseLatencyMs: { p50: 10, p99: 40 },
    monthlyCostUsd: 35,
  },
  search: {
    maxThroughputRps: 300,
    baseLatencyMs: { p50: 30, p99: 120 },
    monthlyCostUsd: 90,
  },
  scheduler: {
    maxThroughputRps: 200,
    baseLatencyMs: { p50: 15, p99: 60 },
    monthlyCostUsd: 20,
  },
  notifications: {
    maxThroughputRps: 400,
    baseLatencyMs: { p50: 25, p99: 100 },
    monthlyCostUsd: 25,
  },
  analytics: {
    maxThroughputRps: 350,
    baseLatencyMs: { p50: 20, p99: 90 },
    monthlyCostUsd: 50,
  },

  // Storage — arquétipo "Armazenamento analítico/vetorial" (âncora: sql_primary/nosql_kv).
  // M1.5 US2, research.md §2. Data Warehouse: throughput bem menor (otimizado pra consulta
  // agregada pesada, não OLTP).
  data_warehouse: {
    maxThroughputRps: 200,
    baseLatencyMs: { p50: 200, p99: 800 },
    monthlyCostUsd: 300,
  },
  vector_db: {
    maxThroughputRps: 3_000,
    baseLatencyMs: { p50: 8, p99: 30 },
    monthlyCostUsd: 150,
  },

  // Messaging — arquétipo "Mensageria de alto throughput" (âncora: queue). M1.5 US2,
  // research.md §2. Kafka/Event Stream na ordem de grandeza de cdn (streaming distribuído,
  // throughput massivo).
  pubsub: {
    maxThroughputRps: 5_000,
    baseLatencyMs: { p50: 3, p99: 12 },
    monthlyCostUsd: 50,
  },
  event_stream: {
    maxThroughputRps: 50_000,
    baseLatencyMs: { p50: 2, p99: 8 },
    monthlyCostUsd: 200,
  },
  kafka: {
    maxThroughputRps: 100_000,
    baseLatencyMs: { p50: 2, p99: 6 },
    monthlyCostUsd: 250,
  },

  // AI & Agents — arquétipo "Pipeline de agente IA" (âncora: app_server/api_gateway, mas
  // baseLatencyMs bem mais alto — chamada de LLM custa centenas de ms, não dezenas). M1.5 US2,
  // research.md §2.
  llm_gateway: {
    maxThroughputRps: 200,
    baseLatencyMs: { p50: 300, p99: 1_500 },
    monthlyCostUsd: 100,
  },
  orchestrator: {
    maxThroughputRps: 150,
    baseLatencyMs: { p50: 400, p99: 2_000 },
    monthlyCostUsd: 80,
  },
  tool_registry: {
    maxThroughputRps: 1_000,
    baseLatencyMs: { p50: 5, p99: 20 },
    monthlyCostUsd: 20,
  },
  memory_fabric: {
    maxThroughputRps: 500,
    baseLatencyMs: { p50: 20, p99: 100 },
    monthlyCostUsd: 60,
  },
  safety_mesh: {
    maxThroughputRps: 800,
    baseLatencyMs: { p50: 15, p99: 60 },
    monthlyCostUsd: 40,
  },

  // External — arquétipo "Dependência externa" (sem âncora interna — throughput baixo/moderado,
  // p99 alto, rede pública fora do controle). M1.5 US2, research.md §2.
  third_party_api: {
    maxThroughputRps: 100,
    baseLatencyMs: { p50: 100, p99: 800 },
    monthlyCostUsd: 10,
  },
  payment: {
    maxThroughputRps: 80,
    baseLatencyMs: { p50: 150, p99: 900 },
    monthlyCostUsd: 50,
  },
  email: {
    maxThroughputRps: 300,
    baseLatencyMs: { p50: 50, p99: 400 },
    monthlyCostUsd: 15,
  },

  // Observability — arquétipo "tap/sink" (cache invertido: throughput altíssimo, latência
  // baixíssima, custo baixo — nunca gargalo em designs razoáveis, por analogia de papel com o
  // critério fixado pra Network/FR-006). M1.5 US3, research.md §2.
  metrics: {
    maxThroughputRps: 80_000,
    baseLatencyMs: { p50: 0.3, p99: 1 },
    monthlyCostUsd: 15,
  },
  logs: {
    maxThroughputRps: 60_000,
    baseLatencyMs: { p50: 0.5, p99: 2 },
    monthlyCostUsd: 20,
  },
  tracing: {
    maxThroughputRps: 40_000,
    baseLatencyMs: { p50: 0.5, p99: 2 },
    monthlyCostUsd: 25,
  },
  alerting: {
    maxThroughputRps: 20_000,
    baseLatencyMs: { p50: 1, p99: 3 },
    monthlyCostUsd: 10,
  },
  health_check: {
    maxThroughputRps: 30_000,
    baseLatencyMs: { p50: 0.3, p99: 1 },
    monthlyCostUsd: 5,
  },

  // Network — arquétipo "contêiner/topologia de rede" (âncora: cdn, a maior capacidade do
  // catálogo). M1.5 US3, research.md §2. VPC/Subnet especificamente MUST ter capacidade >= a de
  // qualquer outro componente do catálogo (FR-006, Clarifications 2026-08-25: "nunca virarem
  // gargalo em designs razoáveis" — não um número arbitrário).
  vpc: {
    maxThroughputRps: 150_000,
    baseLatencyMs: { p50: 0.1, p99: 0.5 },
    monthlyCostUsd: 50,
  },
  subnet: {
    maxThroughputRps: 150_000,
    baseLatencyMs: { p50: 0.1, p99: 0.5 },
    monthlyCostUsd: 30,
  },
  nat_gateway: {
    maxThroughputRps: 100_000,
    baseLatencyMs: { p50: 0.2, p99: 1 },
    monthlyCostUsd: 40,
  },
  vpn: {
    maxThroughputRps: 80_000,
    baseLatencyMs: { p50: 0.5, p99: 2 },
    monthlyCostUsd: 60,
  },
  service_mesh: {
    maxThroughputRps: 90_000,
    baseLatencyMs: { p50: 0.3, p99: 1.5 },
    monthlyCostUsd: 80,
  },
};

export function getComponentSpec(type: ComponentType): ComponentSpec {
  return COMPONENT_CATALOG[type];
}
