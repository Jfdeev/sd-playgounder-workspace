# M4.2 — Rascunho de conteúdo dos 9 problemas novos

**Status**: **aprovado pelo autor (2026-10-28)**, com 2 ajustes de entrada por causa da matriz de
conexões do canvas (spec.md, Clarifications 2026-10-28): Rate limiter sem Load Balancer na frente e
Crawler com API Gateway na entrada. Os números das duas referências são reconferidos pelo teste.

Como ler: cada problema traz o nível, o enunciado, os requisitos, a escala (e o pico em rps que ela gera),
a rubrica, as dicas e a solução de referência. Os números da referência (ρ por nó, p99 e custo) **já
foram rodados no `simulate()` de verdade** — não são estimativa. O "aha" é o design ingênuo que falha.

Padrão de rubrica (vale para os 9, como nos 3 atuais): **latência p99 ≤ orçamento**, **nenhum
componente saturado** e **sem ponto único de falha** — mais 2 ou 3 critérios estruturais próprios do
problema. Nos estruturais, "usa X" quer dizer "existe um nó do tipo X no design"; "X consulta Y" quer
dizer "existe uma aresta de X para Y".

Níveis (4 cada; o básico está sempre aberto, resolver qualquer um de um nível abre o próximo):

| Básico | Intermediário | Avançado |
|---|---|---|
| Encurtador de URL *(existe)* | Feed de notícias *(existe)* | Checkout de e-commerce *(existe)* |
| Rate limiter distribuído | Chat em tempo real | Pagamento Pix |
| Leaderboard | Upload e streaming de vídeo | Matching de corridas |
| Sistema de notificações | Web crawler | Agregador de cliques em anúncios |

Uma limitação do engine que aparece em vários: a carga que sai de um nó **se divide** entre as arestas
pelo peso (não se duplica). Onde na vida real a mesma requisição vai a dois lugares, as referências usam
pesos que representam a fração de trabalho de cada lado, e a dica explica.

---

## 1. Rate limiter distribuído — Básico

**Padrão que ensina** (§2.2): token bucket, sliding window, estado compartilhado.

**Enunciado**: Uma API pública está sendo derrubada por poucos clientes que mandam requisição demais.
Projete um limitador que segure cada cliente no seu limite, não importa em qual servidor a requisição
caia.

**Requisitos funcionais**
- Cada cliente (chave de API) tem um limite de requisições por minuto.
- Requisição acima do limite é recusada com um erro claro (HTTP 429) antes de chegar na API.
- O limite vale para o cliente como um todo, mesmo com várias réplicas do limitador atendendo.

**Requisitos não-funcionais**
- O limitador não pode pesar na latência: a API inteira responde em até 100ms no p99.
- Disponibilidade de 99,9% — se o limitador cair, a API cai junto.
- Contagem aproximada é aceitável (deixar passar uns poucos a mais no limite é tolerável).

**Escala**: 1M clientes ativos/dia × 100 req/dia, 90% leitura, 300 B, pico 3× → **~3.472 rps**.
**Orçamento de latência**: 100ms (p99).

**Rubrica**
1. A API responde em até 100ms (p99)
2. Nenhum componente saturado
3. Usa um Rate Limiter na entrada
4. Contador compartilhado: o Rate Limiter consulta um Cache ou NoSQL
5. Sem ponto único de falha no caminho crítico

**Dicas**
- *Por que o contador precisa ficar fora do limitador?* — Com 2 réplicas de Rate Limiter, cada uma
  com seu próprio contador em memória, um cliente com limite de 100/min consegue 200: metade cai em cada
  réplica. O contador precisa morar num lugar que todas as réplicas enxergam — um Cache (tipo Redis,
  com incremento atômico) é o caso clássico.
- *Token bucket ou janela deslizante?* — Token bucket guarda "fichas" que se recarregam a uma taxa fixa
  e permite rajadas curtas; janela deslizante conta as requisições dos últimos N segundos e é mais
  justa nas bordas. As duas cabem num Cache; a diferença é a regra, não a topologia.
- *Por que o limitador fica antes do App Server?* — O objetivo é que o excesso nunca chegue a ocupar
  uma réplica cara de App Server (500 rps cada). Recusar cedo, num componente barato e rápido (12.000
  rps por réplica), é o que protege o resto.

