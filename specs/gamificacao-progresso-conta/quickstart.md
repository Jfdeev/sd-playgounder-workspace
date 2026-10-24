# Quickstart: M2.8 — Gamificação e progresso na conta

Verificação por user story. `apps/web` não testa componente nem rota (convenção de M0.5): as regras
puras têm teste em `apps/web/test/gamification/`; o resto é conferido no browser e reenviando
requisições à mão.

## Pré-requisito

Migração `0004_*` aplicada ao Neon **só com autorização do autor** (`pnpm --filter web db:migrate`).
Duas contas de teste throwaway (A e B), apagadas ao final.

```bash
pnpm --filter web dev
```

## Checagens automáticas

```bash
pnpm -r test
pnpm -r exec tsc --noEmit
pnpm --filter web build
```

## US1 — XP verificado e persistido

1. Conta A resolve "Encurtador de URL" → XP e nível sobem (≤ 3 s, SC-001).
2. Outro navegador, mesma conta → mesmo XP, nível e desafio resolvido (SC-002).
3. Submeter um design que não passa a rubrica → nenhum XP.
4. **Forjado** (SC-003): reenviar `POST /api/submissions` com campos extras (`result`, `workload`,
   `score`) e com um design que não resolve → nenhum XP; com uma aresta que o canvas recusaria → 400.
5. **Idempotência** (SC-004): reenviar o mesmo design resolvido, e disparar duas submissões ao mesmo
   tempo → XP creditado uma única vez.
6. Mais de 10 submissões em um minuto → 429, resultado local continua aparecendo.

## US2 — Painel

`/app/progresso`: XP total, nível, quanto falta, desafios resolvidos com data. Conta nova: nível 1 e
0 XP explícitos.

## US3 — Ofensiva

Casos de virada de dia cobertos pelo teste de `streak.ts` (mesmo dia, dia seguinte, dia pulado,
horário de verão — SC-006); no browser, conferir que a ofensiva aparece no painel.

## US4 — Conquistas

Resolver o primeiro desafio desbloqueia `first-challenge` com data, uma vez só; a lista mostra as
bloqueadas com a condição.

## US5 — Ranking e perfil

1. Conta A sem apelido: vê o ranking e o convite, não aparece nele.
2. A escolhe apelido; B tenta o mesmo com outra caixa (`Fulano` × `fulano`) → recusado.
3. B abre `/app/u/<apelido-de-A>` → nível, XP, conquistas, desafios, ofensiva; **nenhum e-mail nem
   design** — conferir também a resposta do servidor, não só a tela (SC-007).
4. A se esconde → some do ranking e o perfil não abre pra B (SC-008).
5. Sem sessão, `/app/ranking` e `/app/u/...` redirecionam pra `/entrar`.

## Não-regressão

Para um mesmo design, as 7 dimensões exibidas não mudam e nenhuma nota agregada aparece (SC-005);
engine, narrador e `NARRATOR_PROMPT_VERSION` fora do diff.
