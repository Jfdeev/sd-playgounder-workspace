# Feature Specification: M0 — Engine de Simulação Puro

**Feature Branch**: `feature/001-engine-core-m0`

**Created**: 2026-08-11

**Status**: Ready

**Input**: User description: "M0 — Engine puro (`packages/engine`), sem nenhuma linha de UI, canvas, banco ou
React: tipos fechados, propagação de carga pelo grafo, utilização e fila M/M/1, latência p50/p95/p99,
throughput limitado pelo gargalo, efeito de cache, análises estáticas (SPOF, órfão, ciclo, aresta async),
custo, catálogo de ~10 componentes, e a suíte de testes com casos calculados à mão." (conforme
`docs/product-context.md` §10)

## Clarifications

### Session 2026-08-11

- Q: Quando o Design recebido pelo engine é estruturalmente inválido (aresta apontando pra nó
  inexistente, IDs duplicados, capacidade negativa), o engine deve lançar exceção ou sempre devolver
  um SimulationResult com uma Violation descrevendo o problema? → A: nunca lança exceção; sempre
  retorna um `SimulationResult` válido com uma `Violation` descrevendo o problema.
- Q: Para a detecção de SPOF no M0, quantas réplicas já bastam pra um nó não ser considerado ponto
  único de falha? → A: contagem de réplicas (c ≥ 2) já é suficiente — M0 não modela zona/região por
  réplica.
- Q: `SimulationResult.scores` (§6) existe no tipo, mas o cálculo de score por dimensão só está
  listado no M2 (§10) — o que `simulate()` deve fazer com esse campo no M0? → A: retorna placeholder
  (todas as 7 dimensões zeradas); a fórmula de conversão métrica→nota 0-10 fica para o M2, sem
  inventar regra de pontuação agora.

## User Scenarios & Testing *(mandatory)*

<!--
  M0 não tem UI (não-objetivo explícito). O "usuário" deste marco é quem consome a API do engine —
  hoje, o próprio time do produto validando via testes; a partir de M1, o código do canvas. As
  histórias abaixo são testáveis diretamente contra a função `simulate(design, workload)`, sem
  qualquer interface gráfica.
-->

### User Story 1 - Calcular gargalo, utilização e latência de um design (Priority: P1)

Como pessoa consumindo o engine (via teste automatizado hoje; via `apps/web` a partir de M1), eu
forneço um grafo de arquitetura (`Design`) e uma carga de tráfego (`Workload`) e recebo de volta a
utilização de cada nó, a fila M/M/1, a latência do caminho em p50/p95/p99 e o throughput real
limitado pelo gargalo — para poder confiar que o "momento aha" do produto (utilização passando de
0,9 e latência explodindo) é matematicamente correto antes de qualquer pixel de UI existir.

**Why this priority**: é o núcleo do produto inteiro — `docs/product-context.md` §2: "se o engine
for fraco, você fez mais um wrapper de LLM." Sem isso, nada mais no roadmap tem valor.

**Independent Test**: chamar `simulate(design, workload)` com um dos 3 designs de referência
calculados à mão (ver Success Criteria) e comparar cada campo do `SimulationResult` contra o valor
calculado manualmente.

**Acceptance Scenarios**:

1. **Given** um design de um único nó com capacidade suficiente para a carga oferecida, **When** o
   engine simula, **Then** `utilization < 1`, `status = 'healthy'` e o throughput reportado é igual
   à carga oferecida.
2. **Given** um design onde o nó do meio do caminho tem capacidade menor que os demais, **When** o
   engine simula, **Then** o `bottleneckId` aponta para esse nó e o throughput do caminho nunca
   excede a capacidade dele.
3. **Given** um design com utilização de um nó em 0,9, **When** o engine calcula a latência de fila
   M/M/1 desse nó, **Then** o tempo de espera reportado é aproximadamente 10× o tempo de serviço
   base (conforme a curva descrita em `docs/product-context.md` §7).
4. **Given** uma carga oferecida acima da capacidade de qualquer nó do caminho, **When** o engine
   simula, **Then** o throughput reportado nunca excede a capacidade agregada do caminho — nunca um
   "número fantasma" acima do que o sistema realmente sustenta.

---

### User Story 2 - Detectar problemas estruturais do grafo sem rodar carga (Priority: P1)

Como pessoa consumindo o engine, eu submeto um `Design` (sem precisar de um `Workload`) e recebo uma
lista de violações estruturais — SPOF, nó desconectado do caminho, ciclo, aresta assíncrona
corretamente excluída do cálculo de latência do usuário — para que o produto dê feedback educacional
imediato sobre erros de design "que parecem certos" mesmo sem simular tráfego algum.

