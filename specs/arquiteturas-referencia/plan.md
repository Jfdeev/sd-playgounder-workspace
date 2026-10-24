# Implementation Plan: M2.5 — Arquiteturas de referência

**Branch**: `feature/001-reference-architectures-presets` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/arquiteturas-referencia/spec.md` (Status: Ready)

## Summary

Presets de arquiteturas reais como **dado versionado** em `packages/knowledge` (módulo
`reference-architectures`): cada preset é um `Design` do catálogo existente + fontes web lidas +
explicação por componente + limitações declaradas, tudo escrito com revisão do autor — **sem LLM em
runtime** (Clarifications). Carregar usa o que já existe (`designToCanvas` + `loadDesign` + a
confirmação destrutiva de templates/solução de referência). O que é novo: um menu "Arquiteturas" no
canvas livre, `loadedPresetId` no store do canvas (aviso de valores ilustrativos e explicação no nó), e
testes que provam que cada preset obedece à matriz de conexões e simula sem violação. **Engine, narrador,
prompt v3 e banco não mudam.** O MVP é o preset do **GitHub**; os demais entram um a um (US4).

## Technical Context

**Language/Version**: TypeScript 5.7

**Primary Dependencies**: nenhuma nova — `@sdp/knowledge`, `@sdp/engine` (tipos), `lucide-react`

**Storage**: nenhuma — **sem tabela, sem migração, sem rota de API**

**Testing**: Vitest. `packages/knowledge`: invariantes de dado (fontes, explicações, `basis`,
limitações). `apps/web`: integridade dos presets contra `isValidCanvasConnection` e `simulate()`
(`apps/web/test/`, onde a matriz vive). **Sem teste de componente/rota** — convenção de M0.5; UI no
browser (`quickstart.md`).

**Target Platform**: Web (Next.js App Router) — sem rota nova; UI dentro do canvas existente

**Project Type**: monorepo existente — estende `packages/knowledge` e `apps/web`

**Performance Goals**: nenhuma — conteúdo estático, sem rede

**Constraints**: toda aresta aceita pela matriz de conexões e zero violação estrutural (FR-002); todo
componente com fonte lida e explicação (FR-003/006); conexão afirmada × inferida (FR-003); presets só
em sandbox (FR-009); **nada no engine/narrador/prompt** (FR-010); conteúdo só entra em código depois da
aprovação do autor (FR-008)

**Scale/Scope**: 1 preset no MVP (GitHub, 6 componentes, 6 conexões); até 5 na primeira leva

## Constitution Check

| Princípio | Como este marco cumpre | Risco |
|---|---|---|
| I — Engine é a fonte da verdade | Presets são `Design`s; todo número exibido vem do `simulate()`. Explicações são texto e não trazem números fora das fontes. Sem LLM em runtime | Baixo — réplicas ilustrativas podem ser lidas como dado real; mitigado por FR-005 (aviso) |
| II — Engine puro | `packages/engine` intocado; `knowledge` só importa tipos | Nenhum |
| III — Determinismo | Dado estático; mesma carga → mesmo resultado | Nenhum |
| IV — Só pontua o caminho da requisição | Todo nó do preset é alcançável pela entrada (teste: zero `orphan-node`) | Nenhum |
| V — Score multidimensional | O resultado continua com as 7 dimensões; o aviso é texto, nunca agrega | Nenhum |
| VI — Modelo matemático | Nenhuma fórmula tocada | Nenhum |
| VII — Fronteira de camadas | Dado em `knowledge`, UI em `apps/web`, narrador não participa | Nenhum |

**Resultado**: sem violação; sem entrada em Complexity Tracking.

## Project Structure

### Documentation

```text
specs/arquiteturas-referencia/
├── plan.md            # este arquivo
├── research.md        # registro de fontes (lido × aberto × inacessível), viabilidade, decisões
├── content-draft.md   # preset do GitHub completo — AGUARDA aprovação do autor (FR-008)
├── data-model.md      # WebSource, PresetNode/Edge, ReferenceArchitecture, invariantes
├── quickstart.md      # verificação por user story
└── tasks.md           # /speckit-tasks
```

### Source Code

```text
packages/knowledge/
├── src/reference-architectures.ts      # NOVO — tipos + REFERENCE_ARCHITECTURES + toDesign
├── src/presets/github.ts               # NOVO — preset do MVP (um arquivo por preset)
└── test/reference-architectures.spec.ts # NOVO — invariantes de dado

apps/web/
├── src/stores/canvas-store.tsx         # + loadedPresetId (limpo em outro loadDesign/limpar/trocar desafio)
├── src/components/canvas/
│   ├── reference-architectures-menu.tsx # NOVO — dropdown "Arquiteturas" + detalhe (resumo, fontes, limitações)
│   ├── challenge-topbar.tsx            # + o menu (desabilitado dentro de desafio)
│   ├── canvas-workspace.tsx            # + handler de carregar preset (confirmação destrutiva, designToCanvas)
│   ├── <painel do nó selecionado>      # + "Por que está aqui" quando loadedPresetId
│   └── result-panel.tsx                # + aviso "valores ilustrativos" quando loadedPresetId
└── test/reference-architectures.spec.ts # NOVO — arestas ∈ matriz de conexões; simulate() sem violação
```

**Structure Decision**: `knowledge` guarda o dado (já é o pacote de "dado puro com citação"); os
presets **não** reaproveitam `ArchitectureTemplate`/`TemplateId` (forçaria uma ficha de estilo por
empresa). A matriz de conexões vive em `apps/web`, então o teste de integridade vive lá. Nada em
`packages/engine`, `packages/narrator`, `apps/web/src/db`, `/api/narrator` ou `next.config.ts`.

## Gates antes do `/speckit-implement`

1. **Conteúdo do GitHub (FR-008)**: o autor revisa/aprova `content-draft.md`. Sem isso, nada vira
   código — mesmo gate de M2 (fórmulas), M2.6 e M2.7.
2. **Por preset adicional (US4)**: antes de redigir iFood e Nubank, ler as fontes marcadas "aberta,
   não lida" em `research.md`; cada preset tem o seu gate. Um preset cujas fontes não sustentem os
   componentes fica de fora.
3. Atualizar o roadmap (M2.5): a explicação passa a ser "LLM como rascunho em autoria, revisada" — não
   o narrador em runtime (decisão do autor, feita junto deste plan).

## Fora de escopo

Mudar a matriz de conexões ou o catálogo de componentes; preset editável com sincronização das
explicações; explicação em runtime por LLM; salvar o preset na conta (M4); XP por carregar preset
(M2.8, FR-009).
