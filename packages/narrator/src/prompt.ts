/**
 * Prompt do narrador — packages/narrator/src/prompt.ts
 *
 * Recebe só `SimulationResult` — nunca `Design`/`Workload` brutos (contracts/narrator-contract.md
 * Regra 2, `docs/product-context.md` §3: "o LLM é narrador, nunca juiz"). Todo número citado no
 * prompt já veio do engine; o modelo nunca recebe dado suficiente pra inventar uma métrica que não
 * exista em `result`.
 */

import type { SimulationResult } from '@sdp/engine';

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
  ].join('\n');
}