**Solução de referência**: (Cliente →) Rate Limiter ×2 → App Server ×10, com o Rate Limiter
consultando um Cache ×2 (contadores).
Rodado: p99 87ms · ρ máx 0,35 (App Server) · US$ 560/mês · sem violações.
**Raciocínio**: o pico é ~3.472 rps; 10 réplicas de App Server (5.000 rps) escoam com folga. O Rate
Limiter fica na frente e guarda o contador num Cache compartilhado, pra que o limite valha para o
cliente inteiro e não por réplica. Tudo com 2+ réplicas: o limitador está no caminho de toda
requisição, então ele não pode ser um ponto único de falha.
**Aha**: App Server com 1 réplica satura (500 rps < 3.472); limitador sem Cache falha o critério 4.

---

## 2. Leaderboard — Básico

**Padrão que ensina**: sorted set, hot key, aproximação.

**Enunciado**: Um jogo mobile quer mostrar o ranking global e a posição de cada jogador, atualizado a
cada partida. Projete o sistema.

**Requisitos funcionais**
- Ao fim de cada partida, a pontuação do jogador é registrada.
- Qualquer jogador vê o top 100 global e a própria posição.
- O ranking reflete uma partida nova em poucos segundos.

**Requisitos não-funcionais**
- Ler o ranking responde em até 150ms no p99.
- Disponibilidade de 99,9%.
- Atraso de alguns segundos entre a partida e o ranking é aceitável; perder a pontuação, não.

**Escala**: 5M DAU × 40 req/dia, 90% leitura, 200 B, pico 3× → **~6.944 rps**.
**Orçamento de latência**: 150ms (p99).

**Rubrica**
1. O ranking responde em até 150ms (p99)
2. Nenhum componente saturado
3. Usa uma camada de cache (o ranking mora num sorted set em memória)
4. Registro de pontuação assíncrono: usa uma fila
5. Sem ponto único de falha no caminho crítico

**Dicas**
- *Onde mora o ranking?* — Recalcular "ordenar todos os jogadores" a cada leitura num banco é caro.
  Um sorted set em memória (Redis `ZADD`/`ZRANK`) mantém a ordem a cada escrita e responde o top N e a
  posição em tempo logarítmico. No canvas, isso é o Cache.
- *Por que a pontuação passa por uma fila?* — O fim de partida pode chegar em rajada (fim de evento,
  todos terminam juntos). A fila absorve o pico e os Workers gravam no banco no ritmo deles; o jogador
  não espera a gravação.
- *O que é uma hot key?* — O top 100 é lido por todo mundo: é a mesma chave quente. Ele cabe num Cache
  com taxa de acerto altíssima; o que não pode é cada leitura do top 100 ir até o banco.

**Solução de referência**: Load Balancer ×2 → App Server ×18; leitura (peso 9) → Cache ×2 (acerto 95%)
→ NoSQL ×2; escrita (peso 1) → Fila ×2 → Worker ×5 → NoSQL.
Rodado: p99 96ms · ρ máx 0,77 (App Server) · US$ 1.135/mês · sem violações.
**Raciocínio**: 90% do tráfego é leitura do ranking, servida pelo Cache. A pontuação entra pela fila e
os Workers gravam no NoSQL (durável), que também reabastece o Cache no miss. 18 réplicas de App Server
dão 9.000 rps para ~6.944 de pico.
**Aha**: com 1 Worker (200 rps) a escrita de ~694 rps satura; sem fila, o critério 4 falha.

---

## 3. Sistema de notificações — Básico

**Padrão que ensina**: fan-out, fila, retry, idempotência.

**Enunciado**: Vários times da empresa precisam mandar notificações push aos usuários (pedido saiu,
promoção, lembrete). Projete um serviço único de envio.

**Requisitos funcionais**
- Qualquer serviço interno pede o envio de uma notificação para um usuário.
- A notificação é entregue por push; se o provedor falhar, o envio é tentado de novo.
- O usuário nunca recebe a mesma notificação duas vezes.

**Requisitos não-funcionais**
- Aceitar o pedido responde em até 200ms no p99 — o envio em si pode levar segundos.
- Nenhum pedido aceito é perdido, mesmo se o provedor de push ficar fora por minutos.
- Disponibilidade de 99,9% para aceitar pedidos.

**Escala**: 20M usuários × 3 notificações/dia, 10% leitura, 1 KB, pico 4× → **~2.778 rps**.
**Orçamento de latência**: 200ms (p99).

