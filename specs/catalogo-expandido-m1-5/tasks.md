---
description: "Task list for M1.5 — Catálogo expandido de componentes do canvas"
---

# Tasks: M1.5 — Catálogo expandido de componentes do canvas

**Input**: Design documents from `specs/catalogo-expandido-m1-5/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: incluídos — mesmo padrão de cobertura forte em módulos puros já usado em M0/M0.5/M1
(`.specify/memory/constitution.md`, Fluxo de Trabalho SDD); wiring de UI verificado por
`tsc`/build/checagem manual, nunca por unit test.

**Organização**: 3 fases sequenciais com revisão do autor entre elas (FR-007) — Setup → US1 →
⏸️ **PARAR** → US2 → ⏸️ **PARAR** → US3 → Polish. Isso é mais rígido que "user stories
independentes em paralelo" (o padrão default do Spec Kit): aqui a ordem É a entrega, por decisão
explícita do autor na clarificação de 2026-08-25.

## Formato: `[ID] [P?] [Story] Descrição`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência de tarefa incompleta)
- **[Story]**: a qual user story a tarefa pertence (US1/US2/US3)

---

## Nota de design: matriz de conectividade completa (referência para T008/T018)

`research.md` §3 fixa 8 regras de arquétipo, mas não a tabela célula-a-célula — ela é decidida aqui,
de forma consistente com essas regras, para que T008/T018 sejam executáveis sem inventar nada
durante a implementação. Grupos nomeados usados abaixo:

- **Borda-Filtro** (novo, US2): `dns`, `waf`, `ingress`, `rate_limiter`
- **Cômputo especializado** (novo, US2): `serverless`, `auth_service`, `search`, `scheduler`, `notifications`, `analytics`
- **Sinks novos** (novo, US2): `data_warehouse`, `vector_db`, `pubsub`, `event_stream`, `kafka`
- **Pipeline de IA** (novo, US2): `llm_gateway`, `orchestrator`, `tool_registry`, `memory_fabric`, `safety_mesh`
- **External** (novo, US2): `third_party_api`, `payment`, `email`
- **Observability** (novo, US3): `metrics`, `logs`, `tracing`, `alerting`, `health_check`
- **Network** (novo, US3): `vpc`, `subnet`, `nat_gateway`, `vpn`, `service_mesh`

### Chaves novas (US2)

| Origem | Destinos |
|---|---|
| `dns` | `waf`, `ingress`, `rate_limiter`, `load_balancer`, `api_gateway`, `app_server` |
| `waf` | `dns`, `ingress`, `rate_limiter`, `load_balancer`, `api_gateway`, `app_server` |
| `ingress` | `dns`, `waf`, `rate_limiter`, `load_balancer`, `api_gateway`, `app_server` |
| `rate_limiter` | `dns`, `waf`, `ingress`, `load_balancer`, `api_gateway`, `app_server` |
| `serverless`, `auth_service`, `search`, `scheduler`, `notifications`, `analytics` (cada um) | `cache`, `sql_primary`, `sql_replica`, `nosql_kv`, `queue`, `object_storage`, `data_warehouse`, `vector_db`, `pubsub`, `event_stream`, `kafka`, `third_party_api`, `payment`, `email` (mesmo leque de `app_server` hoje + os 5 sinks novos + External — nunca `llm_gateway`, reservado a `app_server`/`api_gateway` por decisão explícita de `research.md` §3) |
| `data_warehouse` | `[]` (folha) |
| `vector_db` | `[]` (folha) |
| `pubsub`, `event_stream`, `kafka` (cada um) | `worker` (mesma regra de `queue`) |
| `llm_gateway` | `orchestrator`, `safety_mesh` |
| `orchestrator` | `tool_registry`, `memory_fabric`, `safety_mesh` |
| `tool_registry` | `[]` (folha) |
| `memory_fabric` | `[]` (folha) |
| `safety_mesh` | `llm_gateway`, `orchestrator`, `tool_registry`, `memory_fabric` (hop inserível em qualquer ponto do pipeline, `research.md` §3) |
| `third_party_api`, `payment`, `email` (cada um) | `[]` (folha) |

### Chaves existentes a EDITAR (US2) — fácil de esquecer, é exatamente o tipo de bug que este marco existe pra prevenir

| Chave | Hoje | Depois de US2 |
|---|---|---|
| `client` | `load_balancer, api_gateway, cdn, app_server` | + `dns, waf, ingress, rate_limiter` |
| `load_balancer` | `app_server, worker` | + `serverless, auth_service, search, scheduler, notifications, analytics` |
| `api_gateway` | `app_server, worker` | + `serverless, auth_service, search, scheduler, notifications, analytics, llm_gateway` |
| `app_server` | `cache, sql_primary, sql_replica, nosql_kv, queue, object_storage` | + `data_warehouse, vector_db, pubsub, event_stream, kafka, llm_gateway, third_party_api, payment, email` |
| `worker` | `sql_primary, nosql_kv, cache, object_storage, queue` | + `data_warehouse, vector_db, pubsub, event_stream, kafka, third_party_api, payment, email` (sem `llm_gateway` — só `app_server`/`api_gateway` chamam IA) |
| `cache` | `sql_primary, sql_replica, nosql_kv` | + `vector_db` (miss path plausível pra embeddings) |

### Chaves novas (US3)

| Origem | Destinos |
|---|---|
| `vpc`, `subnet`, `nat_gateway`, `vpn`, `service_mesh` (cada um) | `load_balancer`, `api_gateway`, `cdn`, `app_server` (o leque original de `client`, FR-006 — capacidade alta o bastante pra nunca ser o fator limitante) |
| `metrics`, `logs`, `tracing`, `alerting`, `health_check` (cada um) | `[]` (folha/sink) |

### Chaves existentes a EDITAR (US3)

| Chave | Adiciona |
|---|---|
| `client` | + `vpc, subnet, nat_gateway, vpn, service_mesh` |
| `app_server`, `worker`, `serverless`, `auth_service`, `search`, `scheduler`, `notifications`, `analytics` (cada um) | + `metrics, logs, tracing, alerting, health_check` (research.md §3: observability alcançável "a partir de qualquer componente de cômputo") |

---

## Phase 1: Setup

**Purpose**: confirmar baseline verde antes de tocar em qualquer arquivo — plan.md já estabeleceu
que não há dependência nova pra instalar.

- [X] T001 Baseline: `tsc` limpo, 75/75 testes relevantes verdes (93.72%/98.18% cobertura em
      `src/lib/**`), `pnpm --filter web build` limpo. Única exceção: `test/password.spec.ts`
      (3 casos) apresenta timeout intermitente sob paralelismo+coverage — flake pré-existente,
      não relacionado a esta feature, confirmado reproduzível em isolamento (passa 8/8) e
      sinalizado à parte (não é bloqueio pra prosseguir).

---

## Phase 2: Foundational

**Nenhuma tarefa** — a única infraestrutura compartilhada por todas as user stories
(`component-categories.ts`, `data-model.md`) é exatamente o que US1 entrega (FR-001). Extraí-la
pra uma fase separada duplicaria o trabalho sem nenhum benefício de paralelismo real, já que FR-007
já serializa US1 → US2 → US3.

---

## Phase 3: User Story 1 - Paleta organizada por categoria (Priority: P1) 🎯 MVP

**Goal**: os 11 `ComponentType` de M1 + Cliente aparecem agrupados nas 9 categorias do site de
inspiração, sem nenhum componente novo.

**Independent Test**: abrir o canvas, confirmar 9 cabeçalhos de categoria na ordem certa, cada um
dos 11 componentes existentes sob a categoria correta (quickstart.md, seção US1).

### Implementation for User Story 1

- [X] T002 [US1] Criar `apps/web/src/lib/component-categories.ts`: `type PaletteCategory` (9 valores — Client, Traffic & Edge, Compute, Storage, Messaging, Observability, Network, AI & Agents, External), `PALETTE_CATEGORY_ORDER: readonly PaletteCategory[]` nessa ordem, `CATEGORY_OF: Record<ConnectableKind, PaletteCategory>` com as 12 entradas de hoje (`client` + os 11 `ComponentType` de M1) — mapeamento exato em `data-model.md`
- [X] T003 [US1] Reescrever `apps/web/src/components/canvas/palette.tsx`: substituir os 2 `<div>` fixos (Cliente/Componentes) por um `map` sobre `PALETTE_CATEGORY_ORDER`, filtrando `CATEGORY_OF` pra cada seção (categorias sem componente ainda, ex. Observability/Network/AI & Agents/External antes de US2/US3, não renderizam seção vazia); cada `PaletteItem` continua vindo de `COMPONENT_UI`/`CLIENT_UI` como hoje (nenhuma mudança de props do componente)

### Tests for User Story 1

- [X] T004 [P] [US1] Criar `apps/web/test/component-categories.spec.ts`: teste de completude (todo `ConnectableKind` atual mapeia pra uma das 9 `PaletteCategory` válidas) + teste de que `PALETTE_CATEGORY_ORDER` tem exatamente as 9 categorias na mesma ordem da tabela de `spec.md` — 4 testes, 100% cobertura em `component-categories.ts`

### Verificação manual

- [X] T005 [US1] `tsc` limpo; `pnpm --filter web test:coverage` — 79/79 testes relevantes verdes (94.23%/98.18% cobertura em `src/lib/**`, sem regressão; `password.spec.ts` segue com o flake pré-existente sinalizado em T001, não relacionado); `pnpm --filter web build` limpo. Verificação visual no browser (checklist completo de quickstart.md) bloqueada por auth — rota `/app/[problemId]` exige login e não há credencial de teste disponível pra simular (mesmo gap já documentado em T035/T037/T041/T053 de M1); revisão visual fica pro autor no checkpoint abaixo.

**⏸️ PARAR — revisão do autor (FR-007) antes de avançar pra US2.**

---

## Phase 4: User Story 2 - Componentes novos que cabem no modelo de simulação atual (Priority: P2)

**Goal**: os 23 componentes "limpos" (Traffic & Edge, Compute, Storage, Messaging, AI & Agents,
External) existem como `ComponentType` real, com specs plausíveis, matriz de conectividade e
descrição pedagógica — participando da simulação como qualquer um dos 11 componentes de M1.

**Independent Test**: arrastar um componente novo (ex. Rate Limiter), conectar num caminho válido,
submeter, ver utilização/latência/custo reagindo à réplica; tentar uma conexão sem sentido (Rate
Limiter → SQL Database) e ver o canvas recusar (quickstart.md, seção US2).

### Implementation for User Story 2

- [X] T006 [US2] `packages/engine/src/types.ts`: adicionar os 23 literais novos à union `ComponentType` — Traffic & Edge: `dns`, `waf`, `ingress`, `rate_limiter`; Compute: `serverless`, `auth_service`, `search`, `scheduler`, `notifications`, `analytics`; Storage: `data_warehouse`, `vector_db`; Messaging: `pubsub`, `event_stream`, `kafka`; AI & Agents: `llm_gateway`, `orchestrator`, `tool_registry`, `memory_fabric`, `safety_mesh`; External: `third_party_api`, `payment`, `email` (`data-model.md`)
- [X] T007 [P] [US2] `packages/engine/src/catalog/components.ts`: adicionar as 23 entradas em `COMPONENT_CATALOG`, uma por arquétipo de `research.md` §2 — Filtro/borda (âncora `load_balancer`), Cômputo especializado (âncora `app_server`; `serverless` com `monthlyCostUsd` menor e `baseLatencyMs.p99` maior por cold start), Armazenamento analítico (âncora `sql_primary`/`nosql_kv`; `data_warehouse` com throughput menor), Mensageria de alto throughput (âncora `queue`; `kafka`/`event_stream` na ordem de grandeza de `cdn`), Pipeline de IA (âncora `app_server`/`api_gateway` mas `baseLatencyMs` bem mais alto), Dependência externa (throughput baixo/moderado, `baseLatencyMs.p99` alto, sem âncora interna)
- [X] T008 [US2] `apps/web/src/lib/connection-rules.ts`: adicionar as 23 chaves novas em `ALLOWED_TARGETS` e EDITAR as 6 chaves existentes (`client`, `load_balancer`, `api_gateway`, `app_server`, `worker`, `cache`) — tabela completa na "Nota de design" acima
- [X] T009 [P] [US2] `apps/web/src/lib/canvas-ui-catalog.ts`: adicionar as 23 entradas em `COMPONENT_UI` (label, ícone do `lucide-react`, descrição pedagógica de 2-4 frases cobrindo papel + analogia real + a restrição de conectividade do componente, mesmo estilo das 11 entradas existentes) — FR-004
- [X] T010 [P] [US2] `apps/web/src/lib/component-categories.ts`: adicionar as 23 entradas novas em `CATEGORY_OF`, uma por categoria (Traffic & Edge/Compute/Storage/Messaging/AI & Agents/External)

### Tests for User Story 2

- [X] T011 [P] [US2] `packages/engine/test/catalog/components.spec.ts`: atualizar `EXPECTED_TYPES` (11 → 34) e adicionar, por arquétipo, uma asserção de plausibilidade relativa (ex.: `kafka.maxThroughputRps` na ordem de grandeza de `cdn`; `llm_gateway.baseLatencyMs.p99` bem maior que `app_server.baseLatencyMs.p99`) — 4 testes novos de plausibilidade, 40 testes no arquivo (era 3)
- [X] T012 [P] [US2] `apps/web/test/connection-rules.spec.ts`: atualizar `ALL_COMPONENT_TYPES` (11 → 34), atualizar a lista de tipos-folha (+ `data_warehouse`, `vector_db`, `tool_registry`, `memory_fabric`, `third_party_api`, `payment`, `email`), e adicionar 1 caso permitido + 1 proibido por componente novo (ex.: `rate_limiter → load_balancer` true, `rate_limiter → sql_primary` false) — 7 testes novos de cenário
- [X] T013 [US2] Coverage pass: `connection-rules.ts` — os cenários de T012 não bastavam pra quebrar se um elemento de um array de 6-15 entradas fosse removido/trocado (ex.: tirar `vector_db` de `worker` não derrubava nada); adicionados 11 testes que comparam a lista COMPLETA (`toEqual`, ordenado) de cada uma das 6 chaves editadas + 17 chaves novas de `ALLOWED_TARGETS` — 100% statements/branch em `connection-rules.ts`
- [X] T014 [P] [US2] `apps/web/test/canvas-ui-catalog.spec.ts`: atualizar `ALL_COMPONENT_TYPES` (11 → 34) — o teste de completude já existente passa a cobrir as 23 entradas novas automaticamente

### Verificação manual

- [X] T015 [US2] `tsc` limpo em `packages/engine` e `apps/web`; `pnpm --filter engine test` — 148/148 testes verdes; `pnpm --filter web test:coverage` (exceto `password.spec.ts`, flake pré-existente já sinalizado) — 98/98 testes verdes, 96.4%/98.18% cobertura, 100% em `connection-rules.ts`/`canvas-ui-catalog.ts`/`component-categories.ts`; `pnpm --filter web build` limpo. Checklist visual completo de `quickstart.md` (drag/connect/submit/tooltip) fica bloqueado por auth, mesmo gap de T005 — fica pro autor confirmar no checkpoint abaixo.

**⏸️ PARAR — revisão do autor (FR-007) antes de avançar pra US3.**

---

## Phase 5: User Story 3 - Observability e Network (Priority: P3)

**Goal**: os 10 componentes de Observability (Metrics, Logs, Tracing, Alerting, Health Check) e
Network (VPC, Subnet, NAT Gateway, VPN, Service Mesh) existem como `ComponentType` real, com specs
simbólicas plausíveis — Network nunca é o fator limitante em designs razoáveis (Clarifications,
2026-08-25; FR-006).

**Independent Test**: arrastar um componente desta fase (ex. Service Mesh) pro canvas, ligar num
caminho válido, submeter, ver o resultado reagindo à configuração; montar um design razoável com
VPC/Subnet no caminho e confirmar que nunca aparece como gargalo (quickstart.md, seção US3).

### Implementation for User Story 3

- [X] T016 [US3] `packages/engine/src/types.ts`: adicionar os 10 literais novos — Observability: `metrics`, `logs`, `tracing`, `alerting`, `health_check`; Network: `vpc`, `subnet`, `nat_gateway`, `vpn`, `service_mesh`
- [X] T017 [P] [US3] `packages/engine/src/catalog/components.ts`: adicionar as 10 entradas em `COMPONENT_CATALOG` — Observability como arquétipo "tap/sink" (throughput altíssimo, latência baixíssima, custo baixo — nunca gargalo, por analogia de papel com o critério já fixado pra Network); Network ancorado em `cdn` (maior capacidade do catálogo, FR-006: "capacidade alta o bastante pra nunca virar gargalo em designs razoáveis"); VPC/Subnet fixados em 150.000 rps, acima de qualquer outro componente do catálogo
- [X] T018 [US3] `apps/web/src/lib/connection-rules.ts`: adicionar as 10 chaves novas em `ALLOWED_TARGETS` e EDITAR as 9 chaves existentes (`client` + os 8 membros do Grupo Cômputo: `app_server`, `worker`, `serverless`, `auth_service`, `search`, `scheduler`, `notifications`, `analytics`, via `COMPUTE_TARGETS` compartilhado) — tabela completa na "Nota de design" acima
- [X] T019 [P] [US3] `apps/web/src/lib/canvas-ui-catalog.ts`: adicionar as 10 entradas em `COMPONENT_UI` (label, ícone, descrição pedagógica — para VPC/Subnet, a descrição explicita que a spec reflete "container de alta capacidade, raramente o fator limitante", não um hop de processamento comum)
- [X] T020 [P] [US3] `apps/web/src/lib/component-categories.ts`: adicionar as 10 entradas novas em `CATEGORY_OF` (5 Observability, 5 Network)

### Tests for User Story 3

- [X] T021 [P] [US3] `packages/engine/test/catalog/components.spec.ts`: atualizar `EXPECTED_TYPES` (34 → 44) e adicionar um teste dedicado: `vpc.maxThroughputRps` e `subnet.maxThroughputRps` MUST ser `>=` o maior `maxThroughputRps` de qualquer outro componente do catálogo (prova mecânica do critério "nunca gargalo" de FR-006, não só uma asserção de valor solto) — 51 testes no arquivo (era 40)
- [X] T022 [P] [US3] `apps/web/test/connection-rules.spec.ts`: atualizar `ALL_COMPONENT_TYPES` (34 → 44), atualizar a lista de tipos-folha (+ `metrics`, `logs`, `tracing`, `alerting`, `health_check`), e adicionar 1 caso permitido + 1 proibido por componente novo — 2 testes novos de cenário
- [X] T023 [US3] Coverage pass: `connection-rules.ts` — os 3 testes de conteúdo completo (`client`/`app_server`/`worker`) atualizados pra incluir as 5 entradas de Observability/Network que cada um ganhou; +2 testes novos de conteúdo completo (Network idêntico ao leque original de `client`; Observability sempre folha) — 100% mantido, 36 testes no arquivo (era 29)
- [X] T024 [P] [US3] `apps/web/test/canvas-ui-catalog.spec.ts`: atualizar `ALL_COMPONENT_TYPES` (34 → 44)
- [X] T025 [US3] Novo describe em `apps/web/test/bottleneck-scenario.spec.ts`: Cliente → VPC (1 réplica) → App Server subprovisionado (1 réplica, mesmo cenário que já satura) — via `simulate()` real com a escala do encurtador de URL, confirma que o gargalo reportado é o App Server, nunca o VPC (prova mais rigorosa que "design razoável": VPC no caminho crítico de um design que ESTÁ saturado a jusante, e ainda assim não é o gargalo) — Acceptance Scenario 2 de US3

### Verificação manual

- [X] T026 [US3] `tsc` limpo nos dois pacotes; `pnpm --filter engine test` — 159/159 testes verdes; `pnpm --filter web test:coverage` (exceto `password.spec.ts`, flake pré-existente) — 103/103 testes verdes, 96.97%/98.18% cobertura, 100% em `connection-rules.ts`/`canvas-ui-catalog.ts`/`component-categories.ts`; `pnpm --filter web build` limpo. Checklist visual de `quickstart.md` fica bloqueado por auth, mesmo gap de T005/T015 — fica pro autor confirmar.

**Checkpoint**: todas as 3 user stories entregues e independentemente funcionais.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T027 [P] `pnpm --filter engine typecheck`/`test` e `pnpm --filter web typecheck`/`test:coverage`/`build` — regressão completa após as 3 user stories: 159/159 testes do engine, 103/103 testes relevantes do web (100% em `connection-rules.ts`/`canvas-ui-catalog.ts`/`component-categories.ts`, 96.97% geral em `src/lib/**` — acima do threshold de 90%), build de produção limpo. `password.spec.ts` segue com o flake pré-existente sinalizado em T001 (task em background aberta), não relacionado a esta feature.
- [X] T028 Verificação por inspeção de código (não por browser — mesmo gap de auth de T005/T015/T026): `FlowNodeData.componentType` (`apps/web/src/lib/canvas-types.ts`) continua tipado como `ComponentType` — o campo nunca mudou de forma, só o domínio de valores aceitos cresceu (11→44). Nenhum dos 11 valores originais foi renomeado/removido em `COMPONENT_UI`/`COMPONENT_CATALOG`/`CATEGORY_OF`/`ALLOWED_TARGETS` — só ganharam entradas novas ao lado. Um JSON de autosave salvo antes deste incremento, com `componentType` igual a um dos 11 originais, continua sendo um valor válido em todos os 4 catálogos hoje: a mudança é estritamente aditiva, então a compatibilidade retroativa é garantida por construção, não por sorte. Fica pro autor confirmar visualmente quando conseguir logar.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: vazia — nada bloqueia US1 além de Setup
- **US1 (Phase 3)**: depende de Setup. **BLOQUEIA** US2 (FR-007 — revisão do autor obrigatória entre fases, não é só uma sugestão de ordem)
- **US2 (Phase 4)**: depende de US1 concluída E revisada. **BLOQUEIA** US3
- **US3 (Phase 5)**: depende de US2 concluída E revisada
- **Polish (Phase 6)**: depende de US3 concluída

### Dentro de cada user story

- `types.ts` sempre primeiro (T006 antes de T007-T010; T016 antes de T017-T020) — os outros 4 arquivos leem `ComponentType`, então precisam do literal existir primeiro
- `components.ts`, `connection-rules.ts`, `canvas-ui-catalog.ts`, `component-categories.ts` são arquivos diferentes e independentes entre si — paralelizáveis depois que `types.ts` estiver pronto
- Testes de cada arquivo dependem só da implementação daquele arquivo — paralelizáveis entre si
- Coverage pass (T013/T023) depende dos testes de cenário do mesmo arquivo já existirem (T012/T022)

### Parallel Opportunities

```bash
# Depois de T006 (types.ts) em US2:
Task: "components.ts — 23 entradas por arquétipo (T007)"
Task: "connection-rules.ts — 23 chaves novas + 6 editadas (T008)"
Task: "canvas-ui-catalog.ts — 23 entradas (T009)"
Task: "component-categories.ts — 23 entradas (T010)"

# Depois de T007/T008/T009 respectivamente, os testes de cada um:
Task: "components.spec.ts atualizado (T011)"
Task: "connection-rules.spec.ts atualizado (T012)"
Task: "canvas-ui-catalog.spec.ts atualizado (T014)"
```

Mesmo padrão em US3 (T017/T018/T019/T020 após T016; T021/T022/T024 após suas respectivas
implementações).

---

## Implementation Strategy

### MVP (User Story 1 apenas)

1. Phase 1 (Setup) → Phase 3 (US1) → **PARAR e validar** com o autor
2. Já entrega valor sozinho: achar componente na paleta fica mais rápido, sem nenhum risco de
   modelagem nova

### Entrega incremental (a única ordem válida aqui — FR-007)

1. Setup → US1 → revisão → **checkpoint 1**
2. US2 → revisão → **checkpoint 2** (catálogo mais que dobra, ainda sem risco de modelagem
   ambígua)
3. US3 → revisão → **checkpoint 3** (a parte de modelagem mais arriscada, isolada por último)
4. Polish → feature completa

Ao contrário de M0/M0.5/M1, **não há estratégia de equipe paralela** aqui — a própria spec (FR-007)
exige que as fases sejam sequenciais com revisão humana entre elas, então "US2 e US3 em paralelo"
não é uma opção válida para este marco.

---

## Notes

- `[P]` = arquivo diferente, sem dependência de tarefa incompleta
- `[Story]` mapeia a tarefa pra US1/US2/US3 — Setup, Foundational e Polish nunca têm label
- Cada `ComponentType` novo MUST tocar os 5 pontos do contrato (`contracts/novo-componente-
  contract.md`) — o compilador recusa build (`Record` exaustivo) se um deles faltar, exceto a
  entrada em `connection-rules.spec.ts`, que é responsabilidade da tarefa de teste, não do
  compilador
- Commit sugerido por tarefa de implementação (ou por grupo pequeno de tarefas relacionadas), mesmo
  padrão de M0/M0.5/M1
- Parar em cada `⏸️ PARAR` — não é um checkpoint de "pode seguir se quiser", é um requisito da spec
  (FR-007)
