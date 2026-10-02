/**
 * Throughput real do sistema e gargalo — packages/engine/src/metrics/throughput.ts
 *
 * FR-006: throughput = λ / max(1, ρ_max), onde ρ_max é a maior utilização entre os nós
 * alcançáveis. Cada nó recebe uma fração fixa da carga de entrada (split por peso, cache), então
 * o sistema satura quando o primeiro nó chega a ρ = 1 — a carga máxima sustentável é λ / ρ_max.
 * Num caminho linear sem split nem cache (todo nó recebe λ inteiro) isso reduz exatamente a
 * min(λ, capacidade de cada nó) de `docs/product-context.md` §7. Nunca reporta acima de λ.
 *
 * FR-007: gargalo = o nó de maior ρ, só quando ρ_max ≥ 1 (algum nó realmente limita a carga).
 * Comparar a capacidade de um nó com o λ total (e não com a carga que chega nele) apontava falso
 * gargalo em qualquer nó atrás de um cache ou de um split.
 */

import type { NodeId } from '../types.js';

export type NodeUtilization = { nodeId: NodeId; utilization: number };

/**
 * @param offeredRps λ — carga oferecida ao sistema
 * @param nodeUtilizations ρ de cada nó alcançável. Empate em ρ_max é decidido pelo menor `nodeId`
 *        (ordem lexicográfica) — determinístico independente da ordem de entrada (Constitution III).
 */
export function calculateThroughput(
  offeredRps: number,
  nodeUtilizations: readonly NodeUtilization[],
): { throughputRps: number; bottleneckId: NodeId | null } {
  let maxUtilization = 0;
  let mostUtilizedId: NodeId | null = null;
  for (const { nodeId, utilization } of nodeUtilizations) {
    const isTieWinner = utilization === maxUtilization && mostUtilizedId !== null && nodeId < mostUtilizedId;
    if (utilization > maxUtilization || isTieWinner) {
      maxUtilization = utilization;
      mostUtilizedId = nodeId;
    }
  }

  if (maxUtilization < 1) {
    return { throughputRps: offeredRps, bottleneckId: null };
  }

  // ρ_max = Infinity (capacidade zero com carga) ⇒ throughput 0, nunca NaN/Infinity.
  return { throughputRps: offeredRps / maxUtilization, bottleneckId: mostUtilizedId };
}
