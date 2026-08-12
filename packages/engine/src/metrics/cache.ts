/**
 * Efeito de cache — packages/engine/src/metrics/cache.ts
 *
 * FR-008, fórmulas de docs/product-context.md §7 implementadas literalmente:
 *   carga_no_db      = λ · (1 − h)
 *   latência_efetiva = h·L_cache + (1 − h)·(L_cache + L_db)
 *                     = L_cache + (1 − h)·L_db   (forma equivalente, usada na integração do
 *                       caminho — ver graph/propagate.ts e src/index.ts: o hit rate reduz a
 *                       carga/peso de tudo que vem depois do cache no caminho, não só do próximo
 *                       nó, generalizando a mesma fórmula para caminhos com mais de 2 nós.)
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
