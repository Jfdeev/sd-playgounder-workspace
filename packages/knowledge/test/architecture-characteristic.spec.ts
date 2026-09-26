import { describe, expect, it } from 'vitest';
import { ALL_DIMENSIONS } from '@sdp/engine';
import { ARCHITECTURE_CHARACTERISTICS } from '../src/architecture-characteristic.js';
import { CLEAN_ARCHITECTURE, FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE, PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE } from '../src/source.js';

const KNOWN_SOURCES = [
  CLEAN_ARCHITECTURE,
  FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
];

describe('ARCHITECTURE_CHARACTERISTICS', () => {
  it('tem exatamente uma ficha por Dimension existente no engine (FR-001)', () => {
    for (const dimension of ALL_DIMENSIONS) {
      expect(ARCHITECTURE_CHARACTERISTICS[dimension]).toBeDefined();
      expect(ARCHITECTURE_CHARACTERISTICS[dimension].dimension).toBe(dimension);
    }
    expect(Object.keys(ARCHITECTURE_CHARACTERISTICS).sort()).toEqual([...ALL_DIMENSIONS].sort());
  });

  it.each(ALL_DIMENSIONS)('%s: definição não-vazia e fonte é uma das 3 obras reais (FR-004)', (dimension) => {
    const characteristic = ARCHITECTURE_CHARACTERISTICS[dimension];
    expect(characteristic.definition.length).toBeGreaterThan(0);
    expect(KNOWN_SOURCES).toContain(characteristic.source);
  });

  it.each(ALL_DIMENSIONS)('%s: pelo menos 1 trade-off nomeado contra outra dimensão (FR-001)', (dimension) => {
    const characteristic = ARCHITECTURE_CHARACTERISTICS[dimension];
    expect(characteristic.tradeoffs.length).toBeGreaterThanOrEqual(1);
    for (const tradeoff of characteristic.tradeoffs) {
      expect(tradeoff.against).not.toBe(dimension);
      expect(ALL_DIMENSIONS).toContain(tradeoff.against);
      expect(tradeoff.explanation.length).toBeGreaterThan(0);
    }
  });
});