**Rubrica**
1. Aceitar o pedido responde em até 200ms (p99)
2. Nenhum componente saturado
3. Usa uma fila entre aceitar e enviar
4. Usa o componente de Notificações para o envio
5. Idempotência: o Worker consulta um NoSQL ou Cache antes de enviar
6. Sem ponto único de falha no caminho crítico

**Dicas**
- *Por que não enviar direto da API?* — Se o provedor de push demora ou cai, a API trava junto e os
  pedidos se perdem. Com uma fila no meio, a API só aceita e responde; Workers enviam no ritmo possível
  e tentam de novo quando falha.
- *Retry não manda em dobro?* — Manda, se nada impedir: o Worker pode cair depois de enviar e antes de
  confirmar. Por isso cada notificação tem uma chave de idempotência, e o Worker confere num NoSQL se
  aquela chave já foi enviada antes de mandar.
- *Robustez* — Lidar com o provedor fora do ar sem perder pedido é exatamente o que Richards & Ford
  chamam de robustez. (Ler na biblioteca → `robustness`)

**Solução de referência**: API Gateway ×2 → App Server ×8 → Fila ×2 (async) → Worker ×18; Worker →
NoSQL ×2 (chaves de idempotência) e → Notificações ×9.
Rodado: p99 90ms · ρ máx 0,77 (Worker) · US$ 1.245/mês · sem violações.
**Raciocínio**: a API aceita e enfileira — a latência medida é só essa parte. O pico de ~2.778 rps
chega inteiro nos Workers (200 rps cada), daí 18 réplicas. O Worker confere a chave no NoSQL antes de
chamar o provedor; o componente de Notificações (400 rps cada) faz a entrega.
**Aha**: com poucos Workers, eles saturam e a fila só cresce; sem a consulta de idempotência, o
critério 5 falha.

---

## 4. Chat em tempo real — Intermediário

**Padrão que ensina**: WebSocket, presença, ordenação de mensagens.

**Enunciado**: Projete um chat de conversas 1:1 e em grupo, com mensagens chegando na hora e o
indicador de "online".

**Requisitos funcionais**
- Mensagem enviada chega aos participantes conectados em menos de 1 segundo.
- Quem estava offline recebe as mensagens ao reconectar, na ordem em que foram enviadas.
- Cada usuário vê quem está online nas suas conversas.

**Requisitos não-funcionais**
- Entregar uma mensagem responde em até 150ms no p99 (sem contar a rede do celular).
- Mensagem enviada nunca se perde.
- Presença pode estar alguns segundos atrasada.

**Escala**: 5M DAU × 40 req/dia, 50% leitura, 500 B, pico 3× → **~6.944 rps**.
**Orçamento de latência**: 150ms (p99).

**Rubrica**
1. A mensagem é entregue em até 150ms (p99)
2. Nenhum componente saturado
3. Entrega para quem está conectado via Pub/Sub
4. Histórico de mensagens num NoSQL
5. Sem ponto único de falha no caminho crítico

**Dicas**
- *Como representar WebSocket no canvas?* — O engine não modela conexões persistentes. O App Server
  aqui faz o papel do servidor de conexões (gateway WebSocket): cada réplica segura parte dos usuários
  conectados. O que importa é quantas mensagens por segundo ele processa.
- *Como a mensagem chega a quem está em outra réplica?* — O remetente está ligado na réplica A, o
  destinatário na B. Um Pub/Sub entrega a mensagem a todas as réplicas que têm alguém daquela conversa —
  é o mesmo desenho do gateway do Discord (ver Arquiteturas → Discord).
- *Onde mora a presença?* — "Online" é estado efêmero: muda o tempo todo e não precisa de durabilidade.
  Fica num Cache com expiração curta; o histórico de mensagens, que não pode se perder, fica num NoSQL
  ordenado por conversa e horário.

**Solução de referência**: Load Balancer ×2 → App Server ×18 (conexões); App Server → Cache ×2
(presença), → Pub/Sub ×2 (entrega), → NoSQL ×2 (histórico), pesos iguais.
Rodado: p99 98ms · ρ máx 0,77 (App Server) · US$ 1.020/mês · sem violações.
**Raciocínio**: o gargalo é o servidor de conexões: ~6.944 rps em 18 réplicas (9.000). Presença no
Cache (efêmera), entrega pelo Pub/Sub (fan-out entre réplicas), histórico no NoSQL (durável e ordenado
por conversa).
**Aha**: com 1 réplica de App Server, satura; sem Pub/Sub, falha o critério 3.

