# Tasks: M2.7 — Biblioteca de princípios de arquitetura

**Input**: spec.md, plan.md, research.md, data-model.md, quickstart.md, content-draft.md
(`specs/biblioteca-principios-arquitetura/`)

**Gate de conteúdo (FR-006)**: nenhuma definição vira código antes de o autor revisar/aprovar o
trecho correspondente de `content-draft.md`. A aprovação pode ser **por categoria** — por isso o
conteúdo está em três tarefas separadas (T007 Clean Architecture, T013 características de Richards &
Ford, T015 padrões do Fowler), e o MVP só precisa da primeira. Tudo que não é conteúdo (tipos,
validação, testes, rota, busca, ligação das dicas) **não** depende da aprovação e pode andar já.

**Estrutura de arquivos (refinamento do plan.md)**: as 39 entradas ficam em três arquivos por
categoria sob `packages/knowledge/src/library/` (um por gate de aprovação), agregados por
`library.ts` — permite aprovar e commitar uma categoria de cada vez sem tocar nas outras.

## Phase 1: Setup

Nenhuma dependência nova, nenhuma migração, nenhuma API.

- [x] T001 Confirmar a base: `pnpm -r test` e `pnpm -r exec tsc --noEmit` verdes na branch (baseline
      para provar FR-009 — engine, narrador e `NARRATOR_PROMPT_VERSION` intocados)

## Phase 2: Foundational (bloqueia todas as user stories)

- [x] T002 Criar `packages/knowledge/src/library.ts` — tipos `LibraryCategory`, `TopologyRelation`,
      `LibraryEntry` (data-model.md), `LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string>`,
      `LIBRARY_ENTRIES` (agrega os três arquivos de categoria; vazio por ora) e
      `getLibraryEntry(id)`; reexportar em `packages/knowledge/src/index.ts`
- [x] T003 Em `packages/knowledge/src/library.ts`, adicionar
      `validateLibraryEntries(entries): string[]` (pura; devolve as violações dos invariantes de
      data-model.md: id único; `source` é uma das 3 constantes por identidade; Clean Architecture ⇒
      `topology` com `note` não vazia; as outras categorias ⇒ `platformNote`; nenhum id coincide com
      uma `Dimension`; `definition` não vazia)
- [x] T004 [P] Escrever `packages/knowledge/test/library.spec.ts` — (a) **fixtures inline inválidas**,
      uma por invariante, provando que `validateLibraryEntries` acusa cada violação (senão o teste passa
      no vácuo); (b) `LIBRARY_ENTRIES` validada devolve `[]`; (c) o conjunto de ids é **exatamente** o
      inventário aprovado de `research.md` §1 (lista literal no teste: 9 `clean-architecture`, 19
      `architecture-characteristics`, 11 `poeaa`) — protege contra remoção ou adição silenciosa; (d) os
      cinco SOLID (`srp`, `ocp`, `lsp`, `isp`, `dip`) existem (FR-003); (e) `getLibraryEntry` devolve a
      entrada certa e `undefined` para id inexistente. **(c) e (d) só ficam verdes depois de T007/T013/
      T015** — até lá, marcar o teste do inventário por categoria já aprovada
- [x] T005 [P] Criar `apps/web/src/lib/library-search.ts` — `filterLibraryEntries(entries, query)`
      pura: casa por nome e por id, sem acento, sem diferenciar maiúsculas; `query` vazia devolve tudo;
      sem resultado devolve `[]`; e escrever `apps/web/test/library-search.spec.ts` (acento, caixa, id,
      vazio, sem resultado)
- [x] T006 [P] Em `packages/problems/src/types.ts`: `Hint.libraryEntryId?: string` (opcional,
      retrocompatível, ao lado do `source?` do M2.6)

## Phase 3: US1 — Abrir um princípio de Clean Architecture / SOLID (P1) 🎯 MVP

**Goal**: abrir a biblioteca sem desafio ativo e ler um princípio com definição, fonte e relação com a
topologia. **Independent Test**: quickstart.md §US1.