**Why this priority**: é a "regra anti-decoreba" central do produto (`docs/product-context.md` §3,
princípio 4) — sem ela, o engine pontuaria designs que só *parecem* resilientes.

**Independent Test**: fornecer designs de teste, cada um contendo deliberadamente um único tipo de
violação, e verificar que exatamente essa violação (e nenhuma outra) é reportada.

**Acceptance Scenarios**:

1. **Given** um design onde um nó no caminho crítico não tem nenhuma réplica/redundância, **When**
   o engine analisa o grafo, **Then** uma violação do tipo SPOF é reportada apontando esse nó.
2. **Given** um design com um componente no canvas sem nenhuma aresta ligando-o ao caminho da
   requisição, **When** o engine calcula o score, **Then** esse componente não contribui em nada
   para a pontuação (vale zero) e é reportado como nó órfão.
3. **Given** um design cujo grafo contém um ciclo, **When** o engine analisa o grafo, **Then** os
   nós que são membros do ciclo são distinguidos dos nós que estão apenas a jusante do ciclo.
4. **Given** um design com uma aresta explicitamente marcada como assíncrona, **When** o engine
   calcula a latência do caminho até o usuário, **Then** o tempo desse trecho assíncrono não entra
   na soma de latência reportada ao usuário.

---

### User Story 3 - Calcular custo mensal do design (Priority: P2)

Como pessoa consumindo o engine, eu recebo o custo mensal total e por nó de um `Design`, calculado a
partir de uma tabela de custo fixa por tipo de componente, para que o produto possa mostrar o
trade-off custo × performance desde o primeiro marco.

**Why this priority**: o "trade-off tem que doer" é princípio não-negociável do produto
(`docs/product-context.md` §3, princípio 6), e custo é uma das 7 dimensões de score (§9).

**Independent Test**: montar um design com componentes de tipo e quantidade conhecidos e verificar
que o custo total bate com a soma manual das entradas da tabela de custo do catálogo (ver D5 em
Assumptions).

**Acceptance Scenarios**:

1. **Given** um design com N instâncias de um componente de custo mensal conhecido, **When** o
   engine calcula o custo, **Then** o custo desse nó é `N × custo_unitário` e entra na soma do
   `monthlyTotal`.

---

### User Story 4 - Propagar efeito de cache para carga do banco e latência (Priority: P3)

Como pessoa consumindo o engine, eu configuro um hit rate de cache num design com cache na frente de
um banco de dados, e recebo a carga real que chega ao banco e a latência efetiva do caminho — para
que o produto ensine visualmente por que um hit rate caindo de 0,99 para 0,95 multiplica por 5 a
carga no banco (`docs/product-context.md` §7).

**Why this priority**: é citado explicitamente como o exemplo pedagógico do efeito de cache; menor
prioridade que US1-US3 porque depende delas mas não bloqueia o critério de saída do marco por si só.

**Independent Test**: variar o hit rate de um design de referência com cache + DB e verificar que a
carga no DB e a latência efetiva batem com as fórmulas de §7 em cada ponto.

**Acceptance Scenarios**:

1. **Given** um design com cache (hit rate h) na frente de um DB, **When** o engine simula,
   **Then** `carga_no_db = λ × (1 − h)` e `latência_efetiva = h·L_cache + (1−h)·(L_cache + L_db)`.
2. **Given** o mesmo design com hit rate variando de 0,99 para 0,95, **When** o engine recalcula,
   **Then** a carga reportada no DB aumenta na mesma proporção descrita em §7 (5× mais carga).

---

### Edge Cases

- O que acontece quando um nó atinge ρ ≥ 1 (chegada igual ou maior que a capacidade de serviço)? A
  fórmula de fila M/M/1 diverge (`W = 1/(μ−λ)` tende a infinito ou fica negativa). O engine MUST
  reportar esse nó como `status: 'saturated'` com um valor de latência sentinela definido e
  documentado (não `NaN`/`Infinity` não tratado vazando para o consumidor) — o valor exato fica a
  cargo do `/speckit-plan`.
- O que acontece com um design sem nenhum nó de entrada alcançável, grafo vazio, aresta referenciando
  um nó inexistente, ou IDs de nó duplicados? Em todos os casos o engine MUST retornar um
  `SimulationResult` válido com throughput zero e uma `Violation` apropriada descrevendo o problema —
  nunca lançar exceção não tratada (ver FR-019 e Clarifications).
- O que acontece quando os pesos das arestas de split de tráfego que saem de um nó não somam 1,0 (ou
  100%)? Comportamento a ser definido — ver `[NEEDS CLARIFICATION]` abaixo.
- O que acontece com um componente configurado com capacidade zero (ex: 0 réplicas)? O engine MUST
  tratar esse nó como não-operacional (utilização indefinida/infinita, ou o nó nunca participa do
  caminho viável), sem dividir por zero de forma não controlada.
