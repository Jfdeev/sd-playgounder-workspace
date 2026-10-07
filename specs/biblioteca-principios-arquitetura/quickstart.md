# Quickstart: M2.7 — Biblioteca de princípios de arquitetura

Verificação por user story — mesmo padrão dos marcos anteriores: `apps/web` não testa componente React
(convenção de M0.5), então a parte de UI é conferida no browser; dados e lógica pura têm teste.

**Verificado de ponta a ponta em 2026-10-07** (login via conta de teste throwaway criada e apagada na
mesma sessão) — US1/US2/US3/US4, busca e não-regressão confirmados. Achou e corrigiu 1 bug (busca por
"solid" vazia — tasks.md, achado da verificação manual).

## Pré-requisito

```bash
pnpm install
pnpm --filter web dev
```

Login em `/entrar` (qualquer conta). A biblioteca fica em `/app/biblioteca`, filha do layout autenticado.

## Checagens automáticas (todas as USs)

```bash
pnpm -r test
pnpm -r exec tsc --noEmit
pnpm --filter web build
```

`knowledge` (invariantes da lista), `problems` (links de dica resolvem) e `web` (filtro de busca)
cobrem a parte lógica.

## US1 — Abrir um princípio de Clean Architecture / SOLID (P1)

1. Abrir `/app/biblioteca` sem nenhum desafio ativo.
2. Na categoria *Clean Architecture*, abrir "Princípio da Responsabilidade Única (SRP)".
3. **Esperado**: definição, fonte (*Clean Architecture*, Robert C. Martin) e a relação com a
   topologia ("analogia" + nota).
4. Abrir LSP e ISP: **esperado** a indicação explícita "nenhuma" (nível de código), sem analogia
   forçada.
5. Conferir que os 5 SOLID aparecem.

## US2 — Características além das 7 dimensões (P2)

1. Categoria *Características de arquitetura*: abrir "Recuperabilidade".
2. **Esperado**: definição, fonte (*Fundamentals of Software Architecture*), e a nota de que a
   plataforma não calcula a característica.
3. Conferir que nenhuma das 7 dimensões (escalabilidade, disponibilidade, …) aparece na lista.

## US3 — Padrões do Fowler como leitura (P3)

1. Categoria *PoEAA*: abrir "Repository". **Esperado**: definição, fonte, "leitura recomendada".
2. Abrir o menu de componentes do canvas: **esperado** nenhum componente novo.

## US4 — De uma dica à biblioteca (P4)

1. Abrir o desafio "Encurtador de URL" → Dicas → "Por que separar Cache e Store…".
2. **Esperado**: link "Ler na biblioteca" que abre `/app/biblioteca?entry=srp` com o SRP aberto.
3. Abrir uma dica sem princípio ligado (ex. "Por que meu p99…"): **esperado** nenhum link.

## Busca (SC-003)

Digitar "solid" ou "lock" no campo de busca: a lista filtra; um termo sem resultado mostra o estado
vazio. Qualquer entrada deve ser alcançável em até 3 interações a partir do app.

## Não-regressão (FR-009, SC-004/005)

Para um mesmo design, o resultado do engine e o texto do narrador não mudam; `NARRATOR_PROMPT_VERSION`
continua igual; o catálogo de componentes do canvas não ganha item.
