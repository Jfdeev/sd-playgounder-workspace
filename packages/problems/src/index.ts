/**
 * API pública do catálogo de problemas — packages/problems/src/index.ts
 *
 * getProblem(id) nunca lança exceção — id desconhecido retorna undefined (contrato consumido por
 * apps/web/src/app/app/[problemId]/page.tsx, que trata isso como 404).
 *
 * Ver specs/canvas-submissao-m1/contracts/canvas-engine-boundary.md para o contrato completo.
 */

import { URL_SHORTENER } from './catalog/url-shortener.js';
import { SOCIAL_FEED } from './catalog/social-feed.js';
import { ECOMMERCE_CHECKOUT } from './catalog/ecommerce-checkout.js';
import type { Problem } from './types.js';

const PROBLEM_CATALOG: Record<string, Problem> = {
  [URL_SHORTENER.id]: URL_SHORTENER,
  [SOCIAL_FEED.id]: SOCIAL_FEED,
  [ECOMMERCE_CHECKOUT.id]: ECOMMERCE_CHECKOUT,
};

/**
 * Ordem de progressão travada dos desafios (ver `apps/web/src/lib/challenge-progression.ts`) — o
 * desafio N só destrava depois do N-1 ser resolvido (todos os critérios da rubrica passando).
 * Nem toda entrada do catálogo do site de inspiração tem um problema completo aqui ainda — as
 * demais aparecem na lista como "em breve" (bloqueadas, sem `Problem` por trás).
 */
export const ALL_PROBLEM_IDS: readonly string[] = Object.keys(PROBLEM_CATALOG);

export function getProblem(id: string): Problem | undefined {
  return PROBLEM_CATALOG[id];
}

export type { Problem, ProblemScale, RubricCriterion, Hint } from './types.js';
export { isProblemSolved } from './types.js';
