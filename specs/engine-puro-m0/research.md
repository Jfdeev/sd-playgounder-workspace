# Research: M0 — Engine de Simulação Puro

**Input**: [spec.md](spec.md), `docs/product-context.md` §§6-8, `.specify/memory/constitution.md`

Nenhum agente especialista de domínio (`senior-frontend-react-dev`, `senior-backend-dev`) foi
consultado — nenhum se aplica a um pacote TypeScript puro sem React/Next.js/.NET. As decisões abaixo
foram tomadas diretamente, com apoio do Context7 para as bibliotecas citadas.

## 1. Runtime e linguagem

**Decision**: TypeScript 5.x em modo `strict`, sem build step próprio em M0 — o pacote é consumido
como fonte TS via workspace (`workspace:*`), transpilado pelo consumidor (hoje: Vitest; a partir de
M1: Next.js). Node.js 20 LTS como runtime de desenvolvimento/teste.

**Rationale**: constitution II exige zero dependência de UI/rede/IO — não há necessidade de um
bundler próprio enquanto só existe um consumidor de teste. Next.js (ADR-001) já transpila TS de
pacotes do workspace nativamente, então adicionar um passo de build (`tsup`, `tsc --build` para
`dist/`) agora seria complexidade sem uso em M0 (nenhuma abstração antes de precisar).

**Alternatives considered**: publicar `packages/engine` já compilado para `dist/` (via `tsc`) —
rejeitado por enquanto porque não há nenhum consumidor fora do monorepo neste marco; reavaliar se/
quando o pacote precisar ser publicado ou consumido fora do workspace.

## 2. Test runner e cobertura

**Decision**: [Vitest](https://vitest.dev) com provider de cobertura `@vitest/coverage-v8`,
configurado com `thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }` em
`packages/engine/vitest.config.ts` — falha o comando de teste se a cobertura cair abaixo de 80%,
automatizando o RNF-3/SC-003 em vez de checá-lo manualmente.

**Rationale**: nativo em TS/ESM sem configuração extra, rápido (Vite-powered), e a API de thresholds
do provider v8 mapeia 1:1 para o requisito de cobertura ≥80% do marco (confirmado via Context7,
`/vitest-dev/vitest`, doc `config/coverage.md`). Não há necessidade de `test.workspace`/`test.projects`
(modo monorepo do Vitest) ainda — M0 tem um único pacote com testes; reavaliar quando `apps/web`
também tiver testes em M1.

**Alternatives considered**: Jest — também viável e mais familiar em projetos Next.js, mas exige mais
configuração para ESM + TS puro sem `ts-jest`/babel; rejeitado para não adicionar transpilação extra
num pacote que não precisa de nenhuma.

## 3. Derivação de latência p50/p95/p99 a partir do modelo M/M/1

**Contexto**: `docs/product-context.md` §7 dá a fórmula do tempo médio de fila (`W = 1/(μ−λ)`), mas
FR-005 exige percentis (p50/p95/p99) da latência do caminho — e um modelo analítico não roda réplicas
de simulação para observar uma distribuição empírica.

**Decision**: usar o resultado padrão de teoria de filas para M/M/1 — o tempo de permanência no
sistema (`sojourn time`) é exponencialmente distribuído com taxa `(μ−λ)`, logo o percentil `p` é:

```
t_p = -ln(1 − p) / (μ − λ)   =   W · (-ln(1 − p))

p50 → t_p ≈ 0.693 · W
p95 → t_p ≈ 2.996 · W
p99 → t_p ≈ 4.605 · W
```

Para a latência do **caminho completo** (múltiplos nós em fila), soma-se a latência base de cada nó
mais o percentil de fila de cada nó, nó a nó — uma aproximação por soma de percentis, não uma
convolução estatisticamente exata das distribuições.

**Rationale**: é o resultado analítico padrão para M/M/1 (não uma escolha arbitrária), e a soma direta
por nó é consistente com ADR-003 (modelo analítico, não discrete-event) e com `docs/product-context.md`
§4 — o produto é explicitamente um "modelo analítico pedagógico", nunca promete precisão de produção.
Convolução exata de distribuições por caminho seria complexidade desproporcional ao valor pedagógico.

**Alternatives considered**: simulação discreta (Monte Carlo) para obter percentis empíricos —
rejeitada por ADR-003 (roda em ms no browser, DES é complexidade sem ganho pedagógico proporcional).

## 4. Algoritmo de propagação de carga e análises estáticas

**Decision**: representar o `Design` como grafo direcionado; propagar carga com uma travessia
topológica (BFS/DFS iterativo, não recursivo, para evitar estouro de pilha em grafos maiores) a partir
do(s) nó(s) de entrada; detectar ciclos com DFS de 3 cores (branco/cinza/preto) antes de tentar
qualquer ordenação topológica, isolando os nós em ciclo de qualquer ordenação linear.

**Rationale**: complexidade O(V+E), suficiente para bater a meta de <50ms em 30 nós (SC-002) com
folga larga — não há necessidade de nenhuma estrutura de dados mais sofisticada nessa escala.

**Alternatives considered**: nenhuma — a escala do problema (dezenas de nós) não justifica avaliar
alternativas mais complexas.

## 5. Números do catálogo de componentes (D5)

**Decision**: os ~10 componentes do catálogo (FR-014) usam uma tabela fixa de valores ilustrativos
(throughput máximo, latência base p50/p99, custo mensal), definida em `data-model.md` e materializada
como dado versionado em `packages/engine/src/catalog/components.ts` — não uma tabela de preços real
de nenhum provedor de cloud (D5, decisão do autor em `/speckit-specify`).

**Rationale**: D5 já decidiu isso; aqui só se resolve *onde* o dado mora e *que valores* usar (ver
data-model.md) para que os 3 designs de referência (SC-001) tenham uma base fixa para o cálculo à mão.

## Resumo — todas as incógnitas do Technical Context resolvidas

Nenhum `NEEDS CLARIFICATION` remanescente no Technical Context do `plan.md`.
