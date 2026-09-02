/**
 * Escala logarítmica do slider de RPS do botão "Simular" — apps/web/src/lib/rps-slider.ts
 *
 * Um slider linear não cobre bem 1..100.000 rps: a metade direita do curso representaria só os
 * últimos ~50.000 rps, e ajustar valores pequenos (1-100, onde a maioria dos designs de exemplo
 * já satura) ficaria praticamente impossível de precisar. Escala logarítmica: cada posição do
 * slider mapeia pra um rps multiplicado por um fator constante em vez de somado — a mesma
 * distância percorrida no slider dobra/decuplica o rps em qualquer ponto da faixa, não só perto do
 * fim.
 *
 * Puro e testado à parte (sem depender de DOM/React) — mesmo padrão do resto de `src/lib/**`.
 */

export const RPS_MIN = 1;
export const RPS_MAX = 100_000;
/** Resolução do `<input type="range">` — não precisa ser maior que a precisão visual do slider. */
export const RPS_SLIDER_RESOLUTION = 1000;

/** Posição do slider (0..RPS_SLIDER_RESOLUTION) → rps (RPS_MIN..RPS_MAX), escala exponencial. */
export function sliderPositionToRps(position: number): number {
  const clampedPosition = Math.min(Math.max(position, 0), RPS_SLIDER_RESOLUTION);
  const ratio = clampedPosition / RPS_SLIDER_RESOLUTION;
  return Math.round(RPS_MIN * (RPS_MAX / RPS_MIN) ** ratio);
}

/** Inverso de `sliderPositionToRps` — usado pra posicionar o slider quando o rps muda por outro meio (ex. digitado no input numérico, ou ao trocar de desafio). */
export function rpsToSliderPosition(rps: number): number {
  const clampedRps = clampRps(rps);
  const ratio = Math.log(clampedRps / RPS_MIN) / Math.log(RPS_MAX / RPS_MIN);
  return Math.round(ratio * RPS_SLIDER_RESOLUTION);
}

/** Confina um rps arbitrário (ex. digitado à mão) aos limites do slider, sempre um inteiro. */
export function clampRps(rps: number): number {
  if (!Number.isFinite(rps)) return RPS_MIN;
  return Math.min(Math.max(Math.round(rps), RPS_MIN), RPS_MAX);
}
