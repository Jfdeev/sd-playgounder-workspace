import { ARCHITECTURE_CHARACTERISTICS } from './architecture-characteristic.js';
import { ARCHITECTURE_STYLES } from './architecture-style.js';

/**
 * Todo id de ficha válido — as 7 `Dimension` mais os 4 `TemplateId`. Usado pra validar qualquer
 * citação (ex. `citation_id` do narrador, M2.6 US4) contra o conteúdo real, nunca uma string
 * inventada (FR-007).
 */
export const ALL_KNOWLEDGE_IDS: readonly string[] = [
  ...Object.keys(ARCHITECTURE_CHARACTERISTICS),
  ...Object.keys(ARCHITECTURE_STYLES),
];

export function isKnownKnowledgeId(id: string): boolean {
  return ALL_KNOWLEDGE_IDS.includes(id);
}
