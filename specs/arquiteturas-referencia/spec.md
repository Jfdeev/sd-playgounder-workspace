# Feature Specification: M2.5 — Arquiteturas de referência

**Feature Branch**: `feature/001-reference-architectures-presets`

**Created**: 2026-10-03

**Status**: Ready

**Input**: User description: "M2.5 — Presets de arquiteturas reais de empresas conhecidas (GitHub, Discord, iFood, Nubank, Netflix), pesquisadas previamente com fidelidade real, carregáveis no canvas como ponto de partida, com cada componente explicado (por que existe ali, que problema resolve)."

## Contexto ao entrar neste marco

O canvas já deixa o usuário desenhar à mão, carregar um dos 4 templates de estilo (M1.5), carregar a
solução de referência de um desafio (M2) e simular com carga ajustável. O M2.5, inserido no
roadmap em 2026-08-13 e ainda não começado, acrescenta outra origem de design: **a arquitetura
real de uma empresa conhecida**, carregável como ponto de partida e explicada componente a
componente.

Três restrições do projeto moldam este marco e já estão decididas:

1. **Fidelidade real, não invenção.** O roadmap exige que as arquiteturas sejam *pesquisadas
   previamente* — nunca geradas pelo LLM na hora. O risco central do marco é um preset que
   *parece* a arquitetura da empresa mas é invenção plausível.
2. **O narrador explica, nunca inventa** (Constitution I). Explicar "por que a empresa X usa
   Kafka aqui" exige fatos sobre a empresa; esses fatos têm que vir do material pesquisado, não da
   memória do modelo.
3. **O narrador atual está congelado.** A rota `/api/narrator` e o prompt (v3) acabaram de ser
   verificados no M2 (SC-001), e o contrato daquela rota proíbe enviar o `Design` ao LLM. Este
   marco não pode mexer neles.

A simulação não é a empresa: o engine modela capacidade, fila, latência e custo de um grafo
simplificado. Um preset é **uma leitura simplificada, com fonte, da arquitetura da empresa** — não a
sua réplica. Honestidade sobre essa distância é parte do produto (FR-004, FR-005).

## Clarifications

### Session 2026-10-03

- Q: Como produzimos a explicação de cada componente de um preset? → A: **Geradas uma vez por preset a partir do material pesquisado, revisadas e aprovadas pelo autor, e commitadas como dado versionado** — nenhuma chamada ao Gemini em tempo de execução. Motivos: cota gratuita de 20 requisições/dia, SC-003 do M2 já falhando em 15s, e o modelo em runtime acrescentaria fatos próprios sobre a empresa. A rota `/api/narrator` e o prompt v3 continuam intocados.
- Q: O que fazemos com o Netflix, sem fonte primária alcançável? → A: **Manter o Netflix; o agente procura outra fonte primária.** Resultado da busca (2026-10-03): o Tech Blog e o Medium respondem 403, mas o site do Open Connect e os READMEs oficiais de Zuul, EVCache, Eureka e Priam abrem e foram lidos. O preset do Netflix será **mais fino** que os demais — só entra o que essas fontes afirmam (ver `research.md`).
- Ajuste que a pesquisa exigiu no FR-003 (registrado aqui por ser mudança de requisito): as fontes primárias afirmam **componentes e papéis**, quase nunca o **grafo de chamadas**. Exigir fonte para toda aresta esvaziaria os presets; então uma conexão é *afirmada* (a fonte a diz) ou *inferida* (consequência natural dos papéis) — e a inferida é marcada como tal e listada nas limitações.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carregar o preset de uma empresa no canvas (Priority: P1)

O usuário abre o menu de arquiteturas de referência, escolhe uma empresa e o canvas passa a mostrar
a arquitetura dela como ponto de partida. Antes de confirmar, vê de quem é, um resumo do contexto e
as fontes públicas de onde a leitura veio.

**Why this priority**: é o critério de saída do marco ("carregar ao menos 1 preset") e a base de
todo o resto; mesmo sozinho já entrega valor — o usuário vê uma arquitetura real e pode simulá-la.

**Independent Test**: abrir o menu, escolher o preset do GitHub (ou qualquer um disponível), ver o
design aparecer no canvas e clicar em "Simular" sem erro.

**Acceptance Scenarios**:

1. **Given** o usuário está no canvas, **When** abre o menu de arquiteturas de referência,
   **Then** vê a lista de empresas disponíveis, cada uma com resumo e fontes.
2. **Given** um canvas com design em edição, **When** o usuário escolhe um preset, **Then** o
   sistema pede confirmação antes de substituir o design atual, e a ação pode ser desfeita.
