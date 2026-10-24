# Implementation Plan: M3 — Modo Incidente

**Branch**: `feature/001-incident-mode` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/modo-incidente-m3/spec.md` (Status: Ready)

## Summary

Um incidente é um design pronto + uma **falha** (transformação relativa e pura do design) + um alerta
+ um critério de fix. O estado "durante o incidente" é o engine rodando sobre o design com a falha
aplicada; o "antes", sobre o design original. O diagnóstico (componente + tipo) e o fix são conferidos
**no servidor**, que é o único lugar onde a falha plantada existe: o conteúdo é dividido num módulo
público (alerta, design, carga) e num módulo só-servidor (falha, critério, fix de referência), e o
servidor manda do estado "durante" só uma lista branca de métricas. Cada incidente passa por um teste
de **unicidade** — só o par plantado reproduz a tela — que é a definição operacional de "o engine
identifica a causa" (SC-001). Progresso usa os eventos idempotentes do M2.8 com tipos novos, sem
migração. O engine só ganha algo se o autor aprovar `capacityFactor` (pool esgotado).

## Technical Context

**Language/Version**: TypeScript 5.7

**Primary Dependencies**: nenhuma nova prevista — Next.js, Auth.js, Drizzle (já em uso). Proteção do
módulo secreto: `import 'server-only'` (o Next já resolve esse módulo; confirmar no `/speckit-implement`
— se não, a garantia vem só de o módulo ser importado exclusivamente por rotas, mais a checagem do
bundle)

**Storage**: Postgres (Neon) — **sem migração**: tipos novos em `scoringEvents.type` (coluna `text`)

**Testing**: Vitest. `packages/problems`: transformações de falha, busca de unicidade por incidente,
critério do fix (fix de referência aceito, original e "sem o alvo" recusados). `packages/engine`: só
se `capacityFactor` for aprovado (default 1 e snapshot de todos os designs existentes — SC-006).
`apps/web`: serializador do estado "durante" (sem campos do design com falha — SC-003), avaliação do
diagnóstico. Rotas finas; UI no browser (`quickstart.md`). Checagem do bundle (`.next/static` sem a
falha plantada).

**Target Platform**: Web (Next.js App Router)

**Project Type**: monorepo existente — `packages/problems` (incidentes + falhas), `packages/engine`
(talvez 1 campo opcional), `apps/web` (rotas, UI do incidente)

**Constraints**: causa nunca no navegador antes do acerto (FR-005, SC-003); todo número vem do engine
(FR-002); nada muda pra designs existentes (FR-012, SC-006); fix só depois do diagnóstico (FR-008);
XP uma vez (FR-009); conteúdo só após aprovação do autor

**Scale/Scope**: 5 incidentes (SC-001), 5 tipos de falha, 3 rotas de API, 1 modo novo no canvas

## Constitution Check

| Princípio | Como este marco cumpre | Risco |
|---|---|---|
| I — Engine é a fonte da verdade | "Antes" e "durante" são saídas do engine; alerta só descreve o que o engine mostra (SC-002) | Baixo |
| II — Engine puro | Falhas são funções puras sobre `Design` fora do engine; o engine só ganha um campo opcional se aprovado | Baixo |
| III — Determinismo | Falha e regra de zonas determinísticas; mesmo design → mesmo veredito | Nenhum |
| IV — Só pontua o caminho | Inalterado | Nenhum |
| V — Score multidimensional | Resolver incidente dá XP de estudo, nunca nota agregada (FR-013) | Nenhum |
| VI — Modelo matemático | Fórmulas intocadas; `capacityFactor` (se aprovado) só multiplica a capacidade | Baixo |
| VII — Fronteira de camadas | Falhas e incidentes em `packages/problems`; avaliação no servidor (`apps/web`) | Nenhum |

**Resultado**: sem violação. `capacityFactor` contraria a linha "reaproveita 100% do engine" do roadmap
— por isso é gate do autor (`docs/product-context.md` vence conflitos).

## Project Structure

### Documentation

```text
specs/modo-incidente-m3/
├── spec.md            # Ready (clarify 2026-10-24)
├── plan.md            # este arquivo
├── research.md        # modelagem das falhas, unicidade, vazamento, lista branca
├── data-model.md      # Fault, Incident (público × secreto), eventos
├── contracts/incident-api.md
├── content-draft.md   # os 5 incidentes — depois dos gates 1–4, com as checagens já rodadas
├── quickstart.md
└── tasks.md           # /speckit-tasks
```

### Source Code

```text
packages/problems/src/incidents/
├── faults.ts          # Fault (5 tipos) + applyFault(design, fault) — puro
├── zones.ts           # regra de zonas (gate 2) — puro
├── uniqueness.ts      # aplica todo par (componente × tipo) e compara snapshots — puro
├── public.ts          # incidentes públicos: id, título, alerta, design, carga
└── secret.ts          # falha plantada, critério do fix, fix de referência (só servidor)

packages/engine/src/   # só se o gate 3 aprovar: `capacityFactor?` em DesignNode

apps/web/src/
├── lib/incidents/
│   ├── snapshot.ts         # serializador do estado "durante" (lista branca, gate 4)
│   ├── diagnosis.ts        # compara (componente, tipo) → acerto / componente certo / errado
│   └── fix.ts              # avalia o critério do fix com a falha aplicada
├── app/api/incidents/[id]/route.ts            # GET: estado "durante" (snapshot) + status do usuário
├── app/api/incidents/[id]/diagnosis/route.ts  # POST: diagnóstico
├── app/api/incidents/[id]/fix/route.ts        # POST: fix
└── components/incidents/   # menu "Incidentes", painel do incidente (alerta, antes × agora, diagnóstico)
```

**Structure Decision**: conteúdo e regras puras em `packages/problems` (é o pacote de "catálogo +
rubricas"), separados em público e secreto; o servidor importa o secreto só em rotas. Nenhum pacote
novo.

## Gates antes do `/speckit-tasks`

1. **Definição de "o engine identifica a causa"** (research §3): só o par plantado reproduz as
   métricas expostas, verificado por busca sobre todo componente × todo tipo.
2. **Regra de zonas** (research §2): 3 zonas fixas, réplicas em rodízio, perder uma zona remove
   `ceil(r/3)` de cada nó; nó de 1 réplica morre.
3. **`capacityFactor` no engine** (research §8) para pool esgotado — contraria "reaproveita 100% do
   engine". Sem ele, pool esgotado fica fora (4 tipos de falha) ou indistinguível de nó caído.
4. **Lista branca das métricas "durante"** (research §5): utilização, status e carga por nó; latência,
   throughput e violações do caminho; nunca réplicas/capacidade/taxa de acerto.
5. **Os 5 incidentes** (`content-draft.md`), redigidos depois dos gates 1–4 e já passando nas
   checagens mecânicas (research §6).

## Fora de escopo

Placar de tempo até o diagnóstico (P2); série temporal/gráfico ao longo do tempo; modelo de erro
(taxa de erro HTTP); LLM julgando diagnóstico; trava de ordem entre incidentes.
