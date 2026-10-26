# Quickstart: M3 — Modo Incidente

Regras puras com teste (falhas, unicidade, critério do fix, serializador, diagnóstico); UI e rotas no
browser, com conta de teste throwaway apagada ao final.

**Verificado de ponta a ponta em 2026-10-24** — US1–US3, bundle (SC-003) e não-regressão (SC-006)
confirmados (tasks.md, Execução).

## Checagens automáticas

```bash
pnpm -r test
pnpm -r exec tsc --noEmit
pnpm --filter web build
```

Depois do build: procurar em `apps/web/.next/static` os ids-alvo dos incidentes junto dos nomes de
falha → zero ocorrências (SC-003).

## US1 — Abrir e investigar

Abrir cada incidente: arquitetura, alerta, métricas "antes × agora" por componente; o sintoma do
alerta aparece no "agora" e não no "antes" (SC-002); nada na tela revela a causa; a resposta de
`GET /api/incidents/[id]` não tem réplicas/capacidade/taxa de acerto nem a falha.

## US2 — Diagnosticar

Componente errado → "não é isso"; componente certo e tipo errado → "o componente está certo";
certo → passa para o fix. Repetir errado várias vezes continua permitido; a resposta nunca aparece.

## US3 — Corrigir

Enviar o fix antes do diagnóstico → 409. Depois: design original → não resolve; design sem o alvo →
não resolve; fix de referência → resolve, +100 XP uma vez (de novo → 0; duas abas → um crédito).

## Não-regressão

Snapshot de `simulate()` de todo problema, template e preset igual antes/depois (SC-006).
