# Data Model: M2.8 — Gamificação e progresso na conta

Tudo em `apps/web/src/db/schema.ts` (Drizzle, Postgres/Neon). Toda FK `userId → user.id` com
`onDelete: 'cascade'` (exclusão de conta leva o progresso junto). **Nenhum contador armazenado**:
XP, nível, desafios resolvidos, conquistas e ranking são derivados por consulta (`research.md` §2).

## Tabelas novas

### `userProfiles` — um por usuário (só existe quando o usuário mexe no perfil)

| coluna | tipo | regra |
|---|---|---|
| `userId` | text PK, FK cascade | |
| `nickname` | text, nullable | forma normalizada (`content-draft.md` §3) |
| `isPublic` | boolean not null default `true` | opt-out (FR-017) |
| `updatedAt` | timestamp not null default now | |

Índice único em `nickname` (já normalizado em minúsculas → unicidade sem diferenciar maiúsculas,
FR-015). Sem linha = sem apelido = fora do ranking.

### `scoringEvents` — imutável, fonte da verdade do XP

| coluna | tipo | regra |
|---|---|---|
| `id` | text PK (uuid) | |
| `userId` | text not null, FK cascade | |
| `eventKey` | text not null | `challenge:<problemId>` ou `achievement:<achievementId>` |
| `type` | text not null | `'challenge' \| 'achievement'` |
| `problemId` | text, nullable | preenchido em `challenge` |
| `xp` | integer not null | `>= 0`; determinístico pelo tipo (FR-006) |
| `createdAt` | timestamp not null default now | data da 1ª resolução / do desbloqueio |

**Restrição única `(userId, eventKey)`** — garante "cada desafio credita uma vez" e "cada conquista
desbloqueia uma vez", inclusive com submissões simultâneas (FR-003, FR-008, SC-004). Escrita sempre
por `INSERT … ON CONFLICT DO NOTHING RETURNING`. Nunca há `UPDATE` nem `DELETE` (exceto cascade).

### `activityDays` — um registro por dia com atividade verificada

| coluna | tipo | regra |
|---|---|---|
| `userId` | text, FK cascade | |
| `day` | date | dia em `America/Sao_Paulo` |

PK `(userId, day)` — o dia conta uma vez (FR-007). O que conta como atividade depende do gate 1
(`content-draft.md` §4).

### `submissionRateLimits` — limite de taxa (FR-014)

| coluna | tipo | regra |
|---|---|---|
| `userId` | text PK, FK cascade | |
| `windowStart` | timestamp not null | início da janela atual |
| `count` | integer not null | submissões na janela |

Atualizado por um único upsert que zera a janela vencida ou incrementa.

## Derivados (consultas, nunca colunas)

| valor | como |
|---|---|
| XP total | `sum(xp)` de `scoringEvents` do usuário |
| nível, XP até o próximo | `levels.ts` sobre o XP total |
| desafios resolvidos (+ data) | eventos `type = 'challenge'` |
| conquistas desbloqueadas (+ data) | eventos `type = 'achievement'` |
| ofensiva atual e recorde | `streak.ts` sobre a lista de `activityDays` |
| ranking | usuários com `nickname` e `isPublic`, XP agregado, ordem de `ranking.ts` |

## Módulos puros (`apps/web/src/lib/gamification/`)

| módulo | entrada → saída |
|---|---|
| `levels.ts` | `xp → { level, xpIntoLevel, xpForNextLevel }` |
| `streak.ts` | `days[], today → { current, best }`; `toLocalDay(date)` em `America/Sao_Paulo` |
| `achievements.ts` | definições; `(estado verificado) → ids que passam a valer` |
| `design-validation.ts` | `unknown → { ok: true, design } \| { ok: false, reason }` |
| `nickname.ts` | `string → { ok: true, nickname } \| { ok: false, reason }` |
| `ranking.ts` | `entries[] → entries[]` ordenadas (desempate determinístico) |
| `public-profile.ts` | dados do usuário → objeto público só com os campos de FR-018 |

## Fora do modelo

Designs (M4); nada em `narratorExplanations`; nenhuma coluna nova em `user`.
