# Feature Specification: M4.2 — Biblioteca de 12 problemas

**Feature Branch**: `feature/002-problem-library-m4-2`

**Created**: 2026-10-26

**Status**: Done

**Input**: Roadmap (`docs/product-context.md` §10, M4): "biblioteca de 12 problemas". Segunda fatia do
M4, depois do M4.1. Lista de referência: `docs/foundational-doc.md` §2.2.

## Contexto ao entrar neste marco

O catálogo tem 3 desafios: Encurtador de URL, Feed de notícias (`social-feed`) e Checkout de
e-commerce. O Checkout não está na lista do §2.2, mas fica: é o único transacional com pagamento externo
e já tem progresso, XP e designs salvos apontando pra ele. A progressão hoje é uma fila: o desafio N só
destrava com o N-1 resolvido (`apps/web/src/lib/challenge-progression.ts`, conferido também no servidor
em `POST /api/submissions`).

## Clarifications

### Session 2026-10-26

- Q: Sobram 10 problemas do §2.2 para +9 vagas — como fechar? → A: **9 de 10, sem o Google Drive**
  (sincronização, chunking e conflito são o que o engine menos consegue mostrar). Total: 12.
- Q: Com 12 desafios, como fica a trava? → A: **Por nível**: 3 níveis (básico, intermediário,
  avançado) de 4 problemas. O básico está sempre aberto; resolver **qualquer** problema de um nível
  destrava o nível seguinte inteiro.
- Q: Conceitos que o engine não modela (WebSocket/presença, índice geoespacial, janela de stream,
  politeness) → A: **Aproximar com os componentes existentes, engine intocado.** A rubrica cobra
  estrutura e métricas que o engine já calcula; as dicas explicam o conceito em texto.
- Q: Como aprovar o conteúdo? → A: **Rascunho em arquivo** (`content-draft.md`) aprovado pelo autor
  antes do código, como nos presets (M2.5) e incidentes (M3).

### Session 2026-10-28

- Conteúdo de `content-draft.md` **aprovado pelo autor**.
- Q: 7 arestas das referências são proibidas pela matriz de conexões do canvas
  (`apps/web/src/lib/connection-rules.ts`). Ampliar a matriz ou adaptar o conteúdo? → A: **Ampliar a
  matriz** com 5 conexões realistas: Rate Limiter → Cache/NoSQL (contador compartilhado), Worker →
  Notificações, Auth Service → App Server, API Gateway → Kafka/Event Stream, Kafka/Event Stream →
  Analytics/Data Warehouse. Valem para todo o canvas, não só para os desafios.
- Q: Entradas que nem a matriz ampliada cobre (Load Balancer → Rate Limiter, Cliente → Scheduler)? →
  A: **Rate limiter**: o Cliente liga direto no Rate Limiter (sem Load Balancer na frente). **Crawler**:
  um API Gateway ×2 recebe as sementes e alimenta o Scheduler.
