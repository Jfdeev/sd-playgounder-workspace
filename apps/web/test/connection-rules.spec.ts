import { describe, expect, it } from 'vitest';
import type { ComponentType } from '@sdp/engine';
import { connectableKindOf, getAllowedTargets, isValidCanvasConnection, type ConnectableKind } from '../src/lib/connection-rules';
import type { FlowNodeData } from '../src/lib/canvas-types';

const ALL_COMPONENT_TYPES: readonly ComponentType[] = [
  'load_balancer',
  'api_gateway',
  'app_server',
  'worker',
  'cache',
  'sql_primary',
  'sql_replica',
  'nosql_kv',
  'queue',
  'object_storage',
  'cdn',
];
const ALL_KINDS: readonly ConnectableKind[] = ['client', ...ALL_COMPONENT_TYPES];

describe('connectableKindOf', () => {
  it('retorna "client" pra um nó Cliente, ignorando a variante', () => {
    const data: FlowNodeData = { kind: 'client', variant: 'mobile' };
    expect(connectableKindOf(data)).toBe('client');
  });

  it('retorna o componentType pra um nó de componente', () => {
    const data: FlowNodeData = { kind: 'component', componentType: 'cache', replicas: 1 };
    expect(connectableKindOf(data)).toBe('cache');
  });
});

describe('isValidCanvasConnection', () => {
  it('nenhum tipo pode se conectar a "client" — Cliente nunca é destino (FR-006, sem handle de entrada)', () => {
    for (const source of ALL_KINDS) {
      expect(isValidCanvasConnection(source, 'client')).toBe(false);
    }
  });

  it('Load Balancer só conecta a App Server e Worker — nunca a banco, cache ou fila', () => {
    expect(isValidCanvasConnection('load_balancer', 'app_server')).toBe(true);
    expect(isValidCanvasConnection('load_balancer', 'worker')).toBe(true);
    expect(isValidCanvasConnection('load_balancer', 'sql_primary')).toBe(false);
    expect(isValidCanvasConnection('load_balancer', 'cache')).toBe(false);
    expect(isValidCanvasConnection('load_balancer', 'queue')).toBe(false);
    expect(isValidCanvasConnection('load_balancer', 'api_gateway')).toBe(false);
  });

  it('Cliente conecta só nos componentes de borda (LB, API Gateway, CDN, App Server) — nunca direto em dado/cache/fila', () => {
    expect(isValidCanvasConnection('client', 'load_balancer')).toBe(true);
    expect(isValidCanvasConnection('client', 'api_gateway')).toBe(true);
    expect(isValidCanvasConnection('client', 'cdn')).toBe(true);
    expect(isValidCanvasConnection('client', 'app_server')).toBe(true);
    expect(isValidCanvasConnection('client', 'sql_primary')).toBe(false);
    expect(isValidCanvasConnection('client', 'cache')).toBe(false);
    expect(isValidCanvasConnection('client', 'queue')).toBe(false);
    expect(isValidCanvasConnection('client', 'worker')).toBe(false);
  });

  it('Cache só conecta a um backing store (SQL Primary/Replica, NoSQL) — modela o caminho de miss', () => {
    expect(isValidCanvasConnection('cache', 'sql_primary')).toBe(true);
    expect(isValidCanvasConnection('cache', 'sql_replica')).toBe(true);
    expect(isValidCanvasConnection('cache', 'nosql_kv')).toBe(true);
    expect(isValidCanvasConnection('cache', 'queue')).toBe(false);
    expect(isValidCanvasConnection('cache', 'object_storage')).toBe(false);
  });

  it('SQL Primary só replica pra SQL Replica — nunca o inverso', () => {
    expect(isValidCanvasConnection('sql_primary', 'sql_replica')).toBe(true);
    expect(isValidCanvasConnection('sql_replica', 'sql_primary')).toBe(false);
  });

  it('Fila só entrega pra Worker — a aresta assíncrona clássica (FR-012)', () => {
    expect(isValidCanvasConnection('queue', 'worker')).toBe(true);
    expect(isValidCanvasConnection('queue', 'app_server')).toBe(false);
  });

  it('SQL Replica, NoSQL e Object Storage são sempre folha — nenhuma aresta de saída válida', () => {
    for (const target of ALL_COMPONENT_TYPES) {
      expect(isValidCanvasConnection('sql_replica', target)).toBe(false);
      expect(isValidCanvasConnection('nosql_kv', target)).toBe(false);
      expect(isValidCanvasConnection('object_storage', target)).toBe(false);
    }
  });

  it('CDN busca na origem só no miss — Object Storage (estático) ou App Server (dinâmico)', () => {
    expect(isValidCanvasConnection('cdn', 'object_storage')).toBe(true);
    expect(isValidCanvasConnection('cdn', 'app_server')).toBe(true);
    expect(isValidCanvasConnection('cdn', 'cache')).toBe(false);
  });
});

describe('getAllowedTargets — completude da matriz', () => {
  it('todo ComponentType tem uma entrada na matriz (mesmo que vazia, para os tipos-folha)', () => {
    for (const kind of ALL_KINDS) {
      expect(() => getAllowedTargets(kind)).not.toThrow();
      expect(Array.isArray(getAllowedTargets(kind))).toBe(true);
    }
  });

  it('todo ComponentType é alcançável por pelo menos uma origem — nenhum tipo fica sem uso possível no canvas', () => {
    for (const target of ALL_COMPONENT_TYPES) {
      const hasSomeSource = ALL_KINDS.some((source) => isValidCanvasConnection(source, target));
      expect(hasSomeSource).toBe(true);
    }
  });

  it('todo tipo, exceto os leaf, consegue originar pelo menos uma conexão válida', () => {
    const leafTypes: ConnectableKind[] = ['sql_replica', 'nosql_kv', 'object_storage'];
    for (const source of ALL_KINDS) {
      if (leafTypes.includes(source)) continue;
      expect(getAllowedTargets(source).length).toBeGreaterThan(0);
    }
  });
});
