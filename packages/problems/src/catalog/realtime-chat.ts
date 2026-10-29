/**
 * Problema: Chat em tempo real — packages/problems/src/catalog/realtime-chat.ts
 *
 * M4.2, nível intermediário. Padrão (foundational-doc §2.2): WebSocket, presença, ordenação de
 * mensagens. Conteúdo aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §4. O
 * engine não modela conexão persistente: o App Server faz o papel do servidor de conexões. O "aha":
 * App Server com 1 réplica satura; sem Pub/Sub, falha `uses-pubsub`.
 */

import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 150;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'A mensagem é entregue em até 150ms (p99)'),
  NO_SATURATED_NODE,
  usesComponent('uses-pubsub', 'Entrega para quem está conectado via Pub/Sub', 'pubsub'),
  usesComponent('message-history', 'Histórico de mensagens num NoSQL', 'nosql_kv'),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'websocket-on-canvas',
    prompt: 'Como representar WebSocket no canvas?',
    body:
      'O engine não modela conexões persistentes. O App Server aqui faz o papel do servidor de conexões ' +
      '(gateway WebSocket): cada réplica segura parte dos usuários conectados. O que importa é quantas ' +
      'mensagens por segundo ele processa.',
  },
  {
    id: 'cross-replica-delivery',
    prompt: 'Como a mensagem chega a quem está em outra réplica?',
    body:
      'O remetente está ligado na réplica A, o destinatário na B. Um Pub/Sub entrega a mensagem a todas ' +
      'as réplicas que têm alguém daquela conversa — é o mesmo desenho do gateway do Discord (ver ' +
      'Arquiteturas → Discord).',
  },
  {
    id: 'where-presence-lives',
    prompt: 'Onde mora a presença?',
    body:
      '"Online" é estado efêmero: muda o tempo todo e não precisa de durabilidade. Fica num Cache com ' +
      'expiração curta; o histórico de mensagens, que não pode se perder, fica num NoSQL ordenado por ' +
      'conversa e horário.',
  },
  {
    id: 'replica-down',
    prompt: 'E se uma réplica de conexões cair?',
    body:
      'O app reconecta em outra réplica e busca o que perdeu no histórico do NoSQL — o chat segue ' +
      'funcionando sob falha. Richards & Ford chamam isso de robustez.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    libraryEntryId: 'robustness',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'load-balancer-1', type: 'load_balancer', replicas: 2 },
      { id: 'app-server-1', type: 'app_server', replicas: 18 },
      { id: 'cache-1', type: 'cache', replicas: 2 },
      { id: 'pubsub-1', type: 'pubsub', replicas: 2 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 2 },
    ],
    edges: [
      { id: 'e1', from: 'load-balancer-1', to: 'app-server-1', kind: 'read', weight: 1 },
      { id: 'e2', from: 'app-server-1', to: 'cache-1', kind: 'read', weight: 1 },
      { id: 'e3', from: 'app-server-1', to: 'pubsub-1', kind: 'write', weight: 1 },
      { id: 'e4', from: 'app-server-1', to: 'nosql-1', kind: 'write', weight: 1 },
    ],
    entryNodeIds: ['load-balancer-1'],
  },
  reasoning:
    'O gargalo é o servidor de conexões: ~6.944 rps em 18 réplicas (9.000). Presença no Cache ' +
    '(efêmera), entrega pelo Pub/Sub (fan-out entre réplicas), histórico no NoSQL (durável e ordenado ' +
    'por conversa).',
};

export const REALTIME_CHAT: Problem = {
  id: 'realtime-chat',
  title: 'Chat em tempo real',
  level: 'intermediate',

  statement:
    'Projete um chat de conversas 1:1 e em grupo, com mensagens chegando na hora e o indicador de ' +
    '"online".',

  functionalRequirements: [
    'Mensagem enviada chega aos participantes conectados em menos de 1 segundo.',
    'Quem estava offline recebe as mensagens ao reconectar, na ordem em que foram enviadas.',
    'Cada usuário vê quem está online nas suas conversas.',
  ],

  nonFunctionalRequirements: [
    'Entregar uma mensagem responde em até 150ms no p99 (sem contar a rede do celular).',
    'Mensagem enviada nunca se perde.',
    'Presença pode estar alguns segundos atrasada.',
  ],

  scale: {
    dau: 5_000_000,
    requestsPerUserPerDay: 40,
    readWriteRatio: 0.5,
    avgPayloadBytes: 500,
    peakMultiplier: 3,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