- O que acontece quando o `Workload.rps` é zero? O engine MUST retornar utilização zero em todos os
  nós e latência igual à latência base (sem componente de fila), sem erro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST expor os tipos fechados `Design`, `Workload` e `SimulationResult`
  conforme o contrato descrito em `docs/product-context.md` §6, através da função pura
  `simulate(design: Design, workload: Workload): SimulationResult`.
- **FR-002**: O sistema MUST propagar a carga oferecida (`rps`) pelo grafo de componentes a partir
  do(s) nó(s) de entrada, dividindo o tráfego entre arestas de saída de um nó proporcionalmente ao
  peso configurado em cada aresta.
- **FR-003**: O sistema MUST calcular a utilização de cada nó como `ρ = λ / (c · μ)`, onde `λ` é a
  carga que chega ao nó, `c` o número de instâncias e `μ` a capacidade de serviço por instância.
- **FR-004**: O sistema MUST calcular o tempo de espera em fila de cada nó usando o modelo M/M/1
  (`W = 1 / (μ − λ)`) e a Lei de Little (`L = λ · W`) para o número de requisições em voo.
- **FR-005**: O sistema MUST calcular a latência do caminho completo em p50, p95 e p99, combinando a
  latência base e o tempo de fila de cada nó atravessado.
- **FR-006**: O sistema MUST reportar o throughput real do caminho como o mínimo entre a carga
  oferecida e a capacidade de cada nó no caminho — nunca reportar throughput acima da carga
  oferecida, e um nó saturado MUST limitar (colapsar) o throughput de tudo que vem depois dele no
  caminho.
- **FR-007**: O sistema MUST identificar o nó gargalo (`bottleneckId`) do caminho quando existir.
- **FR-008**: O sistema MUST calcular, para designs com cache, a carga efetiva que chega ao
  componente de dados (`carga_no_db = λ · (1 − h)`) e a latência efetiva do caminho
  (`h·L_cache + (1−h)·(L_cache + L_db)`), onde `h` é o hit rate configurado no cache.
- **FR-009**: O sistema MUST detectar e reportar componentes que são ponto único de falha (SPOF) no
  caminho crítico — nó sem nenhuma redundância configurada cuja falha derrubaria o caminho inteiro.
  Para M0, um nó com contagem de réplicas/instâncias ≥ 2 já é considerado redundante (não-SPOF),
  independentemente de zona/região — modelagem de zona/AZ por réplica é explicitamente fora de
  escopo do M0 (ver Clarifications).
- **FR-010**: O sistema MUST detectar componentes desconectados do caminho de execução da requisição
  e excluí-los de qualquer cálculo de pontuação (valem zero) — regra anti-decoreba.
- **FR-011**: O sistema MUST detectar ciclos no grafo e distinguir, no resultado, quais nós são
  membros do ciclo dos que estão apenas a jusante dele.
- **FR-012**: O sistema MUST excluir explicitamente o tempo de qualquer aresta marcada como
  assíncrona do cálculo de latência reportada ao usuário.
- **FR-013**: O sistema MUST calcular o custo mensal por nó (`custo_unitário × número de instâncias`)
  e o custo mensal total do design, a partir de uma tabela de custo por tipo de componente (ver
  Assumptions — D5).
- **FR-014**: O sistema MUST fornecer um catálogo de aproximadamente 10 tipos de componente — no
  mínimo Load Balancer, App Server, Cache distribuído, SQL (com modo primary e modo replica), NoSQL
  (chave-valor), Fila, Object Storage, CDN, API Gateway e Worker — cada um com specs verificáveis:
  throughput máximo, latência base (p50/p99) e custo mensal.
- **FR-015**: O sistema MUST incluir uma suíte de testes automatizados que valida o resultado do
  engine contra pelo menos 3 designs de referência cujo resultado foi calculado manualmente
  (documentando a conta feita à mão junto ao teste, não apenas o valor esperado).
- **FR-016**: O sistema MUST permanecer determinístico — a mesma dupla `(design, workload)` MUST
  sempre produzir exatamente o mesmo `SimulationResult`, sem uso de gerador de números aleatórios
  não-semeado em qualquer cálculo que afete o resultado.
- **FR-017**: O sistema MUST rejeitar (ou não conter) qualquer dependência de tempo de execução em
  React, Next.js, cliente HTTP ou SDK de LLM dentro de `packages/engine`.

- **FR-018**: Quando os pesos das arestas de split de tráfego que saem de um mesmo nó não somam
  100%, o sistema MUST normalizá-los proporcionalmente para somar 100% antes de propagar a carga
  (ex: pesos 30 e 30 tornam-se 50%/50%) — decisão do autor, 2026-08-11.
