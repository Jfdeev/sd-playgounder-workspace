/**
 * Regras de conectividade do canvas — apps/web/src/lib/connection-rules.ts
 *
 * O engine (`packages/engine`) NÃO impõe nenhuma restrição de topologia — `propagateLoad` (ver
 * `packages/engine/src/graph/propagate.ts`) trata toda aresta de saída igual (só olha `weight`,
 * nunca `kind`), e `simulate()` nunca lança (FR-019 de M0): um Load Balancer ligado direto a um
 * SQL Primary roda sem erro e produz um número plausível e **errado** — exatamente o tipo de bug
 * silencioso que a Constitution VI (modelo matemático é especificação) existe pra evitar.
 *
 * Esta camada é puramente pedagógica/de UX (apps/web, nunca packages/engine) — impede no canvas
 * as ligações que não fazem sentido arquitetural, pra que todo design que o engine consegue
 * simular também seja um design que faz sentido ler. Fonte: convenções padrão de system design
 * (papel de cada componente) + o próprio modelo do engine — em particular:
 * - `cache` só reduz a carga de quem vem depois dele no MESMO caminho (packages/engine/src/graph/
 *   propagate.ts, `calculateDownstreamLoad`) — por isso precisa de uma aresta de saída pra um
 *   banco, senão a redução de hit rate não representa nada no grafo.
 * - `sql_replica`/`nosql_kv`/`object_storage` são sempre folha aqui: nenhum FR pede que eles
 *   iniciem chamada pra outro componente.
 */

import type { ComponentType } from '@sdp/engine';
import type { FlowNodeData } from './canvas-types';

/** Todo nó do canvas, do ponto de vista de "quem pode originar/receber uma conexão". */
export type ConnectableKind = ComponentType | 'client';

// Grupo "cômputo especializado" (M1.5 US2) — mesmo leque de destino de app_server hoje, mais os
// sinks novos (Storage/Messaging) e External; nunca llm_gateway, reservado a app_server/api_gateway
// (research.md §3, tasks.md "Nota de design").
const COMPUTE_TARGETS: readonly ComponentType[] = [
  'cache', 'sql_primary', 'sql_replica', 'nosql_kv', 'queue', 'object_storage',
  'data_warehouse', 'vector_db', 'pubsub', 'event_stream', 'kafka',
  'third_party_api', 'payment', 'email',
];

