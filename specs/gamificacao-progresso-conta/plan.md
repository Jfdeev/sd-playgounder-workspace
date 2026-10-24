# Implementation Plan: M2.8 — Gamificação e progresso na conta

**Branch**: `feature/001-account-gamification-progress` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/gamificacao-progresso-conta/spec.md` (Status: Ready)

## Summary

O progresso sai do `localStorage` e vai pro servidor, ligado à conta. A peça central é uma rota nova
de submissão: o cliente manda só `{ problemId, design }`; o servidor valida o design, deriva a carga
do próprio problema, **reexecuta o engine e a rubrica** e, se resolveu, grava um **evento de
pontuação imutável** com chave única por usuário (`challenge:<problemId>`). XP, nível, desafios
resolvidos, conquistas e ranking são **derivados por consulta** desses eventos — não existe contador
que possa entrar em corrida, e um `INSERT … ON CONFLICT DO NOTHING` sozinho garante idempotência
(o driver `neon-http` não tem transação — `research.md` §2). Ofensiva vem de uma tabela de dias de
atividade. Toda regra (nível, ofensiva, validação do design, apelido, ordenação do ranking,
serialização pública) é função pura testada; as rotas só orquestram. Ranking e perfil público por
apelido ficam dentro de `/app` (só logados). O engine, o narrador e as 7 dimensões **não mudam**.

## Technical Context

**Language/Version**: TypeScript 5.7 (igual ao resto do monorepo)

**Primary Dependencies**: nenhuma nova — Next.js App Router, Auth.js (`auth()`), Drizzle + `@neondatabase/serverless` (driver `neon-http`, já em uso), `@sdp/engine`, `@sdp/problems`

**Storage**: Postgres (Neon) — **4 tabelas novas** (`data-model.md`) e **1 migração**, aplicada ao Neon
live só com autorização do autor (gate 6). Há um único banco: dev e produção são o mesmo Neon.

**Testing**: Vitest. Funções puras em `apps/web/src/lib/gamification/` (nível, ofensiva, conquistas,
validação de design, apelido, ranking, serializador público) com teste próprio — incluindo um teste
de que o serializador público nunca tem chaves `email`/`name`/`design` (SC-007). Rotas finas, sem
teste de rota (convenção de M0.5); fluxo ponta a ponta no browser (`quickstart.md`), incluindo
reenviar payload forjado e duas submissões simultâneas.

**Target Platform**: Web (Next.js App Router, Node runtime nas rotas)

**Project Type**: monorepo existente — estende `apps/web` (rotas, páginas, lib, schema). `packages/*`
não mudam (o servidor importa `simulate`, `getProblem`, `isProblemSolved`, `toWorkload` como já são).

**Performance Goals**: SC-001 — XP visível em ≤ 3 s após submeter (uma simulação no servidor é
milissegundos; o custo é rede + 2–3 consultas)

**Constraints**: nunca confiar em resultado/carga do cliente (FR-002); idempotência sem transação
(FR-003, SC-004); só usuários logados (FR-012); nenhuma nota agregada (FR-005, Constitution V); falha
de gravação nunca bloqueia o resultado nem mostra XP fantasma (FR-013); limite de taxa persistido no
banco (FR-014 — limite em memória não sobrevive a várias instâncias serverless); ranking/perfil sem
e-mail nem design (FR-018)

**Scale/Scope**: 3 desafios no catálogo hoje (M2); 5 user stories; 4 tabelas; 3 rotas de API; 3
páginas (`/app/progresso`, `/app/ranking`, `/app/u/[apelido]`)

## Constitution Check

| Princípio | Como este marco cumpre | Risco |
|---|---|---|
| I — Engine é a fonte da verdade | O servidor credita XP só a partir de `simulate()` + rubrica rodados por ele mesmo; nenhum número do cliente é lido | Baixo |
| II — Engine puro | `packages/engine` intocado; o servidor só importa e chama | Nenhum |
| III — Determinismo | Mesmo design + mesmo problema → mesmo veredito; XP por evento e nível são funções determinísticas (FR-006) | Nenhum |
| IV — Só pontua o caminho da requisição | Rubrica e engine inalterados | Nenhum |
| V — Score multidimensional | XP mede atividade; nunca é somado às 7 dimensões, que continuam exibidas separadas (FR-005, SC-005) | Médio — XP no ranking pode ser lido como "nota"; mitigado por texto da UI ("XP de estudo") |
| VI — Modelo matemático | Nenhuma fórmula do engine tocada | Nenhum |
| VII — Fronteira de camadas | Regras de gamificação em `apps/web/src/lib/gamification` (camada de aplicação); nada entra no engine | Nenhum |

**Resultado**: sem violação; sem entrada em Complexity Tracking.

## Project Structure

### Documentation

```text
specs/gamificacao-progresso-conta/
├── spec.md            # Ready (clarify 2026-10-23)
├── plan.md            # este arquivo
├── research.md        # decisões técnicas e alternativas
├── data-model.md      # tabelas, chaves, o que é derivado
├── content-draft.md   # números e regras — AGUARDA aprovação do autor (gate 5)
├── contracts/
│   └── gamification-api.md   # POST /api/submissions, GET /api/progress, PUT /api/profile
├── quickstart.md      # verificação por user story
└── tasks.md           # /speckit-tasks
```

### Source Code

```text
apps/web/src/
├── db/schema.ts                         # + userProfiles, scoringEvents, activityDays, submissionRateLimits
├── db/migrations/0004_*.sql             # gerada pelo drizzle-kit — aplicada ao Neon só com o autor (gate 6)
├── lib/gamification/                    # NOVO — tudo puro e testado
│   ├── levels.ts                        # nível = f(XP), XP até o próximo
│   ├── streak.ts                        # dias (America/Sao_Paulo, via Intl) → ofensiva atual e recorde
│   ├── achievements.ts                  # definições + quais um estado desbloqueia
│   ├── design-validation.ts             # limites de tamanho/forma + matriz do canvas (connection-rules)
│   ├── nickname.ts                      # normalizar + validar apelido
│   ├── ranking.ts                       # ordenação com desempate determinístico
│   └── public-profile.ts                # serializador público (só os campos de FR-018)
├── lib/gamification-store.ts            # (servidor) consultas/escritas Drizzle — idempotentes
├── app/api/submissions/route.ts         # NOVO — reexecuta engine + rubrica, credita evento
├── app/api/progress/route.ts            # NOVO — progresso do próprio usuário
├── app/api/profile/route.ts             # NOVO — apelido e visibilidade
├── app/app/progresso/page.tsx           # NOVO — painel (US2–US4)
├── app/app/ranking/page.tsx             # NOVO — ranking (US5)
├── app/app/u/[apelido]/page.tsx         # NOVO — perfil público (US5)
├── components/canvas/canvas.tsx         # "Submeter" chama a rota; resultado local continua imediato
├── components/canvas/challenge-topbar.tsx  # trava de desafios lê o progresso do servidor (gate 4)
└── stores/progression-store.ts          # aposentado (gate 4)

apps/web/test/gamification/*.spec.ts     # NOVO — um arquivo por módulo puro
```

**Structure Decision**: regras puras em `lib/gamification/` (testáveis sem banco), acesso ao banco
concentrado num módulo de servidor, rotas finas. Leitura pública (ranking/perfil) em Server
Components consultando o banco direto e passando pelo serializador público — sem rota de API pra
isso. Nada em `packages/engine`, `packages/narrator`, `/api/narrator` ou `NARRATOR_PROMPT_VERSION`.

## Gates antes do `/speckit-implement`

**Decididos pelo autor em 2026-10-23**: 1 → opção A (qualquer submissão reexecutada conta pro
dia); 2 → trava pelo servidor, re-travando quem já tinha resolvido; 3 → `content-draft.md`
aprovado como está. 4 → migração `0004` aplicada ao Neon com autorização do autor (2026-10-23).

1. **Ofensiva e "atividade verificada"** (`research.md` §4): com 3 desafios, se só a primeira
   resolução conta, um usuário tem no máximo 3 eventos na vida — a ofensiva morre em dias. O autor
   escolhe entre as opções de `content-draft.md` §4.
2. **Trava de desafios** (`research.md` §5): a progressão travada passa a ler o servidor e a chave
   do `localStorage` é aposentada. Consequência explícita: **quem já tinha resolvido desafios volta a
   ter só o primeiro destravado** (segue de "todos começam do zero", mas precisa do OK).
3. **Conteúdo** (`content-draft.md`): XP por desafio, curva de níveis, conquistas iniciais, regras do
   apelido e desempate do ranking.
4. **Migração no Neon live**: `pnpm --filter web db:migrate` só depois do autor autorizar — mesmo
   procedimento da migração `0003` do M2.6.

## Fora de escopo

Salvar designs na conta (M4); XP por leitura (fichas, biblioteca, dicas — FR-004); moderação de
apelido; fuso por usuário; perfil visível sem login; redirecionamento de apelido antigo; progresso por
conceito (M4).