- Q: A regra do M2.6 (FR-003, `hints-source.spec.ts`) exige ≥1 dica citando uma obra clássica em
  todo problema; 6 dos 9 não tinham. → A: **Adicionar uma dica citada em cada um** (aprovadas pelo
  autor): Rate limiter → `srp`; Leaderboard → `recoverability`; Chat → `robustness`; Vídeo →
  `boundaries`; Crawler → `gateway` (PoEAA); Cliques → `archivability`. Texto em `content-draft.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolver os 9 problemas novos (Priority: P1)

O usuário abre qualquer um dos 9 problemas novos no menu "Desafios", lê enunciado, requisitos e rubrica,
monta um design, submete e recebe score por dimensão, narrador e XP, igual aos 3 de hoje.

**Why this priority**: é o conteúdo do marco.

**Independent Test**: carregar a solução de referência de cada problema novo e submeter — todos os
critérios passam, o desafio conta como resolvido e dá 100 XP uma vez.

**Acceptance Scenarios**:

1. **Given** um problema novo destravado, **When** o usuário submete a solução de referência, **Then**
   todos os critérios da rubrica passam e o desafio conta como resolvido (100 XP, só na primeira vez).
2. **Given** um problema novo, **When** o usuário monta o design ingênuo (o componente central com 1
   réplica), **Then** algum componente satura ou aparece ponto único de falha, e a rubrica mostra o que
   falhou.
3. **Given** um problema novo, **When** o usuário pede "Ver solução de referência", **Then** o design
   e o raciocínio aparecem, como nos 3 de hoje.
4. **Given** um problema novo, **When** o usuário abre as dicas, **Then** cada dica é texto autorado; a
   que cita um princípio oferece "Ler na biblioteca".

---

### User Story 2 - Progressão por nível (Priority: P2)

O menu "Desafios" agrupa os 12 problemas em Básico, Intermediário e Avançado. O básico está sempre
aberto; resolver qualquer problema de um nível destrava o próximo.

**Why this priority**: sem isso, 12 desafios em fila deixariam o conteúdo novo inacessível por muito
tempo.

**Independent Test**: conta nova vê só o nível básico aberto; resolve um problema básico e o nível
intermediário inteiro abre; o servidor recusa submeter um problema de nível ainda travado.

**Acceptance Scenarios**:

1. **Given** uma conta sem nenhum desafio resolvido, **When** abre o menu, **Then** os 4 básicos estão
   abertos e os outros 8 travados, com o motivo ("resolva um problema do nível Básico").
2. **Given** um problema básico resolvido, **When** abre o menu, **Then** os 4 intermediários abrem.
3. **Given** um nível travado, **When** alguém tenta submeter um problema dele pela API, **Then** o
   servidor recusa, como hoje.
4. **Given** uma conta que já tinha resolvido desafios pela regra antiga, **When** abre o menu,
   **Then** nada que estava aberto fecha (a regra nova só abre mais).

### Edge Cases

- A conquista "Catálogo completo" passa a exigir os 12. Quem já a ganhou com 3 continua com ela
  (eventos são imutáveis desde o M2.8); quem não ganhou precisa dos 12.
- Designs salvos (M4.1) em problemas antigos continuam abrindo no contexto certo; abrir um design de
  problema de nível travado cai no canvas livre com aviso (regra do M4.1, agora por nível).
- Ranking e perfil público contam desafios resolvidos sobre o catálogo novo (12).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O catálogo MUST ter 12 problemas: os 3 atuais + Rate limiter distribuído, Leaderboard,
  Sistema de notificações, Chat em tempo real, Upload/streaming de vídeo, Web crawler, Pagamento Pix,
  Matching de corridas e Agregador de cliques em anúncios.
- **FR-002**: Cada problema novo MUST ter todos os campos de `Problem` (enunciado, requisitos
  funcionais e não-funcionais, escala, `latencyBudgetMs`, rubrica, dicas, solução de referência com
  raciocínio), com o conteúdo aprovado pelo autor em `content-draft.md`.
- **FR-003**: A solução de referência de cada problema MUST passar 100% da própria rubrica na escala
  oficial (teste existente `reference-solution.spec.ts`); nas 9 novas, nenhum nó acima de ρ = 0,8 (as 3
  anteriores ficam como estão — a do Feed roda em ρ 0,93 desde o M2).
- **FR-004**: Cada problema MUST ter um nível (`basic` | `intermediate` | `advanced`), 4 por nível.
- **FR-005**: A regra de destrave MUST ser por nível (Clarifications) e a mesma no cliente e no
  servidor; nenhum desafio aberto pela regra antiga pode fechar.
- **FR-006**: O menu "Desafios" MUST agrupar por nível e mostrar o motivo da trava.
- **FR-007**: Critérios de rubrica repetidos (latência p99, nenhum nó saturado, sem SPOF, "usa
  componente X") MUST vir de construtores compartilhados, não copiados em cada problema.
- **FR-008**: Engine, narrador (`NARRATOR_PROMPT_VERSION`) e banco MUST ficar intocados.
- **FR-009**: A matriz de conexões do canvas MUST permitir as 5 conexões novas (Clarifications
  2026-10-28), e toda solução de referência MUST caber na matriz, incluindo Cliente → nós de entrada
  (testado).

### Key Entities

- **Problem** (existente, `packages/problems`): ganha `level`.
- **Nível**: ordem fixa `basic` → `intermediate` → `advanced`.

## Success Criteria *(mandatory)*

- **SC-001**: 12 problemas no catálogo, 4 por nível; as 12 referências passam a própria rubrica.
- **SC-002**: Para cada problema novo, um design ingênuo (componente central com 1 réplica) falha em ao
  menos um critério (testado).
- **SC-003**: Conta nova consegue abrir qualquer problema intermediário depois de resolver 1 básico
  (verificado no browser e no servidor).
- **SC-004**: `tsc`, testes e build limpos; snapshot de não-regressão do engine intacto.

## Assumptions

- XP por desafio continua 100 (`CHALLENGE_XP`), igual para todos os níveis.
- Os níveis dos 3 atuais: Encurtador → básico; Feed → intermediário; Checkout → avançado.
- Valores de capacidade e custo continuam ilustrativos (catálogo de componentes inalterado).
