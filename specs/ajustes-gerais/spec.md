# Feature Specification: Ajustes gerais (pós-M4)

**Feature Branch**: `feature/004-general-fixes`

**Created**: 2026-11-05

**Status**: Ready

**Input**: Pedido do autor (2026-11-05), depois do M4: "ajuste geral dos erros que achei no sistema" —
tela de Progresso fora do design system; desafio/incidente que não conta XP nem fica salvo; falta
animação de XP; varredura de segurança; lentidão ao trocar de tela; alertas nativos do navegador.

## Diagnóstico ao entrar

- **XP "não conta"** (reproduzido): o card do desafio pinta a rubrica com o último resultado de
  *qualquer* simulação — inclusive "Simular", que roda com carga livre e de novo a cada mudança no
  canvas. Os 5 critérios ficam ✓ sem nenhuma submissão; o servidor registra 0 XP e nenhum desafio. Só
  "Submeter" credita.
- **Progresso fora do padrão**: `/app/progresso`, `/app/biblioteca` e `/app/ranking` não têm a barra do
  app nem o visual dos painéis do canvas.
- **Lentidão** (medida em dev): cada tela leva 400–750ms no servidor (consultas ao Neon) e não existe
  `loading.tsx` — o clique fica sem retorno até a página inteira chegar.
- **Alertas nativos**: 11 `window.alert/confirm/prompt` em 5 componentes.

## Clarifications

### Session 2026-11-05

- Q: Como corrigir o XP? → A: **O card mostra os critérios só do último "Submeter"** (na escala do
  desafio). "Simular" continua livre e não pinta o card; o card diz "Submeta para validar e ganhar XP".
- Q: Qual design system? → A: **O do canvas**: mesma barra do app e mesmo visual dos painéis; vale para
  Progresso, Biblioteca e Ranking.
- Q: Dependências para modal/toast/animação? → A: **Pode usar bibliotecas.**
- Q: Segurança? → A: **Só relatório primeiro**; o autor decide o que corrigir.

## User Scenarios & Testing *(mandatory)*

### US1 — Desafio só "passa" quando é submetido (P1)

**Acceptance Scenarios**:
1. **Given** um desafio aberto, **When** o usuário só clica em Simular, **Then** os critérios do card
   continuam "não verificado" e o card convida a submeter.
2. **Given** um design que resolve o desafio, **When** o usuário clica em Submeter, **Then** o servidor
   credita 100 XP (uma vez), o desafio aparece como resolvido no menu e no Progresso, e isso continua
   depois de recarregar.
3. **Given** um incidente, **When** o usuário diagnostica e verifica o fix com sucesso, **Then** o XP é
   creditado e o incidente aparece como resolvido no Progresso.

### US2 — Animação de XP (P2)

1. **Given** uma submissão ou fix que credita XP, **When** a resposta chega, **Then** aparece uma animação
   de "+100 XP" (e das conquistas, se houver); sem XP creditado, não há animação.

### US3 — Confirmações e avisos sem alert nativo (P2)

1. **Given** qualquer ação que hoje usa `alert/confirm/prompt`, **When** acontece, **Then** aparece um modal
   (pergunta/nome) ou um toast (aviso) no visual do app, acessível por teclado (Esc fecha, foco preso no
   modal).

### US4 — Telas no design do canvas (P2)

1. **Given** Progresso, Biblioteca ou Ranking, **When** abertas, **Then** têm a mesma barra do app e os
   mesmos estilos de painel do canvas.

### US5 — Trocar de tela sem parecer travado (P3)

1. **Given** um clique para outra tela do app, **When** a navegação começa, **Then** um estado de
   carregamento aparece na hora, e o tempo de servidor das telas com banco cai (consultas em paralelo /
   menos idas ao banco), medido antes e depois em build de produção.

### US6 — Relatório de segurança (P1)

1. Varredura pelos pilares (autenticação, autorização/IDOR, injeção, XSS, CSRF, cabeçalhos HTTP,
   segredos, rate limit, dependências, exposição de dados, open redirect) com achados classificados
   (alto/médio/baixo) e recomendação; **nada é corrigido sem o autor decidir**.

## Requirements *(mandatory)*

- **FR-001**: A rubrica no card MUST refletir só o resultado do último Submeter do desafio aberto.
- **FR-002**: XP e "resolvido" MUST continuar vindo só do servidor (regra do M2.8 intocada).
- **FR-003**: Nenhum `window.alert/confirm/prompt` MUST sobrar em `apps/web/src`.
- **FR-004**: Engine, narrador e banco MUST ficar intocados.

## Success Criteria *(mandatory)*

- **SC-001**: Simular sozinho nunca deixa o card todo ✓ (testado).
- **SC-002**: Submeter uma solução válida credita XP, e o resolvido persiste após recarregar (browser).
- **SC-003**: Zero alert/confirm/prompt nativos.
- **SC-004**: Tempo até o primeiro retorno visual ao trocar de tela < 100ms (estado de carregamento).
- **SC-005**: Relatório de segurança entregue ao autor.
