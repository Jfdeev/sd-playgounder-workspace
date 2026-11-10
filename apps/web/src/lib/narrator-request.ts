import type { Design, Workload } from '@sdp/engine';
import { getProblem, type Problem } from '@sdp/problems';
import { isRecord, validateSubmittedDesign } from './gamification/design-validation';

/**
 * Corpo aceito por `POST /api/narrator` (relatório de segurança, itens 2 e 3): `design`, `workload` e,
 * dentro de um desafio, `problemId`. O `result` NÃO vem mais do navegador — o servidor recalcula com o
 * engine, então ninguém consegue gravar uma explicação falsa no cache compartilhado. Tudo validado e
 * limitado antes de qualquer trabalho (mesmos limites de design das submissões).
 */

export const WORKLOAD_LIMITS = { maxRps: 10_000_000, maxPayloadBytes: 1_000_000_000, maxPeakMultiplier: 100 } as const;

export type NarratorRequest = { design: Design; workload: Workload; problem: Problem | null };

function inRange(value: unknown, min: number, max: number, { exclusiveMin = false } = {}): value is number {
  return typeof value === 'number' && Number.isFinite(value) && (exclusiveMin ? value > min : value >= min) && value <= max;
}

export function parseWorkload(raw: unknown): Workload | null {
  if (!isRecord(raw)) return null;
  const { rps, readWriteRatio, payloadBytes, peakMultiplier } = raw;
  if (!inRange(rps, 0, WORKLOAD_LIMITS.maxRps, { exclusiveMin: true })) return null;
  if (!inRange(readWriteRatio, 0, 1)) return null;
  if (!inRange(payloadBytes, 0, WORKLOAD_LIMITS.maxPayloadBytes)) return null;
  if (!inRange(peakMultiplier, 0, WORKLOAD_LIMITS.maxPeakMultiplier, { exclusiveMin: true })) return null;
  return { rps, readWriteRatio, payloadBytes, peakMultiplier };
}

export function parseNarratorRequest(raw: unknown): { ok: true; request: NarratorRequest } | { ok: false; reason: string } {
  if (!isRecord(raw)) return { ok: false, reason: 'corpo inválido' };
  const design = validateSubmittedDesign(raw.design);
  if (!design.ok) return { ok: false, reason: design.reason };
  const workload = parseWorkload(raw.workload);
  if (!workload) return { ok: false, reason: 'carga inválida' };
  if (raw.problemId === undefined || raw.problemId === null) return { ok: true, request: { design: design.design, workload, problem: null } };
  const problem = typeof raw.problemId === 'string' ? getProblem(raw.problemId) : undefined;
  if (!problem) return { ok: false, reason: 'desafio desconhecido' };
  return { ok: true, request: { design: design.design, workload, problem } };
}

/** Chave do cache: o resultado depende do desafio (scores), então ele entra na chave junto do design + carga. */
export function narratorCacheKey(designHash: string, problem: Problem | null): string {
  return `${designHash}:${problem?.id ?? 'livre'}`;
}