---

## 5. Upload e streaming de vídeo — Intermediário

**Padrão que ensina**: object storage, transcoding assíncrono, CDN.

**Enunciado**: Projete uma plataforma onde criadores sobem vídeos e qualquer pessoa assiste.

**Requisitos funcionais**
- O criador sobe um vídeo; ele fica disponível depois de processado em várias resoluções.
- Qualquer pessoa assiste a um vídeo publicado.
- O processamento não trava o upload: o criador recebe "processando" e é avisado quando termina.

**Requisitos não-funcionais**
- O vídeo começa a tocar em até 200ms no p99 (primeiro pedaço).
- Assistir é 98% do tráfego; o custo por visualização precisa ser baixo.
- Disponibilidade de 99,9% para assistir.

**Escala**: 20M DAU × 10 req/dia, 98% leitura, 1 MB, pico 3× → **~6.944 rps**.
**Orçamento de latência**: 200ms (p99).

**Rubrica**
1. O vídeo começa a tocar em até 200ms (p99)
2. Nenhum componente saturado
3. Serve o vídeo por CDN
4. Guarda os arquivos em Object Storage
5. Transcoding assíncrono: usa fila e Worker
6. Sem ponto único de falha no caminho crítico

**Dicas**
- *Por que não guardar o vídeo no banco?* — Vídeo é arquivo grande e imutável; banco relacional é
  para registros pequenos que mudam. Object Storage é barato por GB e feito para isso; o banco guarda só
  os metadados (título, dono, status).
- *O que o transcoding faz e por que é assíncrono?* — Converter um vídeo para 360p, 720p e 1080p leva
  minutos de CPU. Se o upload esperasse, a requisição estouraria qualquer orçamento. O upload só grava o
  original e enfileira; Workers convertem em segundo plano.
- *E a CDN?* — Assistir é quase todo o tráfego e o mesmo vídeo é visto por muita gente: a CDN entrega
  de perto do usuário. Observação: no engine a CDN não "segura" carga como o Cache — o Object Storage de
  origem ainda precisa aguentar o que passa por ela.

**Solução de referência**: CDN ×2 (entrada) → Object Storage ×5 (peso 98, assistir); CDN → App Server ×2
(peso 2, upload) → SQL Primary ×2 (metadados) e → Fila ×2 → Worker ×2 (transcoding) → Object Storage.
Rodado: p99 114ms · ρ máx 0,69 (Object Storage) · US$ 680/mês · sem violações.
**Raciocínio**: assistir passa pela CDN e lê do Object Storage (5 réplicas para ~6.800 rps). O upload é
pequeno em volume: grava metadados no SQL e enfileira o transcoding, que os Workers fazem fora do
caminho do usuário e gravam de volta no Object Storage.
**Aha**: Object Storage com 1 réplica (2.000 rps) satura; transcoding síncrono (sem fila) falha o
critério 5.

---

## 6. Web crawler — Intermediário

**Padrão que ensina**: fila de trabalho, politeness, dedupe em escala.

**Enunciado**: Projete um robô que visita a web continuamente para um buscador, sem visitar a mesma
página duas vezes e sem derrubar os sites que visita.

**Requisitos funcionais**
- A partir de uma lista de sites, o crawler baixa páginas e descobre novos links.
- Cada URL é baixada uma vez por ciclo (sem duplicata).
- Cada site recebe no máximo uma requisição por segundo (politeness).
- O conteúdo baixado fica guardado para a indexação.

**Requisitos não-funcionais**
- Ritmo sustentado: ~460 páginas/s, com picos de 2×. (Na escala abaixo, "usuários" são sites
  acompanhados e "requisições" são páginas por site por dia.)
- Uma réplica caindo não pode parar o crawler.
- Não há usuário esperando: o orçamento de latência é largo (1s no p99 por página processada).

**Escala**: 2M sites × 20 páginas/dia, 50% leitura, 100 KB, pico 2× → **~926 rps**.
**Orçamento de latência**: 1.000ms (p99).

**Rubrica**
1. Cada página é processada em até 1s (p99)
2. Nenhum componente saturado
3. Fronteira de URLs numa fila
4. Politeness: um Scheduler controla o ritmo por site
5. Dedupe: o Worker consulta um NoSQL ou Cache de URLs já vistas
6. Sem ponto único de falha no caminho crítico

