# Feature Specification: M2.7 — Biblioteca de princípios de arquitetura

**Feature Branch**: `feature/001-architecture-principles-library`

**Created**: 2026-10-03

**Status**: Ready

**Input**: User description: "M2.7 — ampliar a base de conhecimento do M2.6, que ficou fraca: faltam coisas que o autor viu nos livros (SOLID é um exemplo). Cobrir as três obras-fonte — Clean Architecture (Robert C. Martin), Fundamentals of Software Architecture (Mark Richards & Neal Ford) e Patterns of Enterprise Application Architecture (Martin Fowler) — numa biblioteca navegável."

## Contexto ao entrar neste marco

O M2.6 entregou `packages/knowledge` com 7 fichas de dimensão de score, 4 fichas de estilo
(templates) e 1 dica por problema citando Clean Architecture. Foi um recorte deliberadamente
estreito: só o vocabulário das coisas que a plataforma já calcula ou já tem como template. O autor
considerou isso raso diante do que as obras cobrem — hoje não existe nenhuma ocorrência de SOLID
no catálogo.

Há uma tensão de produto que este marco precisa tratar de frente: a plataforma simula **topologia
de infraestrutura**, e boa parte do que falta (SOLID em particular) é princípio de **código e
módulo**. Esses princípios não têm uma dimensão de score nem um template onde "pendurar" a ficha,
então o padrão exaustivo do M2.6 (uma ficha por dimensão, uma por template) não serve — este marco
precisa de uma entidade e de uma superfície novas: uma **biblioteca navegável**, independente de
haver um desafio ativo.

Fronteira com o M4: o roadmap já prevê uma "wiki de conceitos linkada aos problemas" e
"progresso por conceito" no M4. M2.7 entrega **a biblioteca** (o conteúdo e a navegação); o M4
depois a conecta ao progresso do usuário e ao mapeamento completo problema ↔ conceito. M2.7 não
duplica isso.

## Clarifications

### Session 2026-10-03

- Q: Como definimos a lista de princípios, características e padrões da primeira leva? → A: Proposta rascunhada pelo agente a partir de fontes públicas (sumário do *Clean Architecture*, catálogo oficial de padrões do próprio Fowler, resumos de terceiros do cap. 4 de Richards & Ford) e **aprovada pelo autor como está**. Primeira leva: 9 entradas de *Clean Architecture* (SRP, OCP, LSP, ISP, DIP, Regra de Dependência, Fronteiras, "o banco de dados é um detalhe", "frameworks são detalhes"), as características do cap. 4 de Richards & Ford que **não** são uma das 7 dimensões de score (19), e 11 padrões de Fowler com relevância de infraestrutura (leitura recomendada). Inventário nominal em `research.md`. Segunda leva (princípios de componentes REP/CCP/CRP/ADP/SDP/SAP, estilos de arquitetura além dos 4 templates, demais padrões do Fowler) fica fora deste marco.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir um princípio de Clean Architecture / SOLID na biblioteca (Priority: P1)

O usuário abre a biblioteca, escolhe a categoria de princípios de *Clean Architecture* e abre um
princípio — por exemplo, um dos cinco princípios SOLID — e lê a definição, a fonte bibliográfica
exata e, quando existir, como aquele princípio se relaciona com a topologia que ele desenha no
canvas.

**Why this priority**: é a lacuna que o autor apontou diretamente, e o que dá sentido ao marco —
sem isso M2.7 não existe.

**Independent Test**: abrir o princípio "Responsabilidade Única" (SRP), confirmar que ele mostra a
definição, cita *Clean Architecture*, Robert C. Martin, e diz explicitamente se tem ou não
correspondência com a topologia (sem inventar uma analogia forçada).

**Acceptance Scenarios**:

1. **Given** o usuário está no app, **When** abre a biblioteca sem nenhum desafio ativo, **Then**
   vê as categorias de conteúdo e consegue abrir qualquer princípio de Clean Architecture/SOLID.
2. **Given** um princípio aberto, **When** o usuário lê a ficha, **Then** vê definição, fonte
   bibliográfica exata (obra + autor) e a relação com a topologia da plataforma — ou a indicação
   explícita de que o princípio é de nível de código e não tem correspondência direta.
3. **Given** os cinco princípios SOLID, **When** a biblioteca é conferida, **Then** todos os cinco
   estão presentes, cada um com ficha própria.

---

### User Story 2 - Ver as características de arquitetura além das 7 dimensões (Priority: P2)

