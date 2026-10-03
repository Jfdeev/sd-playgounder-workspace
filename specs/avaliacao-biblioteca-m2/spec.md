# Feature Specification: M2 — Avaliação e biblioteca

**Feature Branch**: `feature/001-evaluation-narrator-scoring`

**Created**: 2026-09-11

**Status**: Done (com ressalva — ver `tasks.md` T041, decisão do autor 2026-10-03)

**Input**: User description: "M2 — Avaliação e biblioteca. Marco definido em docs/product-context.md §10. Escopo P0: rubrica por problema, narrador LLM explicando o resultado do engine (nunca gerando número), score por dimensão, solução de referência com raciocínio, calculadora de capacidade back-of-envelope, 6 problemas. Critério de saída: o narrador nunca contradiz o engine em 20 submissões de teste consecutivas."

## Contexto ao entrar neste marco

Rubrica visível e progressão travada já existem para 3 problemas (Encurtador de URL, Social Feed, E-commerce Checkout) — construídas num incremento anterior, fora do escopo formal deste marco. Este marco **estende** o que existe, não o reconstrói: adiciona score por dimensão (hoje placeholder zerado), narrador em linguagem natural, solução de referência por problema, e uma calculadora de capacidade independente do canvas.

## Clarifications

### Session 2026-09-23

- Q: Catálogo de 6 problemas — completar pra 6 TOTAIS neste marco, ou focar primeiro nos 3 já existentes? → A: Focar em score/narrador/solução de referência pros 3 problemas já existentes (US1-US4) neste marco; os 3 problemas novos ficam pra um incremento separado depois. Autorizado a prosseguir sem aguardar resposta detalhada — opção recomendada aplicada.
- Q: Escopo da calculadora back-of-envelope (US4) — ferramenta independente sempre acessível, ou parte do fluxo de um problema específico? → A: Ferramenta independente sempre acessível (painel próprio, não amarrada a um problema ativo). Autorizado a prosseguir sem aguardar resposta detalhada — opção recomendada aplicada.

### Session 2026-09-24

