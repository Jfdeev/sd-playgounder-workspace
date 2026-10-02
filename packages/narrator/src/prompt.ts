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
 * depois do deploy. Também é incrementada quando o engine passa a devolver números diferentes pro
 * mesmo (Design, Workload) — v3: correção de throughput/gargalo e do limiar de cauda do cache
 * (2026-10-02), senão o cache serviria uma explicação que contradiz o resultado atual.
 */
export const NARRATOR_PROMPT_VERSION = 3;

/** Mesmo limiar que já pinta a barra vermelha no `ScorePanel` (`apps/web/src/lib/canvas-ui-catalog.ts`). */
const SCORE_CITATION_THRESHOLD = 40;

/** Só `spof` tem uma característica claramente relacionada hoje (research.md §1.6) — os outros
 *  tipos de violação (orphan-node, cycle, ...) não mapeiam pra uma dimensão específica. */
const VIOLATION_TO_DIMENSION: Partial<Record<ViolationType, Dimension>> = {
  spof: 'disponibilidade',
};

/**
 * `latencia`/`custo` MUST ficar fora do gatilho por score baixo (achado do advisor durante
 * `/speckit-plan`, aplicado no `/speckit-implement`): fora de um desafio (sandbox/"Simular" sem
 * `scoreContext`), `calculateScores` retorna 0 pra essas duas dimensões por construção — 0 aí
 * significa "não aplicável" (sem orçamento de referência), nunca "ruim" (`packages/engine/src/
 * scores/calculate.ts`, `latencyScore`/`costScore`). `SimulationResult` não distingue as duas
 * situações (nenhum campo diz se havia `scoreContext`), então o narrador não tem como saber —
 * citar a ficha de Custo/Latência num sandbox seria apontar um problema que não existe.
 */
const SCORE_TRIGGER_DIMENSIONS: readonly Dimension[] = [
  'escalabilidade',
  'disponibilidade',
  'consistencia',
  'complexidade_operacional',
  'seguranca',
];

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

  for (const dimension of SCORE_TRIGGER_DIMENSIONS) {
    if (result.scores[dimension] < SCORE_CITATION_THRESHOLD) dimensions.add(dimension);
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

/**
 * `PathResult.latency.p50/p95/p99` é tipado como `number`, e o engine propaga `Infinity` de
 * propósito quando um nó do caminho está saturado (`packages/engine/src/index.ts`, comentário
 * sobre `queueLatencyMs = Infinity`). `Infinity` é um `number` válido em JS, mas não sobrevive a
 * `JSON.stringify`/`JSON.parse` — vira `null` na travessia HTTP client → `POST /api/narrator`
 * (achado ao verificar US4 manualmente no browser: um design saturado gerava
 * `TypeError: Cannot read properties of null (reading 'toFixed')` aqui). Trata `null` e qualquer
 * valor não-finito (`Infinity` chegaria assim se algum dia o transporte mudasse) da mesma forma —
 * nunca chama `.toFixed` num valor que não é um número finito real.
 */
function formatLatencySummary(latency: { p50: number; p95: number; p99: number }): string {
  // Infinity propaga igualmente pros 3 percentis quando o nó saturado está no caminho (a mesma
  // fórmula soma o mesmo termo infinito em cada um) — daí checar só p50 pra decidir o formato da
  // linha inteira, em vez de formatar cada percentil separadamente.
  if (!Number.isFinite(latency.p50)) return 'saturado (fila infinita)';
  return `${latency.p50.toFixed(1)}/${latency.p95.toFixed(1)}/${latency.p99.toFixed(1)} ms`;
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
    `Latência p50/p95/p99: ${formatLatencySummary(result.path.latency)}`,
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
