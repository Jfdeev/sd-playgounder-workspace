/**
 * Categoria de paleta — apps/web/src/lib/component-categories.ts
 *
 * Conceito novo desta feature (M1.5), puramente de apresentação — nunca existe em
 * `packages/engine` (Key Entities de `specs/catalogo-expandido-m1-5/spec.md`; Constitution VII).
 * Agrupa cada `ConnectableKind` (todo nó do canvas, componente ou Cliente) sob uma das 9 categorias
 * do site de inspiração, na mesma ordem — FR-001.
 *
 * `CATEGORY_OF` é `Record<ConnectableKind, PaletteCategory>`, exaustivo por construção: se
 * `ComponentType` (packages/engine) ganhar um valor novo sem uma entrada aqui, o build quebra
 * (mesma técnica de `ALLOWED_TARGETS`/`COMPONENT_CATALOG` — research.md §4).
 */

import type { ConnectableKind } from './connection-rules';

export type PaletteCategory =
  | 'Client'
  | 'Traffic & Edge'
  | 'Compute'
  | 'Storage'
  | 'Messaging'
  | 'Observability'
  | 'Network'
  | 'AI & Agents'
  | 'External';

export const PALETTE_CATEGORY_ORDER: readonly PaletteCategory[] = [
  'Client',
  'Traffic & Edge',
  'Compute',
  'Storage',
  'Messaging',
  'Observability',
  'Network',
  'AI & Agents',
  'External',
];

export const CATEGORY_OF: Record<ConnectableKind, PaletteCategory> = {
  client: 'Client',
  load_balancer: 'Traffic & Edge',
  api_gateway: 'Traffic & Edge',
  cdn: 'Traffic & Edge',
  app_server: 'Compute',
  worker: 'Compute',
  cache: 'Storage',
  sql_primary: 'Storage',
  sql_replica: 'Storage',
  nosql_kv: 'Storage',
  object_storage: 'Storage',
  queue: 'Messaging',

  // Traffic & Edge novos — M1.5 US2.
  dns: 'Traffic & Edge',
  waf: 'Traffic & Edge',
  ingress: 'Traffic & Edge',
  rate_limiter: 'Traffic & Edge',

  // Compute novos — M1.5 US2.
  serverless: 'Compute',
  auth_service: 'Compute',
  search: 'Compute',
  scheduler: 'Compute',
  notifications: 'Compute',
  analytics: 'Compute',

  // Storage novos — M1.5 US2.
  data_warehouse: 'Storage',
  vector_db: 'Storage',

  // Messaging novos — M1.5 US2.
  pubsub: 'Messaging',
  event_stream: 'Messaging',
  kafka: 'Messaging',

  // AI & Agents — M1.5 US2.
  llm_gateway: 'AI & Agents',
  orchestrator: 'AI & Agents',
  tool_registry: 'AI & Agents',
  memory_fabric: 'AI & Agents',
  safety_mesh: 'AI & Agents',

  // External — M1.5 US2.
  third_party_api: 'External',
  payment: 'External',
  email: 'External',
};
