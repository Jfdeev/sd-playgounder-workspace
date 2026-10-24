import type { Design } from '@sdp/engine';
import type { Fault } from './faults.js';
import type { FixCriterion } from './fix.js';
import { getIncident, INCIDENTS } from './public.js';

/**
 * Incidentes do M3 — parte **secreta** (só servidor): a causa plantada, o critério do fix, o fix de
 * referência e "o que aconteceu" (mostrado só depois do diagnóstico certo). Conteúdo aprovado pelo
 * autor em 2026-10-24 (content-draft.md). Exposto apenas por `@sdp/problems/server` — nunca pelo
 * índice do pacote, que o navegador importa (research.md §4, SC-003).
 */

export type IncidentSecret = {
  id: string;
  fault: Fault;
  fixCriterion: FixCriterion;
  referenceFix: Design;
  whatHappened: string;
};

const criterionFor = (incidentId: string): FixCriterion => ({
  maxP99Ms: 150,
  minThroughputRps: getIncident(incidentId)!.workload.rps,
});

function withReplicas(incidentId: string, replicas: Record<string, number>): Design {
  const design = getIncident(incidentId)!.design;
  return { ...design, nodes: design.nodes.map((node) => (replicas[node.id] !== undefined ? { ...node, replicas: replicas[node.id]! } : node)) };
}

function partitionReferenceFix(): Design {
  const design = getIncident('pedidos-sem-processamento')!.design;
  return {
    ...design,
    nodes: [...design.nodes, { id: 'app-b', type: 'app_server', replicas: 2 }],
    edges: [
      ...design.edges,
      { id: 'e6', from: 'lb', to: 'app-b', kind: 'read', weight: 1 },
      { id: 'e7', from: 'app-b', to: 'events', kind: 'write', weight: 1 },
    ],
  };
}

const SECRETS: readonly IncidentSecret[] = [
  {
    id: 'banco-no-limite',
    fault: { type: 'cache-cold', target: 'cache' },
    fixCriterion: criterionFor('banco-no-limite'),
    referenceFix: withReplicas('banco-no-limite', { db: 4 }),
    whatHappened:
      'O deploy reiniciou o cluster de cache e ele voltou vazio. Com 0% de acerto, toda leitura que antes parava no cache passou a ir direto pro banco — dez vezes mais consultas, com o mesmo tráfego de entrada.',
  },
  {
    id: 'app-no-limite',
    fault: { type: 'node-down', target: 'app', lostInstances: 4 },
    fixCriterion: criterionFor('app-no-limite'),
    referenceFix: withReplicas('app-no-limite', { app: 8 }),
    whatHappened:
      'Quatro das cinco instâncias do app server caíram (falta de memória). A única que sobrou recebe todo o tráfego — e virou ponto único de falha.',
  },
  {
    id: 'pedidos-sem-processamento',
    fault: { type: 'partition', target: 'events', cutFrom: 'app' },
    fixCriterion: criterionFor('pedidos-sem-processamento'),
    referenceFix: partitionReferenceFix(),
    whatHappened:
      'Uma regra de firewall nova isolou o Kafka do app server. As requisições continuam sendo atendidas, mas nenhum evento é publicado — o processamento assíncrono parou sem ninguém perceber pela latência.',
  },
  {
    id: 'tudo-piorou',
    fault: { type: 'zone-down', target: 'db', zone: 0 },
    fixCriterion: criterionFor('tudo-piorou'),
    referenceFix: withReplicas('tudo-piorou', { db: 2, app: 5 }),
    whatHappened:
      'Uma zona de disponibilidade inteira caiu. Cada componente perdeu as réplicas que estavam nela; o banco, que só tinha uma réplica — justamente nessa zona —, sumiu.',
  },
  {
    id: 'banco-saturado-sem-carga',
    fault: { type: 'pool-exhausted', target: 'db', capacityFactor: 0.3 },
    fixCriterion: criterionFor('banco-saturado-sem-carga'),
    referenceFix: withReplicas('banco-saturado-sem-carga', { db: 8 }),
    whatHappened:
      'Um vazamento de conexões esgotou o pool do banco: só 30% da capacidade continua atendendo. A carga é a mesma, mas o banco não dá conta — e nenhuma instância caiu.',
  },
];

export function getIncidentSecret(id: string): IncidentSecret | undefined {
  return SECRETS.find((secret) => secret.id === id);
}

/** Todo incidente público tem segredo e vice-versa (checado em teste). */
export const SECRET_IDS: readonly string[] = SECRETS.map((secret) => secret.id);
export const PUBLIC_IDS: readonly string[] = INCIDENTS.map((incident) => incident.id);
