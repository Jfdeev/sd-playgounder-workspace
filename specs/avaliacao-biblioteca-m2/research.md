# Research: M2 — Avaliação e biblioteca

## §1. Fórmula de cada dimensão de score — PROPOSTA, pendente de aprovação do autor (Constitution VI)

`docs/product-context.md` §7 prescreve fórmulas pra métricas que já existem (utilização, fila,
latência, custo, disponibilidade em série/paralelo, quórum) — mas nenhuma delas é, sozinha, "a nota
de uma dimensão de 0 a 100". Score por dimensão é um modelo **novo**, não coberto literalmente por
§7. Constitution VI: "qualquer fórmula alternativa é uma mudança de especificação e MUST ser
aprovada explicitamente pelo autor antes de ser implementada — nunca decidido unilateralmente
durante o desenvolvimento." As propostas abaixo usam blocos já calculados/prescritos como
insumo, mas a função de agregação em si (como virar isso um score 0-100) é uma decisão de produto
que precisa de aprovação antes de `/speckit-implement` codificar `packages/engine/src/scores/calculate.ts`.

Convenção proposta: todo score em escala **0-100**, inteiro, clampado — mesma unidade em todas as
7 dimensões, fácil de comparar visualmente sem sugerir uma soma/média (o painel nunca soma).

| Dimensão | Proposta de cálculo | Insumo (já calculado por `simulate()`) |
|---|---|---|
| **Escalabilidade** | `100 - round(max(ρ) × 100)` sobre os nós do caminho crítico — quanto mais perto da saturação, menor o score; um design com folga (ρ baixo em todo o caminho) pontua alto. | `nodes[id].utilization` de cada nó em `path` |
| **Disponibilidade** | Fórmula já prescrita em §7 (série/paralelo): `A_nó = 1 − (1 − a)^réplicas`, `A_caminho = Π A_nó` ao longo do caminho crítico, score = `round(A_caminho × 100)`. Precisa de um `a` (disponibilidade unitária por instância) novo em `ComponentSpec` — hoje o catálogo só tem `maxThroughputRps`/`baseLatencyMs`/`monthlyCostUsd`. Violação `spof` (já detectada) zera o score do nó envolvido antes da multiplicação (SPOF = disponibilidade efetiva 0 naquele ponto). | `node.replicas`, `violations` (tipo `spof`), + campo novo `a` no catálogo |
| **Latência** | Normalizado contra o próprio limiar de latência já autorado na rubrica do problema (`RubricCriterion` do tipo `latency-p99`, ex. "≤100ms" no Encurtador de URL) — não um valor arbitrário novo. `score = clamp(100 - round((p99 / limiar - 1) × 100), 0, 100)`: p99 igual ao limiar = 100; acima, cai proporcionalmente. Se o problema não tiver um critério de latência explícito na rubrica, o score de latência não é calculável de forma justa — nesse caso a dimensão retorna `0` com uma nota de que não há limiar definido (nunca inventar um número). | `path.latency.p99`, limiar extraído do texto/id do critério de rubrica do problema |
| **Custo** | Normalizado contra o custo da **solução de referência** do problema (US3, `referenceSolution.design` simulado com a mesma escala) — não um valor de mercado real (D5: tabela ilustrativa, não preço de cloud). `score = clamp(100 - round((custo / custo_referência - 1) × 100), 0, 100)`: custo igual à referência = 100; mais caro, cai proporcionalmente; mais barato que a referência nunca ultrapassa 100 (evita pontuar acima do teto por "economizar" à custa de saturar/menos réplicas — já capturado por escalabilidade/disponibilidade baixas nesse caso). | `cost.monthlyTotal` do design atual vs. do `referenceSolution` |
| **Consistência** | Proxy estrutural (o engine não modela quórum R/W/N explicitamente): presença de aresta `replication` no caminho = consistência eventual (score fixo mais baixo, proposto 60); ausência de replicação (sem múltiplas cópias de dado) = consistência forte por padrão (proposto 100). É uma leitura binária do `EdgeKind`, não uma medição contínua — documentado como tal, nunca apresentado como "calculado com precisão". | `design.edges` (presença de `kind: 'replication'`) |
| **Complexidade operacional** | Proxy estrutural: `100 - round(min(nodes.length × 3, 100))` — cada nó no design é uma peça operacional a mais pra manter; mais violações (`violations.length`) subtraem adicionalmente (`- violations.length × 5`, clampado em 0). Não lê nenhuma métrica de "operabilidade" real (não modelada pelo engine) — é uma contagem estrutural transparente. | `design.nodes.length`, `violations.length` |
| **Segurança** | Proxy estrutural: presença de componentes de segurança no caminho de entrada (`waf`, `rate_limiter`, `auth_service`) soma pontos fixos (ex. +30 cada, até 100); ausência de todos = score baixo (proposto 10, nunca 0 — "sem componente de segurança" não é necessariamente "zero seguro" pra todo problema, mas é um sinal forte de ausência de camada). Não é uma auditoria de segurança real — o engine não modela vulnerabilidade nenhuma. | `design.nodes` (presença de `waf`/`rate_limiter`/`auth_service` tipo) |

