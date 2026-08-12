# Feature Specification: M0.5 — Landing Page e Conta

**Feature Branch**: `feature/001-landing-page-auth-m05`

**Created**: 2026-08-12

**Status**: Ready

**Input**: User description: "M0.5 — Landing page e conta, inserido antes do M1 (decisão do autor):
landing page completa de apresentação (hero, diferenciais, comparação com concorrentes) e criação
de conta/login via Auth.js (email/senha + Google OAuth) com Neon Postgres." (conforme
`docs/product-context.md` §10, seção M0.5, e ADR-005/ADR-007 de §8)

## Clarifications

### Session 2026-08-12

- Q: Se alguém criar conta com email/senha usando um email já cadastrado via Google (ou
  vice-versa), o sistema deve tratar como a mesma conta ou como contas separadas? → A: mesma conta,
  vinculada por email — os dois métodos acessam a mesma Account quando o email bate.
- Q: Precisa de rate limiting/bloqueio temporário contra tentativas repetidas de login com senha
  errada já neste marco? → A: sim, proteção básica (bloqueio temporário após N tentativas) já em
  M0.5.

## User Scenarios & Testing *(mandatory)*

<!--
  Diferente do M0 (engine puro, sem usuário final), M0.5 é a primeira UI real do produto — tem
  usuário humano de verdade, na primeira vez que ele vê o produto.
-->

### User Story 1 - Visitante entende o produto e decide criar conta (Priority: P1)

Como visitante que nunca ouviu falar do produto, eu chego na landing page, entendo em poucos
segundos o que é o produto (arquitetura de sistemas com feedback determinístico, não LLM como juiz),
vejo o que o diferencia dos concorrentes, e decido criar uma conta ou entrar.

**Why this priority**: é a porta de entrada do produto inteiro — sem isso, ninguém chega a criar
conta. `docs/product-context.md` §2 define o "momento aha" do produto; a landing page precisa
comunicar a promessa desse momento antes mesmo do usuário testar.

**Independent Test**: acessar a landing page sem estar autenticado e verificar que hero, proposta de
valor, diferenciais e CTA estão visíveis e o CTA leva à tela de criar conta/entrar.

**Acceptance Scenarios**:

1. **Given** um visitante não autenticado, **When** ele acessa a rota raiz do produto, **Then** vê a
   landing page (não uma tela de login forçado, não o canvas — que ainda não existe neste marco).
2. **Given** a landing page carregada, **When** o visitante lê a seção de diferenciais, **Then** vê
   ao menos os itens de maior prioridade de `docs/foundational-doc.md` §7 (Modo Campanha, Modo
   Incidente, Budget forçado + fronteira de Pareto, Import/export).
3. **Given** a landing page carregada, **When** o visitante lê a seção de comparação, **Then** vê a
   tese central do produto (engine determinístico vs. LLM como juiz dos concorrentes listados em
   `docs/foundational-doc.md` §0).
4. **Given** a landing page carregada, **When** o visitante clica no CTA principal, **Then** é
   levado ao fluxo de criação de conta / login (User Story 2).

---

### User Story 2 - Criar conta e entrar pela primeira vez (Priority: P1)

Como visitante convencido pela landing page, eu crio uma conta — com email e senha, ou com um clique
via Google — e sou autenticado no produto.

**Why this priority**: sem conta, não há "dentro do produto" para nenhum marco futuro (M1 em diante)
— e a decisão do autor foi justamente ter esse alicerce pronto antes do canvas.

**Independent Test**: criar uma conta nova por cada um dos dois métodos (email/senha e Google) e
confirmar que, ao final, existe uma sessão autenticada.

**Acceptance Scenarios**:

1. **Given** um visitante sem conta, **When** ele escolhe "criar conta" com email e senha válidos
   (e senha atende aos requisitos mínimos), **Then** a conta é criada, ele é autenticado, e a senha
   nunca é armazenada em texto puro.
2. **Given** um visitante sem conta, **When** ele escolhe "entrar com Google" e autoriza, **Then**
   uma conta é criada automaticamente associada ao email do Google, e ele é autenticado.
3. **Given** um visitante tentando criar conta com email/senha, **When** o email já está cadastrado,
   **Then** vê uma mensagem de erro clara (não uma falha silenciosa nem um erro técnico cru).
4. **Given** um visitante tentando criar conta com email/senha, **When** a senha não atende aos
   requisitos mínimos, **Then** vê uma mensagem de erro clara antes do envio (ou imediatamente após).

---

### User Story 3 - Entrar numa conta existente e sair (Priority: P1)

Como usuário que já tem conta, eu entro com minhas credenciais (ou Google) numa visita seguinte, e
posso sair quando quiser — a sessão não força reentrada a cada visita dentro do período de validade.

**Why this priority**: sem login persistente, a conta de US2 não tem valor prático nenhum.

**Independent Test**: logar, fechar e reabrir o navegador dentro do período de validade da sessão,
confirmar que continua autenticado; deslogar e confirmar que a sessão termina.

**Acceptance Scenarios**:

1. **Given** um usuário com conta existente, **When** ele informa email/senha corretos (ou usa
   Google), **Then** é autenticado e uma sessão é criada.
2. **Given** um usuário com email/senha incorretos, **When** ele tenta entrar, **Then** vê uma
   mensagem de erro genérica (não revela se o email existe ou não — mitigação básica de enumeração
   de usuários).
3. **Given** um usuário autenticado, **When** ele aciona "sair", **Then** a sessão termina e ele
   volta ao estado de visitante não autenticado.
