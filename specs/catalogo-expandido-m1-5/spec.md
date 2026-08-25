# Feature Specification: M1.5 — Catálogo expandido de componentes do canvas

**Feature Branch**: `feature/001-expanded-component-catalog`

**Created**: 2026-08-25

**Status**: Ready

## Clarifications

### Session 2026-08-25

- Q: Fasear a entrega (US1 → revisão → US2 → revisão → US3) ou tudo de uma vez? → A: fases
  sequenciais, mesmo ritmo de M1 (Setup→US1→US2→US3, revisão do autor entre cada fase antes de
  avançar pra próxima).
- Q: Observability (Metrics/Logs/Tracing/Alerting/Health Check) não processa requisição do jeito
  que o engine simula hoje — qual tratamento? → A: `ComponentType` real, com specs simbólicas
  plausíveis (mesmo padrão ilustrativo D5 já usado pelos 11 componentes de M0/M1) — nunca nó
  puramente decorativo.
- Q: Network (VPC/Subnet/NAT Gateway/VPN/Service Mesh) é mais topologia/segurança do que nó no
  caminho — mesma pergunta. → A: `ComponentType` real, mesmo critério do Observability.

**Input**: User description: "M1.5 — Catálogo expandido de componentes do canvas. Marco inserido no
roadmap entre M1 (já concluído, Ready) e M2 — mesmo padrão de inserção por decisão do autor já
usado para M0.5 (antes de M1) e M2.5 (depois de M2) em docs/product-context.md §10. Fonte real
(não inventada): https://sdplayground.vercel.app/#/playground, extraída ao vivo via browser — 9
categorias, 46 componentes, cada um com nome + descrição curta. Ver tabela completa abaixo."

## Contexto e fonte

A paleta atual do canvas (M1) tem exatamente os 11 `ComponentType` de `packages/engine` — uma
decisão de escopo deliberada do M1 (FR-001 de `specs/canvas-submissao-m1/spec.md`), que restringiu
a paleta bem menor que `docs/foundational-doc.md` §1.1 já descrevia. O autor pediu, após usar o
produto, uma paleta organizada nas 9 categorias e ~46 componentes do concorrente
`sdplayground.vercel.app` (citado como inspiração), extraída ao vivo — não inventada por este
agente. Tabela completa abaixo, com a categoria/mapeamento decidido nesta especificação.

