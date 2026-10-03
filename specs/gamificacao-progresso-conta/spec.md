# Feature Specification: M2.8 — Gamificação e progresso na conta

**Feature Branch**: `feature/001-account-gamification-progress`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "Incluir um sistema de gamificação no app: temos a conta do usuário mas não fazemos muita coisa com ela, porque as arquiteturas dele ficam num banco local (navegador). Fazer um sistema gamificado para incentivar o estudo."

## Contexto ao entrar neste marco

Hoje a conta do usuário (Auth.js, e-mail/senha ou Google) só serve pra entrar em `/app`. Nada que
o usuário faz depois fica ligado a ela: o progresso de desafios (`completedIds`) e cada design em
edição vivem no `localStorage` do navegador — trocar de navegador ou de máquina zera tudo.

Isso importa pra este marco por dois motivos:

1. **O progresso precisa mudar de lugar**: pra gamificar, "o que eu já fiz" tem que viver no
   servidor, ligado à conta.
2. **A regra "nunca confiar no frontend" deixa de ser adiável.** Desde o M1, a submissão é 100%
   client-side (o navegador roda o engine e julga a rubrica) e isso era aceitável porque nada
   "oficial" dependia do resultado — o M1 registrou que isso muda "no momento em que algum marco
   futuro persistir/pontuar uma submissão como oficial". Pontuar XP é exatamente esse momento: se o
   cliente decide quanto XP ganhou, qualquer pessoa forja o próprio nível.

Fronteira com o M4: o roadmap já prevê "salvar designs com histórico de versões" e "progresso por
conceito" no M4. Este marco **não** entrega isso por padrão — ver FR-011 (pendente do autor).

Independente do M2.7: não depende da biblioteca de princípios; os dois podem ser mesclados em
qualquer ordem. A entrada de M2.8 no roadmap (`docs/product-context.md` §10) chega pela branch do
M2.7 — o PR do M2.7 deve ser mesclado primeiro (ou esta branch rebaseada depois).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ganhar XP ao resolver um desafio e ver meu progresso na conta (Priority: P1)

Logado, o usuário resolve um desafio (a rubrica inteira passa). O servidor confere a submissão,
credita XP e o nível/XP aparecem na conta. Se ele abrir o app em outro navegador ou máquina, vê o
mesmo progresso.

**Why this priority**: é o núcleo — sem XP persistido e verificado, nada de gamificação existe; e
é o que dá à conta um motivo de existir (a queixa original do autor).

**Independent Test**: logado, resolver o desafio "Encurtador de URL"; confirmar que XP e nível
sobem; abrir outro navegador, entrar com a mesma conta e ver o mesmo XP/nível.

**Acceptance Scenarios**:

1. **Given** um usuário logado com um design que passa 100% da rubrica de um desafio, **When** ele
   submete, **Then** o servidor reconfere a submissão e credita XP à conta, e o usuário vê XP e
   nível atualizados.
2. **Given** o mesmo usuário em outro navegador/dispositivo, **When** entra com a mesma conta,
   **Then** vê o mesmo XP, nível e desafios resolvidos.
3. **Given** uma submissão que **não** passa a rubrica inteira, **When** o usuário submete,
   **Then** nenhum XP é creditado (o resultado do engine continua sendo exibido normalmente).
4. **Given** um corpo de requisição forjado (resultado ou carga adulterados pelo cliente),
   **When** chega ao servidor, **Then** nenhum XP é creditado pelo que o cliente alegou — o
   servidor só credita pelo que ele mesmo recalculou.

---

### User Story 2 - Subir de nível e ver um painel de progresso (Priority: P2)

O usuário vê, num lugar da conta, seu XP total, nível atual, quanto falta pro próximo nível e o
histórico dos desafios resolvidos.

**Why this priority**: é o que torna o XP legível e motivador; sem isso, US1 credita pontos que
ninguém vê direito. Mas depende de US1 existir.

**Independent Test**: com XP creditado, abrir o painel e conferir XP total, nível, distância pro
próximo nível e a lista de desafios resolvidos com a data.

**Acceptance Scenarios**:

1. **Given** um usuário com XP creditado, **When** abre o painel de progresso, **Then** vê XP
   total, nível, XP restante pro próximo nível e os desafios resolvidos.
2. **Given** o mesmo total de XP, **When** o nível é calculado em qualquer momento, **Then** o
   resultado é sempre o mesmo (nível é função determinística do XP).
3. **Given** um usuário recém-criado, **When** abre o painel, **Then** vê um estado inicial
   explícito (nível inicial, zero XP) — nunca um painel vazio ou quebrado.

---

### User Story 3 - Manter uma ofensiva de dias estudando (Priority: P3)

O usuário vê uma ofensiva (streak): quantos dias seguidos teve pelo menos uma atividade de estudo
verificada pelo servidor. Perder um dia zera a ofensiva.