- [x] T007 [US1] ⚠️ **Só após a aprovação do autor desta categoria.** Criar
      `packages/knowledge/src/library/clean-architecture.ts` com as 9 entradas **literais** de
      `content-draft.md` §1 (SRP, OCP, LSP, ISP, DIP, Regra de Dependência, Fronteiras, banco é um
      detalhe, frameworks são detalhes), cada uma com `topology` (`analogia` | `nenhuma` + nota) e
      `source: CLEAN_ARCHITECTURE`; registrar em `LIBRARY_ENTRIES`
- [x] T008 [US1] Criar `apps/web/src/app/app/biblioteca/page.tsx` — Server Component, filho de
      `app/app/layout.tsx` (**herda** o guard de autenticação — não adicionar `auth()` próprio);
      lê `searchParams.entry` e passa `LIBRARY_ENTRIES` e o id inicial ao navegador da biblioteca
- [x] T009 [P] [US1] Criar `apps/web/src/components/library/library-browser.tsx` (client) — campo de
      busca (usa `filterLibraryEntries`), categorias → grupos colapsáveis, uma entrada aberta por vez,
      abre a de `?entry=` ao montar, estado vazio claro quando a busca não acha nada (edge case do
      spec); **sem nenhum estado de usuário, progresso ou ranking** (FR-010)
- [x] T010 [P] [US1] Criar `apps/web/src/components/library/library-entry-card.tsx` — nome,
      definição, fonte (obra + autor — nunca capítulo/página, FR-007), e: para `clean-architecture`, a
      relação com a topologia (`analogia` + nota, ou `nenhuma` explícita); para as demais, a
      `platformNote`
- [x] T011 [US1] Em `apps/web/src/components/canvas/challenge-topbar.tsx`: link "Biblioteca"
      (`next/link`, ícone `BookOpen`) ao lado de Desafios/Templates/Calculadora, para `/app/biblioteca`
      — o autosave por design já preserva o canvas ao navegar (research.md §2.3)
- [ ] T012 [US1] Verificação manual — quickstart.md §US1 (SRP com analogia; LSP e ISP com "nenhuma"; os
      5 SOLID presentes; busca; alcançável em ≤ 3 interações — SC-003)

## Phase 4: US2 — Características além das 7 dimensões (P2)

**Goal**: ver as características de Richards & Ford que **não** são dimensão de score.
**Independent Test**: quickstart.md §US2.

- [x] T013 [US2] ⚠️ **Só após a aprovação do autor desta categoria** (a lista veio de resumos de
      terceiros — o autor confere contra o cap. 4). Criar
      `packages/knowledge/src/library/characteristics.ts` com as 19 entradas literais de
      `content-draft.md` §2 (4 operacionais, 9 estruturais, 6 transversais), cada uma com a
      `platformNote` "a plataforma não calcula esta característica" e
      `source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE`; registrar em `LIBRARY_ENTRIES`
- [ ] T014 [US2] Verificação manual — quickstart.md §US2 (nenhuma das 7 dimensões na lista;
      autenticação e autorização dizem que são cobertas pela dimensão Segurança)

## Phase 5: US3 — Padrões do Fowler como leitura (P3)

**Goal**: ver os padrões de Fowler como leitura recomendada, sem mecânica nova.
**Independent Test**: quickstart.md §US3.

- [x] T015 [US3] ⚠️ **Só após a aprovação do autor desta categoria.** Criar
      `packages/knowledge/src/library/poeaa.ts` com as 11 entradas literais de `content-draft.md` §3
      (definição = descrição oficial de uma linha do catálogo do Fowler, em pt-br), cada uma com
      `platformNote` "leitura recomendada — não é componente do canvas nem algo que o engine calcula" e
      `source: PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE`; `group` = categoria do catálogo do
      Fowler; registrar em `LIBRARY_ENTRIES`
