# Contract: fronteira canvas ↔ engine ↔ catálogo de problemas (M1)

**Input**: [data-model.md](../data-model.md), [research.md](../research.md).

Este marco não expõe nenhuma rota HTTP nova (submissão roda 100% client-side, research.md §6) —
o "contrato" aqui é a interface entre três módulos internos: `packages/problems` (dado),
`apps/web/src/lib/canvas-to-design.ts` (tradução) e `@sdp/engine` (cálculo, inalterado).

## `packages/problems` — API pública

```ts
function getProblem(id: string): Problem | undefined;
const ALL_PROBLEM_IDS: readonly string[];
```

**Regras**:
- `getProblem` nunca lança exceção — `id` desconhecido retorna `undefined` (a rota
  `/app/[problemId]` trata isso como 404, ver quickstart.md).
- `ALL_PROBLEM_IDS` contém exatamente 1 item neste marco: `"url-shortener"`.

## `canvas-to-design.ts` — API pública

```ts
function toDesign(nodes: FlowNode[], edges: FlowEdge[]): Design;
function toWorkload(problem: Problem): Workload;
```

**Regras** (contrato comportamental, testado em `apps/web/test/canvas-to-design.spec.ts`):

1. **Nunca lança exceção** — mesmo padrão de `simulate()` (FR-019 do engine, FR-016 do spec deste
   marco). Entrada malformada (arestas apontando para id inexistente, canvas vazio) produz um
   `Design` estruturalmente "vazio mas válido" (`nodes: []`, `edges: []`, `entryNodeIds: []`) — é o
   próprio `simulate()` quem then reporta a violação correspondente (`broken-edge-reference`,
   etc.), nunca o mapper.
2. **`entryNodeIds` = alvo de toda aresta cuja origem é um nó Cliente**, sem duplicata, mesmo que
   múltiplos Clientes apontem para o mesmo componente real.
3. **Nós Cliente nunca aparecem em `Design.nodes`** — não são `ComponentType`, não têm specs no
   catálogo do engine, não fariam sentido num `NodeResult`.
4. **Arestas partindo de um Cliente nunca aparecem em `Design.edges`** — não representam tráfego
   real entre dois componentes computáveis, só a semântica de entrada (regra 2).
5. **Pesos de aresta são repassados sem normalização própria** — a normalização (soma ≠ 100%) é
   responsabilidade exclusiva do engine (FR-018 de M0), o mapper não duplica essa lógica.
6. **`toWorkload` é determinística** — mesmo `Problem`, mesmo `Workload`, sempre (Constitution III).

## Fronteira que nunca deve ser cruzada (Constitution VII)

- `apps/web` MUST NOT recalcular utilização, latência, throughput, custo ou qualquer violação por
  conta própria — todo esse cálculo é exclusivamente `simulate()` de `@sdp/engine`, chamado depois
  de `toDesign`/`toWorkload`.
- `packages/engine` MUST NOT ganhar um `ComponentType` "client"/"cliente" neste marco — o conceito
  de Cliente existe só do lado do canvas (`apps/web`), nunca do lado do engine.
