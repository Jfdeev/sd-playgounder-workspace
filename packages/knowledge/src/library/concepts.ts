import type { LibraryEntry } from '../library.js';
import { DESIGNING_DATA_INTENSIVE_APPLICATIONS } from '../source.js';

const GROUP = 'System design';
const CH1 = 'cap. 1 — Reliable, Scalable, and Maintainable Applications';
const CH9 = 'cap. 9 — Consistency and Consensus';
const CH11 = 'cap. 11 — Stream Processing';

function concept(
  id: string,
  name: string,
  definition: string,
  tradeoff: string,
  platformNote: string,
  chapter: string,
  relatedEntryIds?: readonly string[],
): LibraryEntry {
  return {
    id,
    category: 'concepts',
    group: GROUP,
    name,
    definition,
    tradeoff,
    platformNote,
    source: DESIGNING_DATA_INTENSIVE_APPLICATIONS,
    chapter,
    ...(relatedEntryIds ? { relatedEntryIds } : {}),
  };
}

/**
 * Conteúdo aprovado pelo autor em 2026-10-29 (specs/conceitos-progresso-m4-3/content-draft.md). O texto
 * é nosso; a fonte é citada por capítulo (DDIA, 1ª ed.).
 */
export const CONCEPT_ENTRIES: readonly LibraryEntry[] = [
  concept(
    'caching',
    'Caching',
    'Guardar uma cópia de um dado num lugar mais rápido (memória, ou um servidor perto do usuário) para não ' +
      'buscar na fonte toda vez. Funciona quando o mesmo dado é lido muitas vezes.',
    'Velocidade e menos carga na fonte contra dado possivelmente desatualizado e a pergunta difícil de quando ' +
      'invalidar. Uma CDN é um cache na borda, perto do usuário.',
    'O Cache tem uma taxa de acerto configurável; só o miss segue para o banco. A CDN não segura carga no ' +
      'engine — a origem continua recebendo o que passa por ela.',
    CH1,
  ),
  concept(
    'fan-out',
    'Fan-out',
    'Uma ação de um usuário gerar trabalho para muitos outros — um post que precisa aparecer no feed de todos ' +
      'os seguidores, uma notificação para vários destinatários.',
    'Fan-out na escrita (pré-calcula o feed de cada seguidor ao postar) deixa a leitura barata e a escrita ' +
      'cara; fan-out na leitura (monta o feed ao abrir) faz o contrário. Contas com milhões de seguidores ' +
      'costumam pedir um híbrido.',
    'Aparece como divisão de carga entre arestas e como fila entre aceitar e entregar.',
    `${CH1} (o exemplo da timeline do Twitter)`,
  ),
  concept(
    'replication',
    'Replicação',
    'Manter cópias do mesmo dado em várias máquinas, para aguentar falha de uma delas e para espalhar as ' +
      'leituras.',
    'Mais disponibilidade e capacidade de leitura contra o atraso entre réplicas (uma leitura pode ver dado ' +
      'antigo) e a complexidade de decidir quem aceita escrita.',
    'SQL Primary → SQL Replica é a aresta de replicação; réplicas de um nó também removem o ponto único de ' +
      'falha.',
    'cap. 5 — Replication',
  ),
  concept(
    'partitioning',
    'Particionamento (sharding)',
    'Dividir os dados em pedaços (partições) e espalhá-los por várias máquinas, cada uma responsável por uma ' +
      'fatia — por chave, por faixa ou por região do mapa.',
    'Escala além do que uma máquina aguenta contra consultas que cruzam partições, chaves quentes que ' +
      'sobrecarregam uma partição só e o custo de rebalancear.',
    'O engine não modela partição explícita; réplicas de NoSQL e um Cache dividido por célula do mapa ' +
      '(Matching de corridas) são as aproximações.',
    'cap. 6 — Partitioning',
  ),
  concept(
    'transactions',
    'Transações e consistência forte',
    'Agrupar várias leituras e escritas numa unidade que acontece inteira ou não acontece, sem que operações ' +
      'concorrentes vejam ou estraguem estados intermediários.',
    'Correção (nunca vender o mesmo item duas vezes, nunca debitar em dobro) contra latência e capacidade ' +
      'menores, e mais dificuldade de escalar horizontalmente.',
    'O SQL Primary é o lugar das transações; os desafios de Checkout e Pix cobram um banco relacional para o ' +
      'saldo e o estoque.',
    'cap. 7 — Transactions',
    ['optimistic-offline-lock', 'pessimistic-offline-lock'],
  ),
  concept(
    'consensus',
    'Consenso',
    'Fazer várias máquinas concordarem sobre um valor (quem é o líder, se uma transação foi confirmada) mesmo ' +
      'com mensagens atrasadas e máquinas caindo. Raft e Paxos são os algoritmos clássicos.',
    'Decisões seguras e consistentes contra latência (exige maioria respondendo) e indisponibilidade quando a ' +
      'maioria não está alcançável.',
    'Não é modelado pelo engine; aparece por trás de componentes gerenciados (eleição de primário, ' +
      'coordenação).',
    CH9,
  ),
  concept(
    'cap-pacelc',
    'CAP e PACELC',
    'CAP diz que, durante uma partição de rede, um sistema distribuído precisa escolher entre responder ' +
      'sempre (disponibilidade) e responder certo (consistência). PACELC (Daniel Abadi) acrescenta: mesmo sem ' +
      'partição, há um trade-off entre latência e consistência.',
    'É o próprio trade-off — um feed aceita dado levemente atrasado para responder rápido; um checkout ' +
      'prefere recusar a vender o que não tem.',
    'Os requisitos não-funcionais de cada desafio dizem qual lado escolher ("consistência eventual é ' +
      'aceitável" vs. "consistência forte no estoque").',
    CH9,
  ),
  concept(
    'queues',
    'Filas e mensageria assíncrona',
    'Colocar o trabalho numa fila para que outro componente o faça depois, no próprio ritmo, em vez de quem ' +
      'pediu esperar o resultado.',
    'Absorve picos, desacopla quem produz de quem consome e protege contra falha do consumidor, contra ' +
      'atraso no resultado e a necessidade de lidar com reentrega.',
    'Fila → Worker (e Kafka/Event Stream → Worker) é a aresta assíncrona: sai do cálculo de latência do ' +
      'usuário.',
    `${CH11} (sistemas de mensageria)`,
  ),
  concept(
    'pubsub',
    'Publish/subscribe',
    'Um produtor publica uma mensagem num tópico e todos os interessados recebem uma cópia — sem o produtor ' +
      'saber quem são.',
    'Entrega para muitos destinos sem acoplamento contra garantias mais fracas de ordem e entrega, que ' +
      'precisam ser tratadas por quem consome.',
    'O Pub/Sub é a peça que leva a mensagem de chat a todas as réplicas com alguém daquela conversa.',
    CH11,
  ),
  concept(
    'idempotency',
    'Idempotência',
    'Uma operação é idempotente quando repeti-la tem o mesmo efeito de fazê-la uma vez. Com uma chave única ' +
      'por operação, o sistema reconhece a repetição e não faz de novo.',
    'Retry passa a ser seguro (nada de Pix em dobro, notificação repetida) contra ter que guardar e ' +
      'consultar as chaves já processadas.',
    'Os desafios de Notificações e Pix cobram que o serviço consulte um NoSQL ou Cache de chaves antes de ' +
      'agir.',
    `${CH11} (tolerância a falhas e idempotência)`,
  ),
  concept(
    'backpressure',
    'Backpressure e limitação de taxa',
    'Quando chega mais trabalho do que dá para processar, o sistema precisa reagir: avisar quem produz para ' +
      'ir mais devagar (backpressure), recusar o excesso na entrada (limitação de taxa) ou enfileirar até um ' +
      'limite.',
    'Protege o sistema de cair sob sobrecarga contra recusar ou atrasar parte das requisições de propósito.',
    'O Rate Limiter recusa o excesso antes do App Server; o Scheduler do crawler segura o ritmo por site. Sem ' +
      'eles, o nó de trás satura. A parte de limitação de taxa é texto nosso — nenhuma das 4 obras a cobre.',
    CH11,
  ),
  concept(
    'stream-processing',
    'Processamento de streams',
    'Processar eventos continuamente, à medida que chegam, em vez de em lotes periódicos — agrupando por ' +
      'janelas de tempo ("cliques por minuto").',
    'Resultado quase em tempo real contra lidar com eventos atrasados ou fora de ordem; por isso costuma ' +
      'conviver com um processamento em lote que recalcula o valor exato.',
    'Kafka/Event Stream → Analytics é o caminho de stream; o Data Warehouse fica com os dados brutos.',
    CH11,
  ),
  concept(
    'redundancy',
    'Redundância e ponto único de falha',
    'Ter mais de uma instância de cada peça crítica, para que a falha de uma não derrube o sistema. Uma peça ' +
      'com uma instância só no caminho crítico é um ponto único de falha (SPOF).',
    'Disponibilidade contra custo — cada réplica a mais é dinheiro, mesmo ociosa.',
    'Todo nó com 1 réplica no caminho crítico gera a violação de SPOF; a dimensão Disponibilidade calcula o ' +
      'efeito das réplicas.',
    CH1,
    ['robustness', 'recoverability'],
  ),
];
