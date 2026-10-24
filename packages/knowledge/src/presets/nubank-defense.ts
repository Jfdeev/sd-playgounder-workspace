import type { ReferenceArchitecture } from '../reference-architectures.js';

/**
 * Preset nubank-defense — conteúdo aprovado pelo autor em 2026-10-08
 * (specs/arquiteturas-referencia/content-draft-nubank-defense.md). Toda afirmação saiu das fontes abaixo,
 * lidas em 2026-10-07 (research.md §1). Réplicas são ilustrativas, salvo `replicasIllustrative: false`
 * com a fonte do número.
 */
export const NUBANK_DEFENSE_PRESET: ReferenceArchitecture = {
  id: 'nubank-defense',
  company: 'Nubank — Defense Platform (antifraude)',
  summary:
    'A Defense Platform é a plataforma antifraude que atende todos os produtos do Nubank: cada evento, como uma transação PIX, passa por um orquestrador que roda regras e modelos de machine learning em paralelo, busca dados em bancos internos e provedores externos, e decide se a transação segue ou dispara uma ação.',
  sources: [
    { id: 'defense', title: 'Scaling fraud defense: How Nubank evolved its risk analysis platform', publisher: 'Nubank', url: 'https://building.nubank.com/scaling-fraud-defense-how-nubank-evolved-its-risk-analysis-platform/', accessedAt: '2026-10-07' },
    { id: 'contracts', title: 'Why We Killed Our End-to-End Test Suite', publisher: 'Nubank', url: 'https://building.nubank.com/why-we-killed-our-end-to-end-test-suite/', accessedAt: '2026-10-07' },
  ],
  nodes: [
    {
      id: 'flow-orchestrator', type: 'app_server', replicas: 6, label: 'Flow Orchestrator', sourceIds: ['defense'], replicasIllustrative: true,
      explanation: {
        text: 'O Flow Orchestrator sabe por onde cada tipo de evento precisa passar: num PIX, mais de 40 processos (regras de negócio e modelos de machine learning) podem rodar em paralelo. Ele foi refeito como um grafo acíclico de dependências, com a biblioteca Nodely, e o tempo dos fluxos complexos caiu de 550 ms para cerca de 350 ms. Se uma regra já marca a transação como de alto risco, o modelo, mais lento, nem roda.',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'datomic', type: 'nosql_kv', replicas: 3, label: 'Datomic (sobre DynamoDB)', sourceIds: ['defense'],
      approximation: 'O Datomic é um banco imutável que roda sobre o DynamoDB; o catálogo o representa como NoSQL (KV).',
      replicasIllustrative: true,
      explanation: {
        text: 'As regras e os modelos puxam dados das features, um sistema que acessa bancos internos, provedores externos e outros serviços. A plataforma é escrita em Clojure, sobre o Datomic rodando em cima do DynamoDB.',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'external-providers', type: 'third_party_api', replicas: 6, label: 'Provedores externos', sourceIds: ['defense'], replicasIllustrative: true,
      explanation: {
        text: 'As features também consultam provedores terceiros para completar o contexto do evento (origem, destino, valor e o que mais cada defesa precisar).',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'kafka', type: 'kafka', replicas: 3, label: 'Kafka', sourceIds: ['defense', 'contracts'], replicasIllustrative: true,
      explanation: {
        text: 'O Kafka faz parte da base técnica da plataforma, junto com Clojure e Datomic. No Nubank, a maior parte das interações críticas entre microsserviços acontece por mensagens Kafka: mutações vão por fluxos assíncronos, e chamadas HTTP ficam quase só para leitura.',
        sourceIds: ['defense', 'contracts'],
      },
    },
    {
      id: 'async-actions', type: 'worker', replicas: 4, label: 'Ações assíncronas', sourceIds: ['defense'], replicasIllustrative: true,
      explanation: {
        text: 'Uma decisão pode disparar ações em tempo real (bloquear a transação, mostrar um aviso no app) ou assíncronas, como abrir um caso interno de investigação.',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'etl', type: 'data_warehouse', replicas: 3, label: 'ETL distribuído', sourceIds: ['defense'],
      approximation: 'O sistema de ETL distribuído é aproximado por Data Warehouse.',
      replicasIllustrative: true,
      explanation: {
        text: 'Todo evento é registrado e empurrado pelo sistema de ETL distribuído do Nubank, que agrega mais de 100 TB de logs por dia, para análise e melhoria contínua das defesas.',
        sourceIds: ['defense'],
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'flow-orchestrator', to: 'datomic', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['defense'] },
    { id: 'e2', from: 'flow-orchestrator', to: 'external-providers', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['defense'] },
    { id: 'e3', from: 'flow-orchestrator', to: 'kafka', kind: 'write', weight: 1, basis: 'inferida', sourceIds: [], note: 'A fonte só cita o Kafka como parte da base técnica; que as decisões saiam do orquestrador por ele é inferência, a partir da regra geral do Nubank de mutações assíncronas via Kafka.' },
    { id: 'e4', from: 'kafka', to: 'async-actions', kind: 'async', weight: 1, basis: 'inferida', sourceIds: [], note: 'As ações assíncronas são afirmadas; que consumam eventos do Kafka, não.' },
    { id: 'e5', from: 'async-actions', to: 'etl', kind: 'write', weight: 1, basis: 'inferida', sourceIds: [], note: 'A fonte afirma que todo evento vai para o ETL, mas não por qual caminho; o catálogo só deixa o Kafka entregar a um Worker.' },
  ],
  entryNodeIds: ['flow-orchestrator'],
  limitations: [
    'As regras e os modelos de machine learning (em Python) não são componentes do catálogo; no preset eles ficam dentro do Flow Orchestrator, e o sistema de features fica colapsado nas arestas até o Datomic e os provedores.',
    'Só no Brasil a plataforma roda em 20 shards, réplicas completas do sistema inteiro; o preset mostra uma cópia só.',
    'As arestas e3, e4 e e5 são inferidas (ver as conexões inferidas).',
    'As ações em tempo real (bloquear, avisar no app) são a resposta do orquestrador, não um componente.',
    'A parte do mesmo post apresentada pela AWS (Rekognition, Textract, SageMaker, Neptune, CleanRooms) é uma demonstração da AWS, não a arquitetura do Nubank, e fica fora.',
  ],
};
