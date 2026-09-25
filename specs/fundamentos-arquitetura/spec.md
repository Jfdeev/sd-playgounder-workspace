# Feature Specification: M2.6 — Fundamentos de arquitetura

**Feature Branch**: `feature/001-architecture-fundamentals-knowledge-base`

**Created**: 2026-09-25

**Status**: Ready

**Input**: User description: "M2.6 — Fundamentos de arquitetura. Base de conhecimento pesquisada previamente condensando Clean Architecture (Robert C. Martin), Fundamentals of Software Architecture (Mark Richards & Neal Ford) e Patterns of Enterprise Application Architecture (Martin Fowler), conectada às 7 dimensões de score e aos 4 templates de arquitetura já existentes."

## Contexto ao entrar neste marco

M2 já entrega score por dimensão real (7 dimensões calculadas), narrador via LLM, solução de
referência e catálogo de templates de arquitetura (M1.5). Este marco não adiciona nenhuma mecânica
de cálculo nova — estende três pontos de extensão que já existem (dimensões de score, templates,
`Hint`) com conteúdo bibliográfico real, e dá ao narrador um vocabulário citável em vez de só
números.

## Clarifications

### Session 2026-09-25

- Q: Onde este conteúdo novo mora no monorepo? → A: Pacote novo `packages/knowledge` (dado puro, mesmo padrão de `packages/problems`) — `packages/problems` referencia `packages/knowledge` pras dicas citarem uma ficha; `packages/narrator` importa direto pro prompt.
- Q: A "ficha" dos critérios de saída precisa de uma superfície de UI nova neste marco? → A: Sim — UI nova (ícone/modal nas dimensões do `ScorePanel` e nos templates da topbar), pra satisfazer literalmente "uma pessoa consegue abrir a ficha".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entender uma dimensão de score (Priority: P1)

Depois de ver o score por dimensão de uma submissão, o usuário abre a ficha de qualquer uma das 7
dimensões e lê a definição formal, a fonte bibliográfica exata, e como ela compete (trade-off)
contra as outras dimensões.

**Why this priority**: é a conexão mais direta com o que M2 já entrega — o score por dimensão já
está na tela do usuário, mas hoje é só um número sem vocabulário por trás.

**Independent Test**: abrir a ficha da dimensão "Disponibilidade", confirmar que ela cita a fonte
(*Fundamentals of Software Architecture*, Richards & Ford) e descreve pelo menos um trade-off real
(ex. contra Custo).

**Acceptance Scenarios**:

1. **Given** o usuário está vendo o score de uma submissão, **When** abre a ficha de uma dimensão,
   **Then** vê a definição formal, a fonte bibliográfica exata (livro + autor), e pelo menos um
   trade-off nomeado contra outra dimensão.
2. **Given** as 7 dimensões existentes no engine, **When** o catálogo de fichas é conferido,
   **Then** todas as 7 têm ficha própria — nenhuma dimensão fica sem conteúdo.

---

### User Story 2 - Entender um estilo de arquitetura (template) (Priority: P2)

Ao abrir o menu de Templates, o usuário vê, pra cada um dos 4 templates já existentes, quando usar
aquele estilo e seus principais trade-offs, citando a fonte.

**Why this priority**: os templates já existem e já são usados (M1.5) — a ficha só adiciona
contexto, não muda o comportamento de aplicar um template.

**Independent Test**: abrir a ficha do template "Microsserviços", confirmar que ela cita a fonte e
descreve pelo menos um trade-off (ex. complexidade operacional vs. escalabilidade independente).

**Acceptance Scenarios**:

1. **Given** o usuário está no menu de Templates, **When** abre a ficha de um template,
   **Then** vê quando usar aquele estilo, os trade-offs principais, e a fonte bibliográfica exata.
2. **Given** os 4 templates já existentes (Monolito, 3 Camadas, Microsserviços, Orientado a
   Eventos), **When** o catálogo de fichas é conferido, **Then** todos os 4 têm ficha própria.

---

### User Story 3 - Receber uma dica sobre responsabilidade e acoplamento (Priority: P3)

Dentro de um desafio, o usuário vê uma dica estática nova (mesmo padrão de `Hint` já usado em M1)
que cita o princípio de responsabilidade/acoplamento quando relevante pro problema em questão.

**Why this priority**: estende um mecanismo que já existe (`Hint`) com uma dica a mais por
problema — incremento pequeno, mas depende de pelo menos uma dimensão (US1) já ter vocabulário
formal pra dica poder citar.

**Independent Test**: abrir as dicas de um problema existente, confirmar que pelo menos uma delas
cita a fonte (*Clean Architecture*, Robert C. Martin) ao falar de responsabilidade/acoplamento.

**Acceptance Scenarios**:

1. **Given** um problema do catálogo, **When** o usuário abre as dicas, **Then** pelo menos uma
   dica cita o princípio de responsabilidade/acoplamento com a fonte bibliográfica exata.

---

### User Story 4 - O narrador cita um princípio ao explicar (Priority: P4)

Ao ler a explicação do narrador (M2) sobre um resultado, o usuário eventualmente vê uma citação a
um princípio ou estilo de arquitetura relevante pro design submetido, sempre atribuída à fonte.

**Why this priority**: é o incremento mais dependente dos outros três (só faz sentido depois que
o conteúdo em si existe) e o mais difícil de garantir deterministicamente (depende do LLM decidir
citar, não é uma regra fixa) — por isso a prioridade mais baixa.

