# Feature Specification: M4.1 — Designs na conta, histórico e compartilhamento

**Feature Branch**: `feature/001-saved-designs-sharing`

**Created**: 2026-10-25

**Status**: Ready

**Input**: Roadmap (`docs/product-context.md` §10, M4): "salvar designs com histórico de versões · … · compartilhar design por URL (P0)". Primeira fatia do M4, por decisão do autor (2026-10-25): designs na conta + histórico + compartilhar por URL — infraestrutura pro resto do marco. Os 9 problemas novos e o progresso por conceito + wiki vêm em fatias seguintes.

## Contexto ao entrar neste marco

Hoje cada canvas (o livre, o de cada desafio, o de cada incidente) só existe no `localStorage` do
navegador: trocar de máquina perde o design, e não há como guardar mais de um design por contexto
nem voltar a uma versão anterior. O M2.8 adiou explicitamente "salvar designs na conta" pro M4.

## Clarifications

### Session 2026-10-25

- Q: O que é "um design salvo na conta"? → A: **Arquivos nomeados.** O usuário salva o canvas como um design com nome e tem uma lista "Meus designs" pra abrir, renomear e apagar — no canvas livre, dentro de desafios e de incidentes.
- Q: Como nasce uma versão? → A: **A cada "Salvar".** Cada salvamento vira uma versão com data; dá pra ver as anteriores e restaurar qualquer uma. O autosave do navegador continua como rascunho.
- Q: Quem abre um design compartilhado por URL? → A: **Só quem está logado** — o link abre o design só pra leitura, dentro do app; sem conta, vai pro login (mesma regra do ranking e do perfil).
- Q: Pode compartilhar um design feito dentro de um desafio? → A: **Pode, com aviso de spoiler**: quem abre um design de desafio que ainda não resolveu vê um aviso antes do canvas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Salvar o canvas como um design nomeado (Priority: P1)

O usuário dá um nome ao que está no canvas e salva. O design aparece em "Meus designs" e pode ser
aberto de qualquer navegador ou máquina.

**Why this priority**: é a queixa original ("as arquiteturas ficam num banco local") e a base de tudo.

**Independent Test**: salvar um design no canvas livre, entrar em outro navegador com a mesma conta e
abri-lo pela lista — o canvas aparece igual.

**Acceptance Scenarios**:

1. **Given** um canvas com componentes, **When** o usuário salva com um nome, **Then** o design aparece
   em "Meus designs" com o nome, o contexto (canvas livre, desafio X ou incidente Y) e a data.
2. **Given** um design salvo, **When** aberto em outro navegador da mesma conta, **Then** o canvas tem os
   mesmos componentes, conexões, réplicas e posições.
3. **Given** um design salvo dentro de um desafio, **When** aberto, **Then** abre no contexto daquele
   desafio (se o desafio ainda estiver travado pra esta conta, abre no canvas livre com um aviso).
4. **Given** a lista, **When** o usuário renomeia ou apaga um design, **Then** a mudança vale em todo
   lugar; apagar pede confirmação.
5. **Given** um canvas vazio, **When** o usuário tenta salvar, **Then** é recusado com mensagem clara.

---

### User Story 2 - Histórico de versões (Priority: P2)

Cada "Salvar" sobre um design existente cria uma versão nova. O usuário vê a lista de versões com
data e restaura qualquer uma no canvas.

**Why this priority**: o roadmap pede "histórico de versões"; depende de US1.

**Independent Test**: salvar um design, mudar o canvas, salvar de novo; abrir o histórico, restaurar a
primeira versão e conferir que o canvas voltou.

**Acceptance Scenarios**:

1. **Given** um design aberto, **When** o usuário salva de novo, **Then** surge uma versão nova e a
   anterior continua no histórico.
2. **Given** o histórico, **When** o usuário restaura uma versão antiga, **Then** o canvas mostra
   aquela versão (o restaurado só vira versão nova se ele salvar de novo — nada é apagado).
3. **Given** salvar sem nenhuma mudança desde a última versão, **When** clicado, **Then** nenhuma
   versão duplicada é criada.

---

### User Story 3 - Compartilhar por URL (Priority: P3)

O dono gera um link do design. Quem estiver logado e abrir o link vê o design só pra leitura e pode
simular; se quiser mexer, abre uma cópia no próprio canvas.

**Why this priority**: o roadmap pede "compartilhar design por URL"; depende de US1.

**Independent Test**: gerar o link com a conta A; abrir com a conta B (vê só leitura, simula, abre
cópia); deslogado (vai pro login); A revoga o link (B não abre mais).

**Acceptance Scenarios**:

1. **Given** um design salvo, **When** o dono pede pra compartilhar, **Then** recebe um link difícil de
   adivinhar.
2. **Given** um usuário logado com o link, **When** abre, **Then** vê o design só pra leitura (sem
   editar o original), pode rodar "Simular" e pode abrir uma cópia no próprio canvas livre.
