/**
 * Problema: Rate limiter distribuído — packages/problems/src/catalog/rate-limiter.ts
 *
 * M4.2, nível básico. Padrão (foundational-doc §2.2): token bucket, sliding window, estado
 * compartilhado. Conteúdo aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §1.
 * O "aha": App Server com 1 réplica (500 rps) satura no pico de ~3.472 rps; Rate Limiter sem contador
 * compartilhado falha o critério `shared-counter`.
 */

import { CLEAN_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { connects, latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 100;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'A API responde em até 100ms (p99)'),
  NO_SATURATED_NODE,
  usesComponent('uses-rate-limiter', 'Usa um Rate Limiter na entrada', 'rate_limiter'),
  connects('shared-counter', 'Contador compartilhado: o Rate Limiter consulta um Cache ou NoSQL', ['rate_limiter'], ['cache', 'nosql_kv']),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-shared-counter',
    prompt: 'Por que o contador precisa ficar fora do limitador?',
    body:
      'Com 2 réplicas de Rate Limiter, cada uma com seu próprio contador em memória, um cliente com ' +
      'limite de 100/min consegue 200: metade cai em cada réplica. O contador precisa morar num lugar ' +
      'que todas as réplicas enxergam — um Cache (tipo Redis, com incremento atômico) é o caso clássico.',
  },
  {
    id: 'token-bucket-or-window',
    prompt: 'Token bucket ou janela deslizante?',
    body:
      'Token bucket guarda "fichas" que se recarregam a uma taxa fixa e permite rajadas curtas; janela ' +
      'deslizante conta as requisições dos últimos N segundos e é mais justa nas bordas. As duas cabem ' +
      'num Cache; a diferença é a regra, não a topologia.',
  },
  {
    id: 'why-before-app-server',
    prompt: 'Por que o limitador fica antes do App Server?',
    body:
      'O objetivo é que o excesso nunca chegue a ocupar uma réplica cara de App Server (500 rps cada). ' +
      'Recusar cedo, num componente barato e rápido (12.000 rps por réplica), é o que protege o resto.',
  },
  {
    id: 'responsibility-coupling',
    prompt: 'Por que o limitador é um componente e não um `if` dentro da API?',
    body:
      'Limitar tráfego e atender o negócio mudam por motivos e por pessoas diferentes: quem decide o ' +
      'limite de cada cliente não é quem decide a regra de negócio. Clean Architecture (Robert C. Martin) ' +
      'chama isso de responsabilidade única — separados, a mudança de um não quebra o outro.',
    source: CLEAN_ARCHITECTURE,
    libraryEntryId: 'srp',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'rate-limiter-1', type: 'rate_limiter', replicas: 2 },
      { id: 'cache-1', type: 'cache', replicas: 2 },
      { id: 'app-server-1', type: 'app_server', replicas: 10 },
    ],
    edges: [
      { id: 'e1', from: 'rate-limiter-1', to: 'cache-1', kind: 'read', weight: 1 },
      { id: 'e2', from: 'rate-limiter-1', to: 'app-server-1', kind: 'read', weight: 1 },
    ],
    entryNodeIds: ['rate-limiter-1'],
  },
  reasoning:
    'O pico é ~3.472 rps; 10 réplicas de App Server (5.000 rps) escoam com folga. O Rate Limiter fica na ' +
    'frente e guarda o contador num Cache compartilhado, pra que o limite valha para o cliente inteiro e ' +
    'não por réplica. Tudo com 2+ réplicas: o limitador está no caminho de toda requisição, então ele não ' +
    'pode ser um ponto único de falha.',
};

export const RATE_LIMITER: Problem = {
  id: 'rate-limiter',
  title: 'Rate limiter distribuído',
  level: 'basic',

  statement:
    'Uma API pública está sendo derrubada por poucos clientes que mandam requisição demais. Projete um ' +
    'limitador que segure cada cliente no seu limite, não importa em qual servidor a requisição caia.',

  functionalRequirements: [
    'Cada cliente (chave de API) tem um limite de requisições por minuto.',
    'Requisição acima do limite é recusada com um erro claro (HTTP 429) antes de chegar na API.',
    'O limite vale para o cliente como um todo, mesmo com várias réplicas do limitador atendendo.',
  ],

  nonFunctionalRequirements: [
    'O limitador não pode pesar na latência: a API inteira responde em até 100ms no p99.',
    'Disponibilidade de 99,9% — se o limitador cair, a API cai junto.',
    'Contagem aproximada é aceitável (deixar passar uns poucos a mais no limite é tolerável).',
  ],

  scale: {
    dau: 1_000_000,
    requestsPerUserPerDay: 100,
    readWriteRatio: 0.9,
    avgPayloadBytes: 300,
    peakMultiplier: 3,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
