# M4.3 — Rascunho de conteúdo: conceitos e mapa problema → conceito

**Status**: **aprovado pelo autor (2026-10-29)**, incluindo os 3 pontos (limitação de taxa dentro de backpressure, CDN dentro de Caching, Replicação e Consenso sem problema).

Como ler: 13 verbetes, cada um com **definição**, **trade-off**, **na plataforma** (como o conceito
aparece no canvas) e **fonte** (obra + capítulo). A fonte nova é *Designing Data-Intensive
Applications* (Martin Kleppmann, 1ª ed., 2017), citada por capítulo; o texto do verbete é nosso, não
trecho do livro. No fim, o mapa de quais problemas exercitam quais conceitos — é ele que alimenta o card
do desafio, a lista "aparece em" do verbete e o progresso.

**Três pontos para decidir junto com a aprovação**

1. **Limitação de taxa não tem fonte** nas 4 obras. Proponho fundir com backpressure num verbete só
   ("Backpressure e limitação de taxa"), citando DDIA cap. 11 pela parte de backpressure.
2. **CDN não tem fonte** nas 4 obras. Proponho tratá-la dentro de Caching ("cache na borda").
3. **Replicação e Consenso ficam sem problema** — nenhum dos 12 os exercita de verdade. Aparecem na
   wiki com "ainda não há desafio para este conceito" e não entram no progresso.

---

## Verbetes

### 1. Caching — `caching`
**Definição**: Guardar uma cópia de um dado num lugar mais rápido (memória, ou um servidor perto do
usuário) para não buscar na fonte toda vez. Funciona quando o mesmo dado é lido muitas vezes.
**Trade-off**: Velocidade e menos carga na fonte contra dado possivelmente desatualizado e a pergunta
difícil de quando invalidar. Uma CDN é um cache na borda, perto do usuário.
**Na plataforma**: O Cache tem uma taxa de acerto configurável; só o miss segue para o banco. A CDN não
segura carga no engine — a origem continua recebendo o que passa por ela.
**Fonte**: DDIA, cap. 1 — Reliable, Scalable, and Maintainable Applications.

### 2. Fan-out — `fan-out`
**Definição**: Uma ação de um usuário gerar trabalho para muitos outros — um post que precisa aparecer
no feed de todos os seguidores, uma notificação para vários destinatários.
**Trade-off**: *Fan-out na escrita* (pré-calcula o feed de cada seguidor ao postar) deixa a leitura
barata e a escrita cara; *fan-out na leitura* (monta o feed ao abrir) faz o contrário. Contas com
milhões de seguidores costumam pedir um híbrido.
**Na plataforma**: Aparece como divisão de carga entre arestas e como fila entre aceitar e entregar.
**Fonte**: DDIA, cap. 1 — Reliable, Scalable, and Maintainable Applications (o exemplo da timeline do
Twitter).

### 3. Replicação — `replication`
**Definição**: Manter cópias do mesmo dado em várias máquinas, para aguentar falha de uma delas e para
espalhar as leituras.
**Trade-off**: Mais disponibilidade e capacidade de leitura contra o atraso entre réplicas (uma
leitura pode ver dado antigo) e a complexidade de decidir quem aceita escrita.
**Na plataforma**: SQL Primary → SQL Replica é a aresta de replicação; réplicas de um nó também
removem o ponto único de falha.
**Fonte**: DDIA, cap. 5 — Replication.

### 4. Particionamento (sharding) — `partitioning`
**Definição**: Dividir os dados em pedaços (partições) e espalhá-los por várias máquinas, cada uma
responsável por uma fatia — por chave, por faixa ou por região do mapa.
**Trade-off**: Escala além do que uma máquina aguenta contra consultas que cruzam partições, chaves
quentes que sobrecarregam uma partição só e o custo de rebalancear.
**Na plataforma**: O engine não modela partição explícita; réplicas de NoSQL e um Cache dividido por
célula do mapa (Matching de corridas) são as aproximações.
**Fonte**: DDIA, cap. 6 — Partitioning.

### 5. Transações e consistência forte — `transactions`
**Definição**: Agrupar várias leituras e escritas numa unidade que acontece inteira ou não acontece, sem
que operações concorrentes vejam ou estraguem estados intermediários.
**Trade-off**: Correção (nunca vender o mesmo item duas vezes, nunca debitar em dobro) contra latência e
capacidade menores, e mais dificuldade de escalar horizontalmente.
**Na plataforma**: O SQL Primary é o lugar das transações; os desafios de Checkout e Pix cobram um banco
relacional para o saldo e o estoque.
**Fonte**: DDIA, cap. 7 — Transactions.
**Na biblioteca**: Optimistic Offline Lock, Pessimistic Offline Lock (PoEAA).

### 6. Consenso — `consensus`
**Definição**: Fazer várias máquinas concordarem sobre um valor (quem é o líder, se uma transação foi
confirmada) mesmo com mensagens atrasadas e máquinas caindo. Raft e Paxos são os algoritmos clássicos.
**Trade-off**: Decisões seguras e consistentes contra latência (exige maioria respondendo) e
indisponibilidade quando a maioria não está alcançável.
**Na plataforma**: Não é modelado pelo engine; aparece por trás de componentes gerenciados (eleição de
primário, coordenação).
**Fonte**: DDIA, cap. 9 — Consistency and Consensus.

