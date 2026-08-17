/**
 * Tipos centrais do catálogo de problemas — packages/problems/src/types.ts
 *
 * Fonte: specs/canvas-submissao-m1/data-model.md, docs/foundational-doc.md §2.1 (partes
 * 1/3/4/5 — enunciado, requisitos funcionais, requisitos não-funcionais, escala). As demais
 * partes da anatomia completa (fase de clarificação, rubrica escondida, solução de referência)
 * são escopo de M2 — não existem neste tipo.
 *
 * Pacote puro: nenhum tipo aqui depende de React, DOM ou Node.
 */

export type ProblemScale = {
  /** Usuários ativos por dia. */
  dau: number;
  /** Requisições médias por usuário ativo por dia (leitura + escrita combinadas). */
  requestsPerUserPerDay: number;
  /** 0..1, fração de leitura — mesmo shape de Workload.readWriteRatio do engine. */
  readWriteRatio: number;
  /** Tamanho médio de payload por requisição, em bytes. */
  avgPayloadBytes: number;
  /** Multiplicador de pico sobre a carga média. */
  peakMultiplier: number;
};

export type Problem = {
  id: string;
  title: string;
  /** Anatomia §2.1 parte 1 — enunciado curto e ambíguo de propósito. */
  statement: string;
  /** Anatomia §2.1 parte 3. */
  functionalRequirements: string[];
  /** Anatomia §2.1 parte 4 — SLA de latência, disponibilidade, consistência, budget. */
  nonFunctionalRequirements: string[];
  /** Anatomia §2.1 parte 5. */
  scale: ProblemScale;
};
