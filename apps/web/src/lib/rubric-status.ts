import type { Design, SimulationResult } from '@sdp/engine';
import type { RubricCriterion } from '@sdp/problems';

/** De onde veio o último resultado no canvas: "Submeter" (escala do desafio) ou "Simular" (carga livre). */
export type SimulationRunKind = 'submit' | 'simulate';

export type LastRun = { kind: SimulationRunKind | null; result: SimulationResult | null; design: Design | null };

/**
 * Status de um critério no card do desafio. Só um "Submeter" verifica a rubrica: "Simular" roda com carga
 * livre (e de novo a cada mudança no canvas), então pintar o card com ele mostrava tudo ✓ sem nada ter
 * sido submetido nem creditado (ajustes gerais, 2026-11-05).
 */
export function criterionStatus(criterion: RubricCriterion, run: LastRun): 'pass' | 'fail' | 'unchecked' {
  if (run.kind !== 'submit' || !run.result || !run.design) return 'unchecked';
  return criterion.evaluate(run.result, run.design) ? 'pass' : 'fail';
}
