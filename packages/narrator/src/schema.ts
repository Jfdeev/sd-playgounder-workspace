/**
 * Schema de resposta estruturada do narrador — packages/narrator/src/schema.ts
 *
 * research.md §2: `responseSchema` nativo do Gemini (`generationConfig.responseMimeType:
 * 'application/json'` + `responseSchema`) — nenhum campo `NUMBER`/`INTEGER` no schema. É a
 * garantia mecânica de que nenhum CAMPO estruturado de saída do narrador é numérico (Constitution:
 * "nenhum número exibido pode ter origem em LLM") — os números exibidos na UI continuam vindo só
 * de `SimulationResult`.
 */

import { SchemaType, type Schema } from '@google/generative-ai';

export const EXPLAIN_RESULT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING, description: '1-2 frases resumindo o resultado' },
    bottleneck_explanation: {
      type: SchemaType.STRING,
      description: 'por que este nó é o gargalo, em linguagem natural',
    },
    recommendation: {
      type: SchemaType.STRING,
      description: 'uma sugestão textual de melhoria, sem propor um número específico de réplicas',
    },
  },
  required: ['summary', 'bottleneck_explanation'],
};

export type NarratorExplanation = {
  summary: string;
  bottleneck_explanation: string;
  recommendation?: string;
};

/**
 * Valida a resposta bruta (já parseada de JSON) contra o shape esperado — nunca confia
 * cegamente no que o provedor devolveu, mesmo com `responseSchema` configurado (o provedor pode
 * falhar em obedecer, ou devolver algo que não é JSON válido antes mesmo de chegar aqui).
 * `null` = resposta inválida; quem chama (Route Handler) trata isso como `INVALID_RESPONSE`,
 * nunca inventa uma explicação no lugar.
 */
export function parseNarratorExplanation(raw: unknown): NarratorExplanation | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.summary !== 'string' || candidate.summary.length === 0) return null;
  if (typeof candidate.bottleneck_explanation !== 'string' || candidate.bottleneck_explanation.length === 0) {
    return null;
  }
  if (candidate.recommendation !== undefined && typeof candidate.recommendation !== 'string') return null;

  return {
    summary: candidate.summary,
    bottleneck_explanation: candidate.bottleneck_explanation,
    ...(candidate.recommendation !== undefined ? { recommendation: candidate.recommendation as string } : {}),
  };
}
