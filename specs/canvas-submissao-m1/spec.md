# Feature Specification: M1 — Canvas e submissão

**Feature Branch**: `feature/001-canvas-submission`

**Created**: 2026-08-17

**Status**: Ready

**Input**: User description: "M1 — Canvas e submissão (P0 do produto), conforme
`docs/product-context.md` §10: paleta com os componentes de M0 · arrastar, conectar, configurar ·
arestas tipadas (leitura/escrita/async/replicação) · painel de configuração por nó · submeter e ver
o resultado do engine · gargalo destacado em vermelho · undo/redo · autosave local · 1 problema
completo (encurtador de URL). Critério de saída: uma pessoa que nunca viu o produto resolve o
problema do encurtador do zero, sem ajuda, e entende por que a nota foi aquela."

## Clarifications

### Session 2026-08-17

- Q: Como o(s) nó(s) de entrada de carga (`Design.entryNodeIds`) são designados pelo usuário no
  canvas? → A: a entrada pode ser múltipla — a paleta ganha uma categoria "Cliente", com variantes
  visuais mobile, web e desktop, puramente semântica (não é um `ComponentType` do engine, não tem
  specs nem é enviada em `Design.nodes`). O usuário arrasta um ou mais nós Cliente e conecta cada
  um a um ou mais componentes reais; todo componente real diretamente conectado a um nó Cliente
  vira um `entryNodeId` daquela submissão (FR-006, revisado).
- Q: (achado durante a revisão do plano) O nó Cliente tinha só 2 variantes (mobile/desktop) — faltava
  "web" (navegador), terceira origem comum de tráfego real. → A: 3 variantes — mobile, web e desktop
  (decisão do autor, mesma sessão; FR-006/data-model.md/tasks.md atualizados).
- Q: Como o usuário controla a carga de trabalho (`Workload`: rps, leitura/escrita, payload, pico)
  usada na simulação? → A: fixada pelo problema — a escala descrita no enunciado do encurtador de URL
  determina o `Workload` usado; sem controle manual do usuário neste marco (FR-007, revisado).
- Q: O critério de saída de M1 (`docs/product-context.md` §10) diz "entende por que a nota foi
  aquela", mas o score por dimensão só existe a partir de M2 (`SimulationResult.scores` é placeholder
  zerado). Como resolver? → A: reformular o critério de saída para falar do resultado técnico
  (gargalo/latência/custo/violações) em vez de "nota" — `docs/product-context.md` §10 atualizado na
  mesma sessão (FR-013, revisado).

## User Scenarios & Testing *(mandatory)*

<!--
  M0 entregou o cálculo (packages/engine, sem UI). M0.5 entregou conta/login (sem canvas). M1 é a
  primeira vez que uma pessoa autenticada realmente usa o produto: monta um design visualmente e vê
  o resultado do próprio engine determinístico (não uma nota de LLM — isso é M2).
-->

### User Story 1 - Montar e simular o desafio do encurtador de URL, do zero (Priority: P1)

Como usuário autenticado que nunca usou o produto, eu leio o enunciado do problema "Encurtador de
URL", arrasto componentes da paleta para o canvas, conecto-os com arestas tipadas, ajusto a
configuração de cada nó (réplicas, e taxa de acerto de cache quando aplicável), submeto o design e
vejo o resultado calculado pelo engine — gargalo, latência do caminho, utilização por nó, custo
mensal e qualquer problema estrutural (nó órfão, ciclo, ponto único de falha) — sem precisar de
ajuda externa.

**Why this priority**: é o loop de valor inteiro do produto — sem isso, não existe M1. É também,
sozinho, o critério de saída do marco (`docs/product-context.md` §10).

**Independent Test**: com uma conta já autenticada (M0.5) e nenhum design salvo, abrir o problema do
encurtador de URL, montar um design com pelo menos um caminho da entrada até um nó de dados, submeter,
e confirmar que o resultado exibido reflete a topologia montada (ex.: mudar réplicas de um nó muda a
capacidade exibida daquele nó no resultado seguinte).

**Acceptance Scenarios**:

1. **Given** um usuário autenticado sem nenhum design em andamento, **When** ele abre o problema do
   encurtador de URL, **Then** vê o enunciado, os requisitos funcionais e não-funcionais, e a escala
   esperada (DAU, proporção leitura/escrita, payload, pico) antes de qualquer interação com o canvas.
2. **Given** o canvas vazio, **When** o usuário arrasta um componente da paleta para o canvas,
   **Then** um nó daquele tipo aparece no canvas, com os valores padrão de configuração aplicáveis
   àquele tipo.
