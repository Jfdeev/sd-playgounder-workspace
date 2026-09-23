/**
 * Conversão de escala de problema para Workload — packages/problems/src/workload.ts
 *
 * Movido de `apps/web/src/lib/canvas-to-design.ts` (M2, Foundational) — a conversão só depende de
 * `Problem`/`ProblemScale`, tipos que este pacote já possui; morava em `apps/web` por conveniência
 * histórica de M1, mas isso impedia testes puros de `packages/problems` (ex. validar a
 * `referenceSolution` contra a escala oficial, M2 US3) de usá-la sem importar `apps/web` — a
 * direção errada de dependência no monorepo (`apps/web` depende de `@sdp/problems`, nunca o
 * contrário). `apps/web/src/lib/canvas-to-design.ts` agora só reexporta esta função — nenhum
 * ponto de chamada existente precisou mudar.
 */

import type { Workload } from '@sdp/engine';
import type { Problem } from './types.js';

/**
 * Traduz a escala do problema para o Workload que o engine consome — conversão DAU → RPS
 * (research.md §5 de M1). Determinística: mesmo Problem, mesmo Workload, sempre.
 */
export function toWorkload(problem: Problem): Workload {
  const { dau, requestsPerUserPerDay, readWriteRatio, avgPayloadBytes, peakMultiplier } = problem.scale;
  const averageRps = (dau * requestsPerUserPerDay) / 86_400;

  return {
    rps: averageRps * peakMultiplier,
    readWriteRatio,
    payloadBytes: avgPayloadBytes,
    peakMultiplier,
  };
}
