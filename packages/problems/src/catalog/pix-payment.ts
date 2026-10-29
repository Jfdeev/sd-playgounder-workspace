/**
 * Problema: Pagamento Pix — packages/problems/src/catalog/pix-payment.ts
 *
 * M4.2, nível avançado. Padrão (foundational-doc §2.2): idempotência, exactly-once, conciliação,
 * auditoria — conteúdo brasileiro (§7.9). Conteúdo aprovado pelo autor em
 * specs/biblioteca-problemas-m4-2/content-draft.md §7. O SPI do Banco Central é a API externa. O
 * "aha": API externa com 1 réplica (100 rps) satura; sem a consulta de idempotência, falha
 * `idempotency-key`.
 */

import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { connects, latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 2_000;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'O Pix é confirmado em até 2s (p99)'),
  NO_SATURATED_NODE,
  connects('requires-auth', 'Exige autenticação (Auth Service no caminho)', ['auth_service'], ['app_server']),
  connects('idempotency-key', 'Idempotência: o serviço consulta um NoSQL ou Cache de chaves antes de liquidar', ['app_server'], ['nosql_kv', 'cache']),
  usesComponent('ledger-sql', 'Saldo num banco relacional (SQL Primary)', 'sql_primary'),
  usesComponent('async-reconciliation', 'Conciliação e auditoria assíncronas: usa Kafka, Event Stream ou fila', 'kafka', 'event_stream', 'queue'),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'what-is-idempotency',
    prompt: 'O que é idempotência aqui?',
    body:
      'O app manda cada Pix com um identificador único (o `endToEndId` do Pix tem esse papel). Antes de ' +
      'liquidar, o serviço confere se aquele id já foi processado; se sim, devolve o resultado anterior em ' +
      'vez de mandar de novo. Sem isso, um retry de rede vira dinheiro saindo duas vezes.',
  },
  {
    id: 'why-sql-ledger',
    prompt: 'Por que SQL e não NoSQL para o saldo?',
    body:
      'Debitar é "ler saldo, conferir, gravar novo saldo" — duas operações concorrentes no mesmo saldo ' +
      'precisam de transação. Mesmo raciocínio do Checkout.',
  },
  {
    id: 'reconciliation',
    prompt: 'Como funcionam a conciliação e a auditoria?',
    body:
      'Cada Pix vira um evento num log (Kafka); um Worker compara com o extrato do Banco Central e guarda ' +
      'a trilha. Fica fora do caminho do cliente, mas não pode perder evento. Errar aqui custa dinheiro: é ' +
      'o que Richards & Ford chamam de confiabilidade / segurança operacional.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    libraryEntryId: 'reliability-safety',
  },
];

// O App Server divide a carga entre as 4 saídas pelo peso (o engine não duplica): o SPI recebe metade
// (~463 rps), as outras ~154 rps cada. Ver content-draft.md, "uma limitação do engine".
const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'api-gateway-1', type: 'api_gateway', replicas: 2 },
      { id: 'auth-service-1', type: 'auth_service', replicas: 3 },
      { id: 'app-server-1', type: 'app_server', replicas: 4 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 2 },
      { id: 'sql-primary-1', type: 'sql_primary', replicas: 2 },
      { id: 'spi-1', type: 'third_party_api', replicas: 6 },
      { id: 'kafka-1', type: 'kafka', replicas: 2 },
      { id: 'worker-1', type: 'worker', replicas: 2 },
    ],
    edges: [
      { id: 'e1', from: 'api-gateway-1', to: 'auth-service-1', kind: 'read', weight: 1 },
      { id: 'e2', from: 'auth-service-1', to: 'app-server-1', kind: 'read', weight: 1 },
      { id: 'e3', from: 'app-server-1', to: 'nosql-1', kind: 'read', weight: 1 },
      { id: 'e4', from: 'app-server-1', to: 'sql-primary-1', kind: 'write', weight: 1 },
      { id: 'e5', from: 'app-server-1', to: 'spi-1', kind: 'write', weight: 3 },
      { id: 'e6', from: 'app-server-1', to: 'kafka-1', kind: 'async', weight: 1 },
      { id: 'e7', from: 'kafka-1', to: 'worker-1', kind: 'async', weight: 1 },
    ],
    entryNodeIds: ['api-gateway-1'],
  },
  reasoning:
    'A autenticação vem antes de tudo. O serviço confere a chave de idempotência, debita o saldo no SQL ' +
    '(transação) e liquida no SPI, que é lento (100 rps por réplica) e domina a latência. Cada Pix vira ' +
    'evento no Kafka para a conciliação e a auditoria, fora do caminho do cliente.',
};

export const PIX_PAYMENT: Problem = {
  id: 'pix-payment',
  title: 'Pagamento Pix',
  level: 'advanced',

  statement:
    'Projete o envio de Pix de um banco digital: o cliente confirma, o dinheiro sai da conta e chega no ' +
    'outro banco pelo SPI do Banco Central.',

  functionalRequirements: [
    'O cliente envia um Pix; o valor é debitado da conta e liquidado pelo SPI.',
    'Um toque duplo, ou um retry do app, nunca gera dois Pix.',
    'No fim do dia, cada Pix do banco bate com o extrato do Banco Central (conciliação).',
    'Todo Pix fica registrado para auditoria.',
  ],

  nonFunctionalRequirements: [
    'O Pix é confirmado em até 2s no p99 — o SPI externo é a parte mais lenta.',
    'Consistência forte no saldo: nunca debitar duas vezes nem ficar negativo por corrida.',
    'Disponibilidade de 99,9%; o cliente precisa estar autenticado.',
  ],

  scale: {
    dau: 10_000_000,
    requestsPerUserPerDay: 2,
    readWriteRatio: 0.2,
    avgPayloadBytes: 2_000,
    peakMultiplier: 4,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
