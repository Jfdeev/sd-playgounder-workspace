/**
 * API pública do catálogo de problemas — packages/problems/src/index.ts
 *
 * getProblem(id) nunca lança exceção — id desconhecido retorna undefined (contrato consumido por
 * apps/web/src/app/app/[problemId]/page.tsx, que trata isso como 404).
 *
 * Ver specs/canvas-submissao-m1/contracts/canvas-engine-boundary.md para o contrato completo.
 */

import { URL_SHORTENER } from './catalog/url-shortener.js';
import { RATE_LIMITER } from './catalog/rate-limiter.js';
import { LEADERBOARD } from './catalog/leaderboard.js';
import { NOTIFICATIONS } from './catalog/notifications.js';
import { SOCIAL_FEED } from './catalog/social-feed.js';
import { REALTIME_CHAT } from './catalog/realtime-chat.js';
import { VIDEO_STREAMING } from './catalog/video-streaming.js';
import { WEB_CRAWLER } from './catalog/web-crawler.js';
import { ECOMMERCE_CHECKOUT } from './catalog/ecommerce-checkout.js';
import { PIX_PAYMENT } from './catalog/pix-payment.js';
import { RIDE_MATCHING } from './catalog/ride-matching.js';
import { AD_CLICK_AGGREGATOR } from './catalog/ad-click-aggregator.js';
import type { Problem, ProblemLevel } from './types.js';

/** Ordem dos níveis (M4.2) — a progressão abre um nível depois do outro. */
export const PROBLEM_LEVELS: readonly ProblemLevel[] = ['basic', 'intermediate', 'advanced'];

/**
 * Catálogo em ordem de nível (4 por nível) — a ordem em que o menu "Desafios" lista. A trava é por
 * nível (ver `apps/web/src/lib/challenge-progression.ts`), não pela posição na lista.
 */
export const ALL_PROBLEMS: readonly Problem[] = [
  URL_SHORTENER,
  RATE_LIMITER,
  LEADERBOARD,
  NOTIFICATIONS,
  SOCIAL_FEED,
  REALTIME_CHAT,
  VIDEO_STREAMING,
  WEB_CRAWLER,
  ECOMMERCE_CHECKOUT,
  PIX_PAYMENT,
  RIDE_MATCHING,
  AD_CLICK_AGGREGATOR,
];

const PROBLEM_CATALOG: ReadonlyMap<string, Problem> = new Map(ALL_PROBLEMS.map((problem) => [problem.id, problem]));

export const ALL_PROBLEM_IDS: readonly string[] = ALL_PROBLEMS.map((problem) => problem.id);

/** Problemas que exercitam um conceito (M4.3), na ordem do catálogo — derivado de `Problem.concepts`. */
export function problemsForConcept(conceptId: string): Problem[] {
  return ALL_PROBLEMS.filter((problem) => problem.concepts.includes(conceptId));
}

export function getProblem(id: string): Problem | undefined {
  return PROBLEM_CATALOG.get(id);
}

export type { Problem, ProblemLevel, ProblemScale, RubricCriterion, Hint } from './types.js';
export { isProblemSolved } from './types.js';
export { toWorkload } from './workload.js';

// M3 — Modo Incidente: parte pública dos incidentes e regras puras (sem a causa plantada, que fica
// em `@sdp/problems/server`).
export { INCIDENTS, getIncident, type IncidentPublic } from './incidents/public.js';
export { FAULT_TYPES, applyFault, isFaultType, type Fault, type FaultType } from './incidents/faults.js';
export { diagnose, type DiagnosisVerdict } from './incidents/diagnosis.js';
export { buildIncidentSnapshot, type IncidentSnapshot, type SnapshotNodeStatus } from './incidents/snapshot.js';
export { evaluateFix, FIX_CHECKS, type FixCheck, type FixCriterion } from './incidents/fix.js';