3. **Given** dois nós no canvas, **When** o usuário desenha uma conexão entre eles e escolhe o tipo
   da aresta (leitura, escrita, assíncrona ou replicação), **Then** a aresta aparece no canvas
   identificada visualmente pelo tipo escolhido.
4. **Given** um nó selecionado, **When** o usuário abre o painel de configuração daquele nó,
   **Then** vê e pode editar o número de réplicas (e, se o nó for um cache, a taxa de acerto
   esperada) — nenhum outro campo de configuração é exibido neste marco.
5. **Given** o canvas, **When** o usuário arrasta um nó "Cliente" (mobile, web ou desktop) da paleta e o
   conecta a um ou mais componentes reais, **Then** cada componente diretamente conectado a esse
   Cliente passa a ser um ponto de entrada de carga na submissão seguinte — o nó Cliente em si não é
   configurável e não aparece no resultado do engine (é puramente visual/semântico).
6. **Given** um design com pelo menos um nó Cliente conectado a um componente real, **When** o
   usuário aciona "submeter", **Then** vê o resultado do engine: utilização e status
   (saudável/atenção/saturado) de cada nó, o caminho crítico com latência p50/p95/p99, o throughput
   real, o custo mensal (por nó e total), e qualquer violação estrutural com a mensagem gerada pelo
   engine.
7. **Given** um resultado com um nó identificado como gargalo, **When** o usuário olha o canvas,
   **Then** aquele nó está destacado visualmente em vermelho, sem precisar abrir um painel separado
   para descobrir qual é.
8. **Given** um design com um problema estrutural (ex.: nó sem redundância marcado como ponto único
   de falha, nó inalcançável a partir de qualquer Cliente, ou um ciclo), **When** o usuário submete,
   **Then** o sistema nunca trava nem mostra um erro técnico cru — mostra a violação com uma mensagem
   legível, no mesmo resultado.

---

### User Story 2 - Corrigir o design sem perder o trabalho (Priority: P2)

Como usuário montando um design, eu erro — conecto o nó errado, apago algo que não devia — e quero
desfazer e refazer ações no canvas sem precisar remontar tudo manualmente.

**Why this priority**: não é o loop de valor em si (US1 já entrega o critério de saída sozinho), mas
sem isso qualquer erro de montagem vira retrabalho manual, o que é P0 no product-context.md e afeta
diretamente a experiência de "resolver sem ajuda" de US1.

**Independent Test**: montar um design parcial, desfazer as últimas N ações e confirmar que o canvas
volta exatamente ao estado anterior a elas; refazer e confirmar que volta ao estado seguinte.

**Acceptance Scenarios**:

1. **Given** uma sequência de edições no canvas (adicionar nó, conectar, configurar, remover),
   **When** o usuário aciona "desfazer" repetidamente, **Then** cada acionamento reverte exatamente
   uma edição, na ordem inversa em que foram feitas.
2. **Given** um estado alcançado por "desfazer", **When** o usuário aciona "refazer", **Then** a
   edição desfeita é reaplicada.
3. **Given** o usuário desfez uma edição e em seguida fez uma edição nova (diferente da que foi
   desfeita), **When** ele tenta "refazer", **Then** não há nada para refazer (o histórico de
   "refazer" anterior foi descartado pela nova edição) — comportamento padrão de undo/redo linear.

---

### User Story 3 - Retomar um design depois de fechar o navegador (Priority: P3)

Como usuário no meio da montagem de um design, eu fecho a aba ou o navegador por engano (ou de
propósito, para continuar depois) e, ao voltar, meu design ainda está lá, sem precisar remontar do
zero.

**Why this priority**: é P0 no product-context.md ("autosave local"), mas é a camada mais isolada
das três — US1 e US2 continuam entregando valor completo mesmo numa sessão contínua sem fechar o
navegador.

**Independent Test**: montar um design parcial, fechar a aba, reabrir a mesma URL no mesmo navegador,
e confirmar que o design reaparece exatamente como estava.

**Acceptance Scenarios**:

1. **Given** um design em andamento no canvas, **When** o usuário fecha e reabre a aba no mesmo
   navegador, **Then** o design é restaurado automaticamente, sem exigir uma ação explícita de
   "salvar".
2. **Given** nenhum design salvo neste navegador, **When** o usuário abre o problema do encurtador de
   URL, **Then** vê um canvas vazio (não um erro, não o design de outra pessoa).

---

### Edge Cases

- O que acontece quando o usuário submete um canvas vazio (nenhum nó)? MUST mostrar um resultado
  vazio/neutro com uma mensagem clara (ex.: "adicione componentes antes de submeter"), nunca um erro
  técnico — consistente com a garantia do engine de nunca lançar exceção sobre entrada malformada.
