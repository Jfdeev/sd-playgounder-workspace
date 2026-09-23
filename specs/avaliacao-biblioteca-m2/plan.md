# Implementation Plan: M2 — Avaliação e biblioteca

**Branch**: `feature/001-evaluation-narrator-scoring` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/avaliacao-biblioteca-m2/spec.md`

## Summary

`SimulationResult.scores` é placeholder zerado desde M0 (FR-020) — este marco implementa o cálculo
real das 7 dimensões, inteiramente em `packages/engine`, a partir de dados que `simulate()` já
calcula (US1). Sobre essa fundação, adiciona um narrador em linguagem natural via Anthropic Claude
API, chamado fora do caminho crítico e cacheado por hash do design em Postgres/Drizzle (US2); uma
solução de referência autorada por problema, validada contra a própria rubrica (US3); e uma
calculadora de capacidade independente, reaproveitando a fórmula de conversão escala→RPS já usada
pelo canvas (US4). Por decisão de `/speckit-clarify`, o catálogo permanece em 3 problemas neste
marco — os 3 problemas novos (pra completar 6) ficam pra um incremento futuro separado.

## Technical Context

**Language/Version**: TypeScript 5.7 (mesma versão de `packages/engine`/`packages/problems`/`apps/web`, já fixada desde M0)

**Primary Dependencies**: `@anthropic-ai/sdk` (novo, só em `apps/web` — narrador via Anthropic Claude API, decisão do autor ao iniciar este marco); reaproveita `drizzle-orm`/`@auth/drizzle-adapter` (já em uso desde M0.5) pra persistir o cache do narrador; nenhuma dependência nova em `packages/engine`/`packages/problems` (Constitution II — engine continua puro)

**Storage**: Postgres via Drizzle (já configurado, `apps/web/src/db/client.ts`) — nova tabela `narrator_explanations` (cache por hash do design+workload, FR-005). Nenhuma outra persistência nova: score é derivado em `simulate()` a cada chamada (não persistido), solução de referência é dado versionado em `packages/problems` (arquivo de código, não banco)

**Testing**: Vitest — mesmo padrão de M0/M0.5/M1/M1.5: `packages/engine` com testes unitários fortes sobre a lógica pura de score (incluindo cenários que provam que o score reage ao design, SC-002); `packages/problems` com teste que roda `simulate()` sobre cada `referenceSolution.design` e confirma `isProblemSolved` verdadeiro (SC-005); `apps/web` restrito a módulos puros em `src/lib/**` (cálculo da calculadora, construção do hash de cache, parsing/validação do schema de resposta do narrador com respostas mockadas) — nenhuma chamada real à API da Anthropic em teste automatizado (custo, não-determinismo), wiring de UI verificado por `tsc`/build/checagem manual no browser (mesmo gap de auth já registrado nos marcos anteriores)

**Target Platform**: Web (Next.js App Router, `apps/web`) — narrador exposto via novo Route Handler `apps/web/src/app/api/narrator/route.ts`, mesmo padrão dos Route Handlers já existentes (`api/account/signup`, `api/account/confirm-email`); nenhum middleware novo (auth() direto na rota, mesma decisão de M0.5/M1)

**Project Type**: Web application (monorepo já existente) — estende `packages/engine` (score), `packages/problems` (solução de referência) e `apps/web` (narrador, calculadora); `packages/narrator` deixa de ser um README stub e ganha código real (prompt, parsing/validação da resposta estruturada)

**Performance Goals**: RNF-5 (latência do narrador < 5s p95, já definido em `docs/product-context.md`); cálculo de score, por ser puro e síncrono, soma tempo desprezível a `simulate()` (mesma ordem de grandeza das outras métricas já calculadas ali)

**Constraints**: chave de API da Anthropic só em variável de ambiente server-only, nunca `NEXT_PUBLIC_*` (mesmo padrão de `RESEND_API_KEY`, FR-006); narrador MUST ficar fora do caminho crítico da submissão (FR-004) — resultado do engine nunca espera a resposta do LLM; resposta do narrador MUST vir em schema estruturado sem campos numéricos (tool use / structured output da API da Anthropic) — não é permitido extrair número de texto livre, único jeito de garantir mecanicamente a regra "nenhum número exibido pode ter origem em LLM"

**Scale/Scope**: 7 dimensões de score novas (função pura); 1 Route Handler novo; 1 tabela Drizzle nova; `Problem` ganha 1 campo novo (`referenceSolution`) preenchido nos 3 problemas já existentes; 1 painel de UI novo (calculadora, na topbar de utilitários)

## Constitution Check

*GATE: verificado antes da Fase 0 e re-checado após a Fase 1.*

| Princípio | Como este marco cumpre | Risco de violação |
|---|---|---|
| I — Engine é a fonte da verdade, narrador nunca julga | Score por dimensão é calculado 100% em `packages/engine`, a partir de dados que `simulate()` já produz. O narrador (`packages/narrator` + Route Handler) só recebe o `SimulationResult` já pronto — nunca recalcula, nunca corrige, nunca inventa um número. Reforçado mecanicamente pelo schema de resposta do LLM não ter nenhum campo numérico (FR-003). | Baixo — a mesma garantia estrutural de M0 (engine como única fonte), reforçada por um schema que fisicamente não aceita número de volta do LLM. |
| II — Engine puro | `@anthropic-ai/sdk` entra só em `apps/web` — `packages/engine`/`packages/problems` ganham só TypeScript puro (função de score, campo `referenceSolution`). Nenhuma dependência de rede/LLM/React entra nesses dois pacotes. | Baixo — verificado por `tsc` isolado de cada pacote, como já é rotina. |
| III — Determinismo | Score é função pura de dados já determinísticos (`nodes`, `path`, `cost`, `violations`, `design`, `workload`) — mesmo design, mesmo score, sempre. O narrador é explicitamente **não-determinístico** (tabela da Seção VII da constitution já prevê isso) — por isso nunca é fonte de número, só de texto explicativo, e é cacheado (mesma pergunta nunca gera duas respostas diferentes *exibidas*, mesmo que o LLM em si não seja determinístico). | Baixo — a constitution já antecipa essa fronteira. |
| IV — Só pontua o caminho da requisição | Score deriva de `nodes`/`path`/`violations`/`cost` já calculados por `simulate()` — que já aplicam essa regra (M0). Nenhuma lógica nova de alcançabilidade é introduzida. | Nenhum. |
| V — Score multidimensional, nunca nota única | É o requisito central de US1/FR-002 — 7 valores separados, nenhuma agregação numa nota. UI nunca soma/pondera as 7 dimensões numa única exibida. | Baixo — mesma disciplina de nunca introduzir um campo "nota geral" em nenhuma camada. |
| VI — Modelo matemático é especificação | O cálculo de score é **novo** (não estava em `docs/product-context.md` §7) — não há fórmula prescrita a seguir literalmente. Tratado como extensão do modelo, não como desvio: cada dimensão é uma leitura/agregação direta de métricas que as fórmulas de §7 já produzem (ex. disponibilidade a partir de replicas/SPOF, custo a partir de `cost.monthlyTotal`), documentada em `research.md` §1 com o racional de cada agregação — nunca aprovada unilateralmente sem esse registro. | Médio — não há fórmula pré-aprovada; mitigado registrando o racional de cada dimensão em `research.md` pra revisão do autor antes da implementação. |
| VII — Fronteira rígida de camadas | Narrador (`packages/narrator` + Route Handler em `apps/web`) só lê `SimulationResult` já calculado — nunca importa `packages/engine` pra recalcular nada, só o tipo. Solução de referência é dado em `packages/problems`, simulada pelo mesmo `simulate()` de sempre, nunca uma segunda implementação de cálculo. | Baixo. |

**Resultado**: nenhuma violação bloqueante. Um risco médio (VI — modelo de score sem fórmula
pré-aprovada) mitigado por registro explícito do racional em `research.md`, para revisão do autor
antes da implementação — não é um desvio silencioso, é a introdução de um modelo novo dentro do
espírito do princípio (medir sinais reais, nunca inventar).

## Project Structure

### Documentation (this feature)

```text
specs/avaliacao-biblioteca-m2/
├── plan.md                              # Este arquivo
├── research.md                          # Fase 0 — racional de cada dimensão de score, contrato do narrador
├── data-model.md                        # Fase 1 — Dimension→cálculo, NarratorExplanation, Problem.referenceSolution
├── quickstart.md                        # Fase 1 — verificação manual por user story
├── contracts/
│   └── narrator-contract.md             # Fase 1 — schema de request/response do Route Handler do narrador
└── tasks.md                             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/
├── engine/
│   └── src/
│       ├── scores/
│       │   └── calculate.ts             # NOVO — calculateScores(design, workload, result-parcial) → Record<Dimension, number>
│       └── index.ts                     # placeholderScores() removida, chama calculateScores()
│
└── problems/
    └── src/
        ├── types.ts                     # Problem ganha `referenceSolution: { design: Design; reasoning: string }`
        └── catalog/
            ├── url-shortener.ts         # + referenceSolution
            ├── social-feed.ts           # + referenceSolution
            └── ecommerce-checkout.ts    # + referenceSolution

packages/
└── narrator/
    ├── README.md                        # substituído por código real
    └── src/
        ├── prompt.ts                    # NOVO — monta o prompt a partir de SimulationResult (nunca de Design bruto sem contexto)
        ├── schema.ts                    # NOVO — schema de tool use/structured output (Anthropic), sem campo numérico
        └── design-hash.ts               # NOVO — hash determinístico de (Design, Workload) pra cache

apps/web/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── narrator/
│   │           └── route.ts             # NOVO — Route Handler: recebe SimulationResult+Design+Workload, checa cache, chama Anthropic, persiste
│   ├── db/
│   │   └── schema.ts                    # + tabela narrator_explanations (hash PK, texto, criado em)
│   ├── lib/
│   │   └── capacity-calculator.ts       # NOVO — reusa a fórmula de toWorkload() (extraída pra função compartilhada)
│   └── components/
│       └── canvas/
│           ├── challenge-topbar.tsx     # + botão "Calculadora" ao lado de Desafios/Templates
│           ├── capacity-calculator-panel.tsx  # NOVO — painel da calculadora (US4)
│           ├── score-panel.tsx          # NOVO — exibe as 7 dimensões (US1), nunca uma nota agregada
│           └── narrator-panel.tsx       # NOVO — busca/exibe a explicação (US2), estado de loading/erro próprio
└── drizzle/
    └── XXXX_narrator_explanations.sql   # NOVO — migration (drizzle-kit generate)
```

**Structure Decision**: `packages/narrator` deixa de ser um README stub e ganha sua primeira
implementação real — vive só de dados de entrada (`SimulationResult`) e produz texto, nunca
importa `packages/engine` além do tipo. O Route Handler em `apps/web/src/app/api/narrator/route.ts`
é a única peça que efetivamente chama a API da Anthropic e toca o banco — `packages/narrator` em si
permanece testável sem rede (schema/prompt são funções puras; a chamada HTTP fica isolada no Route
Handler, mockada em teste). Calculadora e painéis novos seguem o padrão já estabelecido de
`apps/web/src/components/canvas/*` — um componente por responsabilidade, mesmo estilo de
`challenge-card.tsx`/`result-panel.tsx`.

## Complexity Tracking

*Sem violações bloqueantes da Constitution Check acima — seção não aplicável. O risco médio do
princípio VI está endereçado via `research.md`, não via uma exceção aqui.*
