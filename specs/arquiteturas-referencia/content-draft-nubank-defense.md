# Rascunho de conteúdo — M2.5, preset Nubank — Defense Platform (antifraude) — aguardando aprovação do autor

> **Gate (FR-008)**: rascunho assistido por LLM. Cada afirmação foi tirada de uma página que **abriu e
> foi lida** em 2026-10-07 (registro em `research.md` §1); as frases são paráfrase da fonte. Este texto
> foi gerado do mesmo dado que já passou nas checagens dos testes (validador dos 7 invariantes, matriz
> de conexões do canvas e `simulate()` sem violação) — aprovado, ele vira `presets/nubank-defense.ts` literal.

## Identidade

- **Nome no menu**: Nubank — Defense Platform (antifraude) · **id**: `nubank-defense`
- **Resumo**: "A Defense Platform é a plataforma antifraude que atende todos os produtos do Nubank: cada evento, como uma transação PIX, passa por um orquestrador que roda regras e modelos de machine learning em paralelo, busca dados em bancos internos e provedores externos, e decide se a transação segue ou dispara uma ação."

## Fontes

1. [Scaling fraud defense: How Nubank evolved its risk analysis platform](https://building.nubank.com/scaling-fraud-defense-how-nubank-evolved-its-risk-analysis-platform/) — publicador: Nubank
2. [Why We Killed Our End-to-End Test Suite](https://building.nubank.com/why-we-killed-our-end-to-end-test-suite/) — publicador: Nubank

## Componentes

`entryNodeIds: ['flow-orchestrator']` — o cliente é o nó visual do canvas.

| id | Rótulo | Tipo no catálogo | Réplicas | Fonte | Explicação ("Por que está aqui") |
|---|---|---|---|---|---|
| `flow-orchestrator` | Flow Orchestrator | `app_server` | 6 *(ilustrativo)* | [1] | "O Flow Orchestrator sabe por onde cada tipo de evento precisa passar: num PIX, mais de 40 processos (regras de negócio e modelos de machine learning) podem rodar em paralelo. Ele foi refeito como um grafo acíclico de dependências, com a biblioteca Nodely, e o tempo dos fluxos complexos caiu de 550 ms para cerca de 350 ms. Se uma regra já marca a transação como de alto risco, o modelo, mais lento, nem roda." |
| `datomic` | Datomic (sobre DynamoDB) | `nosql_kv` *(aproximação)* | 3 *(ilustrativo)* | [1] | "As regras e os modelos puxam dados das features, um sistema que acessa bancos internos, provedores externos e outros serviços. A plataforma é escrita em Clojure, sobre o Datomic rodando em cima do DynamoDB. <br>*Aproximação:* O Datomic é um banco imutável que roda sobre o DynamoDB; o catálogo o representa como NoSQL (KV)." |
| `external-providers` | Provedores externos | `third_party_api` | 2 *(ilustrativo)* | [1] | "As features também consultam provedores terceiros para completar o contexto do evento (origem, destino, valor e o que mais cada defesa precisar)." |
| `kafka` | Kafka | `kafka` | 3 *(ilustrativo)* | [1], [2] | "O Kafka faz parte da base técnica da plataforma, junto com Clojure e Datomic. No Nubank, a maior parte das interações críticas entre microsserviços acontece por mensagens Kafka: mutações vão por fluxos assíncronos, e chamadas HTTP ficam quase só para leitura." |
| `async-actions` | Ações assíncronas | `worker` | 4 *(ilustrativo)* | [1] | "Uma decisão pode disparar ações em tempo real (bloquear a transação, mostrar um aviso no app) ou assíncronas, como abrir um caso interno de investigação." |
| `etl` | ETL distribuído | `data_warehouse` *(aproximação)* | 2 *(ilustrativo)* | [1] | "Todo evento é registrado e empurrado pelo sistema de ETL distribuído do Nubank, que agrega mais de 100 TB de logs por dia, para análise e melhoria contínua das defesas. <br>*Aproximação:* O sistema de ETL distribuído é aproximado por Data Warehouse." |

## Conexões

| id | De → Para | Tipo de aresta | Base | Fonte / justificativa |
|---|---|---|---|---|
| `e1` | Flow Orchestrator → Datomic (sobre DynamoDB) | `read` | **afirmada** | [1] |
| `e2` | Flow Orchestrator → Provedores externos | `read` | **afirmada** | [1] |
| `e3` | Flow Orchestrator → Kafka | `write` | **inferida** | A fonte só cita o Kafka como parte da base técnica; que as decisões saiam do orquestrador por ele é inferência, a partir da regra geral do Nubank de mutações assíncronas via Kafka. |
| `e4` | Kafka → Ações assíncronas | `async` | **inferida** | As ações assíncronas são afirmadas; que consumam eventos do Kafka, não. |
| `e5` | Ações assíncronas → ETL distribuído | `write` | **inferida** | A fonte afirma que todo evento vai para o ETL, mas não por qual caminho; o catálogo só deixa o Kafka entregar a um Worker. |

Todas as arestas (e as do Cliente até cada entrada) são aceitas pela matriz de conexões do canvas.

## O que a simulação não modela (limitações exibidas no preset)

1. As regras e os modelos de machine learning (em Python) não são componentes do catálogo; no preset eles ficam dentro do Flow Orchestrator, e o sistema de features fica colapsado nas arestas até o Datomic e os provedores.
2. Só no Brasil a plataforma roda em 20 shards, réplicas completas do sistema inteiro; o preset mostra uma cópia só.
3. As arestas e3, e4 e e5 são inferidas (ver as conexões inferidas).
4. As ações em tempo real (bloquear, avisar no app) são a resposta do orquestrador, não um componente.
5. A parte do mesmo post apresentada pela AWS (Rekognition, Textract, SageMaker, Neptune, CleanRooms) é uma demonstração da AWS, não a arquitetura do Nubank, e fica fora.

## Decisões para o autor

- O recorte é **só a Defense Platform** (antifraude). O resto do Nubank só aparece nas fontes como pilha técnica (Clojure, Datomic, Kafka, microsserviços), sem componentes e conexões.
- Três das cinco arestas (todo o caminho pelo Kafka) são **inferidas**: a fonte cita o Kafka só como parte da pilha.
