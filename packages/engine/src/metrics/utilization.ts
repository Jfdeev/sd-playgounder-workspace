/**
 * Utilização — packages/engine/src/metrics/utilization.ts
 *
 * ρ = λ / (c · μ) — FR-003.
 */

/**
 * @param offeredLoad λ — carga que chega no nó (rps)
 * @param replicas c — número de instâncias
 * @param maxThroughputPerReplica μ — capacidade de serviço por instância (rps)
 */
export function calculateUtilization(
  offeredLoad: number,
  replicas: number,
  maxThroughputPerReplica: number,
): number {
  const capacity = replicas * maxThroughputPerReplica;
  if (capacity <= 0) {
    return Infinity;
  }
  return offeredLoad / capacity;
}