3. **Given** um preset carregado, **When** o usuário clica em "Simular", **Then** a simulação roda
   como em qualquer design e exibe as 7 dimensões separadas (nunca uma nota única).
4. **Given** um usuário dentro de um desafio, **When** carrega um preset, **Then** nada daquilo
   conta para a rubrica nem para a progressão do desafio.

---

### User Story 2 - Entender por que cada componente está ali (Priority: P2)

Com um preset carregado, o usuário escolhe um componente e lê uma explicação curta: por que ele
existe naquela arquitetura e que problema resolve — ancorada no material pesquisado, com a fonte.

**Why this priority**: é a segunda metade do critério de saída ("entender por que aquela empresa fez
aquela escolha"). Depende de US1.

**Independent Test**: carregar um preset, abrir a explicação de cada componente e conferir que cada
uma cita a fonte e não traz nenhum fato ausente do material pesquisado.

**Acceptance Scenarios**:

1. **Given** um preset carregado, **When** o usuário escolhe um componente, **Then** vê por que ele
   existe ali e que problema resolve, com referência à fonte.
2. **Given** todos os componentes de um preset, **When** o conjunto de explicações é conferido,
   **Then** cada componente tem a sua — nenhum fica sem explicação.
3. **Given** uma explicação, **When** ela é lida, **Then** não contém número nem afirmação sobre a
   empresa que não esteja no material pesquisado ou no resultado do engine.
4. **Given** qualquer momento de uso (inclusive com serviços externos fora do ar), **When** o
   usuário abre a explicação de um componente, **Then** ela aparece — as explicações não dependem de
   nenhum serviço externo em tempo de execução.

---

### User Story 3 - Saber o que é real e o que é ilustrativo (Priority: P3)

O usuário vê, junto do preset, o que a simulação **não** modela daquela arquitetura e quais
parâmetros (réplicas, carga) são ilustrativos — e esse aviso acompanha os números da simulação.

**Why this priority**: evita o pior mal-entendido do marco: ler "p99 de 12 ms" como a latência
real da empresa. É honestidade, não funcionalidade nova, por isso vem depois de US1/US2.

**Independent Test**: carregar um preset, abrir a lista de limitações, simular e conferir que o
resultado traz o aviso de valores ilustrativos.

**Acceptance Scenarios**:

1. **Given** um preset, **When** o usuário vê seus detalhes, **Then** encontra a lista do que o
   simulador não modela (por exemplo, comportamentos que o engine não representa).
2. **Given** um parâmetro sem fonte (réplicas, carga), **When** o preset é exibido, **Then** ele é
   rotulado como ilustrativo.
3. **Given** uma simulação sobre um preset, **When** o resultado aparece, **Then** vem acompanhado do
   aviso de que os valores são ilustrativos, não os da empresa.

---

### User Story 4 - Explorar as outras empresas da primeira leva (Priority: P4)

Cada empresa adicional da primeira leva entra como um preset independente, do mesmo jeito que o
primeiro.

**Why this priority**: amplia o catálogo, mas cada preset é um incremento separado — o marco já
cumpre o critério de saída com um só.

**Independent Test**: para cada preset adicional, repetir US1–US3.

**Acceptance Scenarios**:

1. **Given** um preset adicional, **When** é carregado, **Then** passa pelos mesmos critérios de US1,
   US2 e US3.
2. **Given** uma empresa cujas afirmações não têm fonte primária verificada, **When** o catálogo é
   montado, **Then** ela fica de fora — nunca entra um preset sem fonte.

---

### Edge Cases

- **A realidade usa algo que o catálogo de 44 componentes não tem** → o componente é omitido ou
  aproximado, e isso consta na lista de limitações do preset; nunca se inventa um componente.
- **A realidade tem uma conexão que a matriz de conexões do canvas proíbe** → o desvio é registrado
  e o preset segue as regras do canvas; mudar as regras de conexão está fora de escopo.
- **O usuário edita o preset carregado** → vira um design comum; componentes removidos perdem a
  explicação, componentes adicionados não têm explicação (nunca uma explicação inventada).
- **Uma fonte sai do ar ou muda** → o preset guarda título e publicador, e não só o link, para a
  fonte continuar localizável.
- **Duas fontes discordam** sobre um detalhe → entra a de publicador primário (a própria empresa);
  na dúvida, o detalhe fica de fora.
- **Carregar um preset por cima de um design sem salvar** → mesma confirmação destrutiva dos
  templates e da solução de referência.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um menu de arquiteturas de referência no canvas; escolher uma
  carrega o design dela no canvas, com confirmação antes de substituir um design existente e a
  possibilidade de desfazer.
- **FR-002**: Todo preset MUST ser construído só com os componentes do catálogo existente, e toda
  conexão MUST ser aceita pelas regras de conexão do canvas e pela validação estrutural do engine —
  um preset que o próprio canvas se recusaria a deixar o usuário desenhar não pode existir.
- **FR-003**: Todo componente de um preset MUST ser rastreável a uma fonte pública que foi de fato
  aberta e lida na pesquisa; resumo de buscador não é fonte. Toda conexão MUST ser *afirmada* por uma
  fonte lida ou *marcada como inferida* (consequência natural dos papéis dos componentes) e listada
  nas limitações do preset. Uma afirmação sem fonte e que não seja uma inferência declarada MUST
  ficar de fora.
- **FR-004**: Todo preset MUST exibir: a empresa, um resumo do contexto, as fontes (título,
  publicador, link) e a lista do que a simulação **não** modela ou simplificou.
- **FR-005**: Réplicas, carga e qualquer parâmetro quantitativo que não venha de uma fonte MUST ser
  rotulado como ilustrativo, e os resultados de "Simular" sobre um preset MUST trazer esse aviso.
- **FR-006**: Todo componente de um preset MUST ter uma explicação — por que existe ali e que
  problema resolve — que MUST ficar restrita ao material pesquisado: nenhum fato sobre a empresa e
  nenhum número que não esteja nele ou no resultado do engine (Constitution I).
- **FR-007**: As explicações por componente MUST ser geradas uma vez por preset a partir do material
  pesquisado, revisadas e aprovadas pelo autor, e guardadas como dado versionado; nenhuma chamada a
  LLM acontece em tempo de execução para produzi-las (Clarifications, 2026-10-03).
- **FR-008**: O conteúdo (designs, resumos, limitações, explicações) MUST ser dado versionado, nunca
  gerado em tempo de execução sem revisão. O rascunho pode ser assistido por LLM, mas MUST ser
  aprovado pelo autor antes da implementação — mesmo gate do M2.6/M2.7.
- **FR-009**: Presets MUST ser exploração de sandbox: carregar um preset nunca conta para a rubrica
  nem para a progressão de um desafio, e nunca concede pontuação.
- **FR-010**: Este marco MUST NOT alterar o engine, a rota do narrador existente, o prompt do
  narrador (v3) nem a exibição das 7 dimensões — as explicações nunca agregam as dimensões numa
  nota única (Constitution V).
- **FR-011**: A primeira leva é GitHub (P0, o preset do MVP), Discord, iFood, Nubank e Netflix; cada
  preset MUST entrar só se cumprir FR-003, e é um incremento independente (cada um passa pelo gate de
  revisão do FR-008). O preset do Netflix, por só ter fontes primárias finas, MAY ter menos
  componentes que os demais.

### Key Entities

- **Preset de arquitetura**: empresa, resumo de contexto, o design (componentes e conexões do
  catálogo existente), a lista do que o simulador não modela e os parâmetros ilustrativos.
- **Fonte web**: título, publicador, link e data de acesso — distinta da citação de livro do M2.6
  (obra + autor).
- **Explicação de componente**: texto ligado a um componente de um preset, com as fontes de onde
  vem.
- **Limitação**: item da lista do que o simulador não representa daquela arquitetura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos componentes de cada preset entregue têm uma fonte aberta e lida listada, e
  100% das conexões são afirmadas por uma fonte ou marcadas como inferidas (conferível numa lista de
  rastreabilidade revisada pelo autor).
- **SC-002**: Pelo menos 1 preset pode ser carregado e **todos** os seus componentes têm explicação
  — o critério de saída do marco.
- **SC-003**: 100% dos presets passam nas regras de conexão do canvas e na validação estrutural do
  engine (conferível por teste automatizado).
- **SC-004**: 0 explicações contêm fato ou número ausente do material pesquisado (revisão do autor
  antes da liberação).
- **SC-005**: Carregar e simular um preset nunca altera a progressão de nenhum desafio (conferível
  comparando o progresso antes/depois).
- **SC-006**: Uma pessoa carrega um preset em até 3 interações a partir do canvas.

## Assumptions

- Conteúdo em pt-br, com nomes de produtos e termos técnicos no original.
- Um preset é uma leitura **simplificada** — a lista de limitações é o que torna isso explícito, não
  uma desculpa para fidelidade menor.
- O M2.7 (biblioteca) e o M2.8 (gamificação) são independentes deste marco.
- A fonte web é um tipo novo (a citação do M2.6 é só livro + autor); a modelagem fica pro
  `/speckit-plan`.
- A explicação "pelo LLM" do roadmap passa a significar **LLM como ferramenta de rascunho em tempo
  de autoria, com revisão do autor** — não o narrador em tempo de execução. É decisão do autor
  (Clarifications) e atualiza a leitura do critério de saída do roadmap.
