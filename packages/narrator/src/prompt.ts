/**
 * Prompt do narrador — packages/narrator/src/prompt.ts
 *
 * Recebe só `SimulationResult` — nunca `Design`/`Workload` brutos (contracts/narrator-contract.md
 * Regra 2, `docs/product-context.md` §3: "o LLM é narrador, nunca juiz"). Todo número citado no
 * prompt já veio do engine; o modelo nunca recebe dado suficiente pra inventar uma métrica que não
 * exista em `result`.
 */

import type { Dimension, SimulationResult, ViolationType } from '@sdp/engine';
import { ARCHITECTURE_CHARACTERISTICS, type ArchitectureCharacteristic } from '@sdp/knowledge';

/**
 * Versão do prompt — M2.6, research.md §1.6. Incrementar sempre que `buildNarratorPrompt` mudar
 * de forma que uma explicação já cacheada (por `hashDesign`) deixe de refletir o prompt atual —
 * evita servir uma explicação de antes de US4 (sem bloco de citação) pro mesmo design/workload
 * depois do deploy.
 */
export const NARRATOR_PROMPT_VERSION = 2;

/** Mesmo limiar que já pinta a barra vermelha no `ScorePanel` (`apps/web/src/lib/canvas-ui-catalog.ts`). */
const SCORE_CITATION_THRESHOLD = 40;

/** Só `spof` tem uma característica claramente relacionada hoje (research.md §1.6) — os outros
 *  tipos de violação (orphan-node, cycle, ...) não mapeiam pra uma dimensão específica. */
const VIOLATION_TO_DIMENSION: Partial<Record<ViolationType, Dimension>> = {
  spof: 'disponibilidade',
};

/**
 * Seleciona as fichas de `@sdp/knowledge` relevantes pro resultado — nunca lê `Design`/`Workload`
 * (só `SimulationResult`, Contract Rule 2). Uma violação mapeada ou uma dimensão com score baixo
 * disparam a ficha correspondente; nada além disso.
 */
export function selectRelevantKnowledge(result: SimulationResult): ArchitectureCharacteristic[] {
  const dimensions = new Set<Dimension>();

  for (const violation of result.violations) {
    const dimension = VIOLATION_TO_DIMENSION[violation.type];
    if (dimension) dimensions.add(dimension);
  }

  for (const [dimension, value] of Object.entries(result.scores) as [Dimension, number][]) {
    if (value < SCORE_CITATION_THRESHOLD) dimensions.add(dimension);
  }

  return [...dimensions].map((dimension) => ARCHITECTURE_CHARACTERISTICS[dimension]);
}

function formatKnowledgeContext(result: SimulationResult): string {
  const characteristics = selectRelevantKnowledge(result);
  if (characteristics.length === 0) return '';

  const entries = characteristics
    .map((c) => `- id "${c.dimension}" (${c.label}): ${c.definition} Fonte: ${c.source.book}, ${c.source.author}.`)
    .join('\n');

  return [
    '',
    'Contexto adicional — cite no campo citation_id só se genuinamente relevante, usando o id',
    'exato entre aspas de uma das fichas abaixo. Nunca cite um id que não esteja nesta lista:',
    entries,
  ].join('\n');
}

function formatNodesSummary(result: SimulationResult): string {
  const entries = Object.entries(result.nodes);
  if (entries.length === 0) return '(nenhum nó no design)';

  return entries
    .map(([nodeId, node]) => `- ${nodeId}: utilização ${(node.utilization * 100).toFixed(0)}%, status ${node.status}`)
    .join('\n');
}

function formatViolationsSummary(result: SimulationResult): string {
  if (result.violations.length === 0) return 'Nenhuma violação estrutural.';
  return result.violations.map((violation) => `- ${violation.type}: ${violation.message}`).join('\n');
}

export function buildNarratorPrompt(result: SimulationResult): string {
  return [
    'Você é um narrador técnico que explica o resultado de uma simulação de arquitetura de sistemas.',
    'Explique em português, de forma clara e objetiva, por que o resultado foi este — nunca invente',
    'nenhum número: cite apenas os valores já fornecidos abaixo, nunca um valor novo.',
    '',
    `Throughput: ${result.path.throughputRps.toFixed(0)} rps`,
    `Gargalo: ${result.path.bottleneckId ?? 'nenhum'}`,
    `Latência p50/p95/p99: ${result.path.latency.p50.toFixed(1)}/${result.path.latency.p95.toFixed(1)}/${result.path.latency.p99.toFixed(1)} ms`,
    `Custo mensal: $${result.cost.monthlyTotal}`,
    '',
    'Nós:',
    formatNodesSummary(result),
    '',
    'Violações:',
    formatViolationsSummary(result),
    formatKnowledgeContext(result),
  ].join('\n');
}
