# Quickstart: M4.1 — Designs na conta

Funções puras com teste; UI e rotas no browser com duas contas throwaway (A e B), apagadas ao final.
Migração `0005` aplicada ao Neon só com autorização do autor.

## US1 — Salvar
A salva o canvas livre como "Meu encurtador"; a lista mostra nome, contexto e data; abrir em outro
navegador reconstrói o canvas igual (SC-001). Renomear e apagar funcionam; canvas vazio é recusado.

## US2 — Histórico
Salvar, mudar, salvar → 2 versões; salvar sem mudar → nenhuma nova; restaurar a 1ª → canvas igual ao
original (SC-002). Duas abas salvando ao mesmo tempo → versões 2 e 3, sem duplicata.

## US3 — Compartilhar
A gera link; B abre: só leitura, Simular funciona, "abrir cópia" vai pro canvas livre de B; design de
desafio não resolvido por B → aviso de spoiler; deslogado → login → volta pro design; A revoga → B vê
"design não encontrado", igual a um token inventado (SC-003); nenhuma resposta tem e-mail de A
(SC-004). `GET /api/designs/<id-de-A>` com a sessão de B → 404. `/entrar?voltar=//evil.com` cai em
`/app`.

## Checagens
`pnpm -r test`, `tsc`, build; resultado do engine igual antes/depois de salvar e reabrir (SC-005).
