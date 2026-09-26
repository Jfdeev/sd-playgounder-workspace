import { describe, expect, it } from 'vitest';
import { ALL_KNOWLEDGE_IDS, isKnownKnowledgeId } from '../src/citation.js';
import { ARCHITECTURE_CHARACTERISTICS } from '../src/architecture-characteristic.js';
import { ARCHITECTURE_STYLES } from '../src/architecture-style.js';

describe('ALL_KNOWLEDGE_IDS / isKnownKnowledgeId', () => {
  it('tem exatamente as 7 dimensões + os 4 templates, sem duplicata', () => {
    expect(ALL_KNOWLEDGE_IDS.length).toBe(11);
    expect(new Set(ALL_KNOWLEDGE_IDS).size).toBe(11);
    expect(ALL_KNOWLEDGE_IDS).toEqual([...Object.keys(ARCHITECTURE_CHARACTERISTICS), ...Object.keys(ARCHITECTURE_STYLES)]);
  });

  it('isKnownKnowledgeId aceita todo id real', () => {
    for (const id of ALL_KNOWLEDGE_IDS) {
      expect(isKnownKnowledgeId(id)).toBe(true);
    }
  });

  it('isKnownKnowledgeId rejeita um id inventado', () => {
    expect(isKnownKnowledgeId('microkernel')).toBe(false);
    expect(isKnownKnowledgeId('')).toBe(false);
  });
});