**Why this priority**: é o mecanismo clássico de hábito, mas só faz sentido depois que XP e painel
existem.

**Independent Test**: simular atividade verificada em dias consecutivos e confirmar que a ofensiva
cresce; pular um dia e confirmar que volta pra zero.

**Acceptance Scenarios**:

1. **Given** atividade verificada em dias consecutivos, **When** o usuário abre o painel, **Then**
   a ofensiva reflete o número de dias seguidos.
2. **Given** um dia inteiro sem atividade verificada, **When** o próximo dia começa, **Then** a
   ofensiva volta a zero na próxima atividade (o recorde histórico é preservado).
3. **Given** várias atividades verificadas no mesmo dia, **When** a ofensiva é calculada, **Then**
   o dia conta uma vez só.

---

### User Story 4 - Desbloquear conquistas (Priority: P4)

O usuário desbloqueia conquistas (badges) por marcos verificáveis — por exemplo, resolver o
primeiro desafio, resolver todos os desafios do catálogo, ou entregar um design sem ponto único de
falha — e vê as que já tem e as que ainda faltam.

**Why this priority**: camada de recompensa extra; o sistema já funciona sem ela.

**Independent Test**: cumprir a condição de uma conquista e confirmar que ela aparece desbloqueada
com a data, uma única vez, mesmo se a condição for cumprida de novo.

**Acceptance Scenarios**:

1. **Given** uma conquista cuja condição foi cumprida por um evento verificado, **When** o evento é
   processado, **Then** a conquista é desbloqueada e registrada com a data.
2. **Given** uma conquista já desbloqueada, **When** a condição é cumprida de novo, **Then** nada
   muda (cada conquista desbloqueia uma vez).
3. **Given** a lista de conquistas, **When** o usuário a abre, **Then** vê as desbloqueadas e as
   bloqueadas (com a condição visível).

---

### Edge Cases

- **Reenviar o mesmo design** ou **resolver de novo um desafio já resolvido** → não credita XP de
  novo (anti-farming); a submissão continua devolvendo o resultado normalmente.
- **Duas submissões simultâneas** (duas abas/dispositivos) do mesmo desafio → o crédito acontece
  uma única vez (nunca XP em dobro por corrida).
- **Evento só de cliente** (abrir uma ficha, abrir a biblioteca, abrir uma dica) → não credita XP:
  é indistinguível de um clique forjado, então seria farmável (ver Assumptions).
- **O servidor de progresso falha ao gravar** → o usuário continua vendo o resultado do engine
  (nunca bloqueia, mesma regra do narrador); nenhum XP "fantasma" é exibido sem estar gravado.
- **Sessão expirada no meio da submissão** → a submissão não credita XP e o usuário é levado a
  entrar de novo, sem perder o design em edição (que continua no navegador).
- **Progresso que já existe no `localStorage`** de quem usava o app antes deste marco → não pode
  ser creditado cegamente (é editável); o tratamento é decisão pendente do autor (FR-009).
- **Rubrica ou catálogo muda depois** (desafio novo, critério alterado) → XP já creditado nunca é
  revogado; desafios novos viram novas oportunidades de XP.
- **Exclusão da conta** → o progresso some junto com ela (nada de órfão).
- **Muitas submissões em sequência** (abuso ou script) → o servidor limita a taxa de submissões
  que disparam recálculo, pra não virar custo ilimitado nem vetor de farming.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST persistir o progresso de gamificação (XP, nível, ofensiva,
  conquistas, desafios resolvidos) **no servidor, ligado à conta**, de modo que o mesmo progresso
  apareça em qualquer navegador ou dispositivo após entrar.
- **FR-002**: O sistema MUST creditar XP **somente** por eventos que o servidor consiga verificar.
  Uma submissão só rende XP depois que o servidor **reexecuta o engine sobre o design recebido**,
  com a carga derivada do próprio problema — nunca confia no resultado, na carga nem na nota que o
  cliente alegar.
- **FR-003**: Resolver o mesmo desafio de novo, ou reenviar o mesmo design, MUST NOT creditar XP
  adicional; o crédito por desafio acontece uma única vez, e submissões repetidas/simultâneas são
  idempotentes.
- **FR-004**: Eventos que só existem no cliente (abrir fichas, biblioteca, dicas) MUST NOT creditar
  XP neste marco.
- **FR-005**: XP, nível, ofensiva e conquistas MUST medir **atividade de estudo** e MUST NOT se
  tornar, substituir ou agregar uma nota de qualidade do design: o resultado de uma submissão
  continua exibindo as 7 dimensões separadas, e nenhuma delas é somada com XP (Constitution V).
  Qualquer coisa derivada do resultado de um design vem do engine, nunca recalculada à parte
  (Constitution VII).
- **FR-006**: O nível MUST ser função determinística do XP total, e o XP creditado por um evento
  verificado MUST ser determinístico (mesmo evento, mesmo XP).
