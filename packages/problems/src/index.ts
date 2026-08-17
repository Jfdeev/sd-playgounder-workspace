/**
 * API pública do catálogo de problemas — packages/problems/src/index.ts
 *
 * getProblem(id) nunca lança exceção — id desconhecido retorna undefined (contrato consumido por
 * apps/web/src/app/app/[problemId]/page.tsx, que trata isso como 404).
 *
 * Ver specs/canvas-submissao-m1/contracts/canvas-engine-boundary.md para o contrato completo.
 */

import { URL_SHORTENER } from './catalog/url-shortener.js';
import type { Problem } from './types.js';

const PROBLEM_CATALOG: Record<string, Problem> = {
  [URL_SHORTENER.id]: URL_SHORTENER,
};

export const ALL_PROBLEM_IDS: readonly string[] = Object.keys(PROBLEM_CATALOG);

export function getProblem(id: string): Problem | undefined {
  return PROBLEM_CATALOG[id];
}

export type { Problem, ProblemScale } from './types.js';
