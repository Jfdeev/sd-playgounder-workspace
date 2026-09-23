# Data Model: M2 — Avaliação e biblioteca

## `ComponentSpec` (estendido — `packages/engine/src/catalog/components.ts`)

```ts
export type ComponentSpec = {
  maxThroughputRps: number;
  baseLatencyMs: { p50: number; p99: number };
  monthlyCostUsd: number;
  /** NOVO — a, disponibilidade unitária por instância (0..1). Insumo da dimensão Disponibilidade
   *  (research.md §1) — fórmula já prescrita em docs/product-context.md §7 (série/paralelo). */
  availability: number;
};
```

Todas as 44 entradas de `COMPONENT_CATALOG` precisam ganhar `availability` — mesmo tratamento
exaustivo de M1.5 (`Record<ComponentType, ComponentSpec>` recusa build sem cobertura completa).
Valores ILUSTRATIVOS (mesma nota de D5 já presente no arquivo) — ex. componentes de borda/rede de
alta capacidade (VPC, CDN) tendem a `availability` mais alta (0.999+); bancos e filas, um pouco
menor (0.99-0.995); segue o mesmo espírito "plausível e redondo, não benchmark real" já declarado
no cabeçalho do arquivo.

## `SimulationResult.scores` (sem mudança de shape — `packages/engine/src/types.ts`)

Já é `Record<Dimension, number>` desde M0 (FR-020) — este marco só substitui `placeholderScores()`
por um cálculo real (`calculateScores`) em `packages/engine/src/scores/calculate.ts`. Nenhum campo
novo no tipo; a mudança é de implementação, não de contrato.

```ts
// packages/engine/src/scores/calculate.ts
export function calculateScores(
  design: Design,
  nodes: Record<NodeId, NodeResult>,
  path: PathResult,
  violations: readonly Violation[],
  cost: { monthlyTotal: number; byNode: Record<NodeId, number> },
  latencyBudgetMs: number | null,     // extraído da rubrica do problema ativo, ou null
  referenceCostUsd: number | null,    // custo da referenceSolution do problema ativo, ou null
): Record<Dimension, number>;
```

`latencyBudgetMs`/`referenceCostUsd` chegam de fora do engine (não são dados de `Design`/`Workload`
em si) — quem resolve isso é `apps/web` (lê a rubrica/`referenceSolution` do `Problem` ativo) e
passa como parâmetro. Mantém `packages/engine` puro (Constitution II): ele não sabe o que é um
`Problem`, só recebe os dois números já resolvidos. Sem desafio ativo (sandbox/"Simular"), ambos
chegam `null` — as dimensões Latência/Custo retornam 0 nesse caso (research.md §1), documentado,
nunca inventado.

## `Problem.referenceSolution` (novo campo — `packages/problems/src/types.ts`)

```ts
export type Problem = {
  // ...campos existentes (id, title, statement, functionalRequirements, nonFunctionalRequirements,
  // scale, rubric, hints)...
  /** NOVO — solução de referência autorada, valida 100% da própria rubrica quando simulada. */
  referenceSolution: {
    design: Design;       // mesmo shape que o engine consome — carregável direto no canvas
    reasoning: string;    // texto explicando o raciocínio das escolhas principais
  };
};
```

Campo obrigatório (não opcional) — força os 3 problemas existentes a serem atualizados no mesmo
incremento que adiciona o campo ao tipo (mesmo padrão de "todo `Problem` novo precisa preencher
todos os campos" já em vigor desde M1).

## `narrator_explanations` (nova tabela — `apps/web/src/db/schema.ts`)

```ts
export const narratorExplanations = pgTable('narratorExplanations', {
  designHash: text('designHash').primaryKey(),       // sha256, ver research.md §3
  summary: text('summary').notNull(),
  bottleneckExplanation: text('bottleneckExplanation').notNull(),
  recommendation: text('recommendation'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
});
```

Sem `userId`/relação com `users` — a explicação de um design é a mesma pra qualquer usuário que
submeta o mesmo design (cache compartilhado, não por-usuário), consistente com FR-005 ("nunca
repetindo a chamada ao provedor de LLM pro mesmo par [design, workload]", independente de quem
submeteu). Sem índice adicional além da PK — todo acesso é por `designHash` exato (get-or-create),
nunca por range/filtro.

## Fluxo de dados do narrador (Route Handler)

```
Client (apps/web canvas)
  → POST /api/narrator { design, workload, result: SimulationResult }
  → Route Handler:
      1. hash = sha256(canonicalize(design) + workload)   (research.md §3)
      2. SELECT narratorExplanations WHERE designHash = hash
      3. se encontrado → devolve direto (cache hit, RNF-6: zero chamada nova)
      4. se não encontrado → monta prompt (packages/narrator/src/prompt.ts) a partir só de `result`
         (nunca de `design`/`workload` brutos sem contexto) → chama Anthropic com tool use
         (research.md §2) → valida resposta contra o schema → INSERT narratorExplanations → devolve
  ← { summary, bottleneckExplanation, recommendation } | { error: '...' } (RNF-5/FR-010: nunca bloqueia o resultado do engine, que já foi devolvido antes desta chamada)
```
