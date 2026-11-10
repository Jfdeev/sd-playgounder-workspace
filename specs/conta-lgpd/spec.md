# Feature Specification: Recuperação de conta e LGPD (pré-lançamento)

**Feature Branch**: `feature/006-account-recovery-lgpd`

**Created**: 2026-11-10

**Status**: Done (texto legal aguarda revisão do autor; dados do responsável a preencher em `apps/web/src/lib/legal.ts`)

**Input**: Pedido do autor (2026-11-10) — itens 1 a 3 da lista "o que falta para lançar": recuperar senha,
reenviar confirmação de e-mail, e LGPD (excluir conta, privacidade e termos).

## Clarifications

### Session 2026-11-10

- Q: Recuperação de senha? → A: **Link de 1h, uso único; trocar a senha derruba todas as sessões**
  (`sessionVersion`) e confirma o e-mail. Resposta neutra (não revela se o e-mail existe), limite por IP.
  Conta só-Google também pode criar senha por esse caminho.
- Q: Reenviar confirmação? → A: **Faixa dentro do app** para contas não confirmadas, com "Reenviar"
  limitado (3 por hora). Não bloqueia o uso.
- Q: Excluir conta? → A: **Na hora**, em Progresso, com modal pedindo para digitar o próprio e-mail;
  apaga tudo (designs, versões, XP, conquistas, perfil/ranking), sem desfazer.
- Q: Exportar dados? → A: **Sim, JSON** com conta (sem senha), perfil, eventos, dias de atividade,
  designs e versões.
- Q: Controlador dos dados? → A: **Pessoa física (o autor)** — nome e e-mail de contato a preencher pelo
  autor em `apps/web/src/lib/legal.ts` antes de publicar (marcados na página até lá).
- Q: Idade mínima? → A: **18 anos**.

## User Scenarios & Testing *(mandatory)*

### US1 — Recuperar a senha (P1)
1. **Given** `/entrar`, **When** clico "Esqueci minha senha" e informo o e-mail, **Then** vejo a mesma
   mensagem exista o e-mail ou não; se existir, chega um link válido por 1h.
2. **Given** o link, **When** defino uma senha nova válida, **Then** entro com ela; o link não funciona de
   novo; sessões abertas em outros lugares caem.
3. **Given** link expirado, usado ou forjado, **When** tento usar, **Then** vejo "link inválido ou expirado".

### US2 — Reenviar confirmação (P2)
1. **Given** conta não confirmada, **When** abro o app, **Then** vejo a faixa "Confirme seu e-mail" com
   "Reenviar"; **When** reenvio, chega um link novo e o anterior deixa de valer.
2. **Given** mais de 3 reenvios na hora, **Then** o app recusa com mensagem clara.
3. **Given** conta confirmada (inclusive via Google), **Then** a faixa não aparece.

### US3 — LGPD (P1)
1. **Given** Progresso, **When** clico "Baixar meus dados", **Then** recebo um JSON com meus dados (sem
   hash de senha nem dados de outras pessoas).
2. **Given** Progresso, **When** clico "Excluir minha conta" e digito meu e-mail, **Then** a conta e todos os
   dados somem na hora, saio da sessão e volto à página inicial; o apelido some do ranking.
3. **Given** a landing, o cadastro e o login, **Then** há links para Privacidade e Termos; o cadastro avisa
   que criar a conta é aceitar os termos e declarar ter 18 anos ou mais.

## Requirements *(mandatory)*

- **FR-001**: Tokens de redefinição guardados só como hash (mesma regra do item 13 do relatório de
  segurança), com identificador separado do de confirmação — um tipo de token nunca vale no outro fluxo.
- **FR-002**: Pedido de redefinição responde igual para e-mail existente ou não, limitado por IP.
- **FR-003**: Exclusão exige sessão, mesma origem e o e-mail digitado igual ao da conta; apaga também
  tokens e contadores de tentativa da conta.
- **FR-004**: Exportação só com dados do próprio usuário; nunca `passwordHash`, tokens ou contas OAuth.
- **FR-005**: Sem migração nova (tokens reaproveitam `verificationToken`; contadores, `loginIpAttempts`).
- **FR-006**: Engine, narrador e problemas intocados.

## Success Criteria *(mandatory)*

- **SC-001**: Fluxo de redefinição completo verificado no browser (pedir → link → nova senha → login).
- **SC-002**: Excluir a conta remove todas as linhas do usuário no banco (verificado por consulta).
- **SC-003**: Exportação contém os dados do usuário e nenhum segredo (testado).

## Resultado (2026-11-10)

Verificado no browser com conta descartável (apagada pela própria exclusão):
- **US1**: pedido de redefinição responde igual para email existente e inexistente (só o existente ganha
  token); senha fraca é recusada sem queimar o link; link de redefinição não confirma email na rota de
  confirmação (e continua intacto); senha nova salva → entra direto em `/app`; reusar o link → 400; senha
  antiga deixa de valer; email fica confirmado; `sessionVersion` 0 → 1.
- **US2**: faixa aparece para conta não confirmada; reenvios 1–3 → 200, 4º → 429; só o último token vale.
- **US3**: export em JSON com conta, perfil, eventos, dias e designs, sem `passwordHash`/tokens; excluir com
  email errado → recusado; com o email certo (em maiúsculas) → sai da sessão e volta à página inicial, e o
  banco fica sem nenhuma linha da conta (usuário, eventos, dias, perfil/ranking, designs, tokens,
  contadores); `/privacidade` e `/termos` renderizam com o aviso de rascunho.
- 937 testes, tsc e build limpos. Sem migração.

**Pendências do autor**: preencher nome e email de contato em `apps/web/src/lib/legal.ts` e revisar o texto
de `/privacidade` e `/termos` (não é aconselhamento jurídico). Emails só chegam com domínio verificado no
Resend (item 4 da lista de lançamento).
