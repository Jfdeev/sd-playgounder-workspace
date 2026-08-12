/**
 * Fila M/M/1 e Lei de Little — packages/engine/src/metrics/queue.ts
 *
 * W = 1 / (μ − λ) — FR-004. Edge Cases (spec.md): quando ρ ≥ 1 (λ ≥ capacidade agregada), a
 * fórmula diverge — o sentinela definido para esse caso é `Infinity` (valor `number` válido em
 * JS/TS), nunca `NaN` vazando sem tratamento.
 */

/**
 * Tempo médio de espera em fila (sojourn time médio do M/M/1), em milissegundos.
 *
 * @param offeredLoadRps λ — carga que chega no nó (rps)
 * @param capacityRps c·μ — capacidade agregada de serviço do nó (rps)
 */
export function calculateQueueWaitMs(offeredLoadRps: number, capacityRps: number): number {
  const availableCapacity = capacityRps - offeredLoadRps;
  if (availableCapacity <= 0) {
    return Infinity; // saturado (ρ ≥ 1) — sentinela documentado, nunca NaN sem tratamento.
  }
  return (1 / availableCapacity) * 1000;
}

/**
 * Lei de Little: L = λ · W — número médio de requisições em voo no nó.
 *
 * @param offeredLoadRps λ — carga que chega no nó (rps)
 * @param waitTimeMs W — tempo médio de espera em fila, em milissegundos
 */
export function calculateRequestsInFlight(offeredLoadRps: number, waitTimeMs: number): number {
  if (!Number.isFinite(waitTimeMs)) {
    return Infinity;
  }
  return offeredLoadRps * (waitTimeMs / 1000);
}
