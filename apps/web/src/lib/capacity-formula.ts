/**
 * Fórmula de conversão escala → RPS — apps/web/src/lib/capacity-formula.ts
 *
 * Extraída de `toWorkload()` (`canvas-to-design.ts`) pra ser compartilhada com a calculadora de
 * capacidade back-of-envelope (M2 US4, `research.md` §4) — mesma conta em um lugar só, nunca
 * duplicada (DRY, pedido explícito do autor nesta sessão pra outros pontos do código).
 */

/** RPS médio a partir de DAU e requisições por usuário por dia. */
export function averageRps(dau: number, requestsPerUserPerDay: number): number {
  return (dau * requestsPerUserPerDay) / 86_400;
}

/** RPS de pico a partir do RPS médio e do multiplicador de pico. */
export function peakRps(averageRpsValue: number, peakMultiplier: number): number {
  return averageRpsValue * peakMultiplier;
}