| Categoria | Componente | Descrição (traduzida) | Já existe no engine? |
|---|---|---|---|
| Client | Cliente (web) | Navegador onde a requisição nasce. | Sim — nó Cliente, variante `web` |
| Client | Cliente (mobile) | App mobile; tráfego mais bursty, sujeito a rede instável. | Sim — nó Cliente, variante `mobile` |
| Traffic & Edge | DNS | Resolve nome de domínio pra IP. Primeiro salto de toda requisição. | Não |
| Traffic & Edge | CDN | Cacheia conteúdo estático perto do usuário. | Sim — `cdn` |
| Traffic & Edge | Load Balancer | Distribui tráfego entre réplicas, remove ponto único de falha. | Sim — `load_balancer` |
| Traffic & Edge | WAF | Filtra requisição maliciosa (SQLi, XSS, bots) antes do app. | Não |
| Traffic & Edge | API Gateway | Ponto de entrada único da API: roteamento, auth, rate limiting. | Sim — `api_gateway` |
| Traffic & Edge | Ingress | Controlador de ingress do Kubernetes. | Não |
| Traffic & Edge | Rate Limiter | Rejeita tráfego acima de um limite configurado. | Não |
| Compute | App Server | Roda a lógica de negócio. | Sim — `app_server` |
| Compute | Worker | Processa jobs consumidos de fila, fora do caminho síncrono. | Sim — `worker` |
| Compute | Serverless | Função que escala por requisição; cold start e custo variável. | Não |
| Compute | Auth Service | Emite/valida identidade (sessão, JWT, OAuth). | Não |
| Compute | Search | Motor de busca full-text (ex. Elasticsearch). | Não |
| Compute | Scheduler | Dispara jobs periódicos (cron). | Não |
| Compute | Notifications | Envia push/SMS/notificação in-app. | Não |
| Compute | Analytics | Coleta e agrega eventos de produto/uso. | Não |
| Storage | SQL Database | Banco relacional, ACID, fonte da verdade. | Sim — `sql_primary` |
| Storage | Read Replica | Cópia somente-leitura de um SQL Database. | Sim — `sql_replica` |
| Storage | NoSQL DB | Chave-valor/documento, escala horizontal. | Sim — `nosql_kv` |
| Storage | Cache | Armazenamento em memória pra leitura quente. | Sim — `cache` |
| Storage | Object Store | Arquivos/blobs em escala praticamente ilimitada. | Sim — `object_storage` |
| Storage | Data Warehouse | Banco analítico colunar pra consulta agregada pesada. | Não |
| Storage | Vector DB | Guarda embeddings, busca por similaridade (RAG). | Não |
| Messaging | Message Queue | Buffer entre produtor e consumidor. | Sim — `queue` |
| Messaging | Pub/Sub | Difunde evento pra N assinantes independentes. | Não |
| Messaging | Event Stream | Log ordenado e replayable de eventos. | Não |
| Messaging | Kafka | Plataforma de streaming distribuída, throughput massivo. | Não |
| Observability | Metrics | Números de série temporal (CPU, RPS, latência). | Não |
| Observability | Logs | Registro estruturado de eventos pra debug. | Não |
| Observability | Tracing | Segue uma requisição por todos os serviços que ela toca. | Não |
| Observability | Alerting | Observa métricas/logs e aciona humano em limiar. | Não |
| Observability | Health Check | Sonda de liveness/readiness periódica. | Não |
| Network | VPC | Fatia isolada e privada da rede na nuvem. | Não |
| Network | Subnet | Subdivisão de uma VPC (pública/privada). | Não |
| Network | NAT Gateway | Permite saída de instância privada sem exposição de entrada. | Não |
| Network | VPN | Túnel criptografado entre redes privadas. | Não |
| Network | Service Mesh | Camada sidecar de tráfego serviço-a-serviço (mTLS, retry). | Não |
| AI & Agents | LLM Gateway | Roteia requisição pra provedores de LLM (quota, cache, fallback). | Não |
| AI & Agents | Orchestrator | Coordena workflow de agente multi-etapa. | Não |
| AI & Agents | Tool Registry | Catálogo de ferramentas/funções que um agente pode chamar. | Não |
| AI & Agents | Memory Fabric | Memória de longo prazo do agente (histórico, fatos, retrieval). | Não |
| AI & Agents | Safety Mesh | Guarda-corpo de chamadas de IA (filtro, política, auditoria). | Não |
| External | 3rd Party API | Serviço de terceiro — latência/disponibilidade fora do controle. | Não |
| External | Payment | Processador de pagamento externo (ex. Stripe). | Não |
| External | Email | Provedor transacional de email. | Não |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paleta organizada por categoria (Priority: P1)

Como alguém que já usa o canvas, eu vejo a paleta lateral agrupada nas mesmas 9 categorias do site
de inspiração (Client, Traffic & Edge, Compute, Storage, Messaging, Observability, Network, AI &
Agents, External), em vez de uma lista plana — os 11 componentes já existentes (e o nó Cliente)
migram para a categoria certa, sem nenhum componente novo ainda.

**Why this priority**: entrega valor imediato (achar o componente certo fica mais rápido) sem
depender de nenhuma decisão de modelagem nova — só reorganiza o que já existe e já é 100% simulado.
É o alicerce visual sobre o qual as próximas user stories encaixam os componentes novos.

**Independent Test**: abrir o canvas e confirmar que os 11 componentes de M1 aparecem cada um sob o
cabeçalho de categoria correto (comparado à tabela acima), e que cada categoria tem sua própria
seção visualmente distinta na paleta.

**Acceptance Scenarios**:

1. **Given** o canvas aberto, **When** a paleta é renderizada, **Then** existem exatamente 9
   cabeçalhos de categoria, na mesma ordem da tabela acima.
2. **Given** a paleta renderizada, **When** eu procuro um componente já existente (ex. Cache),
   **Then** ele aparece sob o cabeçalho "Storage", não mais numa lista plana "Componentes".

---

### User Story 2 - Componentes novos que cabem no modelo de simulação atual (Priority: P2)

Como alguém montando um design, eu tenho, na paleta, os componentes novos das categorias Traffic &
Edge, Compute, Storage, Messaging, AI & Agents e External (ver tabela — coluna "Não") — cada um
com specs reais em `packages/engine` (capacidade, latência base, custo mensal) e participando da
simulação exatamente como os 11 componentes de M1, incluindo a matriz de conectividade (que tipo de
componente pode se ligar a qual) e a descrição pedagógica no canto/painel.