3. **Given** um design de desafio que quem abre ainda não resolveu, **When** abre o link, **Then** vê um
   aviso de spoiler e só vê o canvas se escolher continuar.
4. **Given** um visitante sem sessão, **When** abre o link, **Then** vai pro login e, depois de entrar,
   volta pro design.
5. **Given** o dono revoga o link, **When** alguém abre o link antigo, **Then** vê "design não
   encontrado" — mesma resposta de um link que nunca existiu.
6. **Given** o design compartilhado, **When** aberto por outra pessoa, **Then** nunca mostra o e-mail do
   dono (no máximo o apelido público, se ele tiver um e estiver visível).

---

### Edge Cases

- **Salvar sem rede / servidor fora** → o canvas e o rascunho local continuam; aparece "não deu pra
  salvar", nada é perdido.
- **Design salvo com conteúdo inválido** (forjado pela API) → recusado: o servidor valida o design como
  na submissão do M2.8 (forma, limites, matriz de conexões), mas aceitando canvas parcial (sem exigir
  entrada nem conexões — é um rascunho salvo, não uma submissão).
- **Posições e Cliente** → o design salvo guarda o canvas inteiro (posições, nós Cliente), não só o
  `Design` do engine, pra reabrir igual.
- **Arquitetura de referência carregada** (M2.5) → salvar guarda o vínculo com o preset, pra "Por que
  está aqui" continuar funcionando ao reabrir.
- **Incidente** → um design salvo de incidente reabre no incidente; a causa plantada nunca vai junto
  (o canvas é só o que o usuário montou).
- **Exclusão da conta** → designs, versões e links somem junto.
- **Abuso** (milhares de designs/versões) → limites por conta (valores no plan).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O usuário MUST poder salvar o canvas atual como um design nomeado, ligado à conta, a partir
  do canvas livre, de um desafio ou de um incidente.
- **FR-002**: O sistema MUST listar os designs do usuário com nome, contexto e data da última versão, e
  permitir abrir, renomear e apagar (apagar com confirmação).
- **FR-003**: Abrir um design MUST reconstruir o canvas igual ao salvo (componentes, conexões, réplicas,
  taxa de acerto, tipos/pesos de aresta, posições, nós Cliente e vínculo com arquitetura de referência).
- **FR-004**: Cada "Salvar" sobre um design existente MUST criar uma versão nova e imutável, exceto
  quando o conteúdo não mudou desde a última; o usuário MUST poder ver as versões e restaurar qualquer
  uma no canvas.
- **FR-005**: O dono MUST poder gerar e revogar um link de compartilhamento difícil de adivinhar; o link
  abre a versão mais recente.
- **FR-006**: O link MUST abrir só pra usuários logados (sem sessão → login → volta pro design), só pra
  leitura, com "Simular" e "abrir uma cópia no meu canvas".
- **FR-007**: Design de desafio aberto por quem ainda não resolveu o desafio MUST mostrar aviso de
  spoiler antes do canvas.
- **FR-008**: Link revogado e link inexistente MUST dar a mesma resposta ("design não encontrado").
- **FR-009**: Nenhuma resposta MUST expor o e-mail do dono a outro usuário; quando houver, só o apelido
  público visível (M2.8).
- **FR-010**: O servidor MUST validar todo design salvo (forma, limites, matriz de conexões), aceitando
  canvas parcial.
- **FR-011**: Salvar NÃO dá XP nem conta pra ofensiva — não é atividade verificada de estudo (M2.8).
- **FR-012**: O autosave do navegador MUST continuar funcionando como rascunho, independente do salvo na
  conta.
- **FR-013**: Os resultados do engine e as regras de desafio, incidente e XP MUST NOT mudar.

### Key Entities

- **Design salvo**: dono, nome, contexto (canvas livre / desafio / incidente + id), datas.
- **Versão**: design, número, conteúdo do canvas (imutável), data.
- **Link de compartilhamento**: design, token difícil de adivinhar, ativo/revogado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um design salvo reabre idêntico em outro navegador em 100% dos casos (mesmo `Design` do
  engine e mesmas posições).
- **SC-002**: Restaurar uma versão recupera exatamente o conteúdo daquela versão em 100% dos casos.
- **SC-003**: 0 acessos a design de outra conta sem link ativo; 0 acessos sem sessão; link revogado e
  inexistente indistinguíveis.
- **SC-004**: 0 e-mails de outro usuário em respostas de design compartilhado.
- **SC-005**: Para um mesmo design, o resultado do engine é igual antes e depois de salvar/reabrir.

## Assumptions

- O link é por design (não por versão) e mostra sempre a versão mais recente; revogar e gerar de novo
  produz um link novo.
- Quem abre um link nunca edita o original; "abrir uma cópia" carrega o conteúdo no canvas livre de quem
  abriu (substituindo o que estiver lá, com a confirmação de sempre).
- Limites por conta (quantidade de designs e de versões) ficam pro plan.
- Galeria da comunidade e portfólio público estão fora (P1 / fatias seguintes).
- O conteúdo da interface é em pt-br.
