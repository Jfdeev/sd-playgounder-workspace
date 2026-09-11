/**
 * Templates de arquitetura — apps/web/src/lib/canvas-templates.ts
 *
 * Pedido direto do autor: 4 arquiteturas prontas (Monolito, 3 Camadas, Microsserviços, Orientado a
 * Eventos), cada uma gerando automaticamente um design no canvas. Dado puro + uma função de
 * instanciação — nenhuma dependência de React/store aqui (a store só entra em `apply`, feito pelo
 * componente que consome este módulo via `loadDesign`).
 *
 * **Toda aresta de todo template MUST passar em `isValidCanvasConnection`** — um template que
 * gerasse uma conexão que o próprio canvas recusaria o usuário desenhar à mão seria uma
 * contradição direta da matriz de conectividade que `connection-rules.ts` já garante (prova
 * mecânica em `apps/web/test/canvas-templates.spec.ts`, não só uma promessa em comentário).
 */

import type { ComponentType, EdgeKind } from '@sdp/engine';
import type { ClientVariant, FlowNodeData } from './canvas-types';
import type { CanvasEdge, CanvasNode } from '@/stores/canvas-store';

type TemplateNodeDef =
  | { localId: string; kind: 'client'; variant: ClientVariant; column: number; row: number }
  | { localId: string; kind: 'component'; componentType: ComponentType; replicas: number; column: number; row: number };

type TemplateEdgeDef = { from: string; to: string; kind: EdgeKind };

export type ArchitectureTemplate = {
  id: string;
  label: string;
  description: string;
  nodes: readonly TemplateNodeDef[];
  edges: readonly TemplateEdgeDef[];
};

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 130;

/** Monolito: um único processo de aplicação atrás de um banco — sem camada de borda separada. */
const MONOLITH: ArchitectureTemplate = {
  id: 'monolith',
  label: 'Monolito',
  description:
    'Um único processo de aplicação concentra toda a lógica de negócio, atrás de um banco relacional. Simples de operar e implantar, mas escala e falha como uma unidade só.',
  nodes: [
    { localId: 'client', kind: 'client', variant: 'web', column: 0, row: 0 },
    { localId: 'app', kind: 'component', componentType: 'app_server', replicas: 2, column: 1, row: 0 },
    { localId: 'db', kind: 'component', componentType: 'sql_primary', replicas: 1, column: 2, row: 0 },
  ],
  edges: [
    { from: 'client', to: 'app', kind: 'read' },
    { from: 'app', to: 'db', kind: 'write' },
  ],
};

/** 3 Camadas: borda (Load Balancer) → aplicação (App Server) → dado (SQL Primary + Replica). */
const THREE_TIER: ArchitectureTemplate = {
  id: 'three-tier',
  label: '3 Camadas',
  description:
    'Camada de borda (Load Balancer) distribui tráfego pra réplicas da camada de aplicação (App Server), que lê/escreve na camada de dado — SQL Primary pra escrita, SQL Replica pra leitura, separando as duas cargas.',
  nodes: [
    { localId: 'client', kind: 'client', variant: 'web', column: 0, row: 0 },
    { localId: 'lb', kind: 'component', componentType: 'load_balancer', replicas: 2, column: 1, row: 0 },
    { localId: 'app', kind: 'component', componentType: 'app_server', replicas: 4, column: 2, row: 0 },
    { localId: 'db-primary', kind: 'component', componentType: 'sql_primary', replicas: 1, column: 3, row: 0 },
    { localId: 'db-replica', kind: 'component', componentType: 'sql_replica', replicas: 2, column: 4, row: 0 },
  ],
  edges: [
    { from: 'client', to: 'lb', kind: 'read' },
    { from: 'lb', to: 'app', kind: 'read' },
    { from: 'app', to: 'db-primary', kind: 'write' },
    { from: 'app', to: 'db-replica', kind: 'read' },
    { from: 'db-primary', to: 'db-replica', kind: 'replication' },
  ],
};

