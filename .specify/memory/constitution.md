<!--
Sync Impact Report
==================
Version change: (none) → 1.0.0
Rationale: Initial ratification. No prior constitution existed for this repository.

Principles established:
  I.   Engine é a Fonte da Verdade — Narrador Nunca Julga
  II.  Engine Puro — Zero Dependência de UI, Rede ou IO
  III. Determinismo Total
  IV.  Só Pontua o Caminho da Requisição
  V.   Score Multidimensional — Nota Única é Proibida
  VI.  Modelo Matemático é Especificação, Não Sugestão
  VII. Fronteira Rígida de Camadas (Engine / Aplicação / Narrador)

Added sections:
  - Restrições Técnicas Adicionais (contrato do engine)
  - Fluxo de Trabalho SDD (marcos M0..M6, regra "pare e pergunte")
  - Governance

Removed sections: none (initial version)

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — genérico, já referencia "Constitution Check"
     como gate dinâmico; nenhuma mudança estrutural necessária.
  ✅ .specify/templates/spec-template.md — genérico, sem menções desatualizadas.
  ✅ .specify/templates/tasks-template.md — genérico, sem menções desatualizadas.
  ⚠ Nenhum command file em .specify/templates/commands/ encontrado nesta versão do
    Spec Kit instalado (comandos vivem como skills do plugin devkit); nada a
    sincronizar ali.
  ⚠ docs/product-context.md e docs/foundational-doc.md são a fonte, não o alvo,
    de sincronização — não alterados por esta amendment.

Follow-up TODOs: nenhum. Todos os placeholders do template foram preenchidos com
valores concretos extraídos de docs/product-context.md §§2,3,5,6,7 ou da instrução
direta do autor nesta sessão.
-->

# System Design Playground Constitution

## Core Principles

### I. Engine é a Fonte da Verdade — Narrador Nunca Julga

O engine de simulação (`packages/engine`) é a origem de **todo** número, nota ou
métrica exibida no produto. O narrador (`packages/narrator`, baseado em LLM) MUST
apenas explicar em linguagem natural um resultado que o engine já calculou — ele
NUNCA produz, corrige, arredonda ou infere um número, nota ou métrica por conta
própria. Se um valor aparece na tela, ele tem que ser rastreável até uma função
determinística do engine.

**Racional**: é a tese central do produto (`docs/product-context.md` §2). Todo
concorrente usa LLM como juiz, o que é irreprodutível e premia o design que
*parece* certo em vez do que aguenta carga. Separar cálculo (engine) de explicação
(narrador) é o que torna o produto reproduzível e é o diferencial competitivo.

### II. Engine Puro — Zero Dependência de UI, Rede ou IO

`packages/engine` MUST ser TypeScript puro. Ele NUNCA importa React, Next.js,
cliente HTTP ou SDK de LLM. Sua API pública é uma função pura sem side effects:

```ts
simulate(design: Design, workload: Workload): SimulationResult
```

Nenhuma chamada de rede, leitura de arquivo, acesso a banco ou estado global
mutável é permitida dentro do pacote.

**Racional**: é o que garante que o engine seja testável isoladamente, rode tanto
no browser (preview instantâneo) quanto no servidor (submissão oficial), e possa
ter sua UI trocada no futuro sem risco (`docs/product-context.md` §5, §6).

### III. Determinismo Total

Mesmo `design` + mesmo `workload` MUST produzir sempre o mesmo `SimulationResult`,
bit a bit. É proibido qualquer gerador de número aleatório não-semeado em qualquer
cálculo que afete o resultado reportado ao usuário.

**Racional**: reprodutibilidade é a promessa central do produto — "mesmo design,
mesma nota, sempre" (`docs/product-context.md` §2, princípio 3 da §3).

### IV. Só Pontua o Caminho da Requisição

Um componente (nó) colocado no canvas mas desconectado do grafo de execução da
requisição MUST valer zero na pontuação, mesmo que tecnicamente "correto" para o
problema. O engine só considera, em qualquer cálculo de score, os nós alcançáveis
a partir da entrada pelo caminho real de tráfego.

**Racional**: regra anti-decoreba — impede que o usuário aprenda a "empilhar
componentes bons" sem entender o fluxo real de uma requisição
(`docs/product-context.md` §3, princípio 4).

### V. Score Multidimensional — Nota Única é Proibida

O resultado de uma submissão MUST reportar score por dimensão independente —
escalabilidade, disponibilidade, latência, consistência, custo, complexidade
operacional, segurança — nunca uma nota única agregada. Cada dimensão tem sua
própria justificativa vinda do engine.

**Racional**: nota única esconde o trade-off, que é exatamente a coisa que o
produto existe para ensinar. Um design 9 em latência e 3 em custo pode estar
certo para o requisito dado (`docs/product-context.md` §3 princípio 5, §9).