- **FR-019**: O sistema MUST NUNCA lançar exceção não tratada para um `Design` estruturalmente
  inválido (aresta referenciando um nó inexistente, IDs de nó duplicados, capacidade configurada
  negativa, etc.) — em vez disso, MUST sempre retornar um `SimulationResult` válido contendo uma
  `Violation` que descreve o problema estrutural encontrado (decisão do autor, 2026-08-11; generaliza
  o comportamento já definido para grafo vazio em Edge Cases).
- **FR-020**: O campo `scores` de `SimulationResult` MUST estar presente e tipado com as 7 dimensões
  de §9, mas no M0 o sistema MUST retornar todas as dimensões com valor placeholder `0` — o cálculo
  real de conversão de métrica para nota 0-10 por dimensão é escopo do M2 (`docs/product-context.md`
  §10), não deste marco (decisão do autor, 2026-08-11).

### Key Entities

- **Design**: o grafo de arquitetura submetido — conjunto de nós (instâncias de tipos do catálogo,
  com configuração: réplicas, região, política de cache, etc.) e arestas tipadas (leitura / escrita
  / assíncrona / replicação, com peso de split de tráfego).
- **Workload**: a carga de tráfego oferecida ao design — `rps`, proporção leitura/escrita, tamanho
  de payload, multiplicador de pico.
- **SimulationResult**: a saída do engine — métricas por nó (carga recebida, capacidade, utilização,
  latência de fila, status), métricas do caminho (throughput, gargalo, latência p50/p95/p99), lista
  de violações estruturais, custo (por nó e total) e scores por dimensão.
- **Catálogo de componentes**: os ~10 tipos de componente disponíveis, cada um com specs fixas
  (throughput máximo, latência base, custo mensal, modos de falha) — dado versionado, não
  hardcoded no meio da lógica de cálculo.
- **Violation**: uma violação estrutural detectada (SPOF, nó órfão, ciclo, etc.), com o(s) nó(s) ou
  aresta(s) envolvidos.

## Success Criteria *(mandatory)*

<!--
  M0 não tem usuário final nem UI — os critérios abaixo são os critérios de saída do marco definidos
  em docs/product-context.md §10, que são inerentemente critérios de engenharia (não há métrica de
  "satisfação do usuário" possível para um pacote sem interface).
-->

### Measurable Outcomes

- **SC-001**: Para os 3 designs de referência da suíte de testes (US1), o resultado produzido pelo
  engine bate exatamente com a conta feita à mão documentada junto ao teste.
- **SC-002**: A simulação de um grafo com 30 nós é concluída em menos de 50 ms.
- **SC-003**: A cobertura de teste do pacote `packages/engine` é de pelo menos 80%.
- **SC-004**: Ao final do marco, nenhum componente de UI existe no repositório — nada em `apps/web`,
  nenhuma dependência de React ou Next.js foi adicionada a `packages/engine`.
- **SC-005**: Todas as 4 categorias de análise estática (SPOF, nó órfão, ciclo, aresta assíncrona
  fora do cálculo de latência) têm pelo menos um teste que prova a detecção correta.

## Assumptions

- **D5 (decisão do autor, 2026-08-11)**: os números de custo mensal do catálogo de componentes usam
  **tabela fixa ilustrativa** — valores plausíveis e redondos, documentados como dado versionado em
  `packages/problems` (ou pacote equivalente definido no plan), sem pretensão de precisão de mercado
  real. Consistente com `docs/product-context.md` §4 ("não é simulador de produção") e com a proibição
  do engine ter dependência de rede (§5) — não há chamada a API de preço em tempo real.
- Pela mesma lógica de D5, os valores de throughput máximo e latência base (p50/p99) de cada
  componente do catálogo também são estimativas pedagógicas plausíveis (não benchmarks reais),
  documentadas como dado versionado, recalibráveis sem alterar a lógica de cálculo do engine.
- O "usuário" das histórias deste marco é quem consome a API do engine (hoje: testes automatizados;
  a partir de M1: `apps/web`) — não há usuário final humano interagindo com M0 diretamente, porque UI
  é explicitamente fora de escopo (`docs/product-context.md` §10, M0).
- O valor sentinela usado para latência de um nó saturado (ρ ≥ 1) fica a definir em `/speckit-plan` —
  este documento só exige que o comportamento seja definido e testado, não `NaN`/`Infinity` vazando
  sem tratamento.
- Fora de escopo por decisão (não por esquecimento), conforme `docs/product-context.md` §10: canvas,
  React Flow, persistência em Postgres, narrador/LLM, chaos engineering, Modo Incidente, Modo
  Campanha — todos M1 em diante.
