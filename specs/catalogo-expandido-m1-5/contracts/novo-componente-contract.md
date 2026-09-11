# Contrato: "registrar um `ComponentType` novo"

Não há API REST/CLI nesta feature — o "contrato" real é interno: toda vez que um `ComponentType`
novo é adicionado (US2 ou US3), ele MUST tocar exatamente estes 4 pontos, nesta ordem, ou o build
quebra (cada um é `Record<ComponentType | ConnectableKind, ...>`, exaustivo por construção —
seção "Racional" de `research.md` §1/§3/§4):

| # | Arquivo | O que adicionar | Consequência de esquecer |
|---|---|---|---|
| 1 | `packages/engine/src/types.ts` | novo literal na union `ComponentType` | nenhuma — é o gatilho; os 3 abaixo então falham de compilar |
| 2 | `packages/engine/src/catalog/components.ts` | entrada em `COMPONENT_CATALOG` (`maxThroughputRps`, `baseLatencyMs.{p50,p99}`, `monthlyCostUsd`) — arquétipo de `research.md` §2 | **erro de compilação** (`Record` incompleto) |
| 3 | `apps/web/src/lib/connection-rules.ts` | entrada em `ALLOWED_TARGETS` (lista de destinos permitidos) — regra de `research.md` §3 | **erro de compilação** |
| 4 | `apps/web/src/lib/canvas-ui-catalog.ts` | entrada em `COMPONENT_UI` (`label`, `icon`, `description` pedagógica) — FR-004 | **erro de compilação** |
| 5 | `apps/web/src/lib/component-categories.ts` | entrada em `CATEGORY_OF` — FR-001 | **erro de compilação** |

**Ordem de teste recomendada** (não obrigatória, mas evita retrabalho): 1 → roda `tsc` em
`packages/engine` (falha esperada) → 2 → roda `tsc` em `apps/web` (falha esperada nos pontos 3/4/5)
→ 3, 4, 5 → `tsc` limpo em ambos os pacotes.

**Fora deste contrato** (não é obrigatório por construção do tipo, mas é obrigatório pela spec):
- `connection-rules.spec.ts` MUST ganhar pelo menos 1 caso de aresta permitida e 1 proibida por
  componente novo (FR-003 da spec, não imposto pelo compilador).
- Nenhuma verificação automática garante que a *descrição* (ponto 4) é pedagogicamente correta —
  isso é responsabilidade de revisão humana entre fases (FR-007, checkpoint entre US2/US3).