### VI. Modelo Matemático é Especificação, Não Sugestão

As fórmulas descritas em `docs/product-context.md` §7 MUST ser implementadas
exatamente como estão, sem aproximação livre ou substituição por heurística
própria:

```
Vazão do caminho    throughput = min(capacidade de cada nó no caminho)
Utilização           ρ = λ / (c · μ)
Fila (M/M/1)         W = 1 / (μ − λ)
Lei de Little        L = λ · W
Cache                latência = h·L_cache + (1−h)·(L_cache + L_db)
                     carga_no_db = λ · (1 − h)
Cauda em fan-out     P(todas rápidas) = (1 − p)^N
Retry storm          λ_efetivo = λ · (1 + r + r² + …)
Disponibilidade      série: A = ΠAᵢ   ·   paralelo: A = 1 − (1 − a)ⁿ
Quórum               R + W > N  para consistência forte
```

Qualquer desvio dessas fórmulas (aproximação, simplificação, fórmula alternativa)
é uma mudança de especificação e MUST ser aprovado explicitamente pelo autor antes
de ser implementado — nunca decidido unilateralmente durante o desenvolvimento.

**Racional**: o modelo matemático é o ativo pedagógico central do produto; um
desvio silencioso da fórmula quebra a promessa de que o engine ensina teoria de
filas e teoria de sistemas distribuídos corretamente.

### VII. Fronteira Rígida de Camadas (Engine / Aplicação / Narrador)

O sistema MUST manter três camadas com fronteira rígida, nunca misturadas:

| | Engine | Aplicação | Narrador |
|---|---|---|---|
| Onde | `packages/engine` | `apps/web` | `packages/narrator` |
| Faz | calcula métricas | canvas, UI, persistência | explica em texto |
| Depende de | nada (TS puro) | engine, narrador, DB | resultado do engine |
| Determinístico | sim | — | não |
| Produz número | sim | não | nunca |

Anti-padrões explicitamente proibidos:

- LLM produzindo qualquer métrica, nota ou número.
- `packages/engine` importando React, Next.js, cliente HTTP ou SDK de LLM.
- Código de UI (`apps/web`) recalculando uma métrica por conta própria em vez de
  chamar o engine.

**Racional**: é a decisão arquitetural mais importante do sistema
(`docs/product-context.md` §5) — as violações acima destroem a garantia de
determinismo e reprodutibilidade das seções I a III.

## Restrições Técnicas Adicionais

O contrato do engine — tipos `Design`, `Workload` e `SimulationResult`
(`docs/product-context.md` §6) — é a API mais importante do repositório. Qualquer
mudança de shape nesses tipos é uma mudança breaking e MUST ser tratada como tal:
revisão explícita, e propagação para todo consumidor (`apps/web`,
`packages/narrator`, testes de referência do engine) antes de ser mesclada.

## Fluxo de Trabalho SDD

Este projeto segue Spec-Driven Development. A ordem de construção é por marco
(M0, M1, M2, ...) conforme `docs/product-context.md` §10 — nenhum marco começa
antes do critério de saída do marco anterior ser atingido.

Nenhuma feature, dependência, endpoint ou decisão de arquitetura MUST ser criada
fora do que está descrito em `docs/product-context.md` ou `docs/foundational-doc.md`.
Se algo necessário para avançar uma fase do SDD (constitution, specify, clarify,
plan, tasks, implement) não estiver coberto por esses dois documentos, o agente
MUST parar e perguntar ao autor — nunca assumir ou improvisar a decisão.

## Governance

Esta constitution tem precedência sobre qualquer prática, template ou preferência
de estilo em conflito dentro deste repositório.

**Emendas**: qualquer alteração de um princípio MUST (a) ser proposta com o
racional da mudança, (b) incrementar a versão conforme a política abaixo, e (c)
propagar a mudança para `.specify/templates/plan-template.md`,
`.specify/templates/spec-template.md` e `.specify/templates/tasks-template.md`
quando aplicável.

**Versionamento semântico**:
- MAJOR — remoção ou redefinição incompatível de um princípio existente.
- MINOR — novo princípio adicionado, ou orientação existente expandida
  materialmente.
- PATCH — esclarecimento de redação, correção de typo, refinamento não-semântico.

**Revisão de conformidade**: todo `/speckit-plan` MUST passar pelo gate
"Constitution Check" antes da Fase 0 de pesquisa, e re-checar após o design da
Fase 1. Qualquer violação MUST ser justificada na seção "Complexity Tracking" do
plano ou eliminada antes de prosseguir.

**Version**: 1.0.0 | **Ratified**: 2026-08-11 | **Last Amended**: 2026-08-11