**Dicas**
- *O que é a "fronteira"?* — É a lista de URLs a visitar. Ela cresce a cada página (cada página traz
  dezenas de links) e precisa ser consumida por vários Workers ao mesmo tempo: é uma fila de trabalho.
- *Como não derrubar um site?* — Se 50 Workers pegarem 50 URLs do mesmo site, o site recebe 50
  requisições de uma vez. O Scheduler decide *quando* cada URL pode sair, respeitando um intervalo por
  domínio — o engine não modela o intervalo, mas a rubrica cobra que alguém tenha essa responsabilidade.
- *Como saber se uma URL já foi vista, com bilhões delas?* — Um conjunto de URLs vistas num NoSQL (ou um
  filtro de Bloom em Cache, que erra só para o lado de "já vi"). O Worker consulta antes de baixar.

**Solução de referência**: API Gateway ×2 (sementes) → Scheduler ×6 → Fila ×2 → Worker ×6; Worker → NoSQL ×2 (vistas) e
→ Object Storage ×2 (páginas).
Rodado: p99 77ms · ρ máx 0,77 (Scheduler e Worker) · US$ 560/mês · sem violações.
**Raciocínio**: o Scheduler solta as URLs no ritmo permitido por site para a fila; os Workers baixam,
conferem no NoSQL se a URL é nova e guardam a página no Object Storage. ~926 rps em 6 réplicas de
Scheduler e de Worker (1.200 rps cada grupo).
**Aha**: Worker com 1 réplica (200 rps) satura; sem Scheduler, falha o critério 4.

---

## 7. Pagamento Pix — Avançado

**Padrão que ensina**: idempotência, exactly-once, conciliação, auditoria. (Conteúdo brasileiro, §7.9.)

**Enunciado**: Projete o envio de Pix de um banco digital: o cliente confirma, o dinheiro sai da conta e
chega no outro banco pelo SPI do Banco Central.

**Requisitos funcionais**
- O cliente envia um Pix; o valor é debitado da conta e liquidado pelo SPI.
- Um toque duplo, ou um retry do app, nunca gera dois Pix.
- No fim do dia, cada Pix do banco bate com o extrato do Banco Central (conciliação).
- Todo Pix fica registrado para auditoria.

**Requisitos não-funcionais**
- O Pix é confirmado em até 2s no p99 — o SPI externo é a parte mais lenta.
- Consistência forte no saldo: nunca debitar duas vezes nem ficar negativo por corrida.
- Disponibilidade de 99,9%; o cliente precisa estar autenticado.

**Escala**: 10M clientes ativos × 2 Pix/dia, 20% leitura, 2 KB, pico 4× (dia de pagamento) →
**~926 rps**.
**Orçamento de latência**: 2.000ms (p99).

**Rubrica**
1. O Pix é confirmado em até 2s (p99)
2. Nenhum componente saturado
3. Exige autenticação (Auth Service no caminho)
4. Idempotência: o serviço consulta um NoSQL ou Cache de chaves antes de liquidar
5. Saldo num banco relacional (SQL Primary)
6. Conciliação e auditoria assíncronas: usa Kafka, Event Stream ou fila
7. Sem ponto único de falha no caminho crítico

**Dicas**
- *O que é idempotência aqui?* — O app manda cada Pix com um identificador único (o `endToEndId` do Pix
  tem esse papel). Antes de liquidar, o serviço confere se aquele id já foi processado; se sim, devolve o
  resultado anterior em vez de mandar de novo. Sem isso, um retry de rede vira dinheiro saindo duas vezes.
- *Por que SQL e não NoSQL para o saldo?* — Debitar é "ler saldo, conferir, gravar novo saldo" — duas
  operações concorrentes no mesmo saldo precisam de transação. Mesmo raciocínio do Checkout.
- *Conciliação e auditoria* — Cada Pix vira um evento num log (Kafka); um Worker compara com o extrato
  do Banco Central e guarda a trilha. Fica fora do caminho do cliente, mas não pode perder evento. Errar
  aqui custa dinheiro: é o que Richards & Ford chamam de confiabilidade / segurança operacional. (Ler na
  biblioteca → `reliability-safety`)

