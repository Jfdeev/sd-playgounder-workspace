import { defineConfig } from 'vitest/config';

// Escopo de cobertura restrito aos módulos puros (src/lib/**) — decisão registrada em
// specs/landing-page-conta-m0-5/research.md §5. Rotas, auth.ts e páginas (wiring de
// Next.js/Auth.js/DB/OAuth) não entram na métrica: testá-los exigiria mockar o framework
// inteiro, validando o mock em vez do comportamento real.
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
