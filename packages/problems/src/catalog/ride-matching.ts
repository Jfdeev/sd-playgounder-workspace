/**
 * Problema: Matching de corridas — packages/problems/src/catalog/ride-matching.ts
 *
 * M4.2, nível avançado. Padrão (foundational-doc §2.2): índice geoespacial, escrita alta, estado
 * efêmero. Conteúdo aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §8. O
 * índice geoespacial é o Cache. O "aha": mandar a posição para o SQL faz o banco saturar e falha
 * `location-off-sql`.
 */

import { CLEAN_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem, RubricCriterion } from '../types.js';
import { latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 200;

/** Fração máxima da carga de entrada que pode chegar no banco relacional. */
const MAX_SQL_LOAD_SHARE = 0.3;

// Só compara cargas que o engine já propagou (`offeredLoad`), nunca recalcula nada.
const LOCATION_OFF_SQL: RubricCriterion = {
  id: 'location-off-sql',
  label: 'As atualizações de posição não vão para o banco relacional (o SQL recebe menos de 30% da carga de entrada)',
  evaluate: (result, design) => {
    const loadOf = (ids: string[]) => ids.reduce((sum, id) => sum + (result.nodes[id]?.offeredLoad ?? 0), 0);
    const sqlIds = design.nodes.filter((node) => node.type === 'sql_primary' || node.type === 'sql_replica').map((node) => node.id);
    return loadOf(sqlIds) < MAX_SQL_LOAD_SHARE * loadOf(design.entryNodeIds);
  },
};

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'Encontrar motoristas responde em até 200ms (p99)'),
  NO_SATURATED_NODE,
  usesComponent('locations-in-cache', 'Posições num Cache (estado efêmero em memória)', 'cache'),
  usesComponent('trips-durable', 'Corridas num banco durável (SQL ou NoSQL)', 'sql_primary', 'nosql_kv'),
  LOCATION_OFF_SQL,
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-not-database',
    prompt: 'Por que a posição não vai para o banco?',
    body:
      'São milhares de escritas por segundo de um dado que vale por segundos. Gravar cada uma num SQL é ' +
      'caro e inútil. A posição atual fica em memória (Cache), e só a corrida, que tem valor de negócio, ' +
      'vai para o banco.',
  },
  {
    id: 'geospatial-index',
    prompt: 'O que é um índice geoespacial?',
    body:
      'Divide o mapa em células (geohash, S2, H3); "motoristas perto" vira "motoristas nesta célula e nas ' +
      'vizinhas", uma consulta barata. Redis tem isso pronto (`GEOSEARCH`). No canvas, é o Cache.',
  },
  {
    id: 'responsibility-coupling',
    prompt: 'Por que dois serviços?',
    body:
      'Receber posição (muita escrita, simples) e fazer matching (pouca leitura, lógica de negócio) escalam ' +
      'diferente. Separá-los é responsabilidade única (Clean Architecture, Robert C. Martin): cada um ' +
      'cresce em réplicas conforme a própria carga.',
    source: CLEAN_ARCHITECTURE,
    libraryEntryId: 'srp',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'load-balancer-1', type: 'load_balancer', replicas: 2 },
      { id: 'location-service-1', type: 'app_server', replicas: 18 },
      { id: 'cache-1', type: 'cache', replicas: 2 },
      { id: 'matching-service-1', type: 'app_server', replicas: 6 },
      { id: 'sql-primary-1', type: 'sql_primary', replicas: 2 },
    ],
    edges: [
      { id: 'e1', from: 'load-balancer-1', to: 'location-service-1', kind: 'write', weight: 8 },
      { id: 'e2', from: 'load-balancer-1', to: 'matching-service-1', kind: 'read', weight: 2 },
      { id: 'e3', from: 'location-service-1', to: 'cache-1', kind: 'write', weight: 1 },
      { id: 'e4', from: 'matching-service-1', to: 'cache-1', kind: 'read', weight: 1 },
      { id: 'e5', from: 'matching-service-1', to: 'sql-primary-1', kind: 'write', weight: 1 },
    ],
    entryNodeIds: ['load-balancer-1'],
  },
  reasoning:
    '80% da carga é posição: 18 réplicas recebem ~6.667 rps e gravam só no Cache. O matching (~1.667 ' +
    'rps) lê posições do Cache e grava a corrida no SQL — que assim recebe uma fração pequena do tráfego.',
};

export const RIDE_MATCHING: Problem = {
  id: 'ride-matching',
  title: 'Matching de corridas',
  level: 'advanced',

  statement:
    'Projete o núcleo de um app de corridas: motoristas mandam a localização o tempo todo e, quando um ' +
    'passageiro pede, o sistema acha os motoristas mais próximos.',

  functionalRequirements: [
    'Motoristas online enviam a posição a cada poucos segundos.',
    'Ao pedir uma corrida, o passageiro recebe os motoristas mais próximos e um é designado.',
    'A corrida (quem, de onde, para onde, valor) fica registrada.',
  ],

  nonFunctionalRequirements: [
    'Encontrar motoristas responde em até 200ms no p99.',
    '80% do tráfego são atualizações de posição: a escrita é muito mais alta que a leitura.',
    'Posição antiga de segundos é aceitável; corrida registrada não pode se perder.',
  ],

  scale: {
    dau: 500_000,
    requestsPerUserPerDay: 720,
    readWriteRatio: 0.2,
    avgPayloadBytes: 200,
    peakMultiplier: 2,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
