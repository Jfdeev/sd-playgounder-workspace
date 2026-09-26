import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_STYLES, type TemplateId } from '../src/architecture-style.js';
import { CLEAN_ARCHITECTURE, FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE, PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE } from '../src/source.js';

const KNOWN_SOURCES = [
  CLEAN_ARCHITECTURE,
  FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
];

const ALL_TEMPLATE_IDS: readonly TemplateId[] = ['monolith', 'three-tier', 'microservices', 'event-driven'];

describe('ARCHITECTURE_STYLES', () => {
  it('tem exatamente uma ficha por TemplateId (FR-002)', () => {
    for (const templateId of ALL_TEMPLATE_IDS) {
      expect(ARCHITECTURE_STYLES[templateId]).toBeDefined();
      expect(ARCHITECTURE_STYLES[templateId].templateId).toBe(templateId);
    }
    expect(Object.keys(ARCHITECTURE_STYLES).sort()).toEqual([...ALL_TEMPLATE_IDS].sort());
  });

  it.each(ALL_TEMPLATE_IDS)('%s: quando-usar não-vazio e fonte é uma das 3 obras reais (FR-004)', (templateId) => {
    const style = ARCHITECTURE_STYLES[templateId];
    expect(style.whenToUse.length).toBeGreaterThan(0);
    expect(KNOWN_SOURCES).toContain(style.source);
  });

  it.each(ALL_TEMPLATE_IDS)('%s: pelo menos 1 trade-off (FR-002)', (templateId) => {
    expect(ARCHITECTURE_STYLES[templateId].tradeoffs.length).toBeGreaterThanOrEqual(1);
  });
});
