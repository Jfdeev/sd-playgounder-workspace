# Rascunho de conteúdo — M3 — os 5 incidentes — aguardando aprovação do autor

> **Gate (T010)**: nada daqui vira código antes da sua aprovação. Cada incidente já passou, no
> scratch, em todas as checagens mecânicas (research §6): sintoma presente no estado "durante" e
> ausente no "antes" (SC-002); **busca de unicidade sem nenhum par ambíguo** — só a causa plantada
> reproduz a tela (SC-001); fix de referência aceito; design original recusado; design sem o
> componente afetado recusado (SC-005). Números = engine; o alerta descreve só o que o snapshot mostra.
>
> O título e o alerta são públicos (vão pro navegador). Falha, critério do fix, fix de referência e
> "o que aconteceu" ficam no módulo só-servidor; "o que aconteceu" só aparece depois do diagnóstico
> certo.

Critério do fix, igual nos 5 (com a falha ainda ativa): p99 ≤ 150 ms, nenhum componente saturado,
throughput ≥ carga do incidente, nenhum componente removido, nenhum componente perdido pela falha, o
componente afetado continua alcançável, nenhum órfão novo.

---

## 1. Cache frio — "Banco no limite às 3h"

- **Alerta**: "Às 3h12, logo depois de um deploy, a latência foi ao teto e o banco de dados ficou
  saturado. O tráfego que entra no sistema é o mesmo de sempre."
- **Arquitetura** (2.400 rps): Load Balancer (2) → App Server (7) → Cache (2, 90% de acerto) → SQL
  Primary (2).
- **O que a tela mostra**: o banco passa de 240 para 2.400 rps de carga e satura (ρ 0,12 → 1,20); load
  balancer, app server e cache com a mesma carga de antes; latência infinita.
- **Causa plantada**: Cache × cache frio (taxa de acerto → 0).
- **O que aconteceu**: "O deploy reiniciou o cluster de cache e ele voltou vazio. Com 0% de acerto,
  toda leitura que antes parava no cache passou a ir direto pro banco — dez vezes mais consultas, com o
  mesmo tráfego de entrada."
- **Fix de referência**: SQL Primary com 4 réplicas (aguenta a carga inteira mesmo com o cache frio).

## 2. Nó caído — "Servidores de aplicação no limite"

- **Alerta**: "Às 3h40, a latência disparou e o app server saturou. O tráfego de entrada não mudou, e o
  painel acusa um novo ponto único de falha."
- **Arquitetura** (1.200 rps): Load Balancer (2) → App Server (5) → SQL Primary (2).
- **O que a tela mostra**: o app server com a mesma carga satura (ρ 0,48 → 2,40); aparece um ponto
  único de falha no app server; banco igual.
- **Causa plantada**: App Server × nó caído (4 das 5 instâncias).
- **O que aconteceu**: "Quatro das cinco instâncias do app server caíram (falta de memória). A única
  que sobrou recebe todo o tráfego — e virou ponto único de falha."
- **Fix de referência**: App Server com 8 instâncias (mesmo perdendo 4, as que ficam aguentam).

## 3. Partição de rede — "Pedidos que não chegam ao processamento"

- **Alerta**: "Desde as 2h50, os pedidos continuam sendo aceitos normalmente, mas nada chega ao
  processamento assíncrono. A latência está normal."
- **Arquitetura** (1.000 rps): Load Balancer (2) → App Server (4) → Kafka (3) → Worker (4) → SQL
  Primary (2); o App Server também lê do SQL Primary.
- **O que a tela mostra**: Kafka e Worker sem tráfego (antes: 500 rps cada) e marcados como órfãos;
  app server, banco e latência iguais.
- **Causa plantada**: partição entre App Server e Kafka (vale apontar qualquer uma das duas pontas).
- **O que aconteceu**: "Uma regra de firewall nova isolou o Kafka do app server. As requisições
  continuam sendo atendidas, mas nenhum evento é publicado — o processamento assíncrono parou sem
  ninguém perceber pela latência."
- **Fix de referência**: um segundo grupo de App Server (2) atrás do Load Balancer, também publicando
  no Kafka — um caminho que não passa pelo trecho isolado.

## 4. Zona caída — "Tudo piorou ao mesmo tempo"

- **Alerta**: "Às 4h05, o app server ficou sobrecarregado, o banco parou de receber consultas e o
  painel acusa um novo ponto único de falha — tudo no mesmo minuto."
- **Arquitetura** (900 rps): Load Balancer (3) → App Server (3) → Cache (2, 80% de acerto) → SQL
  Primary (1). (O banco com 1 réplica já aparece como ponto único de falha antes do incidente.)
- **O que a tela mostra**: app server sobrecarregado (ρ 0,60 → 0,90); banco sem tráfego; o cache vira
  ponto único de falha; load balancer um pouco mais carregado.
- **Causa plantada**: zona de disponibilidade caída (zona 0; vale o tipo com qualquer componente). Pela
  regra de 3 zonas, cada componente perde 1/3 das réplicas, e o banco, que só tinha uma, morre.
- **O que aconteceu**: "Uma zona de disponibilidade inteira caiu. Cada componente perdeu as réplicas
  que estavam nela; o banco, que só tinha uma réplica — justamente nessa zona —, sumiu."
- **Fix de referência**: SQL Primary com 2 réplicas e App Server com 5.

## 5. Pool de conexões esgotado — "Banco saturado sem aumento de carga"

- **Alerta**: "Às 3h30, o banco de dados saturou e a latência foi ao teto, mas a carga que chega nele é
  a mesma de antes."
- **Arquitetura** (1.500 rps): Load Balancer (2) → App Server (5) → SQL Primary (3).
- **O que a tela mostra**: o banco com a mesma carga (1.500 rps) satura (ρ 0,50 → 1,67), sem ponto único
  de falha novo e sem perder nada; o resto igual.
- **Causa plantada**: SQL Primary × pool de conexões esgotado (30% da capacidade).
- **O que aconteceu**: "Um vazamento de conexões esgotou o pool do banco: só 30% da capacidade continua
  atendendo. A carga é a mesma, mas o banco não dá conta — e nenhuma instância caiu."
- **Fix de referência**: SQL Primary com 8 réplicas (com 30% de cada uma, a capacidade total volta a
  sobrar).

---

## Decisões para o autor

- **"O que aconteceu"** depois do diagnóstico certo é proposta minha (o spec não pedia). Fica ou sai?
- **Critério do fix**, além do que o spec já dizia, ganhou duas regras que os rascunhos mostraram
  necessárias: o fix **não pode remover componentes** que a arquitetura já tinha (apagar o banco
  "resolvia" a zona caída) e **nenhum componente pode sumir pela falha** (o design original "resolvia"
  a zona caída porque o banco removido não contava como órfão).
- Nomes dos incidentes e horários são narrativa; os números são do engine.
