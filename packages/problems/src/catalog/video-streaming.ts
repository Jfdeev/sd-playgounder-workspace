/**
 * Problema: Upload e streaming de vídeo — packages/problems/src/catalog/video-streaming.ts
 *
 * M4.2, nível intermediário. Padrão (foundational-doc §2.2): object storage, transcoding assíncrono,
 * CDN. Conteúdo aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §5. No engine
 * a CDN não segura carga como o Cache — a origem (Object Storage) aguenta o que passa por ela. O "aha":
 * Object Storage com 1 réplica (2.000 rps) satura; transcoding síncrono falha `async-transcoding`.
 */

import { CLEAN_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { connects, latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 200;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'O vídeo começa a tocar em até 200ms (p99)'),
  NO_SATURATED_NODE,
  usesComponent('uses-cdn', 'Serve o vídeo por CDN', 'cdn'),
  usesComponent('uses-object-storage', 'Guarda os arquivos em Object Storage', 'object_storage'),
  connects('async-transcoding', 'Transcoding assíncrono: usa fila e Worker', ['queue'], ['worker']),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-not-database',
    prompt: 'Por que não guardar o vídeo no banco?',
    body:
      'Vídeo é arquivo grande e imutável; banco relacional é para registros pequenos que mudam. Object ' +
      'Storage é barato por GB e feito para isso; o banco guarda só os metadados (título, dono, status).',
  },
  {
    id: 'why-async-transcoding',
    prompt: 'O que o transcoding faz e por que é assíncrono?',
    body:
      'Converter um vídeo para 360p, 720p e 1080p leva minutos de CPU. Se o upload esperasse, a ' +
      'requisição estouraria qualquer orçamento. O upload só grava o original e enfileira; Workers ' +
      'convertem em segundo plano.',
  },
  {
    id: 'and-the-cdn',
    prompt: 'E a CDN?',
    body:
      'Assistir é quase todo o tráfego e o mesmo vídeo é visto por muita gente: a CDN entrega de perto ' +
      'do usuário. Observação: no engine a CDN não "segura" carga como o Cache — o Object Storage de ' +
      'origem ainda precisa aguentar o que passa por ela.',
  },
  {
    id: 'upload-boundary',
    prompt: 'Por que o upload não sabe nada de transcoding?',
    body:
      'A fila é uma fronteira: o upload só publica "vídeo novo", e trocar o transcodificador não mexe no ' +
      'upload. Clean Architecture (Robert C. Martin) chama isso de fronteira — o detalhe fica do outro ' +
      'lado, substituível.',
    source: CLEAN_ARCHITECTURE,
    libraryEntryId: 'boundaries',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'cdn-1', type: 'cdn', replicas: 2 },
      { id: 'object-storage-1', type: 'object_storage', replicas: 5 },
      { id: 'app-server-1', type: 'app_server', replicas: 2 },
      { id: 'sql-primary-1', type: 'sql_primary', replicas: 2 },
      { id: 'queue-1', type: 'queue', replicas: 2 },
      { id: 'worker-1', type: 'worker', replicas: 2 },
    ],
    edges: [
      { id: 'e1', from: 'cdn-1', to: 'object-storage-1', kind: 'read', weight: 98 },
      { id: 'e2', from: 'cdn-1', to: 'app-server-1', kind: 'write', weight: 2 },
      { id: 'e3', from: 'app-server-1', to: 'sql-primary-1', kind: 'write', weight: 1 },
      { id: 'e4', from: 'app-server-1', to: 'queue-1', kind: 'async', weight: 1 },
      { id: 'e5', from: 'queue-1', to: 'worker-1', kind: 'async', weight: 1 },
      { id: 'e6', from: 'worker-1', to: 'object-storage-1', kind: 'write', weight: 1 },
    ],
    entryNodeIds: ['cdn-1'],
  },
  reasoning:
    'Assistir passa pela CDN e lê do Object Storage (5 réplicas para ~6.800 rps). O upload é pequeno em ' +
    'volume: grava metadados no SQL e enfileira o transcoding, que os Workers fazem fora do caminho do ' +
    'usuário e gravam de volta no Object Storage.',
};

export const VIDEO_STREAMING: Problem = {
  id: 'video-streaming',
  title: 'Upload e streaming de vídeo',
  level: 'intermediate',
  concepts: ['caching', 'queues'],

  statement: 'Projete uma plataforma onde criadores sobem vídeos e qualquer pessoa assiste.',

  functionalRequirements: [
    'O criador sobe um vídeo; ele fica disponível depois de processado em várias resoluções.',
    'Qualquer pessoa assiste a um vídeo publicado.',
    'O processamento não trava o upload: o criador recebe "processando" e é avisado quando termina.',
  ],

  nonFunctionalRequirements: [
    'O vídeo começa a tocar em até 200ms no p99 (primeiro pedaço).',
    'Assistir é 98% do tráfego; o custo por visualização precisa ser baixo.',
    'Disponibilidade de 99,9% para assistir.',
  ],

  scale: {
    dau: 20_000_000,
    requestsPerUserPerDay: 10,
    readWriteRatio: 0.98,
    avgPayloadBytes: 1_000_000,
    peakMultiplier: 3,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
