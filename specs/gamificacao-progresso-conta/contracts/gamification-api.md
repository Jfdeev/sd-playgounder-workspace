# Contrato: API de gamificação (M2.8)

Todas as rotas: `auth()` obrigatório (401 sem sessão), checagem de mesma origem nas que escrevem (403),
respostas JSON. **Nenhuma resposta tem e-mail, nome da conta ou design de outro usuário** (FR-018).

## `POST /api/submissions`

Corpo — **só isto** (qualquer outro campo é ignorado):

```json
{ "problemId": "url-shortener", "design": { "nodes": [], "edges": [], "entryNodeIds": [] } }
```

Regras:
1. Limite de taxa por usuário antes de qualquer cálculo → `429 { "error": "RATE_LIMITED" }`.
2. `problemId` desconhecido → `404 { "error": "UNKNOWN_PROBLEM" }`.
3. Design inválido (`design-validation.ts`) → `400 { "error": "INVALID_DESIGN", "reason": "..." }`.
4. O servidor deriva carga e custo de referência do problema e roda `simulate` + `isProblemSolved`.
   **Nunca lê resultado, carga ou nota do cliente.**
5. Se resolveu: `INSERT … ON CONFLICT DO NOTHING` do evento `challenge:<problemId>`; registra o dia
   de atividade (conforme gate 1); avalia conquistas e insere as novas do mesmo jeito.

Resposta `200`:

```json
{
  "solved": true,
  "credited": { "xp": 100, "achievements": ["first-challenge"] },
  "progress": { "xp": 100, "level": 2, "xpIntoLevel": 0, "xpForNextLevel": 200,
                "solvedProblemIds": ["url-shortener"], "streak": { "current": 1, "best": 1 } }
}
```

`credited.xp = 0` e `achievements = []` quando já tinha resolvido (idempotente) ou não resolveu.
Falha de banco → `503 { "error": "PROGRESS_UNAVAILABLE" }`; o cliente continua mostrando o resultado
local e não exibe XP (FR-013).

## `GET /api/progress`

Progresso do próprio usuário (o mesmo objeto `progress` acima, mais `achievements` com data e
`profile: { nickname, isPublic }`). Usado pelo painel e pela trava de desafios (gate 2).

## `PUT /api/profile`

Corpo: `{ "nickname"?: string | null, "isPublic"?: boolean }`.

- Apelido inválido → `400 { "error": "INVALID_NICKNAME", "reason": "..." }`.
- Apelido em uso por outra conta → `409 { "error": "NICKNAME_TAKEN" }` (violação do índice único,
  nunca checagem-e-depois-grava).
- `nickname: null` remove o apelido (sai do ranking).

Resposta `200 { "nickname": "...", "isPublic": true }`.

## Leitura pública (sem rota de API)

`/app/ranking` e `/app/u/[apelido]` são Server Components que consultam o banco e passam tudo por
`public-profile.ts`. Perfil escondido ou inexistente → página "perfil não encontrado" (mesma resposta
nos dois casos, pra não revelar que o apelido existe).
