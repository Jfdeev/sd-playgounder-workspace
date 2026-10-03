# Quickstart: M2.5 — Arquiteturas de referência

Verificação por user story, no padrão dos marcos anteriores: `apps/web` não testa componente React
(convenção de M0.5) — a UI é conferida no browser; dados e a integridade dos presets têm teste.

## Pré-requisito

```bash
pnpm install
pnpm --filter web dev
```

Login em `/entrar` (qualquer conta). Fora de um desafio (canvas livre) — o menu de presets fica
desabilitado dentro de um desafio.

## Checagens automáticas

```bash
pnpm -r test
pnpm -r exec tsc --noEmit
pnpm --filter web build
```

`knowledge` valida os invariantes de dado (fontes, explicações, `basis`, limitações); `web` valida
que toda aresta passa na matriz de conexões e que o preset simula sem violação estrutural.

## US1 — Carregar o preset (P1)

1. No canvas livre, abrir o menu "Arquiteturas".
2. **Esperado**: lista com GitHub, cada um com resumo e fontes (título, publicador, link).
3. Com algo desenhado, escolher "GitHub": **esperado** confirmação destrutiva; aceitar; Ctrl/Cmd+Z
   desfaz.
4. **Esperado**: o design aparece (monolito → MySQL primário/réplicas, Spokes, Kafka → workers).
5. Clicar "Simular": **esperado** resultado com as 7 dimensões separadas.
6. Entrar num desafio: **esperado** o menu de presets desabilitado, com a dica "saia do desafio".

## US2 — Explicação por componente (P2)

1. Com o preset carregado, clicar em cada nó.
2. **Esperado**: "Por que está aqui" com texto e as fontes; nenhum nó sem explicação.
3. Apagar um nó e adicionar outro: **esperado** o nó apagado some com a explicação; o novo não tem
   nenhuma.
4. Desligar a rede/serviços externos: **esperado** as explicações continuam aparecendo.

## US3 — O que é real × ilustrativo (P3)

1. No detalhe do preset, abrir "O que a simulação não modela": **esperado** ProxySQL, Vitess, proxy
   do Spokes, conexões inferidas.
2. Simular: **esperado** o aviso "valores ilustrativos — não são os da empresa" junto do resultado;
   ele some ao carregar outro design ou apagar o canvas.

## US4 — Outras empresas (P4)

Para cada preset adicional, repetir US1–US3. Um preset sem fonte lida **não** aparece no menu.

## Não-regressão (FR-009, FR-010)

- Carregar e simular um preset não muda o progresso de nenhum desafio (comparar `completedIds` no
  `localStorage` antes/depois).
- Resultado do engine, narrador e `NARRATOR_PROMPT_VERSION` inalterados.
