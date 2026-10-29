/**
 * Problema: Leaderboard — packages/problems/src/catalog/leaderboard.ts
 *
 * M4.2, nível básico. Padrão (foundational-doc §2.2): sorted set, hot key, aproximação. Conteúdo
 * aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §2. O "aha": 1 Worker (200
 * rps) satura com a escrita de ~694 rps; sem fila, falha `async-score-write`.
 */

import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 150;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'O ranking responde em até 150ms (p99)'),
  NO_SATURATED_NODE,
  usesComponent('uses-cache', 'Usa uma camada de cache (o ranking mora num sorted set em memória)', 'cache'),
  usesComponent('async-score-write', 'Registro de pontuação assíncrono: usa uma fila', 'queue'),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'where-ranking-lives',
    prompt: 'Onde mora o ranking?',
    body:
      'Recalcular "ordenar todos os jogadores" a cada leitura num banco é caro. Um sorted set em memória ' +
      '(Redis `ZADD`/`ZRANK`) mantém a ordem a cada escrita e responde o top N e a posição em tempo ' +
      'logarítmico. No canvas, isso é o Cache.',
  },
  {
    id: 'why-queue',
    prompt: 'Por que a pontuação passa por uma fila?',
    body:
      'O fim de partida pode chegar em rajada (fim de evento, todos terminam juntos). A fila absorve o ' +
      'pico e os Workers gravam no banco no ritmo deles; o jogador não espera a gravação.',
  },
  {
    id: 'hot-key',
    prompt: 'O que é uma hot key?',
    body:
      'O top 100 é lido por todo mundo: é a mesma chave quente. Ele cabe num Cache com taxa de acerto ' +
      'altíssima; o que não pode é cada leitura do top 100 ir até o banco.',
  },
  {
    id: 'cache-down',
    prompt: 'E se o Cache cair?',
    body:
      'O ranking em memória é reconstruído a partir do NoSQL — por isso a pontuação é gravada num banco ' +
      'durável, e não só no Cache. Richards & Ford chamam isso de recuperabilidade: quão rápido o ' +
      'sistema volta a operar depois de uma falha grave.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    libraryEntryId: 'recoverability',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'load-balancer-1', type: 'load_balancer', replicas: 2 },
      { id: 'app-server-1', type: 'app_server', replicas: 18 },
      { id: 'cache-1', type: 'cache', replicas: 2, cacheHitRate: 0.95 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 2 },
      { id: 'queue-1', type: 'queue', replicas: 2 },
      { id: 'worker-1', type: 'worker', replicas: 5 },
    ],
    edges: [
      { id: 'e1', from: 'load-balancer-1', to: 'app-server-1', kind: 'read', weight: 1 },
      { id: 'e2', from: 'app-server-1', to: 'cache-1', kind: 'read', weight: 9 },
      { id: 'e3', from: 'app-server-1', to: 'queue-1', kind: 'async', weight: 1 },
      { id: 'e4', from: 'queue-1', to: 'worker-1', kind: 'async', weight: 1 },
      { id: 'e5', from: 'worker-1', to: 'nosql-1', kind: 'write', weight: 1 },
      { id: 'e6', from: 'cache-1', to: 'nosql-1', kind: 'read', weight: 1 },
    ],
    entryNodeIds: ['load-balancer-1'],
  },
  reasoning:
    '90% do tráfego é leitura do ranking, servida pelo Cache. A pontuação entra pela fila e os Workers ' +
    'gravam no NoSQL (durável), que também reabastece o Cache no miss. 18 réplicas de App Server dão ' +
    '9.000 rps para ~6.944 de pico.',
};

export const LEADERBOARD: Problem = {
  id: 'leaderboard',
  title: 'Leaderboard',
  level: 'basic',

  statement:
    'Um jogo mobile quer mostrar o ranking global e a posição de cada jogador, atualizado a cada ' +
    'partida. Projete o sistema.',

  functionalRequirements: [
    'Ao fim de cada partida, a pontuação do jogador é registrada.',
    'Qualquer jogador vê o top 100 global e a própria posição.',
    'O ranking reflete uma partida nova em poucos segundos.',
  ],

  nonFunctionalRequirements: [
    'Ler o ranking responde em até 150ms no p99.',
    'Disponibilidade de 99,9%.',
    'Atraso de alguns segundos entre a partida e o ranking é aceitável; perder a pontuação, não.',
  ],

  scale: {
    dau: 5_000_000,
    requestsPerUserPerDay: 40,
    readWriteRatio: 0.9,
    avgPayloadBytes: 200,
    peakMultiplier: 3,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