**Why this priority**: é o grosso do valor pedido — mais que dobra o catálogo simulável do produto
— mas depende de US1 (as categorias já precisam existir na paleta) e é maior/mais arriscado que
US1, daí a prioridade P2.

**Independent Test**: arrastar um componente novo (ex. Rate Limiter) pro canvas, ligá-lo num
caminho válido, submeter, e ver um resultado do engine (utilização, latência, custo) que reage a
mudar o número de réplicas do componente novo — prova que ele é genuinamente simulado, não
decorativo.

**Acceptance Scenarios**:

1. **Given** um componente novo (ex. Serverless) no canvas, conectado num caminho de requisição,
   **When** eu submeto o design, **Then** o resultado mostra utilização/latência/custo calculados
   pra aquele nó, do mesmo jeito que pros 11 componentes de M1.
2. **Given** dois componentes cuja combinação não faz sentido arquitetural (ex. Rate Limiter →
   SQL Database), **When** eu tento conectá-los, **Then** o canvas recusa a conexão (mesma regra de
   `connection-rules.ts` do incremento anterior).

---

### User Story 3 - Observability e Network (Priority: P3)

Como alguém montando um design mais realista, eu tenho, na paleta, os componentes novos das
categorias Observability (Metrics, Logs, Tracing, Alerting, Health Check) e Network (VPC, Subnet,
NAT Gateway, VPN, Service Mesh) — cada um como `ComponentType` real, com specs simbólicas
plausíveis (Clarifications, 2026-08-25), participando da simulação como qualquer outro componente.

**Why this priority**: são as duas categorias com a semântica mais distante do modelo atual de
"capacidade ao longo do caminho" (product-context.md §7) — decidir specs simbólicas plausíveis pra
elas é mais arriscado de acertar de primeira que US2, por isso vem depois, com sua própria revisão.

**Independent Test**: arrastar um componente novo desta fase (ex. Service Mesh) pro canvas, ligá-lo
num caminho válido, submeter, e ver um resultado do engine reagindo à configuração dele — mesma
prova de US2, aplicada aos 10 componentes desta fase.

**Acceptance Scenarios**:

1. **Given** um componente de Observability ou Network (ex. NAT Gateway) no caminho de uma
   requisição, **When** eu submeto o design, **Then** o resultado mostra utilização/latência/custo
   calculados pra aquele nó.
2. **Given** VPC/Subnet (topologicamente um container, não um hop de processamento), **When** eu
   configuro réplicas nele, **Then** ele nunca aparece como gargalo em designs razoáveis — a spec
   ilustrativa reflete que esses dois componentes raramente são o fator limitante na prática.

### Edge Cases

- O que acontece com um design salvo (autosave, US3 de M1) antes deste incremento, que só usa os
  11 componentes antigos? MUST continuar carregando e simulando normalmente — nenhum componente
  existente muda de `ComponentType`, só de categoria visual na paleta (US1).
- Componentes sem uma noção óbvia de "capacidade de processar requisição" (ex. Tool Registry —
  cadastro de ferramentas; VPC/Subnet — container de rede) MUST, mesmo assim, ganhar specs
  simbólicas plausíveis (Clarifications, 2026-08-25) — nunca ficam de fora da simulação, mas a
  spec escolhida reflete que eles raramente (ou nunca) são o fator limitante de um design real.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A paleta MUST agrupar todo componente (os 11 de M1 + Cliente + os novos de US2) sob
  exatamente as 9 categorias da tabela acima, na mesma ordem.
- **FR-002**: Cada componente novo classificado como "ComponentType real" (US2, e US3 conforme a
  clarificação) MUST ter specs plausíveis em `packages/engine/src/catalog/components.ts`
  (capacidade máxima, latência base p50/p99, custo mensal) — mesmo padrão de dado versionado
  ilustrativo já usado pelos 11 componentes de M0/M1 (D5, `docs/product-context.md`).
- **FR-003**: Cada componente novo MUST entrar na matriz de `connection-rules.ts` com um conjunto
  explícito de tipos de destino permitidos — nenhum componente novo pode se conectar "a qualquer
  coisa" por omissão (mesmo princípio do incremento de conectividade já implementado em M1).
- **FR-004**: Cada componente novo MUST ter uma descrição pedagógica (`canvas-ui-catalog.ts`),
  surfaced nos mesmos três lugares já existentes (tooltip da paleta, ícone no nó, texto completo no
  painel de configuração ao selecionar).
