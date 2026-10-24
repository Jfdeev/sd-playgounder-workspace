import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
// Evita depender de '@auth/core' diretamente (não é dependência direta deste pacote, só
// transitiva via next-auth) — união literal equivalente ao tipo `AdapterAccountType` do Auth.js.
type AdapterAccountType = 'oauth' | 'oidc' | 'email' | 'webauthn' | 'credentials';

/**
 * Tabelas do Auth.js (@auth/drizzle-adapter) — nomes/colunas seguem o padrão esperado pelo
 * adapter (specs/landing-page-conta-m0-5/data-model.md), estendidas com colunas próprias do
 * produto: passwordHash, failedLoginAttempts, lockedUntil (não fazem parte do schema padrão).
 *
 * `emailVerified` é reaproveitado como o "emailConfirmedAt" do spec (FR-013a) — não-nulo significa
 * "email confirmado", e é o que decide se uma conta pode ser vinculada automaticamente (FR-013).
 */
export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),

  // Extensões do produto (não fazem parte do schema padrão do @auth/drizzle-adapter).
  passwordHash: text('passwordHash'),
  failedLoginAttempts: integer('failedLoginAttempts').notNull().default(0),
  lockedUntil: timestamp('lockedUntil', { mode: 'date' }),

  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
});

/**
 * Vínculo de método de login (um `users.id` pode ter uma linha `credentials` e uma `google`) —
 * é o mecanismo técnico do Auth.js para "múltiplos métodos, mesma conta", populado manualmente
 * pelo `signIn` callback quando FR-013 decide vincular (ver src/auth.ts, src/lib/account-linking.ts).
 */
export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

/**
 * Reaproveitada como token de confirmação de email (FR-013a) — mesmo mecanismo que o Auth.js usa
 * para providers `email` (magic link). Este projeto não registra nenhum provider `email`, então
 * nada no core do Auth.js lê/escreve esta tabela por conta própria — escrita e consumo são 100%
 * das rotas próprias (POST /api/account/signup, GET /api/account/confirm-email). Ver
 * data-model.md para a checagem completa dessa suposição.
 */
export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

/**
 * Não usada pelo Auth.js neste projeto — `session.strategy` é `"jwt"` (exigido pelo Credentials
 * provider, research.md §1), então sessão é um cookie assinado, nunca uma linha aqui. A tabela
 * existe só porque o adapter a espera na assinatura de tipos; permanece vazia em produção.
 */
export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

/**
 * Rate limiting por IP — camada secundária contra credential spraying (uma tentativa em muitas
 * contas diferentes, nenhuma isolada bate o limite por conta de FR-012). Não dá pra reaproveitar
 * a tabela `user` pra isto: um IP tentando emails que não existem nunca teria uma linha de conta
 * pra guardar o estado. Chave é o IP em si, não um `userId` — decisão do autor, 2026-08-14 (ver
 * `src/lib/rate-limit.ts`, `IP_LOGIN_POLICY`).
 */
export const loginIpAttempts = pgTable('loginIpAttempts', {
  ip: text('ip').primaryKey(),
  failedAttempts: integer('failedAttempts').notNull().default(0),
  lockedUntil: timestamp('lockedUntil', { mode: 'date' }),
});

/**
 * Cache de explicações do narrador (M2, FR-005) — chave é o hash determinístico de
 * `(Design, Workload)` (`@sdp/narrator` `hashDesign`), nunca `userId`: a explicação de um design é
 * a mesma pra qualquer usuário que submeta o mesmo design (cache compartilhado, não por-usuário) —
 * consistente com RNF-6 ("nunca repetindo a chamada ao provedor de LLM pro mesmo par", independente
 * de quem submeteu). Sem índice além da PK — todo acesso é por `designHash` exato (get-or-create).
 */
export const narratorExplanations = pgTable('narratorExplanations', {
  designHash: text('designHash').primaryKey(),
  summary: text('summary').notNull(),
  bottleneckExplanation: text('bottleneckExplanation').notNull(),
  recommendation: text('recommendation'),
  /** Id de uma ficha de @sdp/knowledge citada pelo narrador (M2.6, US4) — nunca uma string solta. */
  citationId: text('citationId'),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
});

// Mantido só para satisfazer o tipo esperado pelo adapter em algumas versões — não usado.
export const authenticators = pgTable(
  'authenticator',
  {
    credentialID: text('credentialID').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('providerAccountId').notNull(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credentialDeviceType').notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    transports: text('transports'),
  },
  (authenticator) => [
    primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  ],
);

/**
 * M2.8 — perfil social: apelido (já normalizado em minúsculas por `lib/gamification/nickname.ts`,
 * então o índice único é insensível a maiúsculas — FR-015) e visibilidade (opt-out, FR-017). Sem
 * linha = sem apelido = fora do ranking. Nunca guarda XP: progresso é derivado de `scoringEvents`.
 */
export const userProfiles = pgTable('userProfiles', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  nickname: text('nickname').unique(),
  isPublic: boolean('isPublic').notNull().default(true),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

/** Tipos de evento de pontuação (M2.8 + M3). Mudar esta lista não pede migração: a coluna é `text`. */
export const SCORING_EVENT_TYPES = ['challenge', 'achievement', 'incident-diagnosis', 'incident'] as const;
export type ScoringEventType = (typeof SCORING_EVENT_TYPES)[number];

/**
 * M2.8 — eventos de pontuação, imutáveis, fonte da verdade do XP (data-model.md). A restrição única
 * `(userId, eventKey)` é o que garante "cada desafio credita uma vez, cada conquista desbloqueia uma
 * vez" mesmo com submissões simultâneas: o driver `neon-http` não tem transação, então o crédito é
 * um `INSERT … ON CONFLICT DO NOTHING` e quem perde a corrida simplesmente não insere (research §2).
 */
export const scoringEvents = pgTable(
  'scoringEvents',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventKey: text('eventKey').notNull(),
    // M3 acrescentou 'incident-diagnosis' e 'incident' — só no TypeScript: a coluna é `text`, sem migração.
    type: text('type', { enum: SCORING_EVENT_TYPES }).notNull(),
    problemId: text('problemId'),
    xp: integer('xp').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (event) => [unique('scoringEvents_userId_eventKey_unique').on(event.userId, event.eventKey)],
);

/** M2.8 — um registro por dia (fuso de SP) com submissão verificada: o dia conta uma vez (FR-007). */
export const activityDays = pgTable(
  'activityDays',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
  },
  (activity) => [primaryKey({ columns: [activity.userId, activity.day] })],
);

/**
 * M2.8 — limite de submissões verificadas por usuário (FR-014). No banco, não em memória: em
 * serverless cada instância teria o próprio contador. Mesmo padrão de `loginIpAttempts`.
 */
export const submissionRateLimits = pgTable('submissionRateLimits', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  windowStart: timestamp('windowStart', { mode: 'date' }).notNull(),
  count: integer('count').notNull(),
});
