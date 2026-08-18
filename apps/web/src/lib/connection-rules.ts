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

const ALLOWED_TARGETS: Record<ConnectableKind, readonly ComponentType[]> = {
  // Cliente nunca conecta direto em dado/fila/cache — só nos componentes de "borda" (FR-006).
  client: ['load_balancer', 'api_gateway', 'cdn', 'app_server'],
  // Load Balancer só distribui para instâncias de computação — nunca para dado, cache ou fila.
  load_balancer: ['app_server', 'worker'],
  api_gateway: ['app_server', 'worker'],
  // App Server é o nó mais versátil — toca cache, os três tipos de banco, fila e object storage.
  app_server: ['cache', 'sql_primary', 'sql_replica', 'nosql_kv', 'queue', 'object_storage'],
  // Worker processa e grava o resultado, ou encadeia pra próxima fila.
  worker: ['sql_primary', 'nosql_kv', 'cache', 'object_storage', 'queue'],
  // Aresta de saída do cache = caminho de miss (ver comentário do módulo).
  cache: ['sql_primary', 'sql_replica', 'nosql_kv'],
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