- [ ] T016 [US3] Verificação manual — quickstart.md §US3 (definição + fonte + "leitura recomendada";
      o menu de componentes do canvas **não** ganhou item — SC-005; o teste de catálogo do engine, já
      existente, continua verde em `pnpm -r test`)

## Phase 6: US4 — Da dica à biblioteca (P4)

**Goal**: uma dica que cita um princípio presente na biblioteca oferece o caminho até a entrada.
**Independent Test**: quickstart.md §US4. **Depende de T007** (as entradas `srp` e `dip` precisam
existir para o vínculo resolver).

- [x] T017 [US4] Em `packages/problems/src/catalog/{url-shortener,social-feed,ecommerce-checkout}.ts`:
      `libraryEntryId` nas 3 dicas `responsibility-coupling` do M2.6 — `url-shortener` → `srp`,
      `social-feed` → `srp`, `ecommerce-checkout` → `dip` (a dica fala de isolar dependência volátil)
- [x] T018 [P] [US4] Escrever `packages/problems/test/hints-library-link.spec.ts` — todo
      `libraryEntryId` de toda dica de todo problema resolve via `getLibraryEntry` (nunca link morto —
      US4 cenário 2); as 3 dicas do T017 têm o vínculo; uma dica sem princípio (`why-high-latency`) não
      tem `libraryEntryId`
- [x] T019 [US4] Em `apps/web/src/components/canvas/challenge-card.tsx`: quando a dica aberta tem
      `libraryEntryId`, mostrar o link "Ler na biblioteca" (`next/link` →
      `/app/biblioteca?entry=<id>`) abaixo do corpo; sem `libraryEntryId`, nada é renderizado
- [ ] T020 [US4] Verificação manual — quickstart.md §US4 (a dica do Encurtador abre o SRP; a dica de
      p99 não mostra link)

## Phase 7: Polish

- [x] T021 `pnpm -r test`, `pnpm -r exec tsc --noEmit` e `pnpm --filter web build` limpos; confirmar
      que `packages/engine`, `packages/narrator`, `apps/web/src/app/api/narrator`, `apps/web/src/db` e
      `NARRATOR_PROMPT_VERSION` **não aparecem no diff** (FR-009, SC-004/005)
- [x] T022 Atualizar `docs/product-context.md` §10 (status real do M2.7 — quais categorias entraram) e
      `CLAUDE.md` "Plano ativo"
- [ ] T023 Promover `**Status**` de `spec.md` para `Done` **só** depois da verificação manual de
      T012/T014/T016/T020 e da aprovação de todo o conteúdo (SC-001: 100% da lista aprovada acessível)

## Dependências

- T001 → Foundational (T002–T006) → tudo
- T002 → T003 → T004 (e T004(c)/(d) dependem de T007/T013/T015)
- T005 e T006 são independentes entre si e do resto do Foundational
- **T007/T013/T015 dependem cada um da aprovação da sua categoria**; independentes entre si
- US1: T008–T011 podem ser escritos antes de T007 usando uma entrada de fixture em desenvolvimento
  (**não commitada**); T012 exige T007
- US4 depende de T006 e de T007 (`srp`, `dip`); US2 e US3 só dependem de T002–T004
- Polish depende de tudo o que for entregue

## Exemplo paralelo

```text
Depois do T002:  T004 (knowledge/test) + T005 (library-search) + T006 (Hint) — arquivos distintos
US1:             T009 (library-browser) + T010 (library-entry-card) — arquivos distintos
Conteúdo:        T007, T013, T015 — três arquivos; a aprovação do autor pode chegar categoria a categoria
```

## Estratégia

**MVP = T001–T012**: a biblioteca navegável com Clean Architecture/SOLID — a lacuna que o autor
apontou. US2 e US3 completam as outras duas obras e são independentes; US4 costura a biblioteca às
dicas do M2.6 e é o mínimo de integração (o mapeamento completo problema ↔ conceito continua sendo
o M4). Se só uma categoria for aprovada, o marco entrega só ela — o resto fica como segunda leva.
