# Research: M2.5 — Arquiteturas de referência

## 1. Registro de fontes (o que foi aberto e lido em 2026-10-03)

Regra do FR-003: só conta como fonte uma página que **respondeu 200 e cujo texto foi lido** (buscado
cru com `curl`, não via resumo de buscador). A pesquisa mostrou por que essa regra importa: o
buscador listou um link do Datomic sobre o Nubank que devolve **404**, e o Tech Blog do Netflix e o
Medium do Nubank devolvem **403** (Cloudflare) para este ambiente.

Legenda — **Lido**: o texto foi lido e as afirmações abaixo saíram dele. **Aberta, não lida**:
responde 200 mas o conteúdo ainda não foi lido (será lido ao redigir aquele preset).
**Inacessível**: 403/404.

### GitHub — preset do MVP (P0), fontes lidas

| Fonte (publicador: GitHub) | Status | O que ela afirma (lido) |
|---|---|---|
| [Partitioning GitHub's relational databases to handle scale](https://github.blog/engineering/infrastructure/partitioning-githubs-relational-databases-scale/) | Lido | Rails + MySQL desde o início; um cluster principal (`mysql1`) com perfis, repositórios, issues e PRs; **réplicas de leitura** para espalhar carga; **ProxySQL** para reduzir conexões abertas no primário; **Vitess** como camada de escala sobre o MySQL (sharding vertical) |
| [Stretching Spokes](https://github.blog/engineering/infrastructure/stretching-spokes/) | Lido | **Spokes** guarda várias réplicas de cada repositório Git e as mantém sincronizadas; todo push passa por um **proxy** que replica de forma transparente para vários **fileservers**; replicação ao nível do Git (não de bloco); exige quórum de réplicas; usa three-phase commit |
| [How we improved push processing on GitHub](https://github.blog/engineering/architecture-optimization/how-we-improved-push-processing-on-github/) | Lido | O **monolito Rails** recebe o push; antes enfileirava um job gigante (`RepositoryPushJob`); agora **publica um evento num tópico Kafka por push**, e as tarefas, agrupadas por serviço dono, rodam em processos paralelos isolados |

Não afirmado nessas fontes (**não entra** no preset): balanceador/borda, número exato de fileservers por
repositório ("três" veio só de resumo de terceiros), qualquer cache.

### Discord — fonte lida

| Fonte (publicador: Discord) | Status | O que afirma (lido) |
|---|---|---|
| [How Discord Stores Trillions of Messages](https://discord.com/blog/how-discord-stores-trillions-of-messages) | Lido | **Monolito de API** → **data services** (serviços intermediários, escritos em Rust, sem regra de negócio) → **cluster de banco** (Cassandra → ScyllaDB, compatível com o protocolo do Cassandra, em C++); data services fazem **request coalescing** (mesma linha pedida ao mesmo tempo = uma só consulta ao banco) e há **roteamento por hash consistente** até eles; hot partitions e pausas de GC motivaram a troca; 12 nós em 2017 → 177 em 2022 |

Pendente de conferir ao redigir: números do cluster do ScyllaDB (só apareceram em resumo de terceiros).

### iFood — fontes abertas, **ainda não lidas**

| Fonte | Status | Observação |
|---|---|---|
| [iFood Tech Blog — Engenharia](https://tech.ifood.com.br/engenharia/) | Aberta, não lida | índice; precisa achar o post certo |
| [AWS Brasil: plataforma de recomendações do iFood](https://aws.amazon.com/pt/blogs/aws-brasil/como-ifood-desenvolveu-sua-nova-plataforma-de-recomendacoes/) | Aberta, não lida | publicador: AWS (sobre o iFood) |
| [AWS Brasil: arquitetura orientada a eventos no middleware financeiro](https://aws.amazon.com/pt/blogs/aws-brasil/como-ifood-se-beneficiou-da-arquitetura-orientada-a-eventos-para-modernizar-seu-midware-financeiro/) | Aberta, não lida | publicador: AWS |
| [Confluent: iFood](https://www.confluent.io/customers/ifood/) | Aberta, não lida | publicador: Confluent (vendor — fonte secundária) |

Conflito de publicador a resolver ao redigir: só AWS/Confluent falam do iFood em alguns pontos; a
regra do spec ("entra a de publicador primário; na dúvida, fora") vale.

### Nubank — fonte aberta, **ainda não lida**

| Fonte | Status |
|---|---|
| [10 years of engineering at Nubank](https://building.nubank.com/engineering-lessons-from-scaling-million-customers/) (publicador: Nubank) | Aberta, não lida |
| Medium *Building Nubank* ("Microservices at Nubank, an overview") | **Inacessível (403)** |
| Datomic: "Nubank's story" | **Inacessível (404)** — listado na busca, não existe |

### Netflix — fontes primárias finas, lidas

| Fonte (publicador: Netflix) | Status | O que afirma (lido) |
|---|---|---|
| [Open Connect — appliances](https://openconnect.netflix.com/en/appliances/) | Lido | **Appliances de armazenamento** guardam o catálogo em pontos de troca de tráfego (IX) e embarcados em ISPs maiores; redundância de discos, fontes e portas de rede |
| [Zuul — README](https://raw.githubusercontent.com/Netflix/zuul/master/README.md) | Lido | Zuul é um **gateway de aplicação L7**: roteamento dinâmico, monitoramento, resiliência, segurança |
| [EVCache — README](https://raw.githubusercontent.com/Netflix/EVCache/master/README.md) | Lido | cache **baseado em memcached**, em infraestrutura AWS EC2, para dados acessados com frequência |
| [Eureka — README](https://raw.githubusercontent.com/Netflix/eureka/master/README.md) | Lido | serviço REST de **descoberta, balanceamento e failover** de servidores da camada intermediária na AWS |
| [Priam — README](https://raw.githubusercontent.com/Netflix/Priam/master/README.md) | Lido | ferramenta que roda ao lado do **Apache Cassandra** (backup/recuperação) |
| Netflix Tech Blog / Medium | **Inacessível (403)** | o README do Zuul aponta para artigos do blog, mas eles não abrem aqui |

O que **não** é afirmado pelas fontes lidas (**fica fora**): pipeline Kafka→Spark de eventos de
reprodução, o grafo de chamadas entre microsserviços, a separação plano de controle (AWS) × plano de
dados (Open Connect). Esses pontos aparecem só em resumos de terceiros.

## 2. Viabilidade: o catálogo e a matriz de conexões aguentam os presets?

Verificado contra `apps/web/src/lib/connection-rules.ts` (lido inteiro). Exemplo do GitHub — todas as
arestas abaixo são aceitas pela matriz:

| Aresta do preset | Regra |
|---|---|
| cliente → app_server (monolito Rails) | `client` → `app_server` ✓ |
| app_server → sql_primary / sql_replica | ✓ ; `sql_primary` → `sql_replica` ✓ (réplica de leitura) |
| app_server → object_storage (aproxima os fileservers do Spokes) | ✓ — **desvio**: fileserver Git ≠ object storage; vai pras limitações |
| app_server → kafka (evento por push) | ✓ |
| kafka → worker (consumidores por serviço dono) | `kafka` → `worker` ✓ |
| worker → sql_primary / object_storage | ✓ |

Lacunas do catálogo que viram **limitações declaradas**, nunca componente inventado: ProxySQL, Vitess,
o proxy do Spokes, three-phase commit/quórum (o engine não modela), request coalescing e roteamento por
hash consistente (Discord), service discovery (Eureka).

## 3. Decisões técnicas

### 3.1 Casa do conteúdo: `packages/knowledge`

**Decisão**: módulo novo `reference-architectures` em `@sdp/knowledge`. É o pacote de "dado puro com
citação"; o `Design` vem de `@sdp/engine` (já é dependência). **Não** reaproveitar
`ArchitectureTemplate`/`TemplateId` — `Record<TemplateId, ArchitectureStyle>` exigiria uma ficha de
estilo por empresa (armadilha do M2.6).

### 3.2 Fonte web é um tipo novo

**Decisão**: `WebSource { title; publisher; url; accessedAt }`, separado do `Source` (livro + autor)
do M2.6. Preset e explicação referenciam fontes por id dentro do próprio preset.

### 3.3 Carregamento: reutiliza o que já existe

`designToCanvas` (preserva os ids dos nós) + `loadDesign` + a confirmação destrutiva — a mesma de
templates e da solução de referência. Preservar os ids é o que permite ligar a explicação ao nó.

### 3.4 Sandbox only (FR-009), sem trocar de modo automaticamente

**Decisão**: o menu de presets fica **desabilitado dentro de um desafio**, com a dica "saia do
desafio para explorar". Alternativa descartada: sair do desafio sozinho ao carregar — o store do
canvas é por design ativo, então exigiria remontar o store e carregar depois, e esconderia uma troca
de modo atrás de um clique. Fora de desafio, "Submeter" já não existe como progressão.

### 3.5 Aviso de "valores ilustrativos" (FR-005)

**Decisão**: o store do canvas guarda `loadedPresetId` (limpo ao carregar outro design, ao limpar o
canvas ou ao trocar de desafio). Enquanto definido, o painel de resultado mostra o aviso. Réplicas e
carga de um preset são **ilustrativas por padrão**; só deixam de ser se uma fonte lida fornecer o
número (e então o campo `source` do parâmetro a cita).

### 3.6 Explicações: dado, sem LLM em runtime

**Decisão** (Clarifications): `ComponentExplanation { nodeId; text; sourceIds }` no preset. Ao
selecionar um nó de um canvas com `loadedPresetId`, o painel mostra "Por que está aqui". Nó removido
pelo usuário some com a explicação; nó adicionado não tem — nunca uma explicação inventada. Nenhuma
mudança em `/api/narrator`, `packages/narrator`, `NARRATOR_PROMPT_VERSION` ou no engine (FR-010).

### 3.7 Conexão afirmada × inferida

**Decisão** (Clarifications): `PresetEdge.basis: 'afirmada' | 'inferida'`. Toda aresta `inferida` é
listada nas limitações do preset. Teste: nenhuma aresta sem `basis`; toda `afirmada` tem `sourceIds`
não vazio.

### 3.8 Integridade (FR-002, SC-003)

Teste em `apps/web/test/` (a matriz mora lá): para cada preset, toda aresta passa em
`isValidCanvasConnection`, e `simulate()` com carga ilustrativa devolve **zero** violações
estruturais. Testes de dado em `packages/knowledge`: ids únicos, fontes referenciadas existem,
todo nó tem explicação, todo parâmetro `ilustrativo` sem fonte é marcado.

## 4. Riscos

- **Fidelidade (o maior)**: um preset parecer a arquitetura real e não ser. Mitigação: registro de
  fontes, `basis`, limitações obrigatórias, gate do autor.
- **Netflix fino**: pode ficar com poucos componentes; aceito (FR-011).
- **iFood/Nubank**: fontes ainda não lidas — cada preset é um incremento que começa lendo-as; se não
  sustentarem os componentes, o preset fica de fora (US4 cenário 2).

## 5. Gate de conteúdo (FR-008)

`content-draft.md` traz o preset do **GitHub** completo (o MVP). Os demais são redigidos um a um,
cada um com o seu gate, **depois** de ler as fontes pendentes. Nada vira código antes da aprovação.
