# Rascunho de conteúdo — M2.5, preset Netflix — nuvem e Open Connect — aguardando aprovação do autor

> **Gate (FR-008)**: rascunho assistido por LLM. Cada afirmação foi tirada de uma página que **abriu e
> foi lida** em 2026-10-07 (registro em `research.md` §1); as frases são paráfrase da fonte. Este texto
> foi gerado do mesmo dado que já passou nas checagens dos testes (validador dos 7 invariantes, matriz
> de conexões do canvas e `simulate()` sem violação) — aprovado, ele vira `presets/netflix.ts` literal.

## Identidade

- **Nome no menu**: Netflix — nuvem e Open Connect · **id**: `netflix`
- **Resumo**: "Na Netflix, tudo o que acontece antes do play (interface, descoberta, recomendações) roda na nuvem da AWS; o que vem depois do play é entregue pelo Open Connect, a CDN própria da Netflix, com servidores dentro das redes dos provedores de internet ou ligados diretamente a elas."

## Fontes

1. [How Netflix Works With ISPs Around the Globe to Deliver a Great Viewing Experience](https://about.netflix.com/en/news/how-netflix-works-with-isps-around-the-globe-to-deliver-a-great-viewing-experience) — publicador: Netflix
2. [Open Connect Appliances](https://openconnect.netflix.com/en/appliances/) — publicador: Netflix
3. [Zuul (README)](https://github.com/Netflix/zuul) — publicador: Netflix
4. [EVCache (README e wiki)](https://github.com/Netflix/EVCache) — publicador: Netflix
5. [Eureka at a glance](https://github.com/Netflix/eureka/wiki/Eureka-at-a-glance) — publicador: Netflix
6. [Priam (README)](https://github.com/Netflix/Priam) — publicador: Netflix

## Componentes

`entryNodeIds: ['zuul', 'open-connect']` — o cliente é o nó visual do canvas.

| id | Rótulo | Tipo no catálogo | Réplicas | Fonte | Explicação ("Por que está aqui") |
|---|---|---|---|---|---|
| `zuul` | Zuul | `api_gateway` | 4 *(ilustrativo)* | [3] | "O Zuul é o gateway de aplicação (camada 7) da Netflix, com roteamento dinâmico, monitoramento, resiliência e segurança." |
| `aws-services` | Serviços na AWS | `app_server` | 8 *(ilustrativo)* | [1], [5] | "Segundo a Netflix, essencialmente tudo antes do play acontece na AWS: a lógica da interface, a descoberta e a escolha de conteúdo, os algoritmos de recomendação e a transcodificação. Os serviços dessa camada intermediária se encontram pelo Eureka, um serviço REST de descoberta usado para balanceamento de carga e failover entre eles." |
| `evcache` | EVCache | `cache` | 3 *(ilustrativo)* | [4] | "O EVCache é o cache da Netflix baseado em memcached, para dados usados com frequência na infraestrutura AWS EC2. Os dados são distribuídos pelo cluster por hash consistente e podem ser replicados entre zonas de disponibilidade: as leituras vão para a zona local, as gravações para todas." |
| `cassandra` | Apache Cassandra | `nosql_kv` *(aproximação)* | 3 *(ilustrativo)* | [6] | "A Netflix usa o Apache Cassandra, um banco colunar de alta disponibilidade, e mantém o Priam, ferramenta que roda ao lado dele para automatizar backup e recuperação, gerenciamento de tokens e configuração na AWS. <br>*Aproximação:* O Cassandra é um banco colunar; o catálogo o representa como NoSQL (KV)." |
| `open-connect` | Open Connect | `cdn` | 6 *(ilustrativo)* | [1], [2] | "O Open Connect, CDN própria criada em 2011, entrega 100% do tráfego de vídeo da Netflix. Os appliances ficam em pontos de troca de tráfego e embarcados nos provedores de internet (perto de 1.000 locais em 2016), e cerca de 90% do tráfego vai por conexões diretas com os provedores. Cada appliance informa sua saúde e carga, e isso entra nas decisões de para onde mandar cada cliente." |
| `transcoding-repo` | Repositório de transcodificação | `object_storage` *(aproximação)* | 2 *(ilustrativo)* | [1] | "Cada arquivo é copiado uma vez do repositório de transcodificação nos EUA para os locais de armazenamento de cada região, fora do horário de pico, e de lá replicado para os servidores Open Connect dentro dos provedores. Modelos de popularidade decidem qual arquivo fica em qual servidor. <br>*Aproximação:* O repositório de transcodificação é aproximado por Object Storage." |

## Conexões

| id | De → Para | Tipo de aresta | Base | Fonte / justificativa |
|---|---|---|---|---|
| `e1` | Zuul → Serviços na AWS | `read` | **inferida** | O README do Zuul fala em roteamento dinâmico, mas não diz para quais serviços. |
| `e2` | Serviços na AWS → EVCache | `read` | **afirmada** | [4] |
| `e3` | EVCache → Apache Cassandra | `read` | **inferida** | O EVCache guarda dados que viriam de um banco ou de um serviço intermediário; que esse banco seja o Cassandra não é afirmado. |
| `e4` | Open Connect → Repositório de transcodificação | `read` | **inferida** | Na Netflix o conteúdo é pré-posicionado fora do pico; o engine trata esta aresta como leitura na origem quando falta o arquivo, o que não é o mesmo. |

Todas as arestas (e as do Cliente até cada entrada) são aceitas pela matriz de conexões do canvas.

## O que a simulação não modela (limitações exibidas no preset)

1. O Eureka (descoberta de serviços) não existe no catálogo; aparece só na explicação dos serviços na AWS.
2. As arestas e1, e3 e e4 são inferidas (ver as conexões inferidas).
3. Os serviços na AWS (interface, recomendação, transcodificação) aparecem como um único App Server; o sistema de controle que manda cada cliente para um appliance também não aparece.
4. O post sobre o Open Connect é de 2016; os READMEs são atuais. O preset não é uma foto de um único momento.
5. O blog técnico da Netflix não abriu para a pesquisa (403); só entrou o que as páginas lidas afirmam.

## Decisões para o autor

- O post do Open Connect é de **2016** (about.netflix.com); os READMEs do Zuul, EVCache, Eureka e Priam são atuais.
- A aresta Open Connect → repositório é **inferida** e o engine a trata como leitura na origem quando falta o arquivo — na Netflix o conteúdo é pré-posicionado fora do pico.
- Os serviços na AWS viram um único App Server; o Eureka aparece só na explicação.
