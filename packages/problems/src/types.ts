/**
 * Tipos centrais do catálogo de problemas — packages/problems/src/types.ts
 *
 * Fonte: specs/canvas-submissao-m1/data-model.md, docs/foundational-doc.md §2.1 (partes
 * 1/3/4/5 — enunciado, requisitos funcionais, requisitos não-funcionais, escala; parte 6 —
 * rubrica — decisão do autor abaixo).
 *
 * **Rubrica à mostra (contra a recomendação original)**: `foundational-doc.md` §2.1 parte 6
 * descreve rubrica *escondida* ("o usuário precisa aprender a perguntar"), e o plano original de
 * M1/M1.5 tratava rubrica como escopo de M2. O autor pediu explicitamente um checklist de
 * critérios visível (igual ao site de inspiração `sdplayground.vercel.app`), pra alimentar o
 * card de desafio no canto inferior esquerdo e a progressão bloqueada entre desafios — decisão
 * tomada nesta sessão, registrada aqui porque contradiz o texto de `foundational-doc.md` e a nota
 * anterior deste arquivo. Cada critério é uma função pura sobre `SimulationResult` (nunca
 * recalcula uma métrica — só compara um valor que o engine já produziu contra um limiar
 * autorado), então não fere Constitution I/VII; o conjunto de critérios pass/fail nunca vira uma
 * nota única (Constitution V) — não existe campo de "score do desafio" em lugar nenhum aqui.
 *
 * Pacote impuro em relação a tipos (depende de `@sdp/engine` para tipar os critérios da rubrica),
 * mas continua sem depender de React/DOM/Node em tempo de execução — só dado versionado e funções
 * puras.
 */

import type { Design, SimulationResult } from '@sdp/engine';

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

/**
 * Um critério de rubrica — checklist visível no card de desafio (canto inferior esquerdo).
 * `evaluate` é uma função pura: lê `SimulationResult`/`Design` (já calculados por `simulate()`) e
 * devolve pass/fail — nunca deriva um número novo, só compara o que o engine já produziu.
 */
export type RubricCriterion = {
  id: string;
  /** Texto curto exibido no checklist, ex. "Usa uma camada de cache". */
  label: string;
  evaluate: (result: SimulationResult, design: Design) => boolean;
};

/** Uma dica estática — texto autorado, nunca gerado por LLM (fora de escopo até M2/narrador). */
export type Hint = {
  id: string;
  /** Pergunta/gatilho curto mostrado antes de revelar (ex. "Por que meu p99 está tão alto?"). */
  prompt: string;
  /** Texto completo da dica, revelado sob demanda. */
  body: string;
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
  /** Anatomia §2.1 parte 6 — à mostra nesta sessão (ver comentário do módulo), não escondida. */
  rubric: RubricCriterion[];
  /** Sistema de dicas estáticas (texto autorado) — educativo, não gerado por IA. */
  hints: Hint[];
};

/** Um desafio passa quando TODOS os critérios da rubrica passam — usado pra progressão travada. */
export function isProblemSolved(problem: Problem, result: SimulationResult, design: Design): boolean {
  return problem.rubric.every((criterion) => criterion.evaluate(result, design));
}