/** Microsserviços: um serviço por domínio, cada um com seu próprio banco, mais fila entre eles. */
const MICROSERVICES: ArchitectureTemplate = {
  id: 'microservices',
  label: 'Microsserviços',
  description:
    'Cada serviço de domínio (Usuários, Pedidos) tem sua própria instância de App Server e seu próprio banco — nunca compartilham dado diretamente. A comunicação assíncrona entre eles passa por uma fila, não por chamada direta.',
  nodes: [
    { localId: 'client', kind: 'client', variant: 'web', column: 0, row: 1 },
    { localId: 'gateway', kind: 'component', componentType: 'api_gateway', replicas: 2, column: 1, row: 1 },
    { localId: 'users-svc', kind: 'component', componentType: 'app_server', replicas: 2, column: 2, row: 0 },
    { localId: 'users-db', kind: 'component', componentType: 'nosql_kv', replicas: 2, column: 3, row: 0 },
    { localId: 'orders-svc', kind: 'component', componentType: 'app_server', replicas: 2, column: 2, row: 2 },
    { localId: 'orders-db', kind: 'component', componentType: 'sql_primary', replicas: 1, column: 3, row: 2 },
    { localId: 'queue', kind: 'component', componentType: 'queue', replicas: 1, column: 3, row: 1 },
    { localId: 'worker', kind: 'component', componentType: 'worker', replicas: 2, column: 4, row: 1 },
  ],
  edges: [
    { from: 'client', to: 'gateway', kind: 'read' },
    { from: 'gateway', to: 'users-svc', kind: 'read' },
    { from: 'gateway', to: 'orders-svc', kind: 'read' },
    { from: 'users-svc', to: 'users-db', kind: 'read' },
    { from: 'orders-svc', to: 'orders-db', kind: 'write' },
    { from: 'orders-svc', to: 'queue', kind: 'async' },
    { from: 'queue', to: 'worker', kind: 'async' },
    { from: 'worker', to: 'users-db', kind: 'write' },
  ],
};

/** Orientado a Eventos: produtor publica no stream, múltiplos consumidores reagem independentemente. */
const EVENT_DRIVEN: ArchitectureTemplate = {
  id: 'event-driven',
  label: 'Orientado a Eventos',
  description:
    'O App Server publica eventos no Kafka em vez de chamar outros serviços diretamente — cada Worker consumidor reage de forma independente, com seu próprio banco. Desacopla produtor de consumidor: um novo consumidor pode ser adicionado sem o produtor saber.',
  nodes: [
    { localId: 'client', kind: 'client', variant: 'web', column: 0, row: 1 },
    { localId: 'gateway', kind: 'component', componentType: 'api_gateway', replicas: 2, column: 1, row: 1 },
    { localId: 'producer', kind: 'component', componentType: 'app_server', replicas: 3, column: 2, row: 1 },
    { localId: 'kafka', kind: 'component', componentType: 'kafka', replicas: 1, column: 3, row: 1 },
    { localId: 'worker-a', kind: 'component', componentType: 'worker', replicas: 2, column: 4, row: 0 },
    { localId: 'worker-b', kind: 'component', componentType: 'worker', replicas: 2, column: 4, row: 2 },
    { localId: 'db-a', kind: 'component', componentType: 'sql_primary', replicas: 1, column: 5, row: 0 },
    { localId: 'db-b', kind: 'component', componentType: 'nosql_kv', replicas: 2, column: 5, row: 2 },
  ],
  edges: [
    { from: 'client', to: 'gateway', kind: 'read' },
    { from: 'gateway', to: 'producer', kind: 'read' },
    { from: 'producer', to: 'kafka', kind: 'async' },
    { from: 'kafka', to: 'worker-a', kind: 'async' },
    { from: 'kafka', to: 'worker-b', kind: 'async' },
    { from: 'worker-a', to: 'db-a', kind: 'write' },
    { from: 'worker-b', to: 'db-b', kind: 'write' },
  ],
};

export const ARCHITECTURE_TEMPLATES: readonly ArchitectureTemplate[] = [MONOLITH, THREE_TIER, MICROSERVICES, EVENT_DRIVEN];

function nodeData(def: TemplateNodeDef): FlowNodeData {
  return def.kind === 'client' ? { kind: 'client', variant: def.variant } : { kind: 'component', componentType: def.componentType, replicas: def.replicas };
}

/**
 * Instancia um template com ids reais (`crypto.randomUUID()`, nunca os `localId` do template —
 * evita colisão entre duas aplicações do mesmo template na mesma sessão) e posição derivada de
 * `column`/`row`. Pura o bastante pra testar sem tocar o browser, exceto por `crypto.randomUUID`
 * (Web Crypto API, disponível em todo ambiente de teste/browser deste projeto).
 */
export function instantiateTemplate(template: ArchitectureTemplate): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const idByLocalId = new Map(template.nodes.map((def) => [def.localId, crypto.randomUUID()]));

  const nodes: CanvasNode[] = template.nodes.map((def) => {
    const data = nodeData(def);
    return {
      id: idByLocalId.get(def.localId)!,
      type: data.kind,
      position: { x: def.column * COLUMN_WIDTH, y: def.row * ROW_HEIGHT },
      data,
    };
  });

  const edges: CanvasEdge[] = template.edges.map((def) => ({
    id: crypto.randomUUID(),
    source: idByLocalId.get(def.from)!,
    target: idByLocalId.get(def.to)!,
    type: 'typed',
    data: { kind: def.kind },
  }));

  return { nodes, edges };
}