- **FR-005**: Os 5 componentes de Observability (Metrics, Logs, Tracing, Alerting, Health Check)
  MUST ser `ComponentType` reais, com specs simbólicas plausíveis — mesmo padrão ilustrativo de
  FR-002, participando da simulação como qualquer outro componente (Clarifications, 2026-08-25).
- **FR-006**: Os 5 componentes de Network (VPC, Subnet, NAT Gateway, VPN, Service Mesh) MUST ser
  `ComponentType` reais, com specs simbólicas plausíveis — mesmo critério de FR-005. Para VPC/Subnet
  especificamente (topologicamente containers, não hops de processamento), a spec MUST refletir
  capacidade alta o bastante para nunca virarem gargalo em designs razoáveis, em vez de um número
  arbitrário que poderia distorcer o resultado da simulação.
- **FR-007**: A entrega deste marco MUST seguir fases sequenciais com revisão do autor entre elas —
  US1 (reorganizar paleta) → revisão → US2 (23 componentes novos "limpos") → revisão → US3 (10
  componentes de Observability/Network) — mesmo ritmo Setup→US1→US2→US3 já usado em M1
  (Clarifications, 2026-08-25).
- **FR-008**: Nenhum componente exposto na paleta MUST sugerir uma capacidade que o engine não
  computa de fato — como toda categoria deste marco vira `ComponentType` real (FR-002/FR-005/
  FR-006), este requisito garante que nenhuma fase futura reintroduza um componente puramente
  decorativo sem specs reais (mesmo princípio de FR-005 do M1).

### Key Entities

- **ComponentType (expandido)**: o mesmo tipo já existente em `packages/engine`, com até 23 novos
  valores possíveis (categorias "limpas" de US2) mais os de Observability/Network conforme a
  clarificação — cada um com `ComponentSpec` (capacidade/latência/custo).
- **Categoria de paleta**: conceito novo, puramente de apresentação (`apps/web`) — agrupa
  `ComponentType`s relacionados sob um cabeçalho; não existe em `packages/engine` (não afeta
  `Design`/`Workload`/`SimulationResult`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A paleta mostra 9 categorias visualmente distintas, cada componente (existente ou
  novo) sob a categoria correta — verificável por inspeção direta, sem precisar rodar simulação.
- **SC-002**: Uma pessoa consegue montar um design usando pelo menos um componente novo de cada
  categoria "limpa" (Traffic & Edge, Compute, Storage, Messaging, AI & Agents, External) e ver um
  resultado de simulação real reagindo a mudanças de configuração daquele componente (não um
  número fixo/decorativo).
- **SC-003**: Nenhuma tentativa de conectar dois tipos de componente sem sentido arquitetural é
  aceita pelo canvas — toda combinação inválida (por exemplo, WAF conectado direto a um SQL
  Database) é recusada no próprio gesto de conectar.
- **SC-004**: Todo componente que existe na paleta é genuinamente simulável (SC-002) ou está
  claramente marcado/tratado como não-computável — nunca ambíguo sobre qual dos dois é.

## Assumptions

- **AI & Agents e External entram como `ComponentType` real** (mesmo modelo de "capacidade ao longo
  do caminho" dos 11 atuais) — os 8 componentes dessas duas categorias (LLM Gateway, Orchestrator,
  Tool Registry, Memory Fabric, Safety Mesh, 3rd Party API, Payment, Email) descrevem claramente um
  nó que processa uma requisição com latência/custo/disponibilidade próprios, o mesmo papel que um
  App Server ou um SQL Database já desempenham — não há a mesma ambiguidade de modelagem que
  Observability/Network têm (daí não estarem nas perguntas de clarificação).
- **Nenhum EdgeKind novo é necessário** — os 4 tipos de aresta existentes (leitura/escrita/
  assíncrona/replicação) já cobrem os padrões de conexão dos componentes novos "limpos" (ex.:
  App Server → Message Queue é "escrita" ou "assíncrona", igual já é hoje com `queue`).
- **Specs de capacidade/latência/custo dos componentes novos são ilustrativas**, mesmo padrão já
  documentado para os 11 atuais (D5 de `docs/product-context.md`, não preço real de cloud) — não
  serão pesquisados preços reais de mercado para esta especificação.
- **O nó Cliente permanece com 2 variantes visuais do site de inspiração mapeadas nas 3 já
  existentes** (web, mobile) — a variante "desktop" de M1 não tem equivalente no site, mas
  continua existindo (não é removida).