### 7. CAP e PACELC — `cap-pacelc`
**Definição**: CAP diz que, durante uma partição de rede, um sistema distribuído precisa escolher entre
responder sempre (disponibilidade) e responder certo (consistência). PACELC (Daniel Abadi) acrescenta:
mesmo sem partição, há um trade-off entre latência e consistência.
**Trade-off**: É o próprio trade-off — um feed aceita dado levemente atrasado para responder rápido; um
checkout prefere recusar a vender o que não tem.
**Na plataforma**: Os requisitos não-funcionais de cada desafio dizem qual lado escolher ("consistência
eventual é aceitável" vs. "consistência forte no estoque").
**Fonte**: DDIA, cap. 9 — Consistency and Consensus.

### 8. Filas e mensageria assíncrona — `queues`
**Definição**: Colocar o trabalho numa fila para que outro componente o faça depois, no próprio ritmo,
em vez de quem pediu esperar o resultado.
**Trade-off**: Absorve picos, desacopla quem produz de quem consome e protege contra falha do consumidor,
contra atraso no resultado e a necessidade de lidar com reentrega.
**Na plataforma**: Fila → Worker (e Kafka/Event Stream → Worker) é a aresta assíncrona: sai do cálculo de
latência do usuário.
**Fonte**: DDIA, cap. 11 — Stream Processing (seção sobre sistemas de mensageria).

### 9. Publish/subscribe — `pubsub`
**Definição**: Um produtor publica uma mensagem num tópico e todos os interessados recebem uma cópia —
sem o produtor saber quem são.
**Trade-off**: Entrega para muitos destinos sem acoplamento contra garantias mais fracas de ordem e
entrega, que precisam ser tratadas por quem consome.
**Na plataforma**: O Pub/Sub é a peça que leva a mensagem de chat a todas as réplicas com alguém daquela
conversa.
**Fonte**: DDIA, cap. 11 — Stream Processing.

### 10. Idempotência — `idempotency`
**Definição**: Uma operação é idempotente quando repeti-la tem o mesmo efeito de fazê-la uma vez. Com uma
chave única por operação, o sistema reconhece a repetição e não faz de novo.
**Trade-off**: Retry passa a ser seguro (nada de Pix em dobro, notificação repetida) contra ter que
guardar e consultar as chaves já processadas.
**Na plataforma**: Os desafios de Notificações e Pix cobram que o serviço consulte um NoSQL ou Cache de
chaves antes de agir.
**Fonte**: DDIA, cap. 11 — Stream Processing (seção sobre tolerância a falhas e idempotência).

### 11. Backpressure e limitação de taxa — `backpressure`
**Definição**: Quando chega mais trabalho do que dá para processar, o sistema precisa reagir: avisar quem
produz para ir mais devagar (backpressure), recusar o excesso na entrada (limitação de taxa) ou
enfileirar até um limite.
**Trade-off**: Protege o sistema de cair sob sobrecarga contra recusar ou atrasar parte das requisições
de propósito.
**Na plataforma**: O Rate Limiter recusa o excesso antes do App Server; o Scheduler do crawler segura o
ritmo por site. Sem eles, o nó de trás satura.
**Fonte**: DDIA, cap. 11 — Stream Processing (a parte de limitação de taxa é nossa, sem fonte nas 4
obras — ver ponto 1).

### 12. Processamento de streams — `stream-processing`
**Definição**: Processar eventos continuamente, à medida que chegam, em vez de em lotes periódicos —
agrupando por janelas de tempo ("cliques por minuto").
**Trade-off**: Resultado quase em tempo real contra lidar com eventos atrasados ou fora de ordem; por
isso costuma conviver com um processamento em lote que recalcula o valor exato.
**Na plataforma**: Kafka/Event Stream → Analytics é o caminho de stream; o Data Warehouse fica com os
dados brutos.
**Fonte**: DDIA, cap. 11 — Stream Processing.

### 13. Redundância e ponto único de falha — `redundancy`
**Definição**: Ter mais de uma instância de cada peça crítica, para que a falha de uma não derrube o
sistema. Uma peça com uma instância só no caminho crítico é um ponto único de falha (SPOF).
**Trade-off**: Disponibilidade contra custo — cada réplica a mais é dinheiro, mesmo ociosa.
**Na plataforma**: Todo nó com 1 réplica no caminho crítico gera a violação de SPOF; a dimensão
Disponibilidade calcula o efeito das réplicas.
**Fonte**: DDIA, cap. 1 — Reliable, Scalable, and Maintainable Applications.
**Na biblioteca**: Robustez, Recuperabilidade (Richards & Ford).

---

## Mapa problema → conceito

Critério: o conceito é o que o problema **ensina** (padrão do foundational-doc §2.2 + critérios
estruturais da rubrica + dicas), não tudo o que encosta nele. "Sem SPOF" e "nenhum nó saturado" estão em
todos os desafios e por isso não contam sozinhos para Redundância.

| Problema | Conceitos |
|---|---|
| Encurtador de URL | Caching, Redundância |
| Rate limiter distribuído | Backpressure e limitação de taxa |
| Leaderboard | Caching, Filas |
| Sistema de notificações | Fan-out, Filas, Idempotência |
| Feed de notícias | Fan-out, Caching, CAP e PACELC |
| Chat em tempo real | Publish/subscribe, Redundância |
| Upload e streaming de vídeo | Caching, Filas |
| Web crawler | Filas, Backpressure e limitação de taxa |
| Checkout de e-commerce | Transações, CAP e PACELC, Backpressure e limitação de taxa |
| Pagamento Pix | Idempotência, Transações, Filas |
| Matching de corridas | Caching, Particionamento |
| Agregador de cliques | Processamento de streams, Filas |

**Totais por conceito (o "total" do progresso)**: Caching 5 · Filas 6 · Backpressure 3 · Fan-out 2 ·
Idempotência 2 · Transações 2 · CAP e PACELC 2 · Redundância 2 · Publish/subscribe 1 · Particionamento 1 ·
Processamento de streams 1 · Replicação 0 · Consenso 0.
