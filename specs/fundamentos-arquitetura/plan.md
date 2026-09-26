# Implementation Plan: M2.6 — Fundamentos de arquitetura

**Branch**: `feature/001-architecture-fundamentals-knowledge-base` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/fundamentos-arquitetura/spec.md`

## Summary

Pacote novo `packages/knowledge` (dado puro, mesmo padrão de `packages/problems`) com fichas
autoradas à mão: uma por dimensão de score (`ARCHITECTURE_CHARACTERISTICS`, `Record<Dimension,
...>` — exaustivo por construção, mesmo padrão de `COMPONENT_CATALOG`) e uma por template de
arquitetura (`ARCHITECTURE_STYLES`, `Record<TemplateId, ...>`). `TemplateId` — um tipo novo,
união fechada dos 4 ids de template já existentes — passa a viver em `packages/knowledge` e ser
importado por `canvas-templates.ts` (`apps/web`), invertendo quem é dono da enumeração: garante em
tempo de compilação que todo template tem ficha e toda ficha corresponde a um template real (US1
Edge Case do spec). `packages/problems` ganha um campo opcional `source` em `Hint` e usa as 3
constantes de citação de `packages/knowledge` pras dicas novas de responsabilidade/acoplamento
(US3). `packages/narrator` recebe o conteúdo relevante como contexto adicional no prompt (US4).
UI nova (US1/US2, decisão de `/speckit-clarify`): um botão "?" em cada dimensão do `ScorePanel` e
em cada template do dropdown da topbar, abrindo a ficha correspondente.

## Technical Context

**Language/Version**: TypeScript 5.7 (mesma versão de todos os pacotes do monorepo)

**Primary Dependencies**: nenhuma dependência de runtime nova — `packages/knowledge` é TypeScript
puro (mesmo padrão de `packages/problems`/`packages/engine`); `packages/problems` ganha
`@sdp/knowledge` como dependência de workspace; `apps/web` ganha `@sdp/knowledge` como dependência
de workspace; `packages/narrator` ganha `@sdp/knowledge` como dependência de workspace

**Storage**: nenhuma — todo o conteúdo é dado estático versionado em código (arquivos `.ts`), sem
tabela nova, sem persistência

**Testing**: Vitest — mesmo padrão de todos os pacotes: `packages/knowledge` com teste de
exaustividade (as 7 dimensões e os 4 templates têm ficha, cada `source` aponta pra uma das 3 obras
reais); `packages/problems` com teste confirmando que toda dica com `source` cita uma das 3 obras;
`apps/web` com teste da UI restrito ao que já é padrão (nenhum teste de componente React — só
módulos puros em `src/lib/**`, se houver algum; a maior parte da UI nova é wiring, verificado por
`tsc`/build/checagem manual)

**Target Platform**: Web (Next.js App Router, `apps/web`) — nenhuma rota nova, só UI dentro dos
componentes já existentes (`ScorePanel`, `ChallengeTopBar`)

**Project Type**: Web application (monorepo já existente) — 1 pacote novo (`packages/knowledge`),
estende `packages/problems` (campo `source` em `Hint`), `packages/narrator` (prompt), `apps/web`
(UI de ficha + `TemplateId` importado em `canvas-templates.ts`)

**Performance Goals**: nenhuma meta nova — conteúdo estático, sem custo de rede/cálculo

**Constraints**: nenhum conteúdo sem `source` rastreável (FR-004); nenhum padrão de PoEAA de
camada de dado vira componente/cálculo novo (FR-005); narrador só pode citar o que existe em
`packages/knowledge` — nunca inventa uma fonte (FR-007); engine continua puro — `packages/engine`
não ganha nenhuma dependência nova, `packages/knowledge` só referencia o tipo `Dimension` (já
exportado por `@sdp/engine`), nunca o contrário

**Scale/Scope**: 7 fichas de característica, 4 fichas de estilo (escopo fechado nos templates já
existentes — ver Assumptions do spec, revisado em `/speckit-plan`), pelo menos 1 dica nova por
problema (3 problemas hoje), 2 pontos de UI novos (`ScorePanel`, `ChallengeTopBar`)

## Constitution Check

*GATE: verificado antes da Fase 0 e re-checado após a Fase 1.*

| Princípio | Como este marco cumpre | Risco de violação |
|---|---|---|
| I — Engine é a fonte da verdade, narrador nunca julga | Nenhum score/métrica nova — `packages/knowledge` é só texto explicativo sobre dimensões que o engine já calcula. Narrador cita o conteúdo, nunca gera um número a partir dele. | Nenhum. |
| II — Engine puro | `packages/engine` não ganha nenhuma dependência nova — `packages/knowledge` importa `Dimension` de `@sdp/engine` (direção já permitida, mesma que `packages/problems` já faz), nunca o contrário. | Nenhum — verificado por `tsc` isolado do pacote engine, como já é rotina. |
| III — Determinismo | Conteúdo estático — não há cálculo, então não há RNG nem não-determinismo possível. | Nenhum. |
| IV — Só pontua o caminho da requisição | Não aplicável — este marco não introduz cálculo de score novo. | Nenhum. |
| V — Score multidimensional, nunca nota única | As fichas explicam CADA dimensão separadamente — nunca introduzem um "score geral" ou ranking entre dimensões. | Baixo — a UI da ficha precisa evitar qualquer numeração que sugira ranking (ex. "dimensão #1 mais importante"). |
| VI — Modelo matemático é especificação | Não aplicável — nenhuma fórmula nova, nenhuma alteração das 7 já existentes. | Nenhum. |
| VII — Fronteira rígida de camadas | `packages/knowledge` é uma camada de dado nova, mas segue a mesma regra de `packages/problems`: puro, sem UI/rede/IO. `packages/narrator` só lê o conteúdo já pronto pra citar — nunca recalcula nem reescreve a definição. `apps/web` consome os dois via import direto, nunca duplica o texto. | Baixo. |

**Resultado**: nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/fundamentos-arquitetura/
├── plan.md                          # Este arquivo
├── research.md                      # Fase 0 — conteúdo autorado (fichas + dicas), fonte por item
├── data-model.md                    # Fase 1 — ArchitectureCharacteristic, ArchitectureStyle, TemplateId, Hint.source
├── quickstart.md                    # Fase 1 — verificação manual por user story
└── tasks.md                         # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/
└── knowledge/                       # NOVO — pacote de dado puro
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── src/
    │   ├── index.ts                 # API pública
    │   ├── source.ts                # 3 constantes de citação (Source)
    │   ├── architecture-characteristic.ts  # ARCHITECTURE_CHARACTERISTICS, Record<Dimension, ...>
    │   └── architecture-style.ts    # TemplateId, ARCHITECTURE_STYLES, Record<TemplateId, ...>
    └── test/
        ├── architecture-characteristic.spec.ts
        └── architecture-style.spec.ts

packages/
└── problems/
    ├── src/
    │   ├── types.ts                 # Hint ganha campo opcional `source?: Source` (de @sdp/knowledge)
    │   └── catalog/*.ts             # cada Problem ganha >= 1 hint novo com source (responsabilidade/acoplamento)
    └── test/
        └── hints-source.spec.ts     # NOVO — cada problem tem >= 1 hint com source (FR-003); toda
                                      # hint com source cita uma das 3 obras reais (FR-004)

packages/
└── narrator/
    └── src/
        ├── prompt.ts                # buildNarratorPrompt ganha um parâmetro opcional com conteúdo de knowledge relevante
        └── schema.ts                 # EXPLAIN_RESULT_SCHEMA ganha citationId (STRING enum dos ids de knowledge) —
                                       # parseNarratorExplanation rejeita qualquer id fora do enum (FR-007 testável)

apps/web/
├── next.config.ts                   # @sdp/knowledge entra em transpilePackages (import direto e
│                                     # transitivo via @sdp/problems/@sdp/narrator)
└── src/
    ├── lib/
    │   └── canvas-templates.ts      # ArchitectureTemplate.id passa a ser TemplateId (de @sdp/knowledge), não string solto
    ├── components/
    │   └── canvas/
    │       ├── score-panel.tsx           # + botão "?" por dimensão, abre CharacteristicSheet
    │       ├── challenge-topbar.tsx      # + botão "?" por template, abre StyleSheet
    │       ├── characteristic-sheet.tsx  # NOVO — modal/painel da ficha de uma dimensão
    │       └── style-sheet.tsx           # NOVO — modal/painel da ficha de um estilo
    └── test/
        └── template-ids.spec.ts     # NOVO — ARCHITECTURE_TEMPLATES e TemplateId têm exatamente o
                                      # mesmo conjunto de ids, sem duplicata (prova a mão dupla que
                                      # Record<TemplateId,...> sozinho não garante)
```

**Structure Decision**: `packages/knowledge` é o único pacote novo — dado puro, sem posição
ambígua entre "específico de um problema" (`packages/problems`) e "lógica do narrador"
(`packages/narrator`), porque características/estilos de arquitetura não pertencem a nenhum dos
dois. `TemplateId` migrar de `apps/web` pra `packages/knowledge`, com `ARCHITECTURE_STYLES: Record<
TemplateId, ArchitectureStyle>`, garante em compilação que toda ficha corresponde a um `TemplateId`
válido — mas `Record` por si só **não** garante a mão inversa (todo `TemplateId` tem um template
real em `ARCHITECTURE_TEMPLATES`, sem duplicata). Por isso `template-ids.spec.ts` (novo, acima) faz
essa segunda prova em runtime — mesmo padrão de teste de exaustividade já usado em `packages/knowledge`
pras 7 dimensões, só que aqui é preciso porque o array `ARCHITECTURE_TEMPLATES` não é indexado por
chave.

**Nota de governança (achado do `/speckit-plan`, não resolvido aqui)**: US4 altera
`buildNarratorPrompt`, mas o critério de saída oficial de M2 ("narrador nunca contradiz o engine em
20 submissões consecutivas") ainda não foi observado — M2 está `Ready`, não `Done`. Alterar o
prompt antes dessa observação levanta a pergunta de qual prompt está sendo verificado. Este plano
resolve o *desenho* de US4 (ver research.md), mas a decisão de sequenciamento (esperar M2 fechar,
ou re-rodar a verificação de M2 contra o prompt novo) fica para o autor confirmar antes do
`/speckit-implement` — não é uma decisão técnica que este plano deveria tomar sozinho.
