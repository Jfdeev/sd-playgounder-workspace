# Quickstart: M2.6 — Fundamentos de arquitetura

Verificação manual por user story, mesmo padrão já usado em M1/M1.5/M2 — `apps/web` não testa
componentes React por unit test (convenção de M0.5), então US1/US2 são confirmadas no browser.
US3/US4 têm uma parte de unit test (conteúdo/seleção) e uma parte manual (ver a citação renderizada).

**Verificado de ponta a ponta em 2026-09-27** (login via conta de teste throwaway criada e apagada
na mesma sessão) — US1/US2/US3/US4 confirmados funcionando com dados reais (Neon live, Gemini
real). Achou e corrigiu 1 bug real no processo (narrador 500-ava em qualquer design saturado —
tasks.md, achado 3) e encontrou 1 problema em aberto que precisa de decisão do autor: o timeout de
5s do narrador (`NARRATOR_TIMEOUT_MS`, M2) é curto demais na prática pra `gemini-2.5-flash` com
`responseSchema` (~5.8s medido) — ver tasks.md, achado 4, antes de repetir esta verificação.

## Pré-requisito

Migração `0003_regular_prowler.sql` (coluna `citationId`) **já aplicada ao Neon live em
2026-09-27** (`pnpm --filter web db:migrate`, a pedido do autor).

```bash
pnpm --filter web dev
```

Login manual necessário pra chegar em `/app` (mesma limitação já registrada em M2 — sem sessão de
browser autenticada disponível pro agente; author confirma isso manualmente).

## US1 — Entender uma dimensão de score (P1)

1. Submeter (ou simular) qualquer problema até ver o `ScorePanel` com as 7 barras.
2. Clicar no botão "?" ao lado de "Disponibilidade".
3. **Esperado**: abre `CharacteristicSheet` com definição, fonte (*Fundamentals of Software
   Architecture*, Richards & Ford) e pelo menos 1 trade-off nomeado (ex. contra Custo).
4. Repetir pras outras 6 dimensões — nenhuma abre vazia.

## US2 — Entender um estilo de arquitetura (P2)

1. Abrir o dropdown "Templates" na `ChallengeTopBar`.
2. Clicar no botão "?" ao lado de "Microsserviços".
3. **Esperado**: abre `StyleSheet` com quando usar, trade-offs, fonte (mesma obra). Confirmar que a
   nota de leitura sobre PoEAA aparece como texto complementar, não como o campo de fonte principal.
4. Repetir pros outros 3 templates.

## US3 — Receber uma dica sobre responsabilidade e acoplamento (P3)

1. `pnpm --filter problems test hints-source` — confirma automaticamente que os 3 problemas têm
   >= 1 hint com `source`, e que todo `source` é uma das 3 constantes reais.
2. Manual: abrir as dicas do problema "Encurtador de URL" no canvas, confirmar que a dica nova
   aparece e cita *Clean Architecture* (Robert C. Martin) no texto.

## US4 — O narrador cita um princípio ao explicar (P4)

Gate de governança resolvido pelo autor (2026-09-26) — implementado sem esperar M2 chegar a `Done`
(ver product-context.md, "Ordem fora de sequência"). Consequência: a verificação de 20 submissões
consecutivas do M2, quando feita, precisa usar o prompt atual (`NARRATOR_PROMPT_VERSION`), não o de
M2 original.

1. `pnpm --filter narrator test` — confirma automaticamente: `selectRelevantKnowledge` seleciona a
   ficha certa por violação (`spof` → Disponibilidade) e por score baixo (< 40), e retorna `[]`
   quando nada é relevante; `parseNarratorExplanation` rejeita qualquer `citation_id` fora do enum
   conhecido; `hashDesign` com `promptVersion` diferente produz hash diferente pro mesmo
   design/workload.
2. Manual (precisa de `GEMINI_API_KEY` real, mesma limitação de M2): submeter um design com SPOF ou
   com uma dimensão de score baixo, abrir a explicação do narrador, confirmar que se houver
   `citation_id` ele corresponde a uma ficha real (nunca um erro silencioso) e que a UI mostra
   "Princípio citado" com a fonte atribuída (`narrator-panel.tsx`).

## Checagens de todo o marco (Polish)

```bash
pnpm -r test
pnpm -r exec tsc --noEmit
pnpm --filter web build
```

`pnpm -r test` cobre `packages/engine` também: `ALL_DIMENSIONS` passou a ser reexportado por
`packages/engine/src/index.ts` (research.md/tasks.md, achado durante a implementação) — uma
mudança de superfície pública pequena, mas real, então os testes do engine (e do narrator, que
depende dele) precisam rodar de novo, não só o `typecheck`. `no-runtime-deps.spec.ts` (guarda de
fronteira) não precisa de novo padrão proibido — nenhuma dependência nova entrou no engine.
