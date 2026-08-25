# Data Model: M1.5 — Catálogo expandido de componentes do canvas

**Input**: [spec.md](spec.md) Key Entities, [research.md](research.md).

Mesma separação rígida de camadas de M1 (Constitution VII): `packages/engine` ganha 33 valores
novos de `ComponentType` + suas specs (dado versionado, sem lógica nova); `apps/web` ganha só
apresentação (categoria de paleta) e regra de conectividade (já existia desde a task de
conectividade de M1, só cresce).

## `packages/engine` — `ComponentType` expandido

```ts
// packages/engine/src/types.ts — union cresce de 11 para 44 valores.
export type ComponentType =
  // 11 existentes (M0/M1) — inalterados
  | 'load_balancer' | 'api_gateway' | 'app_server' | 'worker' | 'cache'
  | 'sql_primary' | 'sql_replica' | 'nosql_kv' | 'queue' | 'object_storage' | 'cdn'
  // Traffic & Edge — 4 novos (US2)
  | 'dns' | 'waf' | 'ingress' | 'rate_limiter'
  // Compute — 6 novos (US2)
  | 'serverless' | 'auth_service' | 'search' | 'scheduler' | 'notifications' | 'analytics'
  // Storage — 2 novos (US2)
  | 'data_warehouse' | 'vector_db'
  // Messaging — 3 novos (US2)
  | 'pubsub' | 'event_stream' | 'kafka'
  // AI & Agents — 5 novos (US2)
  | 'llm_gateway' | 'orchestrator' | 'tool_registry' | 'memory_fabric' | 'safety_mesh'
  // External — 3 novos (US2)
  | 'third_party_api' | 'payment' | 'email'
  // Observability — 5 novos (US3)
  | 'metrics' | 'logs' | 'tracing' | 'alerting' | 'health_check'
  // Network — 5 novos (US3)
  | 'vpc' | 'subnet' | 'nat_gateway' | 'vpn' | 'service_mesh';
```

**Validação/regras**:
- Nomenclatura `snake_case`, mesmo padrão dos 11 existentes; nomes derivados diretamente da coluna
  "Componente" da tabela do spec (traduzidos/normalizados pro inglês, ASCII).
- `ComponentSpec` (capacidade/latência/custo) não muda de forma — só ganha 33 entradas em
  `COMPONENT_CATALOG` (`Record<ComponentType, ComponentSpec>`, `packages/engine/src/catalog/
  components.ts`), cada uma derivada de um dos 8 arquétipos de `research.md` §2. O compilador
  recusa build se qualquer uma faltar (propriedade de exaustividade do `Record`).
- Nenhum campo novo em `DesignNode`/`DesignEdge`/`Workload`/`SimulationResult` — o contrato do
  engine (`docs/product-context.md` §6, Constitution "Restrições Técnicas Adicionais") não muda de
  forma, só o domínio de `ComponentType` cresce.

## `apps/web` — Categoria de paleta (conceito novo, só apresentação)

```ts
// apps/web/src/lib/component-categories.ts
export type PaletteCategory =
  | 'Client' | 'Traffic & Edge' | 'Compute' | 'Storage' | 'Messaging'
  | 'Observability' | 'Network' | 'AI & Agents' | 'External';

export const PALETTE_CATEGORY_ORDER: readonly PaletteCategory[] = [
  'Client', 'Traffic & Edge', 'Compute', 'Storage', 'Messaging',
  'Observability', 'Network', 'AI & Agents', 'External',
]; // mesma ordem da tabela do spec — FR-001.

export const CATEGORY_OF: Record<ConnectableKind, PaletteCategory> = {
  client: 'Client', // as 3 variantes (mobile/web/desktop) sempre caem em Client.
  load_balancer: 'Traffic & Edge', api_gateway: 'Traffic & Edge', cdn: 'Traffic & Edge',
  dns: 'Traffic & Edge', waf: 'Traffic & Edge', ingress: 'Traffic & Edge', rate_limiter: 'Traffic & Edge',
  app_server: 'Compute', worker: 'Compute', serverless: 'Compute', auth_service: 'Compute',
  search: 'Compute', scheduler: 'Compute', notifications: 'Compute', analytics: 'Compute',
  cache: 'Storage', sql_primary: 'Storage', sql_replica: 'Storage', nosql_kv: 'Storage',
  object_storage: 'Storage', data_warehouse: 'Storage', vector_db: 'Storage',
  queue: 'Messaging', pubsub: 'Messaging', event_stream: 'Messaging', kafka: 'Messaging',
  metrics: 'Observability', logs: 'Observability', tracing: 'Observability',
  alerting: 'Observability', health_check: 'Observability',
  vpc: 'Network', subnet: 'Network', nat_gateway: 'Network', vpn: 'Network', service_mesh: 'Network',
  llm_gateway: 'AI & Agents', orchestrator: 'AI & Agents', tool_registry: 'AI & Agents',
  memory_fabric: 'AI & Agents', safety_mesh: 'AI & Agents',
  third_party_api: 'External', payment: 'External', email: 'External',
};
```

**Validação/regras**:
- `CATEGORY_OF` é `Record<ConnectableKind, PaletteCategory>` (mesma técnica de exaustividade de
  `ALLOWED_TARGETS`/`COMPONENT_CATALOG`) — todo `ComponentType` novo é forçado a ganhar categoria
  no mesmo commit em que é criado, ou o build quebra.
- Não existe em `packages/engine` — `SimulationResult`/`Design`/`Workload` nunca leem
  `PaletteCategory` (Key Entities do spec já declara isso).
- `palette.tsx` (FR-001) itera `PALETTE_CATEGORY_ORDER`, e para cada categoria filtra
  `CATEGORY_OF` — substitui os dois `<div>` fixos atuais (Cliente/Componentes) por um `map` sobre
  9 seções.

## Regra de conectividade expandida (`apps/web/src/lib/connection-rules.ts`)

Nenhum tipo novo introduzido — `ALLOWED_TARGETS` continua `Record<ConnectableKind, readonly
ComponentType[]>`, só cresce de 12 para 45 chaves. O conteúdo de cada chave nova segue as 8 regras
de arquétipo documentadas em `research.md` §3 (não repetidas aqui — a fonte de verdade da regra
final é o próprio arquivo de código + `connection-rules.spec.ts`, não este documento).

## Máquina de estados — nenhuma nesta feature

Mesma conclusão de M1: não existe transição de estado persistente nova. Um `ComponentType` novo é
só mais um valor no mesmo domínio estático já existente.