O usuário vê, na biblioteca, as características de arquitetura de *Fundamentals of Software
Architecture* (Richards & Ford) que **não** são uma das 7 dimensões de score — as que o M2.6 não
cobriu — cada uma com definição e fonte.

**Why this priority**: amplia a cobertura da segunda obra-fonte, mas é incremental sobre o que o
M2.6 já fez, e não tem o mesmo ponto de dor explícito que SOLID.

**Independent Test**: abrir uma característica que não é dimensão de score e confirmar definição +
fonte exata, e que ela não aparece como se fosse uma dimensão que o engine mede.

**Acceptance Scenarios**:

1. **Given** a biblioteca aberta, **When** o usuário abre a categoria de características de
   arquitetura, **Then** vê as características cobertas, claramente separadas das 7 dimensões que
   o engine calcula.
2. **Given** uma característica que o engine não mede, **When** o usuário a abre, **Then** a ficha
   deixa claro que a plataforma não a calcula (nunca sugere um score que não existe).

---

### User Story 3 - Ver os padrões de Fowler como leitura recomendada (Priority: P3)

O usuário vê, na biblioteca, os padrões de *Patterns of Enterprise Application Architecture* que o
autor incluir — sempre como **referência de leitura**, nunca como componente do canvas.

**Why this priority**: fecha a terceira obra-fonte, mas é a menos conectada ao produto (a
plataforma simula topologia, não estrutura interna de aplicação — mesma razão do M2.6 ter
mantido esses padrões fora de qualquer mecânica).

**Independent Test**: abrir um padrão de Fowler e confirmar que mostra definição curta, fonte
exata e a indicação de leitura recomendada; confirmar que o catálogo de componentes do canvas não
ganhou nenhum item.

**Acceptance Scenarios**:

1. **Given** um padrão de Fowler aberto, **When** o usuário lê a ficha, **Then** vê definição
   curta, fonte exata (obra + autor) e a indicação de que é leitura recomendada.
2. **Given** a lista de padrões da biblioteca, **When** o catálogo de componentes do canvas é
   comparado antes/depois do marco, **Then** não há componente novo nem cálculo novo.

---

### User Story 4 - Chegar à biblioteca a partir de uma ficha ou dica que já cita um princípio (Priority: P4)

Quando uma ficha ou dica do M2.6 já cita um princípio que existe na biblioteca (por exemplo, a
dica de responsabilidade/acoplamento que cita *Clean Architecture*), o usuário consegue abrir a
entrada correspondente dali, sem ter que procurar de novo.

**Why this priority**: costura o conteúdo novo ao que o usuário já vê, mas é o mínimo de
integração — o mapeamento completo problema ↔ conceito é o M4.

**Independent Test**: abrir uma dica de um problema que cita um princípio presente na biblioteca e
confirmar que há um caminho direto até a entrada.

**Acceptance Scenarios**:

1. **Given** uma dica ou ficha existente que cita um princípio presente na biblioteca, **When** o
   usuário a lê, **Then** consegue abrir a entrada correspondente direto dali.
2. **Given** uma dica ou ficha que cita uma obra mas nenhum princípio específico da biblioteca,
   **When** o usuário a lê, **Then** nada é exibido como link (nunca um link para uma entrada que
   não existe).

---

### Edge Cases

- Um princípio que não tem correspondência com topologia (ex. princípios de nível de classe) → a
  ficha diz isso explicitamente; nunca inventa uma analogia forçada só pra "conectar" ao produto.
- Um princípio que aparece em mais de uma obra (ex. responsabilidade única é discutida em mais de
  um dos livros) → uma entrada só, com a fonte primária explícita; nunca entradas duplicadas.
- O usuário procura um princípio que não está na biblioteca → estado vazio claro, nunca um
  resultado inventado ou um erro.
- O autor quer acrescentar um princípio depois → entrada sem fonte rastreável não pode existir
  (a regra "nenhum conteúdo sem citação" vale pro conteúdo novo, não só pro do M2.6).
- A citação exata (capítulo, página) não foi verificada contra o livro → a citação fica no nível
  de obra + autor, nunca um capítulo/página não conferido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer uma biblioteca navegável de conteúdo de arquitetura,
  acessível dentro do app autenticado **sem exigir um desafio ativo** (mesmo padrão da calculadora
  de capacidade do M2), organizada em categorias por obra-fonte: princípios de *Clean
  Architecture*, características de arquitetura de *Fundamentals of Software Architecture* e
  padrões de *Patterns of Enterprise Application Architecture*.
- **FR-002**: Toda entrada MUST ter definição e fonte bibliográfica exata (obra + autor); nenhuma
  entrada pode existir sem fonte rastreável.