- Q: Provedor de LLM do narrador (D4, resolvido em 2026-09-11 como Anthropic Claude API) — o autor pediu explicitamente pra trocar pra Google Gemini durante a implementação de US2, antes de qualquer código do narrador existir. → A: Google Gemini, modelo `gemini-2.5-flash`. `@anthropic-ai/sdk` trocado por `@google/generative-ai` em `apps/web/package.json`; `ANTHROPIC_API_KEY` virou `GEMINI_API_KEY`; saída estruturada via `responseSchema` nativo do Gemini em vez de tool use da Anthropic (research.md §2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a nota por dimensão depois de resolver um desafio (Priority: P1)

Depois de submeter um design que resolve um desafio (todos os critérios da rubrica passam), o usuário vê uma pontuação real em cada uma das 7 dimensões (escalabilidade, disponibilidade, latência, consistência, custo, complexidade operacional, segurança) — nunca uma nota geral única, sempre as 7 separadas.

**Why this priority**: É a fundação numérica de todo o resto do marco — o narrador explica esses números, e sem eles não existe "avaliação" nenhuma, só o pass/fail que já existia antes de M2.

**Independent Test**: Resolver o Encurtador de URL com dois designs diferentes (ex. um com cache, um sem) e confirmar que pelo menos a dimensão de latência ou custo muda de valor entre os dois — prova que o score reflete o design de verdade, não um valor fixo.

**Acceptance Scenarios**:

1. **Given** um desafio ativo e um design que resolve todos os critérios da rubrica, **When** o usuário clica em "Submeter", **Then** o resultado mostra um valor numérico (não zero fixo) para cada uma das 7 dimensões de `SimulationResult.scores`.
2. **Given** dois designs distintos que resolvem o mesmo desafio com trade-offs diferentes (ex. mais réplicas = mais disponibilidade, mais custo), **When** cada um é submetido, **Then** as dimensões afetadas mostram valores diferentes entre os dois — o score reage ao design, não é um número fixo por problema.
3. **Given** um design que ainda NÃO resolve o desafio (algum critério da rubrica falha), **When** o usuário submete, **Then** o sistema ainda mostra os 7 scores (aprender pelo número não deve exigir "passar" primeiro), mas a UI nunca os apresenta como comparáveis a uma nota de aprovação — são sinais por dimensão, não um veredito.

---

### User Story 2 - O narrador explica o resultado em linguagem natural (Priority: P2)

Depois de ver os números (utilização por nó, gargalo, latência, custo, violações, scores), o usuário lê uma explicação em texto corrido de por que o resultado foi aquele — nunca um número novo, só a leitura do que o engine já calculou.

**Why this priority**: É o diferencial central do produto sobre a concorrência (`docs/product-context.md` §1: "o LLM é narrador, nunca juiz") — mas só faz sentido depois que existe algo determinístico pra narrar (US1).

**Independent Test**: Submeter o mesmo design duas vezes seguidas (sem alterar nada) e confirmar que a explicação gerada é idêntica nas duas (cache por hash do design, ADR-006) — sem uma segunda chamada ao provedor de LLM.

**Acceptance Scenarios**:

1. **Given** um resultado de simulação (de "Simular" ou "Submeter"), **When** o usuário abre a explicação do narrador, **Then** o texto gerado descreve o gargalo, a latência e o custo já calculados pelo engine — nenhum número no texto pode divergir do que `SimulationResult` já contém.
2. **Given** o mesmo design (mesmo hash) submetido duas vezes, **When** o narrador é solicitado nas duas vezes, **Then** a segunda vez usa a explicação cacheada, sem uma nova chamada ao provedor de LLM (RNF-6: custo zero em cache hit).
3. **Given** a chamada ao provedor de LLM falha ou demora acima do limite (RNF-5: p95 < 15s), **When** isso acontece, **Then** o resultado numérico do engine continua visível normalmente — o narrador nunca bloqueia nem esconde o resultado determinístico já calculado.

---

### User Story 3 - Ver a solução de referência de um problema (Priority: P3)

Depois de tentar resolver um desafio (ou ao desistir dele), o usuário pode ver uma solução de referência autorada para aquele problema, com o raciocínio por trás de cada escolha — não só um diagrama pronto.

**Why this priority**: Fecha o ciclo de aprendizado ("como eu deveria ter resolvido isso?"), mas só é valioso depois que o usuário já formou sua própria opinião via score (US1) e narrador (US2) — mostrar isso cedo demais incentivaria copiar em vez de aprender.

**Independent Test**: Abrir a solução de referência do Encurtador de URL e confirmar que ela é um design carregável no canvas (mesmo formato de `Design`) com uma explicação textual associada a pelo menos uma decisão de capacidade (ex. por que aquele número de réplicas).

**Acceptance Scenarios**:

1. **Given** um problema do catálogo, **When** o usuário pede pra ver a solução de referência, **Then** vê um design completo (mesmo formato usado no canvas) e um texto explicando o raciocínio de pelo menos os componentes que resolvem o "aha" pedagógico daquele problema.
2. **Given** a solução de referência de um problema, **When** o engine simula esse design com a escala oficial do problema, **Then** o resultado satisfaz 100% dos critérios da rubrica daquele problema — a referência nunca pode ser uma solução que o próprio critério de avaliação rejeitaria.

---

### User Story 4 - Estimar capacidade sem montar um design (Priority: P4)

O usuário informa uma escala (ex. número de usuários ativos, requisições por usuário) e recebe uma estimativa de RPS, armazenamento e banda — sem precisar montar nenhum componente no canvas antes.

**Why this priority**: Ferramenta de apoio, útil em qualquer momento (dentro ou fora de um desafio), mas não bloqueia nenhuma das três anteriores — é a menos crítica das quatro pro critério de saída do marco (que fala só do narrador).

**Independent Test**: Informar uma escala conhecida (ex. a mesma do Encurtador de URL) e confirmar que o RPS estimado pela calculadora bate com o que `toWorkload()` já calcula pra aquele problema — mesma fórmula, exposta como ferramenta independente.

**Acceptance Scenarios**:

1. **Given** o usuário informa DAU, requisições por usuário/dia e pico vs. média, **When** confirma o cálculo, **Then** vê RPS médio e RPS de pico estimados, usando a mesma fórmula que o engine já usa pra converter escala em `Workload`.
2. **Given** a calculadora está aberta, **When** o usuário não está dentro de nenhum desafio, **Then** ainda consegue usá-la normalmente — não depende de um problema ativo.

---

### Edge Cases

- O que acontece se o provedor de LLM (Google Gemini) estiver fora do ar ou retornar uma resposta que não é o JSON estruturado esperado? → resultado numérico do engine continua disponível; a explicação mostra um estado de erro claro, nunca um texto inventado que pareça uma explicação válida.
- O que acontece se o usuário pedir a explicação de um resultado que já mudou (ex. editou o canvas depois de simular)? → mesma regra já estabelecida pro par `lastResult`/`lastDesign` na store: o narrador só explica o par exato que gerou aquele resultado, nunca um design editado depois.
- O que acontece se dois designs diferentes (hashes diferentes) só diferem numa posição de nó no canvas, sem mudar nodes/edges/config? → o hash de cache deve ser calculado sobre o `Design` (estrutura que o engine lê), não sobre o `CanvasNode`/posição visual — dois designs com posições diferentes mas mesmo `Design` devem compartilhar cache.
- O que acontece com o score por dimensão de um problema que ainda não foi submetido nenhuma vez? → não existe (mesma regra de `lastResult`: nulo até a primeira simulação, nunca um zero que pareça uma nota real).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O engine MUST calcular um valor real (não placeholder) para cada uma das 7 `Dimension` de `SimulationResult.scores`, a partir do `Design`/`Workload`/resultado já calculados — nunca a partir de uma chamada de LLM (Constitution I: engine é fonte da verdade).
- **FR-002**: A UI MUST exibir as 7 dimensões de score separadamente, em nenhum lugar reduzidas a uma nota/veredito único (Constitution V).
- **FR-003**: O sistema MUST gerar uma explicação em linguagem natural do resultado via um provedor de LLM (Google Gemini, modelo `gemini-2.5-flash`), citando apenas números que já existem em `SimulationResult` — nenhuma métrica pode se originar do texto gerado (Constitution: "nenhum número exibido pode ter origem em LLM").
- **FR-004**: A chamada ao narrador MUST ficar fora do caminho crítico da submissão — o resultado do engine aparece imediatamente; a explicação carrega de forma assíncrona/separada (ADR-006).
- **FR-005**: O sistema MUST cachear a explicação do narrador por hash do `Design` + `Workload`, nunca repetindo a chamada ao provedor de LLM pro mesmo par (ADR-006, RNF-6).
- **FR-006**: A chave de API do provedor de LLM MUST viver só no servidor (Server Action / Route Handler) — nunca exposta ao client (restrição de segurança padrão do projeto).
- **FR-007**: Cada problema do catálogo MUST ter uma solução de referência: um `Design` completo que satisfaz 100% da rubrica daquele problema na escala oficial, mais um texto de raciocínio associado.
- **FR-008**: A solução de referência MUST ser dado versionado (autorada como os demais campos de `Problem`), não gerada por LLM em tempo de execução — mesmo padrão de rubrica/dicas já estabelecido em `packages/problems`.
- **FR-009**: O sistema MUST oferecer uma calculadora de capacidade back-of-envelope, que reusa a mesma fórmula de conversão escala→RPS já usada em `toWorkload()`, disponível independente de haver um desafio ativo.
- **FR-010**: Se a chamada ao narrador falhar ou exceder o tempo limite (RNF-5), o sistema MUST continuar mostrando o resultado numérico do engine normalmente, sinalizando a falha do narrador sem bloquear o restante da tela.

### Key Entities

- **Score por dimensão**: 7 valores numéricos (`Record<Dimension, number>`), um por dimensão de `Dimension` já definida no engine — substitui o placeholder zerado atual, calculado a partir do mesmo `SimulationResult` que já existe.
- **Explicação do narrador**: texto gerado por LLM associado a um par `(Design, Workload)` via hash — cacheado, nunca contém um número que não esteja em `SimulationResult`.
- **Solução de referência**: um `Design` completo + texto de raciocínio, um por `Problem` do catálogo — dado versionado, mesmo padrão de `RubricCriterion`/`Hint`.
- **Estimativa de capacidade**: entrada (DAU, requisições/usuário/dia, pico) → saída (RPS médio, RPS de pico) — mesma fórmula de `toWorkload()`, exposta como ferramenta independente de um `Problem`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O narrador nunca contradiz o engine em 20 submissões de teste consecutivas (critério de saída oficial do marco, `docs/product-context.md` §10) — nenhuma explicação gerada cita um número ausente de, ou divergente de, `SimulationResult`.
- **SC-002**: Um usuário que resolve um desafio vê as 7 dimensões de score preenchidas com valores reais (não todas zero) em 100% das submissões que passam na rubrica.
- **SC-003**: 95% das explicações do narrador aparecem em até 15 segundos (RNF-5, p95 — subido de
  5s, decisão do autor, 2026-09-27, `specs/fundamentos-arquitetura/tasks.md` achado 4: 5s batia
  timeout na prática contra `gemini-2.5-flash` com `responseSchema`, medido em ~5.8s).
- **SC-004**: Uma segunda submissão do mesmo design nunca gera uma nova chamada ao provedor de LLM — custo zero em cache hit (RNF-6).
- **SC-005**: Todo problema do catálogo tem uma solução de referência que passa 100% da própria rubrica quando simulada.

## Assumptions

- A solução de referência é conteúdo autorado à mão (como rubrica e dicas hoje), não gerada por LLM em tempo de autoria nem de execução — mantém o mesmo padrão de confiabilidade do resto do catálogo.
- O cálculo de score por dimensão vive inteiramente em `packages/engine` (pacote puro) — nenhuma dependência de rede, LLM ou camada de aplicação entra no cálculo em si.
- A calculadora de capacidade reusa a fórmula já existente em `toWorkload()`/`apps/web/src/lib/canvas-to-design.ts`, sem inventar uma segunda fórmula de conversão escala→RPS.
- Autorar os 3 problemas novos (pra chegar a 6 totais, conforme product-context.md §10) fica **fora do escopo deste marco** — resolvido via `/speckit-clarify`, Session 2026-09-23. Este marco entrega score/narrador/solução de referência pros 3 problemas já existentes (Encurtador de URL, Social Feed, E-commerce Checkout); os 3 problemas novos são um incremento futuro separado.
- A calculadora back-of-envelope (US4) é uma ferramenta independente e sempre acessível, não amarrada a um problema ativo — resolvido via `/speckit-clarify`, Session 2026-09-23.