4. **Given** um usuário autenticado que fecha e reabre o navegador dentro do período de validade da
   sessão, **When** ele volta ao produto, **Then** continua autenticado, sem precisar entrar de novo.

---

### Edge Cases

- O que acontece quando um usuário autenticado acessa a landing page diretamente? MUST redirecionar
  para dentro do produto (não mostrar a landing de "venda" para quem já é usuário) — ver Assumptions
  para onde exatamente isso leva, já que o canvas (M1) ainda não existe.
- O que acontece se o provedor OAuth (Google) estiver indisponível? MUST mostrar erro claro e manter
  o caminho de email/senha disponível — nunca travar o fluxo inteiro por causa de um provedor.
- O que acontece se alguém tentar criar conta com email/senha usando um email já cadastrado via
  Google (ou vice-versa)? A conta é a mesma — o login por senha e o login via Google acessam a
  mesma Account quando o email é idêntico (decisão do autor, 2026-08-12; ver Clarifications).
- O que acontece com tentativas repetidas de login com senha errada? O sistema MUST bloquear
  temporariamente após N tentativas malsucedidas consecutivas (decisão do autor, 2026-08-12; ver
  FR-012).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exibir uma landing page pública (sem exigir autenticação) na rota raiz
  do produto, contendo: hero com a proposta de valor central (`docs/product-context.md` §2 — engine
  determinístico, LLM como narrador, momento "aha"), seção de diferenciais (prioridade P0/⭐ de
  `docs/foundational-doc.md` §7), seção de comparação com os concorrentes listados em
  `docs/foundational-doc.md` §0, e um CTA principal para criar conta/entrar.
- **FR-002**: O sistema MUST permitir criar uma conta com email e senha.
- **FR-003**: O sistema MUST permitir criar conta e entrar via Google OAuth (ADR-007).
- **FR-004**: O sistema MUST permitir entrar numa conta existente via email/senha ou Google.
- **FR-005**: O sistema MUST permitir encerrar a sessão (logout) a qualquer momento.
- **FR-006**: O sistema MUST manter a sessão autenticada entre visitas, dentro de um período de
  validade, sem exigir novo login a cada acesso.
- **FR-007**: O sistema MUST armazenar dados de conta em Neon (Postgres serverless, ADR-005).
- **FR-008**: O sistema MUST NUNCA armazenar senha em texto puro — apenas hash (constitution não
  cobre isso diretamente, mas é requisito de segurança elementar de qualquer criação de conta).
- **FR-009**: O sistema MUST mostrar mensagens de erro claras e específicas para: email já
  cadastrado (no fluxo de criação de conta) e senha que não atende aos requisitos mínimos.
- **FR-010**: O sistema MUST mostrar uma mensagem de erro genérica (sem revelar se o email existe)
  para tentativa de login com credenciais inválidas.
- **FR-011**: O sistema MUST redirecionar um usuário já autenticado que acessa a landing page para
  dentro do produto, em vez de mostrar a landing de apresentação novamente.
- **FR-012**: O sistema MUST bloquear temporariamente novas tentativas de login por email/senha
  após um número limitado de tentativas malsucedidas consecutivas para a mesma conta (decisão do
  autor, 2026-08-12) — proteção básica contra força bruta.
- **FR-013**: Quando o email de uma nova conta (por qualquer método) já corresponde a uma Account
  existente, o sistema MUST vincular o novo método de login à Account existente, nunca criar uma
  Account duplicada (decisão do autor, 2026-08-12).

### Key Entities

- **Account (Conta)**: email, senha (hash) ou vínculo com provedor OAuth (Google), data de criação.
  Um email corresponde a uma conta (ver Edge Cases — vínculo entre método email/senha e Google ainda
  em aberto).
- **Session (Sessão)**: vínculo entre uma Account autenticada e o navegador do usuário, com validade
  limitada no tempo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa que nunca viu o produto consegue, sem ajuda, entender do que se trata a
  partir da landing page e chegar ao fluxo de criação de conta em menos de 1 minuto.
- **SC-002**: Uma pessoa consegue criar conta (por qualquer um dos dois métodos), entrar, e sair,
  de ponta a ponta, sem erro.
- **SC-003**: Uma tentativa de login com senha errada nunca revela se o email existe ou não na base.
- **SC-004**: Nenhuma senha aparece em texto puro em nenhum lugar do sistema (banco, logs).

## Assumptions

- Após login bem-sucedido, o usuário MUST ver uma tela simples de "dentro do produto" (placeholder
  autenticado) — o canvas (M1) ainda não existe neste marco, então não há para onde mais redirecionar.
  O conteúdo exato dessa tela fica a critério do `/speckit-plan` (não é uma decisão de escopo/produto,
  é um detalhe de implementação de baixíssimo risco).
- Requisitos mínimos de senha (comprimento, complexidade) seguem prática padrão de mercado (ex:
  mínimo 8 caracteres) — não especificado nos documentos de contexto, e não é uma decisão que muda o
  escopo do marco.
- Acessibilidade dos formulários (navegação por teclado, labels) segue o mesmo princípio de RNF-8
  (`docs/product-context.md` §11), que já pede navegação por teclado para o canvas — aplicado aqui
  por analogia a formulários de conta.
- Fora de escopo por decisão (não por esquecimento): progresso por conceito, histórico de versões de
  designs, biblioteca de problemas, wiki de conceitos, compartilhar por URL — tudo isso é M4
  (`docs/product-context.md` §10). Este marco só entrega a conta e a landing page.