- **FR-003**: A categoria de princípios de *Clean Architecture* MUST incluir os cinco princípios
  SOLID — pedido explícito do autor. A primeira leva, aprovada pelo autor em 2026-10-03
  (Clarifications), tem 39 entradas: 9 de *Clean Architecture*, 19 características de Richards &
  Ford fora das 7 dimensões de score, e 11 padrões de Fowler; o inventário nominal está em
  `research.md`. Itens fora dessa lista não entram neste marco.
- **FR-004**: Toda entrada de princípio de nível de código MUST indicar explicitamente se tem
  correspondência com a topologia que a plataforma simula; quando não tiver, a ficha diz isso, em
  vez de forçar uma analogia.
- **FR-005**: Nenhum padrão de *PoEAA* (Repository, Data Mapper, Active Record, Table Module ou
  outro) MUST virar componente do canvas, cálculo do engine ou mecânica nova — ficam só como
  leitura recomendada (decisão do M2.6 mantida).
- **FR-006**: O conteúdo MUST ser dado versionado, nunca gerado por LLM em tempo de execução. O
  rascunho pode ser assistido por LLM, mas MUST ser revisado e aprovado pelo autor antes da
  implementação — mesmo gate do M2.6 (FR-006 daquela spec), porque quem rascunha não tem acesso
  aos livros.
- **FR-007**: O sistema MUST tornar o nível de citação explícito e conservador: obra + autor.
  Capítulo, página ou trecho citado só entram se o autor tiver conferido contra o livro.
- **FR-008**: Uma ficha ou dica já existente (M2.6) que cita um princípio presente na biblioteca
  MUST oferecer um caminho direto até a entrada correspondente; nunca um link para entrada
  inexistente.
- **FR-009**: Este marco MUST NOT alterar o prompt do narrador, o engine nem qualquer número
  exibido: a biblioteca é só texto e navegação (Constitution I, V, VII). Em particular, o prompt do
  narrador continua na versão atual — mudá-lo invalida o cache e a verificação do M2.
- **FR-010**: A biblioteca MUST NOT se apresentar como progresso, nota ou ranking do usuário —
  progresso por conceito é do M4, e qualquer pontuação de estudo é do M2.8.

### Key Entities

- **Entrada de biblioteca**: uma unidade de conteúdo (princípio, característica ou padrão) com
  nome, categoria, definição, fonte bibliográfica exata e — para princípios de nível de código — a
  indicação de relação com a topologia. Não é ligada a uma `Dimension` nem a um template (esse é o
  motivo de ser uma entidade nova, e não mais uma ficha do M2.6).
- **Categoria**: agrupamento por obra-fonte (Clean Architecture, Fundamentals of Software
  Architecture, PoEAA).
- **Fonte**: obra + autor — as mesmas três citações já usadas no M2.6.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para 100% dos itens da lista aprovada pelo autor, uma pessoa consegue abrir a
  biblioteca, encontrar o item e ver definição + fonte bibliográfica exata.
- **SC-002**: 100% das entradas têm uma citação rastreável a uma das três obras — nenhuma entrada
  "solta".
- **SC-003**: Uma pessoa encontra qualquer princípio da lista em até 3 interações a partir do
  app, sem precisar de um desafio ativo.
- **SC-004**: Para um mesmo design, nenhum número exibido muda antes/depois do marco (confirmável
  comparando o resultado do engine e a versão do prompt do narrador).
- **SC-005**: Zero componentes novos no catálogo do canvas e zero cálculos novos no engine
  (confirmável por revisão antes/depois, igual ao SC-004 do M2.6).

## Assumptions

- O conteúdo é redigido em pt-br, com termos consagrados em inglês (nomes de princípios e de
  padrões) mantidos no original — mesma convenção do M2.6.
- A biblioteca fica dentro do app autenticado (mesmo lugar do resto do produto); não é uma página
  pública neste marco.
- O conteúdo novo reaproveita o pacote de dados puro do M2.6 como casa por padrão — a decisão de
  estrutura fica pro `/speckit-plan`.
- A fronteira com o M4 é: M2.7 = conteúdo + navegação; M4 = progresso por conceito e mapeamento
  completo problema ↔ conceito. Se o autor quiser puxar parte disso pra cá, é uma decisão dele,
  não deste rascunho.
- O narrador não consome a biblioteca neste marco (ver FR-009); reabrir isso é um marco futuro.
- A lista da primeira leva foi aprovada pelo autor (Clarifications); as **definições** de cada
  entrada continuam sendo rascunho assistido por LLM, sujeito ao gate de revisão do FR-006 antes da
  implementação.
