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
};

export function getComponentSpec(type: ComponentType): ComponentSpec {
  return COMPONENT_CATALOG[type];
}