- O que acontece quando o design não tem nenhum nó de entrada alcançável? MUST ser tratado como uma
  violação estrutural exibida no resultado (mesma mecânica das demais violações), não como uma falha
  silenciosa.
- O que acontece se o usuário digitar um número de réplicas inválido (zero, negativo, não-numérico)
  no painel de configuração? MUST impedir a entrada inválida no próprio campo (validação na hora da
  digitação), nunca deixar chegar ao engine um valor que ele seria forçado a rejeitar depois.
- O que acontece se o armazenamento local do navegador (autosave, US3) estiver indisponível ou cheio
  (ex.: navegação privada com restrições)? MUST degradar sem quebrar o canvas — o usuário continua
  montando e submetendo normalmente nessa sessão, apenas sem persistência entre sessões; não MUST
  bloquear nenhuma outra funcionalidade nem mostrar erro técnico.
- O que acontece quando duas arestas saem do mesmo nó com pesos que não somam 100%? MUST normalizar
  automaticamente (mesma regra do engine, FR-018 de M0) e MUST deixar claro ao usuário, no próprio
  canvas, qual é o peso efetivo aplicado — não apenas o valor bruto digitado.
- O que acontece se o usuário tentar conectar um nó a ele mesmo, ou criar uma conexão duplicada entre
  o mesmo par de nós no mesmo sentido? MUST impedir a ação diretamente no canvas (auto-conexão) ou
  MUST deixar o engine sinalizar como ciclo/estrutura inválida quando aplicável (conexão duplicada não
  é, por si, uma violação do engine — apenas redundante).
- O que acontece se um nó Cliente não estiver conectado a nenhum componente real? MUST ser ignorado
  silenciosamente na submissão (nenhum efeito, nenhuma violação) — um Cliente solto não é uma entrada.