- **FR-007**: A ofensiva MUST contar dias corridos com pelo menos uma atividade verificada pelo
  servidor, contar cada dia uma vez, e voltar a zero depois de um dia inteiro sem atividade,
  preservando o recorde histórico.
- **FR-008**: As conquistas MUST ser desbloqueadas apenas por eventos verificados, cada uma uma
  única vez, com a data registrada; a lista MUST mostrar as desbloqueadas e as bloqueadas.
- **FR-009**: O progresso que já existe no `localStorage` (antes deste marco) MUST NOT ser
  creditado sem verificação. [NEEDS CLARIFICATION: o que fazer com o progresso antigo — começar
  todo mundo do zero, ou conceder crédito retroativo (mesmo sendo auto-declarado, já que
  `completedIds` é editável no navegador)?]
- **FR-010**: [NEEDS CLARIFICATION: gamificação social — o usuário deve poder ver outros usuários
  (ranking/leaderboard, perfil público)? Isso expõe dados de usuários uns aos outros (nome, e-mail?)
  e é uma decisão de produto e de privacidade; sem resposta, este marco entrega só o progresso
  individual, visível apenas pro próprio usuário.]
- **FR-011**: [NEEDS CLARIFICATION: salvar os designs do usuário na conta (a queixa original: "as
  arquiteturas ficam num banco local") entra neste marco ou continua no M4 ("salvar designs com
  histórico de versões")? Sem resposta, este marco **não** move designs pro servidor — só o
  progresso.]
- **FR-012**: A gamificação MUST valer só pra usuários autenticados; nenhuma ação sem sessão válida
  credita XP.
- **FR-013**: Se o registro do progresso falhar, o sistema MUST continuar exibindo o resultado do
  engine normalmente e MUST NOT exibir XP que não tenha sido gravado.
- **FR-014**: O servidor MUST limitar a frequência de submissões que disparam recálculo, pra
  conter custo e tentativa de farming.

### Key Entities

- **Perfil de progresso**: um por usuário — XP total, nível (derivado), ofensiva atual e recorde.
- **Evento de pontuação**: registro imutável de cada crédito verificado — tipo, desafio
  relacionado, XP concedido, data. É o que garante idempotência (FR-003) e auditoria do XP.
- **Desafio resolvido**: o fato de um usuário ter resolvido um desafio, com a data da primeira
  resolução.
- **Conquista**: definição (nome, condição) e **conquista desbloqueada** (usuário, conquista,
  data).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depois de submeter um design que resolve um desafio, o usuário vê XP e nível
  atualizados em até 3 segundos.
- **SC-002**: Em 100% das vezes, um usuário que entra em outro navegador/dispositivo vê o mesmo XP,
  nível, ofensiva e conquistas.
- **SC-003**: 0 créditos de XP a partir de uma requisição forjada (resultado, carga ou nota
  adulterados no cliente) — confirmável reenviando payloads adulterados.
- **SC-004**: 0 XP adicional ao resolver de novo um desafio já resolvido ou reenviar o mesmo design,
  em 100% dos casos, inclusive com submissões simultâneas.
- **SC-005**: Para um mesmo design, as 7 dimensões de score exibidas não mudam antes/depois do
  marco, e nenhuma nota única agregada passa a existir (Constitution V).
- **SC-006**: A ofensiva está correta em 100% dos casos de teste de virada de dia (mesmo dia,
  dia seguinte, dia pulado).

## Assumptions

- Hoje todo o `/app` já exige login, então "usuário autenticado" cobre todo mundo que usa o
  produto; a gamificação não cria um modo anônimo.
- **Só XP verificável pelo servidor.** Ler uma ficha, abrir a biblioteca ou uma dica é estudo de
  verdade, mas é indistinguível de um clique forjado — se rendesse XP, seria o jeito mais fácil de
  farmar nível. Premiar leitura fica fora deste marco por esse motivo, não por esquecimento; o
  autor pode reverter isso se aceitar um teto diário de XP de leitura.
- O gatilho de XP deste marco é **resolver um desafio** (a rubrica inteira passa); progresso
  parcial na rubrica não rende XP — mantém a regra simples e verificável.
- Os valores concretos (XP por desafio, curva de níveis, o conjunto inicial de conquistas) são
  ajustáveis e ficam pro `/speckit-plan`; a spec fixa as regras, não os números.
- O limite de "dia" da ofensiva usa um fuso fixo (assumido: o do Brasil, `America/Sao_Paulo`,
  público inicial pt-br); fuso por usuário fica fora deste marco.
- O servidor pode executar o engine: ele é TypeScript puro e já foi desenhado pra rodar no browser
  e no servidor (Constitution II).
- O conteúdo da interface é em pt-br.
- Sem monetização, anúncios, recompensas com valor real ou loja de itens — fora de escopo.
