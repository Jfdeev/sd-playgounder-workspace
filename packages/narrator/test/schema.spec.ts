import { describe, expect, it } from 'vitest';
import { SchemaType, type Schema } from '@google/generative-ai';
import { EXPLAIN_RESULT_SCHEMA, parseNarratorExplanation } from '../src/schema.js';

/** Percorre um Schema recursivamente coletando todo `type` encontrado (properties + items). */
function collectSchemaTypes(schema: Schema): SchemaType[] {
  const types: SchemaType[] = schema.type !== undefined ? [schema.type] : [];
  if (schema.properties) {
    for (const propSchema of Object.values(schema.properties)) {
      types.push(...collectSchemaTypes(propSchema));
    }
  }
  if (schema.items) types.push(...collectSchemaTypes(schema.items));
  return types;
}

describe('EXPLAIN_RESULT_SCHEMA', () => {
  it('nenhum campo do schema é NUMBER ou INTEGER — garantia mecânica de "nenhum número do LLM"', () => {
    const types = collectSchemaTypes(EXPLAIN_RESULT_SCHEMA);
    expect(types).not.toContain(SchemaType.NUMBER);
    expect(types).not.toContain(SchemaType.INTEGER);
  });

  it('exige summary e bottleneck_explanation; recommendation é opcional', () => {
    expect(EXPLAIN_RESULT_SCHEMA.required).toEqual(['summary', 'bottleneck_explanation']);
    expect(Object.keys(EXPLAIN_RESULT_SCHEMA.properties ?? {})).toContain('recommendation');
  });
});

describe('parseNarratorExplanation', () => {
  it('aceita uma resposta válida completa', () => {
    const result = parseNarratorExplanation({
      summary: 'resumo',
      bottleneck_explanation: 'explicação',
      recommendation: 'sugestão',
    });
    expect(result).toEqual({ summary: 'resumo', bottleneck_explanation: 'explicação', recommendation: 'sugestão' });
  });

  it('aceita uma resposta válida sem o campo opcional recommendation', () => {
    const result = parseNarratorExplanation({ summary: 'resumo', bottleneck_explanation: 'explicação' });
    expect(result).toEqual({ summary: 'resumo', bottleneck_explanation: 'explicação' });
  });

  it('rejeita quando summary está ausente', () => {
    expect(parseNarratorExplanation({ bottleneck_explanation: 'explicação' })).toBeNull();
  });

  it('rejeita quando bottleneck_explanation está ausente', () => {
    expect(parseNarratorExplanation({ summary: 'resumo' })).toBeNull();
  });

  it('rejeita summary vazio', () => {
    expect(parseNarratorExplanation({ summary: '', bottleneck_explanation: 'explicação' })).toBeNull();
  });

  it('rejeita quando recommendation não é string', () => {
    expect(
      parseNarratorExplanation({ summary: 'resumo', bottleneck_explanation: 'explicação', recommendation: 42 }),
    ).toBeNull();
  });

  it('rejeita null, array e primitivos', () => {
    expect(parseNarratorExplanation(null)).toBeNull();
    expect(parseNarratorExplanation([])).toBeNull();
    expect(parseNarratorExplanation('texto solto')).toBeNull();
    expect(parseNarratorExplanation(42)).toBeNull();
  });
});
