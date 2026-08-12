---
description: "Task list for M0 — Engine de Simulação Puro"
---

# Tasks: M0 — Engine de Simulação Puro

**Input**: Design documents from `specs/engine-puro-m0/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/engine-api.md](contracts/engine-api.md),
[quickstart.md](quickstart.md)

**Tests**: incluídos — FR-015 e SC-001/SC-003 exigem explicitamente uma suíte de testes com casos
calculados à mão e cobertura ≥80%.

**Organization**: tasks agrupadas por user story (spec.md), na ordem de prioridade P1 → P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: US1-US4, conforme spec.md
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Pacote único `packages/engine/` (biblioteca TypeScript pura), conforme Project Structure de
[plan.md](plan.md). Sem `backend/`/`frontend/` — não se aplica a este marco (zero UI).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicialização do pacote `packages/engine` dentro do workspace pnpm já existente.

- [X] T001 Criar `packages/engine/package.json` (`name: "@sdp/engine"`, `private: true`,
      `type: "module"`, scripts `test` e `test:coverage`, devDependencies `typescript`, `vitest`,
      `@vitest/coverage-v8`)
- [X] T002 [P] Criar `packages/engine/tsconfig.json` (modo `strict`, `target: "ES2022"`,
      `module: "NodeNext"`, `noEmit: true` — sem build step em M0, conforme research.md §1)
- [X] T003 [P] Criar `packages/engine/vitest.config.ts` com `coverage.provider: "v8"` e
      `thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }` (research.md §2)
- [X] T004 Rodar `pnpm install` na raiz do repo e confirmar que `packages/engine` é reconhecido como
      workspace member (`pnpm-workspace.yaml`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, catálogo e validação estrutural — usados por todas as user stories.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase estar completa.

- [X] T005 Definir os tipos centrais em `packages/engine/src/types.ts` (`NodeId`, `ComponentType`,
      `DesignNode`, `DesignEdge`, `EdgeKind`, `Design`, `Workload`, `NodeStatus`, `NodeResult`,
      `PathResult`, `Violation`, `Dimension`, `SimulationResult`) conforme data-model.md — FR-001
- [X] T006 [P] Criar o catálogo de componentes em `packages/engine/src/catalog/components.ts` (11
      `ComponentType`, com throughput/latência p50-p99/custo, valores da tabela de data-model.md) —
      FR-014, D5
- [X] T007 [P] Teste de sanidade do catálogo em `packages/engine/test/catalog/components.spec.ts`
      (11 tipos presentes; cada um com throughput > 0, `p50 < p99`, custo > 0)
- [X] T008 Implementar validação estrutural em `packages/engine/src/graph/validate.ts` — nunca lança,
      retorna `Violation[]` para aresta com referência quebrada, ID de nó duplicado e contagem de
      réplicas inválida (FR-019) — depende de T005
- [X] T009 [P] Testes unitários de `validate.ts` em `packages/engine/test/graph/validate.spec.ts`
      (cada condição inválida produz o `Violation.type` correto; design válido não produz nenhuma)
- [X] T010 Coverage pass: `validate.ts` — para cada ponto de decisão (checagem de aresta quebrada, ID
      duplicado, contagem de réplica) em `packages/engine/src/graph/validate.ts`, garantir que existe
      um teste que quebra se a linha for mutada; escrever os testes faltantes
- [X] T011 Criar `packages/engine/src/index.ts` exportando o esqueleto de `simulate()` — roda
      `validate()` e retorna um `SimulationResult` mínimo válido (nodes/path/cost vazios, violations
      da validação, `scores` zerado por FR-020) — depende de T005, T008

**Checkpoint**: fundação pronta — user stories podem começar.

---

## Phase 3: User Story 1 - Calcular gargalo, utilização e latência de um design (Priority: P1) 🎯 MVP

**Goal**: `simulate()` calcula utilização (ρ), fila M/M/1, latência do caminho em p50/p95/p99, e
throughput real limitado pelo gargalo.

**Independent Test**: chamar `simulate(design, workload)` com os designs de referência A e B e
comparar cada campo do resultado com a conta feita à mão.

### Tests for User Story 1

- [X] T012 [P] [US1] Testes de utilização (`ρ = λ/(c·μ)`) em
      `packages/engine/test/metrics/utilization.spec.ts`
- [X] T013 [P] [US1] Testes de fila M/M/1 e Lei de Little, incluindo o caso `ρ ≥ 1` (saturado), em
      `packages/engine/test/metrics/queue.spec.ts`
- [X] T014 [P] [US1] Testes da derivação de percentis p50/p95/p99 (research.md §3) em
      `packages/engine/test/metrics/latency.spec.ts`
- [X] T015 [P] [US1] Testes de propagação de carga com normalização de peso de split (FR-018) em
      `packages/engine/test/graph/propagate.spec.ts`
- [X] T016 [P] [US1] Testes de throughput/gargalo — nunca acima da carga ofertada nem da capacidade
      do caminho — em `packages/engine/test/metrics/throughput.spec.ts`
- [X] T017 [US1] Design de referência A (nó único, ρ<1, conta à mão documentada no arquivo) em
      `packages/engine/test/reference-designs/design-a.spec.ts` (SC-001)
- [X] T018 [US1] Design de referência B (gargalo no meio do caminho, conta à mão documentada) em
      `packages/engine/test/reference-designs/design-b.spec.ts` (SC-001)

### Implementation for User Story 1

- [X] T019 [P] [US1] Implementar cálculo de utilização em `packages/engine/src/metrics/utilization.ts`
      (FR-003)
- [X] T020 [P] [US1] Implementar fila M/M/1 + Lei de Little em `packages/engine/src/metrics/queue.ts`,
      com valor sentinela documentado para `ρ ≥ 1` (FR-004, Edge Cases)
- [X] T021 [US1] Implementar derivação de percentis p50/p95/p99 em
      `packages/engine/src/metrics/latency.ts` (FR-005, research.md §3) — depende de T020
- [X] T022 [US1] Implementar propagação de carga com normalização de peso em
      `packages/engine/src/graph/propagate.ts` (FR-002, FR-018) — depende de T005, T008
- [X] T023 [US1] Implementar cálculo de throughput/gargalo em
      `packages/engine/src/metrics/throughput.ts` (FR-006, FR-007) — depende de T019, T022
- [X] T024 [US1] Integrar propagação + utilização + fila + latência + throughput no pipeline de
      `packages/engine/src/index.ts` — depende de T019, T020, T021, T022, T023
- [X] T025 [US1] Coverage pass: `queue.ts` — garantir que o ramo de saturação (`ρ ≥ 1`) e o ramo normal
      têm teste que mata mutação; escrever os testes faltantes
- [X] T026 [US1] Coverage pass: `propagate.ts` — garantir que a normalização de peso (soma ≠ 100%) tem
      teste que mata mutação; escrever os testes faltantes
- [X] T027 [US1] Coverage pass: `throughput.ts` — garantir que a seleção do nó gargalo tem teste que
      mata mutação; escrever os testes faltantes

**Checkpoint**: US1 completa e testável de forma independente — designs A e B batem com a conta à mão.

---

## Phase 4: User Story 2 - Detectar problemas estruturais do grafo (Priority: P1)

**Goal**: `simulate()` detecta SPOF, nó órfão e ciclo, e exclui aresta assíncrona da latência do
usuário — sem depender de carga simulada.

**Independent Test**: designs de teste, cada um com exatamente um tipo de violação, verificando que
só essa violação é reportada.

### Tests for User Story 2

- [X] T028 [P] [US2] Teste de detecção de SPOF (réplicas < 2 no caminho crítico) em
      `packages/engine/test/graph/spof.spec.ts`
- [X] T029 [P] [US2] Teste de detecção de nó órfão (vale zero; fora de cost/path/scores) em
      `packages/engine/test/graph/orphan-node.spec.ts`
- [X] T030 [P] [US2] Teste de detecção de ciclo (nó membro do ciclo vs. nó a jusante) em
      `packages/engine/test/graph/cycle.spec.ts`
- [X] T031 [P] [US2] Teste de exclusão de aresta assíncrona do cálculo de latência do usuário em
      `packages/engine/test/metrics/async-edge.spec.ts`

### Implementation for User Story 2

- [X] T032 [US2] Implementar detecção de SPOF em `packages/engine/src/graph/static-analysis.ts`
      (FR-009 — `replicas ≥ 2` não-SPOF, decisão do autor)
- [X] T033 [US2] Implementar detecção de nó órfão em `packages/engine/src/graph/static-analysis.ts`
      (FR-010) — mesmo arquivo de T032, sequencial
- [X] T034 [US2] Implementar detecção de ciclo via DFS de 3 cores em
      `packages/engine/src/graph/static-analysis.ts` (FR-011) — mesmo arquivo, sequencial
- [X] T035 [US2] Excluir o trecho de aresta assíncrona da soma de latência em
      `packages/engine/src/metrics/latency.ts` (FR-012) — depende de T021
- [X] T036 [US2] Integrar as análises estáticas ao pipeline de `packages/engine/src/index.ts`
      (violations acumuladas; nó órfão excluído de cost/path/scores) — depende de T032, T033, T034,
      T035, T024
- [X] T037 [US2] Coverage pass: `static-analysis.ts` — garantir que SPOF, órfão e ciclo têm cada um
      teste que mata mutação; escrever os testes faltantes

**Checkpoint**: US1 + US2 funcionais e testáveis independentemente.

---

## Phase 5: User Story 3 - Calcular custo mensal do design (Priority: P2)

**Goal**: custo mensal por nó e total, a partir do catálogo (D5, tabela fixa ilustrativa).

**Independent Test**: design com componentes de tipo/quantidade conhecidos; custo total bate com a
soma manual das entradas da tabela do catálogo.

### Tests for User Story 3

- [X] T038 [P] [US3] Teste de cálculo de custo (N réplicas × custo unitário; soma no `monthlyTotal`)
      em `packages/engine/test/cost/calculate.spec.ts`

### Implementation for User Story 3

- [X] T039 [US3] Implementar cálculo de custo por nó e total em `packages/engine/src/cost/calculate.ts`
      (FR-013) — depende de T006
- [X] T040 [US3] Integrar custo ao pipeline de `packages/engine/src/index.ts` (excluindo nós órfãos,
      FR-010) — depende de T039, T036
- [X] T041 [US3] Coverage pass: `calculate.ts` — garantir que o cálculo por nó e a soma total têm
      teste que mata mutação; escrever os testes faltantes

**Checkpoint**: US1 + US2 + US3 funcionais.

---

## Phase 6: User Story 4 - Propagar efeito de cache (Priority: P3)

**Goal**: hit rate do cache propaga para a carga do DB e a latência efetiva do caminho.

**Independent Test**: variar o hit rate de 0,99 para 0,95 num design com cache + DB; confirmar que a
carga no DB aumenta ~5× conforme §7.

### Tests for User Story 4

- [X] T042 [P] [US4] Teste do efeito de cache (`carga_no_db`, `latência_efetiva`) em
      `packages/engine/test/metrics/cache.spec.ts`

### Implementation for User Story 4

- [X] T043 [US4] Implementar efeito de cache sobre carga e latência em
      `packages/engine/src/metrics/cache.ts` (FR-008)
- [X] T044 [US4] Integrar o efeito de cache ao pipeline de propagação/latência em
      `packages/engine/src/index.ts` — depende de T043, T024
- [X] T045 [US4] Coverage pass: `cache.ts` — garantir que o ramo de hit e o de miss têm teste que mata
      mutação; escrever os testes faltantes

**Checkpoint**: todas as 4 user stories funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T046 [P] Implementar o placeholder de `scores` (7 dimensões = `0`) em
      `packages/engine/src/index.ts` conforme FR-020 — depende de T024
- [X] T047 [P] Teste do placeholder de `scores` (as 7 chaves de `Dimension` presentes, valor `0`) em
      `packages/engine/test/index.spec.ts`
- [X] T048 Design de referência C — integra cache + custo + SPOF num único design, conta à mão
      documentada — em `packages/engine/test/reference-designs/design-c.spec.ts` (SC-001, 3º design de
      referência) — depende de T036, T040, T044
- [X] T049 Teste de performance: grafo de 30 nós conclui em menos de 50 ms em
      `packages/engine/test/performance/scale.spec.ts` (SC-002)
- [X] T050 [P] Verificar zero dependência de runtime — teste estático que falha se qualquer arquivo em
      `packages/engine/src/**/*.ts` importar `react`, `next`, cliente HTTP ou SDK de LLM — em
      `packages/engine/test/no-runtime-deps.spec.ts` (FR-017, constitution II)
- [X] T051 Rodar o passo a passo de [quickstart.md](quickstart.md) manualmente e confirmar que o
      exemplo funciona como documentado
- [X] T052 Confirmar cobertura ≥80% via `pnpm --filter @sdp/engine test:coverage` (SC-003); se algum
      arquivo ficar abaixo do threshold, completar os testes faltantes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: depende do Setup — bloqueia todas as user stories
- **User Stories (Phase 3-6)**: todas dependem do Foundational; entre si, US1 e US2 são P1 e
  independentes uma da outra (nenhuma lê o resultado da outra); US3 (custo) e US4 (cache) integram no
  mesmo `index.ts` mas não dependem da lógica interna uma da outra — podem ser feitas em qualquer
  ordem relativa após US1
- **Polish (Phase 7)**: depende de todas as user stories completas (o design de referência C usa
  cache + custo + SPOF simultaneamente)

### User Story Dependencies

- **US1 (P1)**: depende só do Foundational
- **US2 (P1)**: depende só do Foundational — pode rodar em paralelo com US1 (arquivos diferentes:
  `static-analysis.ts` vs. `propagate.ts`/`metrics/*.ts`), mas ambas escrevem em `index.ts` na etapa de
  integração (T024 e T036), então essa etapa final de cada uma é sequencial entre si
- **US3 (P2)**: depende do Foundational (catálogo, T006) e da integração de US2 em `index.ts` (T036)
  para não recontar nó órfão
- **US4 (P3)**: depende da integração de US1 em `index.ts` (T024)

### Parallel Opportunities

- Setup: T002, T003 em paralelo (arquivos diferentes)
- Foundational: T006+T007 em paralelo entre si; T009 em paralelo com T006/T007
- US1: T012-T016 (todos os testes) em paralelo entre si; T019, T020 em paralelo entre si
- US2: T028-T031 (todos os testes) em paralelo entre si
- US3/US4: T038 e T042 em paralelo entre si (arquivos diferentes)
- Polish: T046, T047, T050 em paralelo entre si

---

## Parallel Example: User Story 1

```bash
# Testes de US1 em paralelo:
Task: "Testes de utilização em packages/engine/test/metrics/utilization.spec.ts"
Task: "Testes de fila M/M/1 em packages/engine/test/metrics/queue.spec.ts"
Task: "Testes de percentis em packages/engine/test/metrics/latency.spec.ts"
Task: "Testes de propagação em packages/engine/test/graph/propagate.spec.ts"
Task: "Testes de throughput em packages/engine/test/metrics/throughput.spec.ts"

# Implementação de US1 em paralelo (utilização e fila não dependem uma da outra):
Task: "Implementar utilization.ts"
Task: "Implementar queue.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (bloqueia tudo)
3. Completar Fase 3: US1
4. **Parar e validar**: designs de referência A e B batendo com a conta à mão, testes verdes
5. Esse já é o "momento aha" do produto (utilização/latência) funcionando de ponta a ponta

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. US1 → validar independentemente (gargalo/latência/throughput)
3. US2 → validar independentemente (SPOF/órfão/ciclo/async)
4. US3 → validar independentemente (custo)
5. US4 → validar independentemente (cache)
6. Polish → 3º design de referência, teste de performance de 30 nós, cobertura ≥80%

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si
- [Story] mapeia a task para a user story correspondente (rastreabilidade com spec.md)
- Cada coverage-pass task é gerada por unidade lógica com pontos de decisão reais — getters puros e
  delegações diretas (nenhum caso aqui) não precisam de coverage pass
- FR-020 (placeholder de `scores`) é tratado no Polish porque não pertence a nenhuma das 4 user
  stories — é apenas a garantia de que o contrato de tipo (§6) fica completo mesmo com a lógica de
  pontuação adiada para M2
- Evitar: task vaga, conflito de mesmo arquivo em paralelo, dependência cruzada entre stories que
  quebre a independência