**Duas dimensões (Disponibilidade, Custo) dependem de dado que ainda não existe**: `a` (disponibilidade
unitária) precisa ser adicionado a `ComponentSpec` pras 44 entradas do catálogo (mesmo tratamento
exaustivo de M1.5 — `Record<ComponentType, ComponentSpec>` força a cobertura); Custo depende de
US3 (solução de referência) estar pronta antes de US1 poder calcular a dimensão de custo — muda a
ordem de implementação sugerida em `tasks.md` (US3 antes da parte de custo de US1, mesmo com
prioridade de produto P1 > P3).

**Decisão**: nenhuma escolhida ainda. Este documento propõe; a aprovação acontece antes de
`/speckit-implement` gerar código pra `packages/engine/src/scores/calculate.ts` — ver nota em
`tasks.md`.

## §2. Schema de resposta estruturada do narrador

**Decision**: usar tool use da API da Anthropic (`tools` + `tool_choice: {type: 'tool', name: 'explain_result'}`)
com um schema JSON que só aceita campos de texto — nenhum campo `number`/`integer` no schema.

```json
{
  "name": "explain_result",
  "input_schema": {
    "type": "object",
    "properties": {
      "summary": { "type": "string", "description": "1-2 frases resumindo o resultado" },
      "bottleneck_explanation": { "type": "string", "description": "por que este nó é o gargalo, em linguagem natural" },
      "recommendation": { "type": "string", "description": "uma sugestão textual de melhoria, sem propor um número específico de réplicas" }
    },
    "required": ["summary", "bottleneck_explanation"]
  }
}
```

**Rationale**: tool use força o modelo a responder no shape exato — não há campo pra "inventar" um
número, e mesmo que o texto livre (`summary`, etc.) mencione um número solto, esse número já
precisa ter vindo do prompt (que só contém dados de `SimulationResult`) pra ser plausível — não é
uma garantia absoluta contra alucinação textual, mas é a garantia mecânica de que nenhum CAMPO
estruturado de saída é numérico, o mínimo que a Constitution exige ("nenhum número exibido pode ter
origem em LLM" — os números exibidos na UI continuam vindo só de `SimulationResult`, o narrador
nunca populariza um campo separado que a UI leria como métrica).

**Alternatives considered**: pedir markdown livre e extrair texto — rejeitado, mais difícil de
validar estrutura/tamanho, sem garantia de quais seções existem. JSON mode sem tool use — Anthropic
recomenda tool use para schema estrito; mesmo efeito, tool use é o padrão mais documentado.

## §3. Hash de cache do narrador

**Decision**: `sha256(JSON.stringify(canonicalize(design)) + '|' + JSON.stringify(workload))`, onde
`canonicalize` ordena `nodes`/`edges` por `id` antes de serializar — dois designs logicamente iguais
mas com nodes/edges em ordem diferente (ex. depois de um undo/redo) devem compartilhar cache.
Calculado no Route Handler (`apps/web/src/app/api/narrator/route.ts`), usando `crypto.subtle.digest`
(Web Crypto, disponível no runtime Node do Route Handler) — sem dependência nova.

**Rationale**: FR-005 exige cache por hash do design; sem canonicalização, o mesmo design lógico
gerado em ordens diferentes (ex. `nodes` re-serializados após uma operação do zundo) geraria hashes
diferentes, perdendo cache hits sem motivo semântico.

**Alternatives considered**: hash só do `design.nodes.length` + `design.edges.length` (rejeitado —
colisão trivial entre designs bem diferentes); incluir `Workload.rps` exato no hash (mantido — dois
workloads com rps diferentes podem ter resultado/explicação diferentes, então precisam de entradas
de cache diferentes).

## §4. Fórmula de capacidade compartilhada (calculadora + `toWorkload`)

**Decision**: extrair `averageRps(dau, requestsPerUserPerDay)` e `peakRps(averageRps, peakMultiplier)`
de `apps/web/src/lib/canvas-to-design.ts` pra um módulo puro novo (`apps/web/src/lib/capacity-formula.ts`),
usado tanto por `toWorkload(problem)` quanto pela calculadora nova (US4) — nunca duas implementações
da mesma conta (DRY, já pedido pelo autor nesta sessão em pedidos anteriores).

**Rationale**: `toWorkload()` já faz exatamente essa conta (`(dau * requestsPerUserPerDay) / 86_400`);
duplicá-la na calculadora seria a mesma fórmula em dois lugares — risco de um dia divergirem
silenciosamente.
