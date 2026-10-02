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
import { ALL_KNOWLEDGE_IDS, isKnownKnowledgeId } from '@sdp/knowledge';

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
    // M2.6, US4: `enum` restringe o próprio schema aos ids reais de packages/knowledge — mesmo
    // campo STRING de sempre, verificado no .d.ts instalado do SDK que `enum` é suportado
    // (research.md §1.6). Isso é só a primeira linha de defesa: o provedor pode devolver algo
    // fora do enum mesmo com responseSchema configurado, por isso parseNarratorExplanation abaixo
    // valida de novo em código.
    citation_id: {
      type: SchemaType.STRING,
      description:
        'id de uma ficha de packages/knowledge (dimensão de score ou template) genuinamente relevante ' +
        'pro resultado, se houver uma — nunca um id fora desta lista',
      enum: [...ALL_KNOWLEDGE_IDS],
    },
  },
  required: ['summary', 'bottleneck_explanation'],
};

export type NarratorExplanation = {
  summary: string;
  bottleneck_explanation: string;
  recommendation?: string;
  citation_id?: string;
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
  // FR-007: nunca aceita uma citação que não exista no conteúdo autorado — mesmo tratamento de
  // INVALID_RESPONSE de qualquer outra alucinação do narrador (o provedor pode ignorar o `enum`
  // do schema, então esta é a garantia real, não o schema).
  if (candidate.citation_id !== undefined && (typeof candidate.citation_id !== 'string' || !isKnownKnowledgeId(candidate.citation_id))) {
    return null;
  }

  return {
    summary: candidate.summary,
    bottleneck_explanation: candidate.bottleneck_explanation,
    ...(candidate.recommendation !== undefined ? { recommendation: candidate.recommendation as string } : {}),
    ...(candidate.citation_id !== undefined ? { citation_id: candidate.citation_id as string } : {}),
  };
}
