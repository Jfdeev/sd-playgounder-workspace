# System Design Playground

## Leitura obrigatória antes de qualquer tarefa neste repo

- [`docs/product-context.md`](docs/product-context.md) — fonte de verdade funcional.
  Rege toda decisão de escopo, arquitetura e prioridade. Em caso de conflito com
  qualquer outro documento, **este vence**.
- [`docs/foundational-doc.md`](docs/foundational-doc.md) — documento completo
  (lista exaustiva de funcionalidades, concorrentes, diferenciais). Consultar
  quando precisar de mais profundidade do que a versão condensada oferece.

Nenhuma feature, dependência, endpoint ou decisão de arquitetura pode ser criada
fora do que está descrito nesses dois arquivos. Se algo necessário não estiver
lá, pare e pergunte ao autor — não assuma, não improvise.

## Estrutura do monorepo

```
apps/web/            # Next.js: canvas, problemas, resultado
packages/engine/      # cálculo puro — o ativo real do projeto
packages/knowledge/    # fichas de característica/estilo de arquitetura, dado versionado (M2.6)
packages/narrator/    # prompt + parsing da explicação em linguagem natural
packages/problems/    # catálogo de problemas + rubricas, como dados versionados
packages/ui/          # componentes compartilhados
```

Gerenciador de pacotes: **pnpm workspaces** (`pnpm-workspace.yaml`).

## Governança SDD

Este projeto segue Spec-Driven Development via GitHub Spec Kit
(`.specify/`). A ordem de construção é por marco (M0, M1, ...) conforme
`docs/product-context.md` §10 — nenhum marco começa antes do critério de saída
do anterior ser atingido.

<!-- SPECKIT START -->
**Plano ativo**: nenhum — M2.7 concluído; próximo da fila abaixo.

M2.7 — Biblioteca de princípios de arquitetura
([specs/biblioteca-principios-arquitetura/plan.md](specs/biblioteca-principios-arquitetura/plan.md)):
**concluído e verificado no browser (2026-10-07)**, `spec.md` em `Done`. `packages/knowledge` ganhou a
biblioteca (39 entradas aprovadas pelo autor em 2026-10-03 — 9 de Clean Architecture incluindo os 5
SOLID, 19 características de Richards & Ford fora das 7 dimensões, 11 padrões do Fowler só como
leitura), `validateLibraryEntries`, rota `/app/biblioteca` (herda o guard do layout), busca sem acento
(por nome, id ou grupo) e o link "Ler na biblioteca" nas 3 dicas do M2.6 (`Hint.libraryEntryId`) —
`tsc`/482 testes/build limpos. Engine, narrador, banco e `NARRATOR_PROMPT_VERSION` intocados. A
verificação achou e corrigiu 1 bug (busca por "solid" vazia).

Em fila, na ordem: **M2.5** Arquiteturas de referência
([specs/arquiteturas-referencia/tasks.md](specs/arquiteturas-referencia/tasks.md) — spec `Ready`, plan e
tasks prontos; aguarda o autor aprovar o `content-draft.md` do preset do GitHub) e **M2.8** Gamificação
([specs/gamificacao-progresso-conta/spec.md](specs/gamificacao-progresso-conta/spec.md) — `Draft`, 3
perguntas abertas). Ordem fora de sequência registrada no roadmap como decisão do autor.

M2.6 — Fundamentos de arquitetura ([specs/fundamentos-arquitetura/plan.md](specs/fundamentos-arquitetura/plan.md)):
**código completo e verificado no browser (2026-09-27)** — `packages/knowledge` (7 fichas de característica + 4
de estilo), dicas de responsabilidade/acoplamento, UI de ficha, narrador citando uma ficha real via
`citation_id`. Achou e corrigiu 2 bugs reais (narrador 500-ava em design saturado; timeout do narrador
subido de 5s pra 15s por decisão do autor — RNF-5/SC-003 de M2 atualizados). US4 foi implementada antes
do critério de saída do M2 (decisão do autor, 2026-09-26). O `spec.md` ainda está `Ready` (não promovido
a `Done`).

M2 — Avaliação e biblioteca ([specs/avaliacao-biblioteca-m2/plan.md](specs/avaliacao-biblioteca-m2/plan.md)):
**código completo** (US1-US4: score por dimensão, narrador via Google Gemini `gemini-2.5-flash`,
solução de referência, calculadora de capacidade) — `tsc`/381 testes/build limpos nos 4 pacotes.
Catálogo de problemas fica em 3 (não 6) neste marco — decisão de `/speckit-clarify`. **Spec `Done`
com ressalva (decisão do autor, 2026-10-03)**: critério de saída ("narrador nunca contradiz o engine
em 20 submissões consecutivas") aceito com 17/20 submissões reais contra o prompt v3, 0 contradições
— as 3 restantes bateram na cota do free tier do Gemini (20 req/dia). Pendências abertas: SC-003
(5/17 acima de 15s) e a própria cota limitando o narrador em produção. **v3 (2026-10-02)**: correção de 3 bugs do engine (throughput/gargalo comparava capacidade
com o λ total em vez de usar ρ; ramo async pesado escondia o ramo síncrono da latência; cache
ponderava percentis por (1−h) em vez do limiar de cauda) — números mudam pro mesmo design, então
o cache do narrador foi invalidado e submissões observadas antes disso não contam.

Marcos concluídos: M2.7 (Biblioteca de princípios, acima), M2 (Avaliação e biblioteca, com ressalva — acima), M1.5 (Catálogo expandido de componentes,
[specs/catalogo-expandido-m1-5/plan.md](specs/catalogo-expandido-m1-5/plan.md)), M1 (Canvas e
submissão, [specs/canvas-submissao-m1/plan.md](specs/canvas-submissao-m1/plan.md)), M0.5 (Landing
Page e Conta, [specs/landing-page-conta-m0-5/plan.md](specs/landing-page-conta-m0-5/plan.md)) — mais
um lote fora do fluxo formal entre M1.5 e M2 (canvas sandbox/desafios/templates/Simular,
[specs/canvas-sandbox-desafios-templates/decisions.md](specs/canvas-sandbox-desafios-templates/decisions.md)).
<!-- SPECKIT END -->