- O que acontece se um componente real não estiver alcançável a partir de nenhum nó Cliente (nem
  direta, nem indiretamente por outros componentes)? É coberto pela violação já existente do engine
  para nó órfão (`orphan-node`) — nenhuma regra nova é necessária além de FR-006 definir corretamente
  quais nós entram em `entryNodeIds`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exibir uma paleta com exatamente os componentes já suportados pelo
  engine (`packages/engine`, M0): load balancer, API gateway, app server, worker, cache, SQL
  primary, SQL replica, NoSQL key-value, fila, object storage e CDN — nenhum outro tipo de
  componente computável é oferecido neste marco, mesmo que `docs/foundational-doc.md` §1.1 descreva
  uma paleta maior (decisão de escopo: `docs/product-context.md` §10 diz "paleta com os componentes
  de M0", e product-context vence em caso de conflito). A única exceção é o nó Cliente de FR-006 —
  não é um componente computável do engine, é um marcador visual de origem de carga.
- **FR-002**: O sistema MUST permitir arrastar um componente da paleta para o canvas, criando um nó
  daquele tipo com valores padrão de configuração.
- **FR-003**: O sistema MUST permitir conectar dois nós do canvas com uma aresta direcionada,
  escolhendo um entre quatro tipos: leitura, escrita, assíncrona ou replicação.
- **FR-004**: Quando mais de uma aresta sai do mesmo nó, o sistema MUST permitir definir um peso
  relativo por aresta (probabilidade de a requisição seguir por aquele caminho) e MUST normalizar
  automaticamente quando a soma dos pesos de um nó não totalizar 100%, exibindo o valor efetivo
  aplicado.
- **FR-005**: O sistema MUST oferecer um painel de configuração por nó, limitado aos campos que o
  engine efetivamente usa no cálculo: número de réplicas (todos os tipos) e taxa de acerto de cache
  (só para nós do tipo cache) — outros knobs descritos em `docs/foundational-doc.md` §1.2 (política
  de eviction, TTL, sharding, algoritmo de load balancer, etc.) não afetam o resultado da simulação
  neste marco e não são expostos, para não sugerir um controle que não existe.
- **FR-006**: O sistema MUST oferecer, na paleta, uma categoria "Cliente" com três variantes visuais
  — mobile, web e desktop — que o usuário pode arrastar para o canvas livremente, em qualquer
  quantidade. Um nó Cliente não é um componente computável (não tem specs de capacidade/latência/
  custo, não é configurável, não entra em `Design.nodes` na submissão ao engine). Todo componente
  real conectado diretamente a um ou mais nós Cliente MUST ser incluído em `entryNodeIds` na
  submissão — permitindo múltiplos pontos de entrada (ex.: um Cliente mobile e um Cliente web
  entrando por API Gateways diferentes).
- **FR-007**: A carga de trabalho usada na simulação (requisições por segundo, proporção de
  leitura/escrita, tamanho de payload, multiplicador de pico) MUST ser determinada pela escala
  descrita no enunciado do problema (FR-012) — o sistema MUST NOT oferecer controle manual da carga
  de trabalho ao usuário neste marco.
- **FR-008**: O sistema MUST calcular o resultado da submissão usando exclusivamente o engine
  determinístico (`packages/engine`) — nunca uma estimativa aproximada ou gerada por LLM — e MUST
  exibir, no mínimo: utilização e status de cada nó, caminho crítico com latência p50/p95/p99,
  throughput real, custo mensal (por nó e total), e toda violação estrutural detectada (ponto único
  de falha, nó órfão, ciclo), cada uma com a mensagem legível já produzida pelo engine.
- **FR-009**: O sistema MUST destacar visualmente o nó identificado como gargalo diretamente no
  canvas (cor vermelha), não apenas em um painel de texto separado.
- **FR-010**: O sistema MUST permitir desfazer e refazer edições no canvas (adicionar/remover/mover
  nó ou aresta, alterar configuração de um nó), em ordem, de forma consistente com o histórico real
  de ações do usuário.
- **FR-011**: O sistema MUST salvar o design em andamento automaticamente no navegador do usuário à
  medida que ele edita, e MUST restaurá-lo automaticamente ao reabrir o mesmo problema no mesmo
  navegador — sem exigir uma ação explícita de "salvar" e sem persistir em servidor neste marco
  (autosave local; histórico de versões e sincronização entre dispositivos são escopo de M4).
- **FR-012**: O sistema MUST apresentar exatamente um problema completo — "Encurtador de URL" — com
  enunciado, requisitos funcionais, requisitos não-funcionais e escala (`docs/foundational-doc.md`
  §2.1, partes 1/3/4/5; partes 2, 6 e 7 da anatomia — fase de clarificação, rubrica escondida e
  solução de referência — são escopo de M2, não deste marco).
- **FR-013**: O resultado exibido após a submissão MUST se limitar ao que o engine de fato calcula
  neste marco (utilização, gargalo, latência, custo, violações) e MUST NOT apresentar uma nota ou
  pontuação — nem mesmo um veredito provisório do tipo "passa"/"não passa" — já que o cálculo de
  score por dimensão só existe a partir de M2 (decisão do autor, 2026-08-17: o critério de saída do
  marco em `docs/product-context.md` §10 foi reformulado para não mencionar "nota").
- **FR-014**: O sistema MUST impedir que o usuário digite um número de réplicas inválido (não é
  possível confirmar um valor menor que 1, ou não-numérico) diretamente no campo de configuração.
- **FR-015**: O sistema MUST permitir navegar e operar o canvas inteiramente por teclado (adicionar,
  selecionar, conectar, configurar, desfazer/refazer), consistente com RNF-8
  (`docs/product-context.md` §11).
- **FR-016**: O sistema MUST NUNCA travar nem mostrar um erro técnico cru para nenhuma entrada de
  design malformada (canvas vazio, sem entrada alcançável, com ciclo) — sempre um resultado com
  mensagem legível, consistente com a garantia do engine de nunca lançar exceção (FR-019 de M0).
- **FR-017** *(adicionado pós-Ready, feedback direto do autor)*: O sistema MUST recusar, no próprio
  gesto de conectar, uma aresta entre dois tipos de componente cuja combinação não faz sentido
  arquitetural (ex.: Load Balancer → SQL Primary) — o engine roda sem erro nesse caso (FR-016/FR-019
  de M0) mas produz um resultado plausível e errado. A regra é puramente de UX (`apps/web`,
  `packages/engine` não muda) e vive em `connection-rules.ts`: cada tipo de componente só alcança um
  conjunto fixo de tipos de destino, derivado do papel de cada componente em system design e do
  comportamento real do engine (ex.: Cache só conecta a um banco, porque é isso que dá sentido à
  redução por taxa de acerto no caminho — `packages/engine/src/graph/propagate.ts`). O painel de
  configuração do nó selecionado MUST mostrar a quais tipos ele pode se conectar.
- **FR-018** *(adicionado pós-Ready, feedback direto do autor)*: O sistema MUST exibir, para cada
  componente da paleta e para cada nó já colocado no canvas, uma explicação textual do que aquele
  componente faz — visível ao passar o mouse na paleta, ao passar o mouse no nó, e por completo no
  painel de configuração ao selecionar o nó (o único dos três caminhos garantidamente acessível por
  teclado). Não introduz nenhum controle novo que o engine não lê (mantém FR-005) — quando a
  explicação menciona um conceito não modelado nesta versão (ex.: algoritmo de Load Balancer), o
  texto MUST deixar isso explícito, para nunca sugerir um comportamento que a simulação não aplica.

### Key Entities

- **Design (Canvas)**: o grafo montado pelo usuário — nós computáveis (cada um com tipo, réplicas e,
  se aplicável, taxa de acerto de cache), arestas tipadas e com peso, e um ou mais nós Cliente
  (mobile/web/desktop) que determinam os pontos de entrada (FR-006) sem entrar no cálculo do engine.
  Estrutura editável, com histórico de undo/redo (US2) e persistência local automática (US3,
  FR-011) — sem persistência em servidor neste marco.
- **Problema (Encurtador de URL)**: o único problema completo deste marco — enunciado, requisitos
  funcionais e não-funcionais, e escala esperada (FR-012). Vive como dado versionado em
  `packages/problems` (ainda não criado), não hardcoded na UI.
- **Resultado da simulação**: a saída do engine para um Design + carga de trabalho submetidos —
  utilização por nó, gargalo, latência do caminho, custo, violações estruturais. Não inclui nota ou
  score neste marco (FR-013).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa que nunca usou o produto consegue montar um design válido para o problema
  do encurtador de URL (com ao menos um caminho da entrada até um componente de dados) e submetê-lo,
  sem ajuda externa, numa única sessão.
- **SC-002**: Depois de submeter, o usuário identifica visualmente qual nó é o gargalo em menos de
  10 segundos, sem precisar ler texto explicativo — só olhando o canvas.
- **SC-003**: Nenhuma submissão, para nenhuma topologia de design (incluindo canvas vazio, ciclos,
  nós inalcançáveis), resulta em erro técnico visível ao usuário.
- **SC-004**: Fechar e reabrir o navegador nunca perde um design em andamento — o conteúdo restaurado
  é idêntico ao estado antes de fechar.
- **SC-005**: O resultado da simulação aparece na tela em menos de 1 segundo após o usuário submeter,
  para designs de até 30 nós (herdado do orçamento de performance do engine, RNF-1 de
  `docs/product-context.md` §11: simulação de 30 nós em menos de 50 ms).
- **SC-006**: O canvas responde a arrastar/soltar/conectar sem travamento perceptível (60 fps) para
  designs de até 50 nós (RNF-7).

## Assumptions

- Fora de escopo por decisão (não por esquecimento), conforme prioridade explícita em
  `docs/product-context.md` §10: import/export em JSON e Mermaid, export em PNG (P1); minimapa e
  agrupamento visual por região (P2). Nenhum desses aparece neste marco.
- Também fora de escopo, por pertencerem a outros marcos: fase de clarificação de requisitos, rubrica
  escondida e solução de referência do problema (M2, parte da "anatomia" completa de um problema);
  score por dimensão e narrador LLM explicando o resultado (M2); progresso por conceito, histórico de
  versões de designs, biblioteca de 12 problemas e compartilhar por URL (M4).
- O engine (`packages/engine`) roda no browser, dentro de um Client Component — confirmado
  empiricamente nesta sessão (spike de risco, commit `feat: wire @sdp/engine into apps/web`). A
  submissão deste marco calcula o resultado inteiramente no cliente, sem round-trip a um servidor:
  não há efeito colateral em servidor neste marco (nenhum design ou resultado é persistido em banco —
  isso só começa em M4), então a restrição "nunca confiar no frontend" (decisão do autor, M0.5) não é
  violada por calcular localmente. **Esta suposição deixa de valer no momento em que qualquer marco
  futuro passar a persistir ou pontuar uma submissão como "oficial"** (M2 em diante) — a partir daí, o
  resultado usado para qualquer efeito registrado (nota, progresso, ranking) MUST ser recalculado no
  servidor a partir do Design enviado, nunca aceito como o cliente o reportou.
- Requisitos mínimos de réplicas (mínimo 1, sem máximo definido) seguem o que o tipo `DesignNode` do
  engine já aceita — não é uma decisão de escopo/produto nova.
- O texto completo do problema "Encurtador de URL" (enunciado, requisitos, escala) é escrito com base
  em `docs/foundational-doc.md` §2.1/§2.2 durante o `/speckit-plan`/`/speckit-tasks` deste marco — não
  é uma decisão de produto em aberto, é conteúdo a produzir.
- A estrutura de dados de `packages/problems` (ainda inexistente) é uma decisão técnica de
  `/speckit-plan`, não uma decisão de escopo/produto.
