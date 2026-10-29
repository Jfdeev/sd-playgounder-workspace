/**
 * Problema: Sistema de notificações — packages/problems/src/catalog/notifications.ts
 *
 * M4.2, nível básico. Padrão (foundational-doc §2.2): fan-out, fila, retry, idempotência. Conteúdo
 * aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §3. O "aha": com poucos
 * Workers (200 rps cada) eles saturam com o pico de ~2.778 rps; sem a consulta de idempotência, falha
 * `idempotency-check`.
 */

import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { connects, latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 200;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'Aceitar o pedido responde em até 200ms (p99)'),
  NO_SATURATED_NODE,
  usesComponent('uses-queue', 'Usa uma fila entre aceitar e enviar', 'queue'),
  usesComponent('uses-notifications', 'Usa o componente de Notificações para o envio', 'notifications'),
  connects('idempotency-check', 'Idempotência: o Worker consulta um NoSQL ou Cache antes de enviar', ['worker'], ['nosql_kv', 'cache']),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-not-send-directly',
    prompt: 'Por que não enviar direto da API?',
    body:
      'Se o provedor de push demora ou cai, a API trava junto e os pedidos se perdem. Com uma fila no ' +
      'meio, a API só aceita e responde; Workers enviam no ritmo possível e tentam de novo quando falha.',
  },
  {
    id: 'retry-duplicates',
    prompt: 'Retry não manda em dobro?',
    body:
      'Manda, se nada impedir: o Worker pode cair depois de enviar e antes de confirmar. Por isso cada ' +
      'notificação tem uma chave de idempotência, e o Worker confere num NoSQL se aquela chave já foi ' +
      'enviada antes de mandar.',
  },
  {
    id: 'robustness',
    prompt: 'E se o provedor de push ficar fora do ar?',
    body:
      'Lidar com o provedor fora do ar sem perder pedido é exatamente o que Richards & Ford chamam de ' +
      'robustez: continuar funcionando de forma aceitável sob condições adversas. A fila guarda os ' +
      'pedidos até o provedor voltar.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    libraryEntryId: 'robustness',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'api-gateway-1', type: 'api_gateway', replicas: 2 },
      { id: 'app-server-1', type: 'app_server', replicas: 8 },
      { id: 'queue-1', type: 'queue', replicas: 2 },
      { id: 'worker-1', type: 'worker', replicas: 18 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 2 },
      { id: 'notifications-1', type: 'notifications', replicas: 9 },
    ],
    edges: [
      { id: 'e1', from: 'api-gateway-1', to: 'app-server-1', kind: 'write', weight: 1 },
      { id: 'e2', from: 'app-server-1', to: 'queue-1', kind: 'async', weight: 1 },
      { id: 'e3', from: 'queue-1', to: 'worker-1', kind: 'async', weight: 1 },
      { id: 'e4', from: 'worker-1', to: 'nosql-1', kind: 'read', weight: 1 },
      { id: 'e5', from: 'worker-1', to: 'notifications-1', kind: 'write', weight: 1 },
    ],
    entryNodeIds: ['api-gateway-1'],
  },
  reasoning:
    'A API aceita e enfileira — a latência medida é só essa parte. O pico de ~2.778 rps chega inteiro ' +
    'nos Workers (200 rps cada), daí 18 réplicas. O Worker confere a chave no NoSQL antes de chamar o ' +
    'provedor; o componente de Notificações (400 rps cada) faz a entrega.',
};

export const NOTIFICATIONS: Problem = {
  id: 'notifications',
  title: 'Sistema de notificações',
  level: 'basic',
  concepts: ['fan-out', 'queues', 'idempotency'],

  statement:
    'Vários times da empresa precisam mandar notificações push aos usuários (pedido saiu, promoção, ' +
    'lembrete). Projete um serviço único de envio.',

  functionalRequirements: [
    'Qualquer serviço interno pede o envio de uma notificação para um usuário.',
    'A notificação é entregue por push; se o provedor falhar, o envio é tentado de novo.',
    'O usuário nunca recebe a mesma notificação duas vezes.',
  ],

  nonFunctionalRequirements: [
    'Aceitar o pedido responde em até 200ms no p99 — o envio em si pode levar segundos.',
    'Nenhum pedido aceito é perdido, mesmo se o provedor de push ficar fora por minutos.',
    'Disponibilidade de 99,9% para aceitar pedidos.',
  ],

  scale: {
    dau: 20_000_000,
    requestsPerUserPerDay: 3,
    readWriteRatio: 0.1,
    avgPayloadBytes: 1_000,
    peakMultiplier: 4,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