**Independent Test**: submeter um design com um SPOF (violação já detectada pelo engine), abrir a
explicação do narrador, confirmar que ela não cita nenhum princípio/fonte que não exista no
conteúdo autorado das US1-US3 (nunca uma citação inventada).

**Acceptance Scenarios**:

1. **Given** uma explicação do narrador que cita um princípio ou estilo, **When** a citação é
   conferida, **Then** ela corresponde a um item real do conteúdo autorado (nunca inventada).
2. **Given** uma explicação do narrador que não cita nenhum princípio, **When** isso acontece,
   **Then** não é um erro — citar é um enriquecimento oportunista, nunca obrigatório em toda
   resposta (o narrador continua funcionando exatamente como em M2 sem isso).

---

### Edge Cases

- O que acontece se uma dimensão de score ou um template ganhar uma entrada nova no futuro (ex.
  M1.5 adicionar um 5º template) sem a ficha correspondente ser autorada junto? → o catálogo de
  fichas deve ser exaustivo por construção (mesmo padrão `Record<Dimension, ...>`/`Record<TemplateId,
  ...>` já usado em `packages/engine`/`apps/web`) — um item novo sem ficha correspondente não deve
  compilar, nunca aparecer silenciosamente sem conteúdo.
- O que acontece se o narrador tentar citar uma fonte que não está no conteúdo autorado? → nunca
  deveria acontecer (o prompt só recebe o conteúdo real como contexto, não pode inventar uma fonte
  que não viu) — mas se acontecer, é tratado como o mesmo tipo de falha que qualquer outra alucinação
  do narrador, não uma categoria de erro nova.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST ter uma ficha por dimensão de score (7 no total), cada uma com
  definição formal, fonte bibliográfica exata (livro + autor), e pelo menos um trade-off nomeado
  contra outra dimensão.
- **FR-002**: O sistema MUST ter uma ficha por template de arquitetura já existente (4 no total),
  cada uma com quando usar, trade-offs principais, e fonte bibliográfica exata.
- **FR-003**: O sistema MUST ter pelo menos uma dica estática nova por problema do catálogo,
  citando o princípio de responsabilidade/acoplamento com fonte, quando aplicável ao problema.
- **FR-004**: Todo conteúdo (ficha ou dica) MUST citar a fonte bibliográfica exata (livro + autor)
  — nenhum conteúdo sem citação rastreável.
- **FR-005**: Nenhum padrão específico de camada de dado de *Patterns of Enterprise Application
  Architecture* (Repository, Data Mapper, Active Record, Table Module) MUST virar mecânica nova do
  produto (componente novo, cálculo novo) — esses padrões, se citados, ficam só como referência de
  leitura dentro do conteúdo já definido acima.
- **FR-006**: O conteúdo MUST ser autorado à mão (dado versionado), nunca gerado por LLM em tempo
  de autoria nem de execução — mesmo padrão já usado em `rubric`/`hints`/`referenceSolution`.
- **FR-007**: O narrador MAY citar um item do conteúdo autorado ao explicar um resultado, sempre
  atribuído à fonte — nunca é obrigado a citar em toda resposta, e nunca inventa uma citação que
  não exista no conteúdo autorado.
- **FR-008**: O sistema MUST manter a garantia já estabelecida de que nenhum número exibido tem
  origem em LLM — este conteúdo é só texto/citação, nunca produz nem influencia uma métrica.

### Key Entities

- **Característica de arquitetura**: ficha ligada 1:1 a uma `Dimension` já existente no engine —
  definição formal, fonte, trade-offs nomeados contra outras dimensões.
- **Estilo de arquitetura**: ficha ligada 1:1 a um template já existente (`ArchitectureTemplate`) —
  quando usar, trade-offs, fonte. Pode incluir estilos sem template correspondente ainda (referência
  pura, sem virar mecânica nova neste marco).
- **Dica de responsabilidade/acoplamento**: mesmo tipo `Hint` já existente, associada a um ou mais
  problemas do catálogo, citando a fonte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para qualquer uma das 7 dimensões de score, um usuário consegue abrir a ficha
  correspondente e ver a definição formal + a fonte bibliográfica exata.
- **SC-002**: Para qualquer um dos 4 templates de arquitetura já existentes, um usuário consegue
  abrir a ficha correspondente e ver quando usar + trade-offs + a fonte bibliográfica exata.
- **SC-003**: 100% do conteúdo novo (fichas e dicas) tem uma citação rastreável a uma das 3 obras
  de origem — nenhum conteúdo "solto" sem fonte.
- **SC-004**: Zero padrões de camada de dado de PoEAA viram componente novo do canvas ou cálculo
  novo do engine (confirmável por revisão do catálogo de componentes e do engine antes/depois).

## Assumptions

- O conteúdo é redigido em português (pt-br), mesmo padrão do resto do catálogo de problemas —
  citações de título de obra/nome de padrão em inglês (termo técnico consagrado) são aceitáveis
  dentro do texto em português, mesmo padrão já usado em `docs/product-context.md`.
- O conteúdo novo mora num pacote novo, `packages/knowledge` — dado puro, mesmo padrão de
  `packages/problems`. `packages/problems` passa a depender de `packages/knowledge` (pras dicas
  citarem uma ficha); `packages/narrator` importa direto pro prompt. Resolvido via
  `/speckit-clarify`, Session 2026-09-25.
- Este marco entrega uma superfície de UI nova (ícone/modal nas dimensões do painel de score e nos
  templates da topbar) — não fica só como dado verificável por teste. Resolvido via
  `/speckit-clarify`, Session 2026-09-25.
