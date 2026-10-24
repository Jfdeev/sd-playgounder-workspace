# Feature Specification: M3 — Modo Incidente

**Feature Branch**: `feature/001-incident-mode`

**Created**: 2026-10-24

**Status**: Done

**Input**: Roadmap (`docs/product-context.md` §10, M3): "Arquitetura pronta + alerta + métricas simuladas; o usuário diagnostica a causa raiz plantada e propõe o fix. Reaproveita 100% do engine. Chaos: derrubar nó, derrubar AZ, partição, cache frio, esgotamento de pool (P0). Placar de tempo até diagnóstico (P2)." Detalhe em `docs/foundational-doc.md` §3.3 e §7.2 ("system design invertido").

## Contexto ao entrar neste marco

Até aqui o usuário só **constrói** arquiteturas (desafios, canvas livre, arquiteturas de referência).
O Modo Incidente inverte: ele recebe uma arquitetura **pronta e funcionando** que, de repente, passa
a se comportar mal — e precisa descobrir por quê olhando só para métricas, como um plantão de
madrugada. É o primeiro diferencial do produto (foundational-doc §7.2): ensina o lado de operação e é
avaliável objetivamente, porque existe uma causa raiz plantada.

O que já existe e este marco reaproveita: o engine (todo número exibido sai dele — Constitution I), o
canvas, a submissão verificada pelo servidor e o sistema de XP/ofensiva do M2.8.

## Clarifications

### Session 2026-10-24

- Q: Como o usuário entrega o diagnóstico? → A: **Aponta o componente culpado e escolhe o tipo de falha numa lista fixa** (nó caído, zona de disponibilidade caída, partição de rede, cache frio, pool de conexões esgotado). O servidor compara com a causa plantada — sem interpretação.
- Q: Como funciona "propor o fix"? → A: **O usuário edita a arquitetura no canvas e submete; o engine roda com a falha ainda ativa e confere se o sintoma voltou ao normal.**
- Q: Resolver um incidente dá XP? → A: **Sim, como um desafio do M2.8**: o servidor confere diagnóstico e fix e credita uma única vez por incidente; conta para a ofensiva.
- Q: O que acontece quando o diagnóstico está errado? → A: **Tentativas ilimitadas, com pista**: a resposta diz só "não é isso"; se o componente estiver certo e o tipo errado, avisa que o componente está certo. Nunca revela a resposta.
- Q: Os incidentes têm ordem/trava? → A: **Não — livres.** Qualquer incidente pode ser aberto a qualquer momento.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir um incidente e investigar pelas métricas (Priority: P1)

