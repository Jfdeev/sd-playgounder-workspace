/**
 * Percentis de latência do caminho — packages/engine/src/metrics/latency.ts
 *
 * FR-005. Deriva p50/p95/p99 do tempo médio de fila M/M/1 usando o resultado padrão de teoria de
 * filas (o sojourn time de M/M/1 é exponencialmente distribuído com taxa (μ−λ)) — ver
 * specs/engine-puro-m0/research.md §3 para a derivação completa.
 */

export type Percentile = 'p50' | 'p95' | 'p99';

/** -ln(1 - p) para p ∈ {0.50, 0.95, 0.99} — research.md §3. */
const QUEUE_PERCENTILE_FACTOR: Record<Percentile, number> = {
  p50: -Math.log(1 - 0.5),
  p95: -Math.log(1 - 0.95),
  p99: -Math.log(1 - 0.99),
};

/**
 * Percentil do tempo de fila a partir do tempo médio de espera (W do M/M/1).
 * `Infinity` propaga naturalmente quando o nó está saturado (W = Infinity).
 */
export function queueLatencyAtPercentile(meanWaitMs: number, percentile: Percentile): number {
  return meanWaitMs * QUEUE_PERCENTILE_FACTOR[percentile];
}

/**
 * Percentil da latência base (sem fila) de um componente. O catálogo só fornece p50 e p99
 * (docs/product-context.md §1.1); p95 é interpolado linearmente entre os dois — aproximação
 * pedagógica documentada (research.md), não uma medição real (§4: "não é simulador de produção").
 */
export function baseLatencyAtPercentile(
  base: { p50: number; p99: number },
  percentile: Percentile,
): number {
  if (percentile === 'p50') return base.p50;
  if (percentile === 'p99') return base.p99;
  // p95: interpolação linear entre p50 e p99, posicionando 95 no intervalo [50, 99].
  const fraction = (95 - 50) / (99 - 50);
  return base.p50 + (base.p99 - base.p50) * fraction;
}

export type NodeLatencyInput = {
  baseLatencyMs: { p50: number; p99: number };
  queueWaitMs: number;
  /**
   * Probabilidade de a requisição efetivamente passar por este nó (default 1 — sempre passa).
   * FR-008: um nó a jusante de um cache com hit rate `h` só é visitado em um miss, então seu
   * peso é `(1−h)` — generaliza `latência_efetiva = h·L_cache + (1−h)·(L_cache + L_db)` (que
   * equivale a `L_cache·1 + L_db·(1−h)`) para caminhos com qualquer número de nós.
   */
  weight?: number;
};

/** Soma ponderada, para um percentil, da latência base + fila de cada nó do caminho (FR-005, FR-008). */
export function calculatePathLatency(
  nodes: readonly NodeLatencyInput[],
): { p50: number; p95: number; p99: number } {
  const sumAt = (percentile: Percentile): number =>
    nodes.reduce(
      (total, node) =>
        total +
        (node.weight ?? 1) *
          (baseLatencyAtPercentile(node.baseLatencyMs, percentile) +
            queueLatencyAtPercentile(node.queueWaitMs, percentile)),
      0,
    );

  return { p50: sumAt('p50'), p95: sumAt('p95'), p99: sumAt('p99') };
}
