import type { Design, DesignEdge, Workload } from '@sdp/engine';

/**
 * Incidentes do M3 — parte **pública** (vai pro navegador): título, alerta, arquitetura e carga.
 * Conteúdo aprovado pelo autor em 2026-10-24 (specs/modo-incidente-m3/content-draft.md). Nada aqui
 * revela a causa: falha plantada, critério do fix, fix de referência e "o que aconteceu" ficam em
 * `secret.ts`, exposto só por `@sdp/problems/server` (research.md §4).
 */

export type IncidentPublic = {
  id: string;
  title: string;
  /** Descreve só o sintoma que as métricas "durante" mostram. */
  alert: string;
  design: Design;
  workload: Workload;
};

const workload = (rps: number): Workload => ({ rps, readWriteRatio: 0.8, payloadBytes: 1024, peakMultiplier: 1 });
const edge = (id: string, from: string, to: string, kind: DesignEdge['kind'] = 'read'): DesignEdge => ({ id, from, to, kind, weight: 1 });

export const INCIDENTS: readonly IncidentPublic[] = [
  {
    id: 'banco-no-limite',
    title: 'Banco no limite às 3h',
    alert: 'Às 3h12, logo depois de um deploy, a latência foi ao teto e o banco de dados ficou saturado. O tráfego que entra no sistema é o mesmo de sempre.',
    design: {
      nodes: [
        { id: 'lb', type: 'load_balancer', replicas: 2 },
        { id: 'app', type: 'app_server', replicas: 7 },
        { id: 'cache', type: 'cache', replicas: 2, cacheHitRate: 0.9 },
        { id: 'db', type: 'sql_primary', replicas: 2 },
      ],
      edges: [edge('e1', 'lb', 'app'), edge('e2', 'app', 'cache'), edge('e3', 'cache', 'db')],
      entryNodeIds: ['lb'],
    },
    workload: workload(2400),
  },
  {
    id: 'app-no-limite',
    title: 'Servidores de aplicação no limite',
    alert: 'Às 3h40, a latência disparou e o app server saturou. O tráfego de entrada não mudou, e o painel acusa um novo ponto único de falha.',
    design: {
      nodes: [
        { id: 'lb', type: 'load_balancer', replicas: 2 },
        { id: 'app', type: 'app_server', replicas: 5 },
        { id: 'db', type: 'sql_primary', replicas: 2 },
      ],
      edges: [edge('e1', 'lb', 'app'), edge('e2', 'app', 'db')],
      entryNodeIds: ['lb'],
    },
    workload: workload(1200),
  },
  {
    id: 'pedidos-sem-processamento',
    title: 'Pedidos que não chegam ao processamento',
    alert: 'Desde as 2h50, os pedidos continuam sendo aceitos normalmente, mas nada chega ao processamento assíncrono. A latência está normal.',
    design: {
      nodes: [
        { id: 'lb', type: 'load_balancer', replicas: 2 },
        { id: 'app', type: 'app_server', replicas: 4 },
        { id: 'events', type: 'kafka', replicas: 3 },
        { id: 'worker', type: 'worker', replicas: 4 },
        { id: 'db', type: 'sql_primary', replicas: 2 },
      ],
      edges: [
        edge('e1', 'lb', 'app'),
        edge('e2', 'app', 'events', 'write'),
        edge('e3', 'app', 'db', 'read'),
        edge('e4', 'events', 'worker', 'async'),
        edge('e5', 'worker', 'db', 'write'),
      ],
      entryNodeIds: ['lb'],
    },
    workload: workload(1000),
  },
  {
    id: 'tudo-piorou',
    title: 'Tudo piorou ao mesmo tempo',
    alert: 'Às 4h05, o app server ficou sobrecarregado, o banco parou de receber consultas e o painel acusa um novo ponto único de falha — tudo no mesmo minuto.',
    design: {
      nodes: [
        { id: 'lb', type: 'load_balancer', replicas: 3 },
        { id: 'app', type: 'app_server', replicas: 3 },
        { id: 'cache', type: 'cache', replicas: 2, cacheHitRate: 0.8 },
        { id: 'db', type: 'sql_primary', replicas: 1 },
      ],
      edges: [edge('e1', 'lb', 'app'), edge('e2', 'app', 'cache'), edge('e3', 'cache', 'db')],
      entryNodeIds: ['lb'],
    },
    workload: workload(900),
  },
  {
    id: 'banco-saturado-sem-carga',
    title: 'Banco saturado sem aumento de carga',
    alert: 'Às 3h30, o banco de dados saturou e a latência foi ao teto, mas a carga que chega nele é a mesma de antes.',
    design: {
      nodes: [
        { id: 'lb', type: 'load_balancer', replicas: 2 },
        { id: 'app', type: 'app_server', replicas: 5 },
        { id: 'db', type: 'sql_primary', replicas: 3 },
      ],
      edges: [edge('e1', 'lb', 'app'), edge('e2', 'app', 'db')],
      entryNodeIds: ['lb'],
    },
    workload: workload(1500),
  },
];

export function getIncident(id: string): IncidentPublic | undefined {
  return INCIDENTS.find((incident) => incident.id === id);
}