**Solução de referência**: API Gateway ×2 → Auth Service ×3 → App Server ×4; App Server → NoSQL ×2
(idempotência, peso 1), → SQL Primary ×2 (saldo, peso 1), → API externa (SPI) ×6 (peso 3), → Kafka ×2
(async, peso 1) → Worker ×2 (conciliação).
Rodado: p99 970ms · ρ máx 0,77 (SPI) · US$ 1.315/mês · sem violações.
**Raciocínio**: a autenticação vem antes de tudo. O serviço confere a chave de idempotência, debita o
saldo no SQL (transação) e liquida no SPI, que é lento (100 rps por réplica) e domina a latência. Cada
Pix vira evento no Kafka para a conciliação e a auditoria, fora do caminho do cliente.
**Aha**: com 1 réplica da API externa, ela satura; sem a consulta de idempotência, o critério 4 falha.

---

## 8. Matching de corridas — Avançado

**Padrão que ensina**: índice geoespacial, escrita alta, estado efêmero.

**Enunciado**: Projete o núcleo de um app de corridas: motoristas mandam a localização o tempo todo e,
quando um passageiro pede, o sistema acha os motoristas mais próximos.

**Requisitos funcionais**
- Motoristas online enviam a posição a cada poucos segundos.
- Ao pedir uma corrida, o passageiro recebe os motoristas mais próximos e um é designado.
- A corrida (quem, de onde, para onde, valor) fica registrada.

**Requisitos não-funcionais**
- Encontrar motoristas responde em até 200ms no p99.
- 80% do tráfego são atualizações de posição: a escrita é muito mais alta que a leitura.
- Posição antiga de segundos é aceitável; corrida registrada não pode se perder.

**Escala**: 500k usuários × 720 req/dia, 20% leitura, 200 B, pico 2× → **~8.333 rps**.
**Orçamento de latência**: 200ms (p99).

**Rubrica**
1. Encontrar motoristas responde em até 200ms (p99)
2. Nenhum componente saturado
3. Posições num Cache (estado efêmero em memória)
4. Corridas num banco durável (SQL ou NoSQL)
5. As atualizações de posição não vão para o banco relacional (o SQL recebe menos de 30% da carga de
   entrada)
6. Sem ponto único de falha no caminho crítico

**Dicas**
- *Por que a posição não vai para o banco?* — São milhares de escritas por segundo de um dado que vale
  por segundos. Gravar cada uma num SQL é caro e inútil. A posição atual fica em memória (Cache), e só a
  corrida, que tem valor de negócio, vai para o banco.
- *O que é um índice geoespacial?* — Divide o mapa em células (geohash, S2, H3); "motoristas perto"
  vira "motoristas nesta célula e nas vizinhas", uma consulta barata. Redis tem isso pronto (`GEOSEARCH`).
  No canvas, é o Cache.
- *Por que dois serviços?* — Receber posição (muita escrita, simples) e fazer matching (pouca leitura,
  lógica de negócio) escalam diferente. Separá-los é responsabilidade única: cada um cresce em réplicas
  conforme a própria carga. (Ler na biblioteca → `srp`)

**Solução de referência**: Load Balancer ×2 → App Server de localização ×18 (peso 8) → Cache ×2
(posições); Load Balancer → App Server de matching ×6 (peso 2) → Cache (lê posições) e → SQL Primary ×2
(corridas).
Rodado: p99 116ms · ρ máx 0,74 (localização) · US$ 1.180/mês · sem violações · SQL recebe ~10% da
carga.
**Raciocínio**: 80% da carga é posição: 18 réplicas recebem ~6.667 rps e gravam só no Cache. O matching
(~1.667 rps) lê posições do Cache e grava a corrida no SQL — que assim recebe uma fração pequena do
tráfego.
**Aha**: mandar a posição para o SQL faz o banco saturar e falha o critério 5.

---

## 9. Agregador de cliques em anúncios — Avançado

**Padrão que ensina**: stream processing, janelas, contagem aproximada.

**Enunciado**: Anunciantes querem ver, quase em tempo real, quantos cliques cada anúncio recebeu por
minuto — e pagar por eles. Projete a coleta e a agregação.

**Requisitos funcionais**
- Cada clique em um anúncio é registrado.
- O anunciante vê cliques por anúncio por minuto, com atraso de até 1 minuto.
- Os cliques brutos ficam guardados para cobrança e auditoria.

**Requisitos não-funcionais**
- Registrar o clique responde em até 50ms no p99 (o usuário está indo para o site do anunciante).
- Nenhum clique pode se perder — é dinheiro.
- O painel aceita contagem aproximada; a cobrança usa a contagem exata dos dados brutos.

