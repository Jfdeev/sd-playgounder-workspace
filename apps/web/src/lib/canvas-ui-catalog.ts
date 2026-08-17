/**
 * Catálogo de apresentação do canvas — apps/web/src/lib/canvas-ui-catalog.ts
 *
 * Ícone + rótulo por `ComponentType`/`ClientVariant`/`EdgeKind`. Puramente visual — nenhum valor
 * aqui é lido pelo engine ou pelo mapper (`canvas-to-design.ts`). Compartilhado entre a paleta
 * (`palette.tsx`) e os nós/arestas renderizados no canvas, para nunca duplicar rótulo/ícone entre
 * os dois lugares.
 */

import {
  Boxes,
  Cloud,
  Cog,
  Database,
  DatabaseZap,
  DoorOpen,
  Globe,
  HardDrive,
  ListOrdered,
  Monitor,
  Server,
  Shuffle,
  Smartphone,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType, EdgeKind } from '@sdp/engine';
import type { ClientVariant } from './canvas-types';

export const COMPONENT_UI: Record<ComponentType, { label: string; icon: LucideIcon }> = {
  load_balancer: { label: 'Load Balancer', icon: Shuffle },
  api_gateway: { label: 'API Gateway', icon: DoorOpen },
  app_server: { label: 'App Server', icon: Server },
  worker: { label: 'Worker', icon: Cog },
  cache: { label: 'Cache', icon: Zap },
  sql_primary: { label: 'SQL Primary', icon: Database },
  sql_replica: { label: 'SQL Replica', icon: DatabaseZap },
  nosql_kv: { label: 'NoSQL (KV)', icon: Boxes },
  queue: { label: 'Fila', icon: ListOrdered },
  object_storage: { label: 'Object Storage', icon: HardDrive },
  cdn: { label: 'CDN', icon: Cloud },
};

export const CLIENT_UI: Record<ClientVariant, { label: string; icon: LucideIcon }> = {
  mobile: { label: 'Cliente (mobile)', icon: Smartphone },
  web: { label: 'Cliente (web)', icon: Globe },
  desktop: { label: 'Cliente (desktop)', icon: Monitor },
};

export const EDGE_KIND_UI: Record<EdgeKind, { label: string; colorClass: string; dashed: boolean }> = {
  read: { label: 'Leitura', colorClass: 'stroke-cyan-400', dashed: false },
  write: { label: 'Escrita', colorClass: 'stroke-pink-400', dashed: false },
  async: { label: 'Assíncrona', colorClass: 'stroke-amber-400', dashed: true },
  replication: { label: 'Replicação', colorClass: 'stroke-violet-400', dashed: false },
};

export const NODE_STATUS_UI: Record<'healthy' | 'warning' | 'saturated', { label: string; colorClass: string }> = {
  healthy: { label: 'Saudável', colorClass: 'border-emerald-500 text-emerald-400' },
  warning: { label: 'Atenção', colorClass: 'border-amber-500 text-amber-400' },
  saturated: { label: 'Saturado', colorClass: 'border-red-500 text-red-400' },
};