O usuário escolhe um incidente. Recebe a arquitetura pronta no canvas, um alerta (por exemplo: "o p99
de latência subiu 8× às 3h da manhã") e as métricas de cada componente — como o sistema estava
**antes** do incidente e como está **agora** —, todas calculadas pelo engine.

**Why this priority**: sem isso não há incidente — é a base de tudo o resto.

**Independent Test**: abrir um incidente e conferir que a arquitetura, o alerta e as métricas
"antes × agora" por componente aparecem, e que o "agora" mostra o sintoma descrito no alerta.

**Acceptance Scenarios**:

1. **Given** a lista de incidentes, **When** o usuário abre um, **Then** vê a arquitetura no canvas, o
   alerta e as métricas de cada componente nos dois estados (normal e durante o incidente).
2. **Given** um incidente aberto, **When** o usuário seleciona um componente, **Then** vê as métricas
   dele (utilização, status, contribuição pra latência) nos dois estados — nunca um número que o
   engine não calculou.
3. **Given** o alerta de um incidente, **When** comparado às métricas "agora", **Then** o sintoma
   descrito no alerta está visível nelas (o alerta nunca descreve algo que o engine não mostra).
4. **Given** um incidente aberto, **When** o usuário olha a tela, **Then** a causa raiz **não** está
   revelada em lugar nenhum (nem no nome do incidente, nem nos rótulos).

---

### User Story 2 - Diagnosticar a causa raiz (Priority: P2)

O usuário aponta o componente que acha culpado e escolhe o tipo de falha. O servidor compara com a
causa plantada.

**Why this priority**: é o núcleo pedagógico (achar a causa) e o que torna o modo avaliável.

**Independent Test**: num incidente, enviar um diagnóstico errado (componente errado), um
parcialmente certo (componente certo, tipo errado) e o certo; conferir as três respostas.

**Acceptance Scenarios**:

1. **Given** um diagnóstico com componente e tipo certos, **When** enviado, **Then** é aceito e o
   usuário passa para a etapa de correção.
2. **Given** componente certo e tipo errado, **When** enviado, **Then** a resposta diz que o tipo não
   é esse **e** que o componente está certo.
3. **Given** componente errado, **When** enviado, **Then** a resposta diz só "não é isso" — sem
   revelar nada.
4. **Given** qualquer número de tentativas erradas, **When** o usuário continua, **Then** pode
   tentar de novo; a resposta nunca é revelada.
5. **Given** um diagnóstico enviado, **When** chega ao servidor, **Then** a comparação é feita lá —
   a causa plantada nunca é enviada ao navegador antes do acerto.

---

### User Story 3 - Corrigir a arquitetura e ver o sintoma sumir (Priority: P3)

Depois do diagnóstico certo, o usuário edita a arquitetura no canvas para resistir à falha e submete.
O engine roda com a falha **ainda ativa**; se o sintoma do alerta voltou ao normal, o incidente está
resolvido e o XP é creditado.

**Why this priority**: fecha o ciclo "diagnosticar → corrigir"; depende de US2.

**Independent Test**: num incidente diagnosticado, submeter o design original (não resolve), depois
um design corrigido (resolve); conferir XP creditado uma única vez.

**Acceptance Scenarios**:

1. **Given** um incidente diagnosticado, **When** o usuário submete um design que, com a falha ativa,
   volta o sintoma ao normal, **Then** o incidente é marcado resolvido e o XP é creditado.
2. **Given** um design que não resolve, **When** submetido, **Then** o usuário vê as métricas com a
   falha ativa e o que ainda está fora do normal — sem XP.
3. **Given** um incidente já resolvido, **When** resolvido de novo, **Then** nenhum XP adicional.
4. **Given** uma tentativa de enviar o fix **antes** do diagnóstico certo, **When** chega ao servidor,
   **Then** não credita nada (o diagnóstico vem primeiro).
5. **Given** um "fix" que só remove o componente afetado ou corta o caminho, **When** submetido,
   **Then** não resolve — o fix precisa manter a arquitetura atendendo o mesmo tráfego (critério do
   próprio incidente).

---

### Edge Cases

- **Incidente aberto fora do canvas livre** (dentro de um desafio) → o incidente usa seu próprio
  espaço; não sobrescreve o design de um desafio nem o do canvas livre.
- **Usuário recarrega a página no meio** → o incidente reabre no mesmo ponto (diagnóstico já
  acertado continua acertado — fica no servidor).
- **Corpo de requisição forjado** (diagnóstico ou "incidente resolvido" alegado pelo cliente) → o
  servidor só aceita o que ele mesmo conferiu (mesma regra do M2.8).
- **Muitos diagnósticos em sequência** (força bruta: testar todo componente × todo tipo) → limitado
  pelo mesmo limite de taxa do servidor; tentativas ilimitadas não significam sem limite de
  velocidade.
- **Duas abas resolvendo o mesmo incidente** → XP creditado uma única vez.
- **Narrador** → não participa do diagnóstico (nunca julga); pode continuar explicando o resultado
  do engine como já faz, sem citar a causa plantada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer uma lista de incidentes, cada um com arquitetura pronta, um
  alerta descrevendo o sintoma e uma causa raiz plantada — conteúdo autorado e aprovado pelo autor
  antes de virar código (mesmo gate de M2.5–M2.8).
- **FR-002**: Todo número exibido num incidente (estado normal e estado durante o incidente) MUST vir
  do engine (Constitution I). Nenhuma série temporal ou métrica inventada.
- **FR-003**: Os tipos de falha suportados MUST ser os cinco do roadmap: nó caído, zona de
  disponibilidade caída, partição de rede, cache frio e pool de conexões esgotado. Cada incidente
  planta exatamente uma causa.
- **FR-004**: O sintoma descrito no alerta MUST ser observável nas métricas "durante o incidente"
  calculadas pelo engine — e o engine MUST apontar a mesma causa que o autor plantou (critério de
  saída do M3).
- **FR-005**: O diagnóstico MUST ser um par (componente, tipo de falha) comparado **no servidor**; a
  causa plantada MUST NOT chegar ao navegador antes do acerto.
- **FR-006**: Diagnóstico errado MUST ter tentativas ilimitadas; com componente certo e tipo errado, a
  resposta MUST dizer que o componente está certo; a causa nunca é revelada.
- **FR-007**: O fix MUST ser conferido pelo servidor rodando o engine sobre o design submetido **com a
  falha ainda ativa**; resolve quando o sintoma do alerta volta ao normal segundo o critério do
  próprio incidente, mantendo a arquitetura atendendo o mesmo tráfego.
- **FR-008**: O fix só é aceito depois do diagnóstico certo, que fica registrado no servidor.
- **FR-009**: Resolver um incidente MUST creditar XP uma única vez por incidente, pelo mesmo
  mecanismo idempotente do M2.8, e contar como dia de atividade para a ofensiva.
- **FR-010**: Incidentes MUST ser livres (sem trava de ordem).
- **FR-011**: Diagnósticos e submissões de fix MUST passar pelo mesmo limite de taxa do servidor.
- **FR-012**: O incidente MUST NOT alterar o engine de forma que mude o resultado de um design já
  existente (desafios, canvas livre, arquiteturas de referência) — qualquer capacidade nova é aditiva.
- **FR-013**: O resultado de uma submissão continua com as 7 dimensões separadas; resolver um
  incidente não vira nota agregada (Constitution V).

### Key Entities

- **Incidente**: arquitetura pronta (um design), alerta (texto + sintoma observável), causa plantada
  (componente + tipo de falha), critério de resolução do fix.
- **Falha (fault)**: tipo + alvo, aplicada sobre um design para produzir o estado "durante o
  incidente".
- **Progresso no incidente**: por usuário — diagnóstico acertado (com data) e incidente resolvido
  (evento de pontuação do M2.8).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 5 incidentes publicados, cada um com causa raiz verificável, e em 100% deles o engine
  aponta a mesma causa que o autor plantou (critério de saída do M3).
- **SC-002**: Em 100% dos incidentes, o sintoma do alerta aparece nas métricas "durante" e não
  aparece nas "antes".
- **SC-003**: 0 vazamentos da causa plantada para o navegador antes do acerto — confirmável
  inspecionando as respostas do servidor.
- **SC-004**: 0 XP creditado por diagnóstico ou fix alegados pelo cliente, ou por fix enviado antes
  do diagnóstico; 0 XP em dobro com duas abas.
- **SC-005**: Para cada incidente, existe ao menos um fix (a solução de referência do incidente) que
  o engine aceita, e o design original nunca é aceito como fix.
- **SC-006**: Para todo design existente (desafios, templates, presets), o resultado do engine não
  muda antes/depois do marco.

## Assumptions

- "Métricas simuladas" = os números que o engine já calcula, em dois estados (normal e com a falha
  aplicada). O engine é de estado estacionário, então não há gráfico ao longo do tempo; o "às 3h da
  manhã" do alerta é narrativa, não uma série temporal.
- Como representar cada tipo de falha (transformação do design × capacidade nova do engine) é decisão
  do `/speckit-plan`. Nó caído, cache frio e partição parecem caber no engine atual; zona de
  disponibilidade e pool de conexões provavelmente pedem algo novo — aditivo (FR-012).
- O placar de tempo até o diagnóstico é P2 no roadmap e fica fora deste marco.
- O Modo Incidente vive dentro do app logado (`/app`), como todo o resto.
- O conteúdo da interface é em pt-br.
