# Quickstart: M1.5 — Catálogo expandido de componentes do canvas

Verificação manual pós-implementação, mesmo padrão de M1 (sem endpoint novo, sem servidor — tudo
no browser).

## US1 — Paleta organizada por categoria

1. Abrir o canvas (`pnpm --filter web dev`, `/app/encurtador-de-url`).
2. Confirmar 9 cabeçalhos de categoria na paleta lateral, na ordem: Client, Traffic & Edge,
   Compute, Storage, Messaging, Observability, Network, AI & Agents, External.
3. Confirmar que os 11 componentes de M1 (e o nó Cliente) aparecem sob a categoria certa (ex.:
   Cache → Storage, Load Balancer → Traffic & Edge).
4. Abrir um design salvo antes deste incremento (autosave de M1) — MUST carregar e simular
   normalmente (Edge Case da spec).

## US2 — 23 componentes novos "limpos"

1. Arrastar um componente novo de cada categoria "limpa" (ex.: Rate Limiter, Serverless, Data
   Warehouse, Kafka, LLM Gateway, Payment) pro canvas.
2. Conectar cada um num caminho válido até um Cliente, configurar réplicas, submeter.
3. Confirmar que o painel de resultado mostra utilização/latência/custo reagindo a mudar réplicas
   do componente novo (prova de que é simulado, não decorativo — SC-002).
4. Tentar uma conexão sem sentido arquitetural (ex. Rate Limiter → SQL Database) — canvas MUST
   recusar no próprio gesto de conectar (SC-003).
5. Passar o mouse/tocar no ícone de descrição de um componente novo — tooltip/painel MUST mostrar
   a descrição pedagógica (FR-004).

## US3 — Observability e Network

1. Repetir os passos 1-3 de US2 para um componente de Observability (ex. Health Check) e um de
   Network (ex. Service Mesh).
2. Montar um design razoável com VPC ou Subnet no caminho, com carga normal do problema — MUST
   nunca aparecer como gargalo (Acceptance Scenario 2 de US3).

## Regressão

- Rodar `pnpm --filter engine test` e `pnpm --filter web test:coverage` — todos os testes verdes,
  cobertura ≥ 90% mantida nos módulos puros tocados.
- Rodar `pnpm --filter web build` — build limpo (confirma exaustividade dos `Record` novos).
