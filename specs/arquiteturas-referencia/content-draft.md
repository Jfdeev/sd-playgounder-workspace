# Rascunho de conteúdo — M2.5, preset do GitHub (MVP) — aguardando aprovação do autor

> **Gate (FR-008)**: rascunho assistido por LLM. Cada afirmação abaixo foi tirada de uma página que
> **abriu e foi lida** (registro em `research.md` §1); a frase de apoio de cada item é paráfrase da
> fonte. Nada daqui vira código antes da sua aprovação. Os presets de Discord, iFood, Nubank e Netflix
> serão redigidos um a um, cada um com o seu gate — iFood e Nubank só depois de ler as fontes
> pendentes.
>
> Siglas das fontes: **[P]** *Partitioning GitHub's relational databases to handle scale* ·
> **[S]** *Stretching Spokes* · **[K]** *How we improved push processing on GitHub*.

## Identidade

- **Empresa**: GitHub · **id**: `github`
- **Resumo (pt-br)**: "O GitHub nasceu como uma aplicação Ruby on Rails com um único banco MySQL e
  cresceu sem abandonar o monolito: particionou o banco, passou a guardar cada repositório Git em
  várias réplicas e trocou um job gigante de processamento de push por eventos."
- **Fontes**: as três acima (publicador: GitHub).

## Componentes (design do preset)

`entryNodeIds: ['rails-monolith']` — o cliente é o nó visual do canvas, fora do `Design`.

| id | Tipo no catálogo | Réplicas | Fonte | Explicação (o que aparece em "Por que está aqui") |
|---|---|---|---|---|
| `rails-monolith` | `app_server` | 6 *(ilustrativo)* | [P], [K] | "O GitHub começou (segundo o post de 2021, há mais de 10 anos) como uma aplicação Ruby on Rails e o monolito continua no centro: é ele que é notificado de cada push e dispara o processamento. Só no push, mais de 60 pedaços de lógica, pertencentes a 20 serviços, rodam em resposta direta a ele." |
| `mysql-primary` | `sql_primary` | 2 *(ilustrativo)* | [P] | "Os dados dos recursos centrais (perfis, repositórios, issues e pull requests) ficavam num cluster principal, o `mysql1`. Com o crescimento, foi preciso escalar sempre para máquinas maiores, e um incidente nesse cluster afetava todas as funcionalidades que guardavam dados nele — o que levou ao plano, de 2019, de particionar os bancos relacionais." |
| `mysql-read-replicas` | `sql_replica` | 4 *(ilustrativo)* | [P] | "Foram adicionadas réplicas de leitura para espalhar a carga de leitura por várias máquinas, aliviando o primário." |
| `git-fileservers` | `object_storage` *(aproximação)* | 3 *(ilustrativo)* | [S] | "O Spokes guarda várias réplicas de cada repositório Git em fileservers e as mantém sincronizadas; todo push passa por um proxy que replica para vários deles, e a replicação exige ao menos um quórum de réplicas. Espalhar as réplicas aumenta a chance de algumas sobreviverem a um desastre que afete uma grande região." |
| `push-events` | `kafka` | 3 *(ilustrativo)* | [K] | "Antes, o monolito enfileirava um job enorme (`RepositoryPushJob`) com toda a lógica de push, numa sequência longa e frágil. Agora ele publica um evento por push num tópico Kafka." |
| `push-workers` | `worker` | 4 *(ilustrativo)* | [K] | "As tarefas de push, agrupadas por serviço dono, passaram a rodar em processos paralelos e isolados. Assim cada time evolui a sua parte sem afetar os outros, nenhuma tarefa espera as demais, e o push é processado com menor latência." |

## Conexões

| id | De → Para | Tipo de aresta | Base | Fonte / justificativa |
|---|---|---|---|---|
| `e1` | `rails-monolith` → `mysql-primary` | `write` | **afirmada** | [P]: aplicação Rails sobre o cluster MySQL principal |
| `e2` | `rails-monolith` → `mysql-read-replicas` | `read` | **afirmada** | [P]: réplicas de leitura adicionadas para espalhar a carga |
| `e3` | `mysql-primary` → `mysql-read-replicas` | `replication` | **inferida** | consequência do papel de "réplica de leitura"; [P] não descreve o mecanismo |
| `e4` | `rails-monolith` → `git-fileservers` | `write` | **inferida** | [S] fala de um proxy entre o push e os fileservers; o proxy não existe no catálogo, então a aresta o colapsa |
| `e5` | `rails-monolith` → `push-events` | `write` | **afirmada** | [K]: um evento é publicado no tópico Kafka a cada push |
| `e6` | `push-events` → `push-workers` | `async` | **inferida** | [K] diz que as tarefas rodam em processos paralelos por serviço dono; que sejam consumidores do tópico é a consequência natural |

Todas as arestas são aceitas pela matriz de conexões do canvas (`research.md` §2).

## O que a simulação não modela (limitações exibidas no preset)

1. **ProxySQL** e o **Vitess** (sharding vertical, partições virtuais, *schema domains*) não existem no
   catálogo — o banco aparece como um primário e réplicas de leitura, sem o particionamento.
2. O **proxy do Spokes**, o **three-phase commit** e o **quórum** de réplicas não são representados; os
   fileservers do Git são **aproximados** por `object_storage`, que não é a mesma coisa.
3. As arestas `e3`, `e4` e `e6` são **inferidas** (ver tabela).
4. Não há balanceador, borda nem cache no preset porque **as fontes lidas não os afirmam** — não que o
   GitHub não os tenha.
5. O que as tarefas de push **gravam** depois de consumir os eventos não é afirmado pelas fontes e não
   aparece.

## Parâmetros ilustrativos

Todas as **réplicas** da tabela e a **carga** da simulação (o controle de requisições/s) são
**ilustrativos**: nenhuma das três fontes publica esses números para os componentes modelados.
Resultados de "Simular" sobre este preset exibem: "valores ilustrativos — não são os da empresa".
