# Research: M1.5 — Catálogo expandido de componentes do canvas

**Input**: [spec.md](spec.md) (Ready, clarificado — 3 perguntas resolvidas, Session 2026-08-25).

Nenhum `NEEDS CLARIFICATION` sobrevive no Technical Context deste plano — as duas únicas
incógnitas reais da feature (fasear ou não; tratamento de Observability/Network) já foram
resolvidas no `/speckit-clarify`. Este documento resolve as incógnitas *técnicas* que restam para
poder escrever `data-model.md` e `tasks.md` sem inventar nada durante a implementação.

## 1. Onde o catálogo de specs do engine já vive (não é preciso criar)

**Decisão**: `packages/engine/src/catalog/components.ts` já existe, com exatamente a forma que
FR-002 da spec pressupõe: `export const COMPONENT_CATALOG: Record<ComponentType, ComponentSpec>`,
`ComponentSpec = { maxThroughputRps, baseLatencyMs: { p50, p99 }, monthlyCostUsd }`. Cada valor é
declarado como ilustrativo (comentário do próprio arquivo, D5 de `docs/product-context.md`).

**Racional**: como o catálogo é tipado `Record<ComponentType, ComponentSpec>`, o próprio
TypeScript recusa compilar se `ComponentType` ganhar um valor novo em `types.ts` sem uma entrada
correspondente aqui — não há como esquecer um componente novo sem specs. Isso vira o mecanismo de
verificação principal de FR-002/FR-005/FR-006 (nenhuma tarefa extra de "conferir que todos têm
spec" é necessária além de rodar `tsc`).

**Alternativas consideradas**: catálogo separado por categoria (`observability-catalog.ts`,
`network-catalog.ts`) — rejeitado; fragmentaria a fonte única de verdade do engine sem benefício,
e a spec já trata todo componente novo como um `ComponentType` de primeira classe, igual aos 11 de
M0/M1.

## 2. Como derivar specs plausíveis para 33 componentes novos sem inventar números soltos

**Decisão**: agrupar os 33 componentes novos em **arquétipos de comportamento**, ancorados nos
valores já existentes em `COMPONENT_CATALOG` para os 11 componentes de M0/M1 — nunca um número
"do nada". Cada arquétipo herda a ordem de grandeza do componente existente mais próximo em papel:

| Arquétipo | Componentes novos que se encaixam | Âncora existente (M0/M1) | Racional da analogia |
|---|---|---|---|
| **Filtro/borda de alta capacidade** | DNS, WAF, Ingress, Rate Limiter | `load_balancer` (10k rps, ~1-3ms, $50) | Ficam antes do Load Balancer/API Gateway no caminho; trabalho leve por requisição (checagem/roteamento), não lógica de negócio. |
| **Cômputo de propósito específico** | Auth Service, Search, Scheduler, Notifications, Analytics, Serverless | `app_server` (500 rps, 20/80ms, $30) — Serverless usa a mesma âncora mas com `monthlyCostUsd` menor (cobrança por invocação, não por instância fixa) e `baseLatencyMs.p99` maior (cold start) | Mesmo papel de "roda lógica", especializado; latência/custo variam por especialização, não a ordem de grandeza. |
| **Armazenamento analítico/vetorial** | Data Warehouse, Vector DB | `sql_primary`/`nosql_kv` (1k-8k rps, 5-25ms, $80-120) | Mesma família de "banco", mas Data Warehouse é escrito com throughput bem menor (otimizado pra consulta agregada, não OLTP) — usar throughput mais baixo que `sql_primary`. |
| **Mensageria de alto throughput** | Pub/Sub, Event Stream, Kafka | `queue` (3k rps, 3-10ms, $45) | Mesmo papel de desacoplamento assíncrono; Kafka/Event Stream com throughput bem mais alto (ordem de grandeza de `cdn`) refletindo a proposta real de "log distribuído de altíssima vazão". |
| **Pipeline de agente IA** | LLM Gateway, Orchestrator, Tool Registry, Memory Fabric, Safety Mesh | `app_server`/`api_gateway`, mas com `baseLatencyMs` bem mais alto (chamada a LLM externo custa centenas de ms, não dezenas) | Reflete o fato de que uma chamada de IA é ordens de magnitude mais lenta que uma chamada de app server tradicional — spec ilustrativa deve tornar isso visível no resultado da simulação (é justamente o tipo de trade-off que o produto existe pra ensinar). |
| **Dependência externa (terceiro)** | 3rd Party API, Payment, Email | Nenhuma âncora interna — throughput baixo/moderado, `baseLatencyMs.p99` alto (rede pública, fora do controle) e sem SLA de disponibilidade — reflete meta-princípio de `docs/product-context.md` §4 ("não é simulador de produção", mas precisa "parecer" externo. | |
| **Observabilidade (tap/sink)** | Metrics, Logs, Tracing, Alerting, Health Check | `cache` invertido: throughput altíssimo (aceitam volume grande de telemetria), latência baixíssima, custo baixo — nunca aparecem como gargalo em designs razoáveis (mesmo critério que a clarificação já fixou explicitamente para VPC/Subnet, aplicado aqui por analogia de papel). | |
| **Contêiner/topologia de rede** | VPC, Subnet, NAT Gateway, VPN, Service Mesh | `cdn` (100k rps, latência mínima) | Clarificação de FR-006 já exige "capacidade alta o bastante pra nunca virar gargalo em designs razoáveis" — usar a maior âncora disponível no catálogo (`cdn`) e não um número arbitrário. |

**Racional geral**: qualquer avaliador (o autor, ou uma pessoa nova lendo `components.ts` depois)
consegue auditar cada número novo perguntando "de qual arquétipo/âncora ele veio", em vez de
aceitar 33 valores mágicos sem critério — mesmo padrão de rastreabilidade que D5 já estabelece pros
11 componentes atuais.

**Alternativas consideradas**: pesquisar preço/capacidade real de mercado por serviço — rejeitado
explicitamente pela spec (Assumptions: "specs... são ilustrativas... não serão pesquisados preços
reais de mercado").

## 3. Como estender `connection-rules.ts` (44 `ComponentType` no lugar de 11)

**Decisão**: `ALLOWED_TARGETS` é `Record<ConnectableKind, readonly ComponentType[]>` — mesma
propriedade de exaustividade do catálogo do engine (seção 1): o TypeScript recusa compilar se
`ComponentType` ganhar um valor sem uma chave correspondente na matriz. A matriz cresce de 12
chaves (11 tipos + `client`) para 45 (44 tipos + `client`), mas a *forma* da regra por categoria
segue os mesmos princípios já documentados no cabeçalho do arquivo:

- **Filtro/borda** (DNS, WAF, Ingress, Rate Limiter) entram na cadeia de borda já existente:
  `client` pode alcançá-los, e eles encadeiam entre si ou para `load_balancer`/`api_gateway`/
  `app_server` — nunca direto para um dado/fila/cache (mesma regra que já protege
  `load_balancer`/`api_gateway` hoje).
- **Cômputo especializado** (Auth Service, Search, Scheduler, Notifications, Analytics,
  Serverless) ganham o mesmo leque de destinos que `app_server` já tem hoje (cache, os bancos,
  fila, object storage) — são, na prática, variações de `app_server` no grafo.
- **Storage novo** (Data Warehouse, Vector DB) são folhas, como `sql_replica`/`nosql_kv`/
  `object_storage` já são — nada MUST se conectar a partir delas neste marco.
- **Mensageria nova** (Pub/Sub, Event Stream, Kafka) só alcançam `worker` (ou variantes de
  cômputo), mesma regra de `queue → worker`.
- **Pipeline de IA** é uma cadeia própria: `app_server`/`api_gateway` → LLM Gateway → Orchestrator
  → {Tool Registry, Memory Fabric} — Safety Mesh entra como um passo intermediário opcional em
  qualquer ponto da cadeia (mesma posição que WAF ocupa na borda tradicional).
- **External** (3rd Party API, Payment, Email) são sempre folha, alcançadas só a partir de
  `app_server`/`worker`/pipeline de IA — nunca a origem de uma conexão.
- **Observability** (tap/sink) são alcançáveis a partir de **qualquer** componente de cômputo
  (App Server, Worker, e todos os novos de "cômputo especializado") — nunca são origem.
- **Network** (VPC, Subnet, NAT Gateway, VPN, Service Mesh) são hops inline de altíssima
  capacidade, posicionados **antes** da camada de borda: `client → VPC/Subnet/NAT/VPN/Service Mesh
  → {load_balancer, api_gateway, cdn, app_server}` — mesmo leque de destino que `client` já tem
  hoje, para não introduzir um caminho que o `client` não pudesse alcançar de outra forma.

**Racional**: a matriz de 44 componentes é grande demais para especificar célula por célula neste
documento sem risco de erro de transcrição — a autoria real acontece durante a implementação
(`tasks.md`), guiada por estas 8 regras de arquétipo, e é auditável por teste (`connection-rules.
spec.ts` já cobre completude/simetria da matriz atual e cresce junto).

**Alternativas consideradas**: matriz aberta (qualquer novo tipo conecta a qualquer coisa por
padrão, com bloqueio explícito) — rejeitado; inverte o princípio de segurança já estabelecido no
próprio arquivo ("nenhum componente novo pode se conectar a qualquer coisa por omissão").

## 4. Onde vive a "categoria de paleta" (US1) — conceito novo, só apresentação

**Decisão**: novo módulo `apps/web/src/lib/component-categories.ts`, com um único
`Record<ConnectableKind, PaletteCategory>` (`PaletteCategory` = as 9 strings da tabela do spec, na
ordem: Client, Traffic & Edge, Compute, Storage, Messaging, Observability, Network, AI & Agents,
External). `palette.tsx` passa a agrupar por essa categoria (`Object.groupBy` ou `reduce` manual)
em vez dos dois grupos fixos atuais (Cliente/Componentes).

**Racional**: mesma técnica de exaustividade das seções 1 e 3 — usar `Record<ConnectableKind, ...>`
de novo garante que nenhum `ComponentType` novo escape sem categoria (erro de compilação, não bug
silencioso de UI). Fica em `apps/web/src/lib`, ao lado de `canvas-ui-catalog.ts` e
`connection-rules.ts`, porque é puramente de apresentação (Key Entities da spec já declara isso) —
nunca em `packages/engine`.

**Alternativas consideradas**: campo `category` dentro de `COMPONENT_UI` (`canvas-ui-catalog.ts`)
em vez de um módulo à parte — rejeitado por manter a mesma separação de responsabilidade que já
existe entre "rótulo/ícone/descrição" (apresentação de um componente) e "estrutura da paleta"
(apresentação de uma lista de componentes); um módulo dedicado também deixa claro, por importação,
quem depende da ordenação de categorias (só `palette.tsx`).

## 5. Escopo de teste

**Decisão**: mesmo padrão de M0/M0.5/M1 — cobertura unitária forte em módulos puros:
- `packages/engine`: `COMPONENT_CATALOG` (completude — coberta pelo próprio compilador — e um
  smoke test por arquétipo, provando que `getComponentSpec` devolve valores plausíveis pros
  componentes novos).
- `apps/web/src/lib/connection-rules.ts`: expandir `connection-rules.spec.ts` já existente com
  casos por arquétipo (uma aresta permitida e uma proibida por categoria nova).
- `apps/web/src/lib/component-categories.ts`: teste de completude (todo `ConnectableKind` mapeia
  pra uma das 9 categorias válidas) + teste de que a ordem das categorias bate com a tabela do
  spec.
- `apps/web/src/lib/canvas-ui-catalog.ts`: já tem teste de completude (`canvas-ui-catalog.spec.
  ts`, criado durante o fechamento de M1) — cresce automaticamente ao adicionar entradas, sem
  tarefa nova de teste dedicada além de manter esse arquivo atualizado.

Wiring de UI (`palette.tsx` reagrupado por categoria, `component-node.tsx` recebendo tipos novos)
é verificado por `tsc`/`build`/checagem manual no browser — não por unit test, mesma decisão já
tomada e documentada em M0.5/M1.

## 6. Nenhuma superfície de servidor nova

**Decisão**: esta feature não introduz rota, endpoint, tabela ou dependência de auth nova — é
inteiramente cliente (canvas + catálogo de dados versionado). A análise de "nunca confiar no
frontend" já registrada no `research.md` de M1 continua valendo sem alteração: a simulação roda
100% no browser, nada aqui é persistido como "oficial" em servidor.
