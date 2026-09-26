/**
 * API pública do narrador — packages/narrator/src/index.ts
 *
 * Puramente dados + funções puras (schema, prompt, hash de cache) — nenhuma chamada de rede
 * acontece aqui. Quem efetivamente chama a API do Gemini é `apps/web/src/app/api/narrator/route.ts`
 * (plan.md, Structure Decision) — mantém este pacote 100% testável sem rede.
 */

export { hashDesign } from './design-hash.js';
export { EXPLAIN_RESULT_SCHEMA, parseNarratorExplanation, type NarratorExplanation } from './schema.js';
export { buildNarratorPrompt, selectRelevantKnowledge, NARRATOR_PROMPT_VERSION } from './prompt.js';
