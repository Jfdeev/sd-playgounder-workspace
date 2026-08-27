import { describe, expect, it } from 'vitest';
import type { ComponentType } from '@sdp/engine';
import { connectableKindOf, getAllowedTargets, isValidCanvasConnection, type ConnectableKind } from '../src/lib/connection-rules';
import type { FlowNodeData } from '../src/lib/canvas-types';

const ALL_COMPONENT_TYPES: readonly ComponentType[] = [
  // 11 originais (M0/M1)
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
  // 23 novos "limpos" — M1.5 US2
  'dns',
  'waf',
  'ingress',
  'rate_limiter',
  'serverless',
  'auth_service',
  'search',
  'scheduler',
  'notifications',
  'analytics',
  'data_warehouse',
  'vector_db',
  'pubsub',
  'event_stream',
  'kafka',
  'llm_gateway',
  'orchestrator',
  'tool_registry',
  'memory_fabric',
  'safety_mesh',
  'third_party_api',
  'payment',
  'email',
  // 10 de Observability/Network — M1.5 US3
  'metrics',
  'logs',
  'tracing',
  'alerting',
  'health_check',
  'vpc',
  'subnet',
  'nat_gateway',
  'vpn',
  'service_mesh',
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

// M1.5 US2 — 1 caso permitido + 1 proibido por componente novo (tasks.md, coverage pass T013).
describe('isValidCanvasConnection — componentes novos (M1.5 US2)', () => {
  it('Traffic & Edge novos (DNS/WAF/Ingress/Rate Limiter) encadeiam entre si e terminam na borda que processa requisição', () => {
    expect(isValidCanvasConnection('dns', 'waf')).toBe(true);
    expect(isValidCanvasConnection('dns', 'load_balancer')).toBe(true);
    expect(isValidCanvasConnection('dns', 'sql_primary')).toBe(false);
    expect(isValidCanvasConnection('waf', 'app_server')).toBe(true);
    expect(isValidCanvasConnection('waf', 'cache')).toBe(false);
    expect(isValidCanvasConnection('ingress', 'api_gateway')).toBe(true);
    expect(isValidCanvasConnection('ingress', 'queue')).toBe(false);
    expect(isValidCanvasConnection('rate_limiter', 'app_server')).toBe(true);
    expect(isValidCanvasConnection('rate_limiter', 'worker')).toBe(false);
  });

  it('Cliente e a borda alcançam os 6 componentes de "cômputo especializado" — variações de App Server no grafo', () => {
    expect(isValidCanvasConnection('load_balancer', 'serverless')).toBe(true);
    expect(isValidCanvasConnection('load_balancer', 'sql_primary')).toBe(false);
    expect(isValidCanvasConnection('api_gateway', 'auth_service')).toBe(true);
    expect(isValidCanvasConnection('client', 'search')).toBe(false); // client não alcança direto — só via borda
  });

  it('Cômputo especializado tem o mesmo leque de destino de App Server, + os sinks novos, nunca LLM Gateway', () => {
    for (const source of ['serverless', 'auth_service', 'search', 'scheduler', 'notifications', 'analytics'] as const) {
      expect(isValidCanvasConnection(source, 'sql_primary')).toBe(true);
      expect(isValidCanvasConnection(source, 'kafka')).toBe(true);
      expect(isValidCanvasConnection(source, 'email')).toBe(true);
      expect(isValidCanvasConnection(source, 'llm_gateway')).toBe(false);
    }
  });

  it('Data Warehouse e Vector DB são sempre folha; Cache agora também alcança Vector DB (miss path de embeddings)', () => {
    expect(isValidCanvasConnection('app_server', 'data_warehouse')).toBe(true);
    expect(isValidCanvasConnection('data_warehouse', 'sql_primary')).toBe(false);
    expect(isValidCanvasConnection('cache', 'vector_db')).toBe(true);
    expect(isValidCanvasConnection('vector_db', 'cache')).toBe(false);
  });

  it('Pub/Sub, Event Stream e Kafka só entregam pra Worker — mesma regra de Fila → Worker', () => {
    expect(isValidCanvasConnection('pubsub', 'worker')).toBe(true);
    expect(isValidCanvasConnection('pubsub', 'app_server')).toBe(false);
    expect(isValidCanvasConnection('event_stream', 'worker')).toBe(true);
    expect(isValidCanvasConnection('kafka', 'worker')).toBe(true);
    expect(isValidCanvasConnection('kafka', 'search')).toBe(false);
  });

  it('Pipeline de IA: App Server/API Gateway → LLM Gateway → Orchestrator → {Tool Registry, Memory Fabric}; Safety Mesh é hop inserível', () => {
    expect(isValidCanvasConnection('app_server', 'llm_gateway')).toBe(true);
    expect(isValidCanvasConnection('worker', 'llm_gateway')).toBe(false);
    expect(isValidCanvasConnection('llm_gateway', 'orchestrator')).toBe(true);
    expect(isValidCanvasConnection('orchestrator', 'tool_registry')).toBe(true);
    expect(isValidCanvasConnection('orchestrator', 'memory_fabric')).toBe(true);
    expect(isValidCanvasConnection('tool_registry', 'memory_fabric')).toBe(false);
    expect(isValidCanvasConnection('safety_mesh', 'llm_gateway')).toBe(true);
    expect(isValidCanvasConnection('llm_gateway', 'safety_mesh')).toBe(true);
  });

  it('External (3rd Party API, Payment, Email) só alcançados a partir de cômputo/pipeline de IA — sempre folha', () => {
    expect(isValidCanvasConnection('app_server', 'payment')).toBe(true);
    expect(isValidCanvasConnection('worker', 'third_party_api')).toBe(true);
    expect(isValidCanvasConnection('notifications', 'email')).toBe(true);
    expect(isValidCanvasConnection('orchestrator', 'payment')).toBe(false); // pipeline de IA não chama External direto, só app_server/worker
    expect(isValidCanvasConnection('email', 'app_server')).toBe(false);
  });
});

// M1.5 US3 — 1 caso permitido + 1 proibido por componente novo (tasks.md, coverage pass T023).
describe('isValidCanvasConnection — componentes novos (M1.5 US3, Observability/Network)', () => {
  it('Observability é alcançável a partir de qualquer componente de cômputo, mas nunca origina conexão', () => {
    expect(isValidCanvasConnection('app_server', 'metrics')).toBe(true);
    expect(isValidCanvasConnection('worker', 'logs')).toBe(true);
    expect(isValidCanvasConnection('serverless', 'tracing')).toBe(true);
    expect(isValidCanvasConnection('analytics', 'alerting')).toBe(true);
    expect(isValidCanvasConnection('auth_service', 'health_check')).toBe(true);
    expect(isValidCanvasConnection('metrics', 'app_server')).toBe(false);
    expect(isValidCanvasConnection('sql_primary', 'metrics')).toBe(false); // banco não é "cômputo"
  });

  it('Network é um hop de altíssima capacidade entre Cliente e a borda original — nunca alcança dado/fila/cache', () => {
    expect(isValidCanvasConnection('client', 'vpc')).toBe(true);
    expect(isValidCanvasConnection('vpc', 'load_balancer')).toBe(true);
    expect(isValidCanvasConnection('vpc', 'sql_primary')).toBe(false);
    expect(isValidCanvasConnection('client', 'subnet')).toBe(true);
    expect(isValidCanvasConnection('subnet', 'api_gateway')).toBe(true);
    expect(isValidCanvasConnection('client', 'nat_gateway')).toBe(true);
    expect(isValidCanvasConnection('nat_gateway', 'cdn')).toBe(true);
    expect(isValidCanvasConnection('client', 'vpn')).toBe(true);
    expect(isValidCanvasConnection('vpn', 'app_server')).toBe(true);
    expect(isValidCanvasConnection('client', 'service_mesh')).toBe(true);
    expect(isValidCanvasConnection('service_mesh', 'queue')).toBe(false);
  });
});

// Coverage pass (tasks.md T013): os testes acima só verificam pares pontuais — não bastam pra
// quebrar se um elemento for removido/trocado de um array que tem 6-15 entradas (ex.: tirar
// `vector_db` de `worker` silenciosamente não derrubaria nenhum teste acima). Estes testes
// comparam a lista COMPLETA de cada chave nova/editada de `ALLOWED_TARGETS` (T008) contra o
// conjunto esperado — qualquer mutação (remoção, adição indevida, troca) quebra aqui.
describe('getAllowedTargets — conteúdo completo das chaves novas/editadas (M1.5 US2/US3, coverage pass T013/T023)', () => {
  const sorted = (kind: ConnectableKind) => [...getAllowedTargets(kind)].sort();

  it('client: 4 originais + 4 de borda (US2) + 5 de Network (US3)', () => {
    expect(sorted('client')).toEqual(
      [
        'api_gateway', 'app_server', 'cdn', 'load_balancer', // originais
        'dns', 'ingress', 'rate_limiter', 'waf', // US2
        'nat_gateway', 'service_mesh', 'subnet', 'vpc', 'vpn', // US3
      ].sort(),
    );
  });

  it('load_balancer: app_server/worker + os 6 de cômputo especializado', () => {
    expect(sorted('load_balancer')).toEqual(
      ['analytics', 'app_server', 'auth_service', 'notifications', 'scheduler', 'search', 'serverless', 'worker'].sort(),
    );
  });

  it('api_gateway: mesma expansão de load_balancer + llm_gateway', () => {
    expect(sorted('api_gateway')).toEqual(
      ['analytics', 'app_server', 'auth_service', 'llm_gateway', 'notifications', 'scheduler', 'search', 'serverless', 'worker'].sort(),
    );
  });

  it('app_server: 6 originais + 5 sinks + llm_gateway + 3 External (US2) + 5 Observability (US3)', () => {
    expect(sorted('app_server')).toEqual(
      [
        'cache', 'sql_primary', 'sql_replica', 'nosql_kv', 'queue', 'object_storage',
        'data_warehouse', 'vector_db', 'pubsub', 'event_stream', 'kafka',
        'llm_gateway', 'third_party_api', 'payment', 'email',
        'metrics', 'logs', 'tracing', 'alerting', 'health_check',
      ].sort(),
    );
  });

  it('worker: 5 originais + 5 sinks + 3 External (US2, sem llm_gateway) + 5 Observability (US3)', () => {
    expect(sorted('worker')).toEqual(
      [
        'sql_primary', 'nosql_kv', 'cache', 'object_storage', 'queue',
        'data_warehouse', 'vector_db', 'pubsub', 'event_stream', 'kafka',
        'third_party_api', 'payment', 'email',
        'metrics', 'logs', 'tracing', 'alerting', 'health_check',
      ].sort(),
    );
    expect(getAllowedTargets('worker')).not.toContain('llm_gateway');
  });

  it('cache: 3 originais + vector_db', () => {
    expect(sorted('cache')).toEqual(['nosql_kv', 'sql_primary', 'sql_replica', 'vector_db'].sort());
  });

  it('os 4 componentes de borda novos (dns/waf/ingress/rate_limiter) encadeiam entre si + terminam em load_balancer/api_gateway/app_server', () => {
    const expected = ['api_gateway', 'app_server', 'load_balancer'];
    for (const source of ['dns', 'waf', 'ingress', 'rate_limiter'] as const) {
      const targets = sorted(source);
      const otherBorda = ['dns', 'waf', 'ingress', 'rate_limiter'].filter((k) => k !== source);
      expect(targets).toEqual([...expected, ...otherBorda].sort());
    }
  });

  it('os 6 componentes de cômputo especializado têm exatamente o leque de destino esperado (COMPUTE_TARGETS) — 6 sinks + 3 External (US2) + 5 Observability (US3)', () => {
    const expected = [
      'cache', 'sql_primary', 'sql_replica', 'nosql_kv', 'queue', 'object_storage',
      'data_warehouse', 'vector_db', 'pubsub', 'event_stream', 'kafka',
      'third_party_api', 'payment', 'email',
      'metrics', 'logs', 'tracing', 'alerting', 'health_check',
    ].sort();
    for (const source of ['serverless', 'auth_service', 'search', 'scheduler', 'notifications', 'analytics'] as const) {
      expect(sorted(source)).toEqual(expected);
    }
  });

  it('os 5 componentes de Network têm exatamente o leque original de client (load_balancer/api_gateway/cdn/app_server)', () => {
    const expected = ['api_gateway', 'app_server', 'cdn', 'load_balancer'].sort();
    for (const source of ['vpc', 'subnet', 'nat_gateway', 'vpn', 'service_mesh'] as const) {
      expect(sorted(source)).toEqual(expected);
    }
  });

  it('os 5 componentes de Observability não têm nenhum destino (sempre sink)', () => {
    for (const type of ['metrics', 'logs', 'tracing', 'alerting', 'health_check'] as const) {
      expect(getAllowedTargets(type)).toEqual([]);
    }
  });

  it('data_warehouse e vector_db não têm nenhum destino (folhas novas)', () => {
    expect(getAllowedTargets('data_warehouse')).toEqual([]);
    expect(getAllowedTargets('vector_db')).toEqual([]);
  });

  it('pubsub/event_stream/kafka só entregam pra worker', () => {
    for (const source of ['pubsub', 'event_stream', 'kafka'] as const) {
      expect(getAllowedTargets(source)).toEqual(['worker']);
    }
  });

  it('pipeline de IA: llm_gateway/orchestrator/safety_mesh têm exatamente os destinos esperados; tool_registry/memory_fabric são folha', () => {
    expect(sorted('llm_gateway')).toEqual(['orchestrator', 'safety_mesh'].sort());
    expect(sorted('orchestrator')).toEqual(['memory_fabric', 'safety_mesh', 'tool_registry'].sort());
    expect(sorted('safety_mesh')).toEqual(['llm_gateway', 'memory_fabric', 'orchestrator', 'tool_registry'].sort());
    expect(getAllowedTargets('tool_registry')).toEqual([]);
    expect(getAllowedTargets('memory_fabric')).toEqual([]);
  });

  it('third_party_api/payment/email não têm nenhum destino (folhas novas)', () => {
    for (const type of ['third_party_api', 'payment', 'email'] as const) {
      expect(getAllowedTargets(type)).toEqual([]);
    }
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
    const leafTypes: ConnectableKind[] = [
      'sql_replica',
      'nosql_kv',
      'object_storage',
      // M1.5 US2 — folhas novas.
      'data_warehouse',
      'vector_db',
      'tool_registry',
      'memory_fabric',
      'third_party_api',
      'payment',
      'email',
      // M1.5 US3 — folhas novas (Observability é sempre sink).
      'metrics',
      'logs',
      'tracing',
      'alerting',
      'health_check',
    ];
    for (const source of ALL_KINDS) {
      if (leafTypes.includes(source)) continue;
      expect(getAllowedTargets(source).length).toBeGreaterThan(0);
    }
  });
});