const ALLOWED_TARGETS: Record<ConnectableKind, readonly ComponentType[]> = {
  // Cliente nunca conecta direto em dado/fila/cache — só nos componentes de "borda" (FR-006).
  // M1.5 US2: + dns/waf/ingress/rate_limiter (Filtro/borda, research.md §3).
  client: ['load_balancer', 'api_gateway', 'cdn', 'app_server', 'dns', 'waf', 'ingress', 'rate_limiter'],
  // Load Balancer só distribui para instâncias de computação — nunca para dado, cache ou fila.
  // M1.5 US2: + os 6 componentes de "cômputo especializado" (variações de app_server no grafo).
  load_balancer: ['app_server', 'worker', 'serverless', 'auth_service', 'search', 'scheduler', 'notifications', 'analytics'],
  // M1.5 US2: mesma expansão de load_balancer, + llm_gateway (único ponto de entrada do pipeline
  // de IA a partir da borda, junto com app_server — research.md §3).
  api_gateway: ['app_server', 'worker', 'serverless', 'auth_service', 'search', 'scheduler', 'notifications', 'analytics', 'llm_gateway'],
  // App Server é o nó mais versátil — toca cache, os três tipos de banco, fila e object storage.
  // M1.5 US2: + os 5 sinks novos (Storage/Messaging), + llm_gateway, + External.
  app_server: ['cache', 'sql_primary', 'sql_replica', 'nosql_kv', 'queue', 'object_storage', 'data_warehouse', 'vector_db', 'pubsub', 'event_stream', 'kafka', 'llm_gateway', 'third_party_api', 'payment', 'email'],
  // Worker processa e grava o resultado, ou encadeia pra próxima fila. M1.5 US2: + os 5 sinks
  // novos + External (sem llm_gateway — só app_server/api_gateway chamam IA).
  worker: ['sql_primary', 'nosql_kv', 'cache', 'object_storage', 'queue', 'data_warehouse', 'vector_db', 'pubsub', 'event_stream', 'kafka', 'third_party_api', 'payment', 'email'],
  // Aresta de saída do cache = caminho de miss (ver comentário do módulo). M1.5 US2: + vector_db
  // (miss path plausível pra embeddings, ex. cache de resultado de busca semântica).
  cache: ['sql_primary', 'sql_replica', 'nosql_kv', 'vector_db'],
  // Replicação: primary → replica, nunca o contrário.
  sql_primary: ['sql_replica'],
  sql_replica: [],
  nosql_kv: [],
  // Fila → worker é a aresta assíncrona clássica (FR-012: sai do cálculo de latência do usuário).
  queue: ['worker'],
  object_storage: [],
  // CDN busca na origem só no miss — origem pode ser conteúdo estático (object storage) ou
  // dinâmico (app server).
  cdn: ['object_storage', 'app_server'],

  // --- Traffic & Edge novos (M1.5 US2) — encadeiam entre si (ordem real varia por arquitetura,
  // nenhuma é "a" ordem certa) e terminam nos 3 componentes de borda que já processam requisição.
  dns: ['waf', 'ingress', 'rate_limiter', 'load_balancer', 'api_gateway', 'app_server'],
  waf: ['dns', 'ingress', 'rate_limiter', 'load_balancer', 'api_gateway', 'app_server'],
  ingress: ['dns', 'waf', 'rate_limiter', 'load_balancer', 'api_gateway', 'app_server'],
  rate_limiter: ['dns', 'waf', 'ingress', 'load_balancer', 'api_gateway', 'app_server'],

  // --- Compute novos (M1.5 US2) — variações de app_server no grafo (research.md §3): mesmo leque
  // de destino, via COMPUTE_TARGETS.
  serverless: COMPUTE_TARGETS,
  auth_service: COMPUTE_TARGETS,
  search: COMPUTE_TARGETS,
  scheduler: COMPUTE_TARGETS,
  notifications: COMPUTE_TARGETS,
  analytics: COMPUTE_TARGETS,

  // --- Storage novos (M1.5 US2) — sempre folha, como sql_replica/nosql_kv/object_storage.
  data_warehouse: [],
  vector_db: [],

  // --- Messaging novos (M1.5 US2) — só entregam pra Worker, mesma regra de queue → worker.
  pubsub: ['worker'],
  event_stream: ['worker'],
  kafka: ['worker'],

  // --- Pipeline de IA (M1.5 US2) — app_server/api_gateway → llm_gateway → orchestrator →
  // {tool_registry, memory_fabric}; safety_mesh é um hop inserível em qualquer ponto do pipeline.
  llm_gateway: ['orchestrator', 'safety_mesh'],
  orchestrator: ['tool_registry', 'memory_fabric', 'safety_mesh'],
  tool_registry: [],
  memory_fabric: [],
  safety_mesh: ['llm_gateway', 'orchestrator', 'tool_registry', 'memory_fabric'],

  // --- External (M1.5 US2) — sempre folha, alcançados a partir de app_server/worker/pipeline de
  // IA (research.md §3).
  third_party_api: [],
  payment: [],
  email: [],
};

/** Deriva o `ConnectableKind` de um nó do canvas a partir do seu `data` (React Flow nativo). */
export function connectableKindOf(data: FlowNodeData): ConnectableKind {
  return data.kind === 'client' ? 'client' : data.componentType;
}

/** Os tipos de componente que `source` pode alcançar por uma aresta de saída. */
export function getAllowedTargets(source: ConnectableKind): readonly ComponentType[] {
  return ALLOWED_TARGETS[source];
}

/** Regra central: `source` pode se conectar a `target`? (Cliente nunca é destino — FR-006.) */
export function isValidCanvasConnection(source: ConnectableKind, target: ConnectableKind): boolean {
  if (target === 'client') return false;
  return ALLOWED_TARGETS[source].includes(target);
}
