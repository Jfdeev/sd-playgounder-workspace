import { defineConfig } from 'drizzle-kit';

// `generate` só precisa do schema (não abre conexão) — não bloqueia sem DATABASE_URL.
// `migrate`/`push`/`studio` precisam de uma conexão real; falham naturalmente (erro de conexão,
// não deste arquivo) se DATABASE_URL não estiver em apps/web/.env.local.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
