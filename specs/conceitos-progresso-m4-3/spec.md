# Feature Specification: M4.3 — Wiki de conceitos e progresso por conceito

**Feature Branch**: `feature/003-concept-progress-wiki-m4-3`

**Created**: 2026-10-29

**Status**: Done

**Input**: Roadmap (`docs/product-context.md` §10, M4): "progresso **por conceito**, não por problema ·
… · wiki de conceitos linkada aos problemas (P0)". Última fatia P0 do M4, depois do M4.1 e M4.2.
Referências: `docs/foundational-doc.md` §5 ("Wiki de conceitos: caching, sharding, replicação,
consenso, CAP/PACELC, filas, idempotência, backpressure"; "cada problema linka os conceitos que ele
exercita, e cada conceito linka os problemas onde aparece") e §6 ("progresso por conceito — 'você é
fraco em consistência'").

## Contexto ao entrar neste marco

Existem 12 problemas (M4.2), uma biblioteca de 39 princípios com fonte (M2.7, `/app/biblioteca`) e uma
página de progresso que lista desafios resolvidos, incidentes, XP, ofensiva e conquistas (M2.8,
`/app/progresso`). Nada liga um problema aos conceitos de system design que ele exercita.

## Clarifications

### Session 2026-10-29

- Q: Qual lista de conceitos? → A: **Os 8 do §5 + os que os 12 problemas exercitam.** Conceito sem
  nenhum problema aparece na wiki, mas não entra no progresso.
- Q: Como medir o progresso por conceito? → A: **Pelos desafios resolvidos**: domínio de um conceito =
  problemas resolvidos que o exercitam ÷ problemas que o exercitam. Derivado dos eventos que já
  existem — sem tabela nem migração nova.
- Q: Verbete precisa de citação? → A: **Sim**, como a biblioteca do M2.7. Entra uma 4ª obra, *Designing
  Data-Intensive Applications* (Martin Kleppmann), além das 3 atuais onde couber.
- Q: Onde aparece? → A: **"Conceitos" como seção de `/app/biblioteca`** (mesma busca); o card do
  desafio mostra os conceitos que ele exercita; `/app/progresso` ganha "por conceito", com os mais
  fracos em destaque.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ler a wiki de conceitos (Priority: P1)

O usuário abre a Biblioteca, vai em "Conceitos", acha um conceito (pela busca ou pela lista) e lê a
definição, o trade-off, como ele aparece no canvas, a fonte e os problemas onde ele aparece.

**Why this priority**: sem a wiki, não há o que ligar nem medir.

**Independent Test**: abrir `/app/biblioteca`, buscar "idempotência" e ver o verbete com a fonte e os
links para Notificações e Pix.

**Acceptance Scenarios**:

1. **Given** a Biblioteca, **When** o usuário abre "Conceitos", **Then** vê todos os conceitos aprovados,
   cada um com definição, trade-off, "na plataforma", fonte (obra + capítulo) e problemas relacionados.
2. **Given** a busca, **When** o usuário digita o nome de um conceito sem acento, **Then** o conceito
   aparece (mesma busca da biblioteca).
3. **Given** um conceito que nenhum problema exercita, **When** aberto, **Then** mostra "ainda não há
   desafio para este conceito" em vez de uma lista vazia.
4. **Given** um problema relacionado no verbete, **When** clicado, **Then** abre o canvas naquele
   desafio (se travado para a conta, o motivo da trava aparece, como no menu).

---

### User Story 2 - Ver os conceitos de um desafio (Priority: P2)

O card do desafio mostra os conceitos que ele exercita; cada um leva ao verbete.

**Why this priority**: é a metade "cada problema linka os conceitos" do §5.

**Independent Test**: abrir o desafio Pix e ver "Idempotência", "Transações" e "Filas", cada um
abrindo o verbete na Biblioteca.

**Acceptance Scenarios**:

1. **Given** um desafio aberto, **When** o usuário olha o card, **Then** vê os conceitos dele.
2. **Given** um conceito no card, **When** clicado, **Then** abre `/app/biblioteca` naquele verbete.

---

### User Story 3 - Progresso por conceito (Priority: P3)

`/app/progresso` mostra, para cada conceito que algum problema exercita, quantos desses problemas o
usuário já resolveu, e destaca os conceitos mais fracos ("você é fraco em …").

**Why this priority**: depende da wiki e do mapa problema → conceito.

**Independent Test**: conta que resolveu só o Encurtador vê Caching em 1/N e os conceitos sem nenhum
resolvido em destaque.

**Acceptance Scenarios**:

1. **Given** uma conta, **When** abre o progresso, **Then** vê cada conceito com "resolvidos / total" dos
   problemas que o exercitam.
2. **Given** conceitos com frações diferentes, **When** a página carrega, **Then** os de menor fração
   (que não estão completos) aparecem destacados como pontos fracos, cada um com link para o verbete.
3. **Given** uma conta sem nenhum desafio resolvido, **When** abre o progresso, **Then** vê uma
   mensagem convidando a resolver o primeiro desafio, sem acusar "fraco em tudo".
4. **Given** todos os conceitos completos, **When** abre o progresso, **Then** não há destaque de ponto
   fraco.

### Edge Cases

- Conceitos sem problema (ex.: consenso) não aparecem no progresso; aparecem na wiki.
- O progresso por conceito é derivado: resolver um desafio atualiza todos os conceitos dele de uma vez.
- Perfil público (M2.8) não muda — progresso por conceito é só do próprio usuário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A wiki MUST ter os conceitos aprovados em `content-draft.md`, cada um com definição,
  trade-off, "na plataforma" e fonte (obra + capítulo).
- **FR-002**: Toda fonte MUST ser uma das 4 obras (as 3 atuais + DDIA) — nenhuma citação solta.
- **FR-003**: Cada problema MUST declarar os conceitos que exercita (aprovado em `content-draft.md`);
  todo id de conceito citado MUST existir (testado).
- **FR-004**: Os problemas de um conceito MUST ser derivados do mapa problema → conceito (uma fonte
  só, nada mantido nos dois sentidos).
- **FR-005**: Domínio por conceito = resolvidos ÷ total, só sobre conceitos com total > 0; função pura,
  testada.
- **FR-006**: Engine, narrador (`NARRATOR_PROMPT_VERSION`), banco e regras de XP MUST ficar intocados.

### Key Entities

- **Conceito** (novo, `packages/knowledge`): id, nome, definição, trade-off, "na plataforma", fonte +
  capítulo, princípios relacionados da biblioteca (opcional).
- **Problem** (existente): ganha a lista de conceitos que exercita.

## Success Criteria *(mandatory)*

- **SC-001**: Qualquer conceito aprovado pode ser encontrado pela busca da Biblioteca e mostra fonte
  rastreável.
- **SC-002**: Os 12 desafios mostram seus conceitos no card, com link para o verbete.
- **SC-003**: O progresso por conceito bate com os desafios resolvidos da conta (testado com contas de
  exemplo e verificado no browser).
- **SC-004**: `tsc`, testes e build limpos; snapshot do engine intacto.

## Assumptions

- "Mais fracos" = os conceitos de menor fração entre os não completos (empate: todos com a mesma
  fração mínima). Sem nota única por conceito além da fração.
- Widgets animados e galeria da comunidade (P1 do M4) ficam fora desta fatia.