**Escala**: 200M cliques/dia, 100% escrita, 300 B, pico 3× → **~6.944 rps**.
(`readWriteRatio` 0,01 — o catálogo exige > 0.)
**Orçamento de latência**: 50ms (p99).

**Rubrica**
1. Registrar o clique responde em até 50ms (p99)
2. Nenhum componente saturado
3. Ingestão por log durável: usa Kafka ou Event Stream
4. Processamento em stream: usa Analytics
5. Agregados por minuto num NoSQL
6. Sem ponto único de falha no caminho crítico

**Dicas**
- *Por que o clique entra num log e não direto no banco?* — O clique precisa ser aceito rápido e não
  pode se perder. Um log durável (Kafka) aceita a escrita em milissegundos e guarda tudo; quem processa
  lê depois, no próprio ritmo.
- *O que é uma janela?* — "Cliques por minuto" é uma janela de tempo: o processador de stream agrupa os
  eventos de cada minuto e emite um total. Eventos atrasados são o problema clássico — por isso o painel
  aceita aproximação e a cobrança recalcula dos dados brutos.
- *Por que dois caminhos (painel e cobrança)?* — Painel quer rapidez, cobrança quer exatidão. O stream
  alimenta o painel; os brutos vão para o Data Warehouse, onde um processamento em lote recalcula o
  valor exato (a "arquitetura lambda").

**Solução de referência**: API Gateway ×2 → Kafka ×2; Kafka → Analytics ×24 (async, peso 9) → NoSQL ×2
(agregados); Kafka → Data Warehouse ×5 (async, peso 1, brutos).
Rodado: p99 14ms · ρ máx 0,74 (Analytics) · US$ 3.440/mês · sem violações.
**Raciocínio**: o clique é aceito pelo Gateway e gravado no Kafka — o caminho do usuário termina aí,
por isso o p99 é baixo. O processamento é assíncrono: Analytics agrega por minuto e grava no NoSQL; os
brutos seguem para o Data Warehouse. Analytics é caro por réplica (350 rps), daí as 24 réplicas — o custo
deste problema é o maior do catálogo, e de propósito.
**Aha**: gravar o clique direto num banco síncrono estoura os 50ms ou satura; Analytics com poucas
réplicas satura.

---

## O que muda fora do conteúdo (para revisão junto)

- `Problem` ganha `level`; os 3 atuais ficam Encurtador → básico, Feed → intermediário, Checkout →
  avançado.
- Destrave por nível no cliente e no servidor (a regra nova só abre mais do que a antiga).
- Critérios repetidos (latência, saturação, SPOF, "usa X", "X consulta Y") viram construtores
  compartilhados em `packages/problems`; os 3 problemas atuais passam a usá-los, sem mudar o que avaliam.
- "Catálogo completo" passa a exigir os 12 (quem já ganhou continua com a conquista).
- Engine, narrador e banco intocados.

---

## Dicas citadas acrescentadas (aprovadas em 2026-10-28)

A regra do M2.6 exige uma dica citando obra clássica em todo problema; estas completam os 6 que não
tinham.

| Problema | Dica | Obra · entrada |
|---|---|---|
| Rate limiter | *Por que o limitador é um componente e não um `if` dentro da API?* — Limitar tráfego e atender o negócio mudam por motivos e por pessoas diferentes; separados, um não quebra o outro. | Clean Architecture · `srp` |
| Leaderboard | *E se o Cache cair?* — O ranking em memória é reconstruído a partir do NoSQL; por isso a pontuação é gravada num banco durável. | Fundamentals · `recoverability` |
| Chat | *E se uma réplica de conexões cair?* — O app reconecta em outra e busca o que perdeu no histórico do NoSQL; o chat segue funcionando sob falha. | Fundamentals · `robustness` |
| Vídeo | *Por que o upload não sabe nada de transcoding?* — A fila é uma fronteira: o upload só publica "vídeo novo"; trocar o transcodificador não mexe no upload. | Clean Architecture · `boundaries` |
| Web crawler | *Onde ficam robots.txt, timeouts e o intervalo por site?* — Num único ponto que encapsula o acesso aos sites externos. | PoEAA · `gateway` |
| Cliques em anúncios | *Por quanto tempo guardar os cliques brutos?* — O que a cobrança e a auditoria exigem; depois, arquivados ou apagados conforme a política. | Fundamentals · `archivability` |
