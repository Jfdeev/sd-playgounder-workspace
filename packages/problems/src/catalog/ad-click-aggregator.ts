/**
 * Problema: Agregador de cliques em anúncios — packages/problems/src/catalog/ad-click-aggregator.ts
 *
 * M4.2, nível avançado. Padrão (foundational-doc §2.2): stream processing, janelas, contagem
 * aproximada. Conteúdo aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §9.
 * Quase 100% escrita — `readWriteRatio` 0,01 porque o catálogo exige > 0. O "aha": gravar o clique
 * direto num banco síncrono estoura os 50ms ou satura; Analytics com poucas réplicas satura.
 */

import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 50;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'Registrar o clique responde em até 50ms (p99)'),
  NO_SATURATED_NODE,
  usesComponent('durable-log', 'Ingestão por log durável: usa Kafka ou Event Stream', 'kafka', 'event_stream'),
  usesComponent('stream-processing', 'Processamento em stream: usa Analytics', 'analytics'),
  usesComponent('aggregates-store', 'Agregados por minuto num NoSQL', 'nosql_kv'),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-log-first',
    prompt: 'Por que o clique entra num log e não direto no banco?',
    body:
      'O clique precisa ser aceito rápido e não pode se perder. Um log durável (Kafka) aceita a escrita em ' +
      'milissegundos e guarda tudo; quem processa lê depois, no próprio ritmo.',
  },
  {
    id: 'what-is-window',
    prompt: 'O que é uma janela?',
    body:
      '"Cliques por minuto" é uma janela de tempo: o processador de stream agrupa os eventos de cada minuto ' +
      'e emite um total. Eventos atrasados são o problema clássico — por isso o painel aceita aproximação ' +
      'e a cobrança recalcula dos dados brutos.',
  },
  {
    id: 'two-paths',
    prompt: 'Por que dois caminhos (painel e cobrança)?',
    body:
      'Painel quer rapidez, cobrança quer exatidão. O stream alimenta o painel; os brutos vão para o Data ' +
      'Warehouse, onde um processamento em lote recalcula o valor exato (a "arquitetura lambda").',
  },
  {
    id: 'raw-retention',
    prompt: 'Por quanto tempo guardar os cliques brutos?',
    body:
      'O tempo que a cobrança e a auditoria exigem; depois, eles são arquivados ou apagados conforme a ' +
      'política. Richards & Ford chamam essa característica de arquivabilidade.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    libraryEntryId: 'archivability',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'api-gateway-1', type: 'api_gateway', replicas: 2 },
      { id: 'kafka-1', type: 'kafka', replicas: 2 },
      { id: 'analytics-1', type: 'analytics', replicas: 24 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 2 },
      { id: 'data-warehouse-1', type: 'data_warehouse', replicas: 5 },
    ],
    edges: [
      { id: 'e1', from: 'api-gateway-1', to: 'kafka-1', kind: 'write', weight: 1 },
      { id: 'e2', from: 'kafka-1', to: 'analytics-1', kind: 'async', weight: 9 },
      { id: 'e3', from: 'kafka-1', to: 'data-warehouse-1', kind: 'async', weight: 1 },
      { id: 'e4', from: 'analytics-1', to: 'nosql-1', kind: 'write', weight: 1 },
    ],
    entryNodeIds: ['api-gateway-1'],
  },
  reasoning:
    'O clique é aceito pelo Gateway e gravado no Kafka — o caminho do usuário termina aí, por isso o p99 é ' +
    'baixo. O processamento é assíncrono: Analytics agrega por minuto e grava no NoSQL; os brutos seguem ' +
    'para o Data Warehouse. Analytics é caro por réplica (350 rps), daí as 24 réplicas — o custo deste ' +
    'problema é o maior do catálogo, e de propósito.',
};

export const AD_CLICK_AGGREGATOR: Problem = {
  id: 'ad-click-aggregator',
  title: 'Agregador de cliques em anúncios',
  level: 'advanced',
  concepts: ['stream-processing', 'queues'],

  statement:
    'Anunciantes querem ver, quase em tempo real, quantos cliques cada anúncio recebeu por minuto — e ' +
    'pagar por eles. Projete a coleta e a agregação.',

  functionalRequirements: [
    'Cada clique em um anúncio é registrado.',
    'O anunciante vê cliques por anúncio por minuto, com atraso de até 1 minuto.',
    'Os cliques brutos ficam guardados para cobrança e auditoria.',
  ],

  nonFunctionalRequirements: [
    'Registrar o clique responde em até 50ms no p99 (o usuário está indo para o site do anunciante).',
    'Nenhum clique pode se perder — é dinheiro.',
    'O painel aceita contagem aproximada; a cobrança usa a contagem exata dos dados brutos.',
  ],

  scale: {
    dau: 200_000_000,
    requestsPerUserPerDay: 1,
    readWriteRatio: 0.01,
    avgPayloadBytes: 300,
    peakMultiplier: 3,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
