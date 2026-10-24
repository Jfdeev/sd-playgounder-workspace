# Research: M2.8 — Gamificação e progresso na conta

## 1. Submissão verificada pelo servidor (FR-002, SC-003)

**Decisão**: rota `POST /api/submissions` recebe **só** `{ problemId, design }`. O servidor:

1. `auth()` (401 sem sessão), checagem de mesma origem (`isSameOriginRequest`, igual ao narrador) e
   limite de taxa (§6);
2. `getProblem(problemId)` (404 se não existir);
3. valida o design (§3);
4. `workload = toWorkload(problem)`; `referenceCostUsd = simulate(problem.referenceSolution.design, workload).cost.monthlyTotal`;
5. `result = simulate(design, workload, { latencyBudgetMs: problem.latencyBudgetMs, referenceCostUsd })`;
6. `solved = isProblemSolved(problem, result, design)`; se `solved`, credita (§2).

**Por quê**: é exatamente o que o cliente já faz em `canvas.tsx` ao submeter — o servidor repete os
mesmos passos com as mesmas funções (`@sdp/engine`, `@sdp/problems`), então o veredito é o mesmo para
o mesmo design (Constitution III). Resultado, carga ou nota vindos do cliente nunca são lidos.

**Alternativa rejeitada**: o cliente mandar `result` e o servidor só conferir um hash — continua
confiando no cálculo do cliente.

**Cliente**: "Submeter" continua rodando o engine localmente para mostrar o resultado na hora
(nada muda na experiência) e, em paralelo, chama a rota. Falha da rota não esconde o resultado e
não mostra XP (FR-013).

## 2. Idempotência sem transação (FR-003, SC-004)

Conferido em `node_modules/drizzle-orm@0.38.4/neon-http/session.js`: `transaction()` lança
`"No transactions support in neon-http driver"`; existe só `batch()` (não interativo).

**Decisão**: a fonte da verdade é uma tabela **imutável** de eventos de pontuação com restrição
única `(userId, eventKey)` — `eventKey = "challenge:<problemId>"` ou `"achievement:<id>"`. O crédito é
um único `INSERT … ON CONFLICT DO NOTHING RETURNING`: duas submissões simultâneas disputam a mesma
linha e só uma insere. **Nada é contador armazenado**: XP total = `sum(xp)`, desafios resolvidos =
eventos `challenge`, conquistas = eventos `achievement`, nível = `f(XP)`. Ranking = agregação.

**Alternativas rejeitadas**: coluna `xp` no perfil incrementada (corrida entre abas, exige
transação); trocar para o driver WebSocket só para ter transação (dependência de runtime nova sem
necessidade).

## 3. Validação do design recebido

`simulate` passa a rodar sobre entrada não confiável a cada requisição, e a rubrica avalia
`(result, design)` — uma topologia que o canvas recusaria poderia passar num critério.

**Decisão** (`lib/gamification/design-validation.ts`, puro):
- forma: `nodes`/`edges`/`entryNodeIds` arrays; ids string não vazia e únicos; `type` ∈ catálogo do
  engine; `replicas` inteiro em `[1, 1000]`; `cacheHitRate` ∈ `[0, 1]`; `kind` ∈ `EdgeKind`; `weight`
  finito ≥ 0; arestas e entradas apontam pra nós existentes;
- tamanho: até 60 nós e 150 arestas (o maior template tem bem menos);
- topologia: toda aresta passa em `isValidCanvasConnection` (`apps/web/src/lib/connection-rules.ts`)
  e toda entrada é destino válido de `client`.

Design inválido → 400, sem simular.

## 4. Ofensiva com um catálogo de 3 desafios — **decidido: opção A** (autor, 2026-10-23)

Se "atividade verificada" for só a primeira resolução de um desafio, cada usuário tem no máximo 3
eventos na vida: a ofensiva (FR-007) morre em poucos dias e conquistas de ofensiva ficam
inalcançáveis. Opções em `content-draft.md` §4. O mecanismo é o mesmo em todas: tabela
`activityDays (userId, day)` com `INSERT … ON CONFLICT DO NOTHING` (o dia conta uma vez — FR-007), dia
calculado em `America/Sao_Paulo` com `Intl.DateTimeFormat` (nunca aritmética de offset — horário de
verão), ofensiva atual e recorde calculados por função pura sobre a lista de dias.

## 5. Trava de desafios — **decidido: pelo servidor** (autor, 2026-10-23)

Hoje `challenge-progression.ts` destrava o desafio N quando N−1 está em `completedIds` do
`localStorage`. Se "resolvido" passa a morar no servidor e a trava continua lendo o navegador, as duas
fontes divergem (e a trava continua burlável à mão).

**Proposta**: a trava passa a ler os desafios resolvidos do servidor (`GET /api/progress`); a chave
`sdp-challenge-progression` é aposentada. `isChallengeUnlocked` continua igual (função pura) — só
muda de onde vêm os ids. **Consequência**: quem já tinha resolvido desafios volta a ver só o primeiro
destravado. Segue de "todos começam do zero" (FR-009), mas fica explícito no gate 2 do plan.

## 6. Limite de taxa (FR-014)

Limite em memória não sobrevive a várias instâncias serverless. **Decisão**: tabela
`submissionRateLimits (userId, windowStart, count)` no padrão de `loginIpAttempts`, com um único
`INSERT … ON CONFLICT DO UPDATE` que zera a janela vencida ou incrementa (sem corrida). Política
proposta: 10 submissões por minuto por usuário (`content-draft.md` §5). Acima disso → 429, o cliente
mostra o resultado local normalmente e avisa que o progresso não foi registrado.

## 7. Ranking e perfil público (FR-010, FR-015–FR-019)

- Páginas `/app/ranking` e `/app/u/[apelido]` como Server Components, dentro do layout de `/app`
  (mesmo guard — só logados; `robots: noindex` por precaução).
- Leitura passa sempre por `public-profile.ts`, que monta só `{ apelido, nivel, xp, conquistas,
  desafiosResolvidos, ofensiva: { atual, recorde } }`. Teste garante que nenhuma chave `email`,
  `name`, `image` ou `design` sai dele (SC-007).
- Só entra quem tem apelido **e** `isPublic = true` (padrão `true` — opt-out, FR-017).
- Apelido: único sem diferenciar maiúsculas (índice único sobre a forma normalizada); regras em
  `content-draft.md` §3. Fica sob `/app/u/`, então não colide com `/app/[problemId]` nem com
  `/app/ranking`.

## 8. Exclusão de conta

Todas as tabelas novas com FK `userId → user.id` `onDelete: 'cascade'` — o progresso some junto
(edge case do spec).
