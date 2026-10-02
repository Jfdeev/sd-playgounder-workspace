/**
 * Efeito de cache — packages/engine/src/metrics/cache.ts
 *
 * FR-008, fórmulas de docs/product-context.md §7 implementadas literalmente:
 *   carga_no_db      = λ · (1 − h)
 *   latência_efetiva = h·L_cache + (1 − h)·(L_cache + L_db)
 *   (latência MÉDIA. Os percentis p50/p95/p99 do caminho usam o limiar de cauda de
 *   metrics/latency.ts — ponderar um percentil por (1−h) subestimaria a cauda.)
 */

/** carga_no_db = λ · (1 − h) — FR-008. */
export function calculateDownstreamLoad(offeredLoad: number, hitRate: number): number {
  return offeredLoad * (1 - hitRate);
}

/**
 * latência_efetiva = h·L_cache + (1−h)·(L_cache + L_db) — FR-008, caso literal de 2 nós
 * (cache imediatamente na frente do componente de dados).
 */
export function calculateEffectiveLatency(
  cacheLatencyMs: number,
  dbLatencyMs: number,
  hitRate: number,
): number {
  return hitRate * cacheLatencyMs + (1 - hitRate) * (cacheLatencyMs + dbLatencyMs);
}
