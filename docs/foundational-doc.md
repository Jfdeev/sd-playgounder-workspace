# System Design Playground — Especificação de Funcionalidades

> Projeto de aprendizado, gratuito. Objetivo: paridade com os playgrounds existentes + diferenciais que nenhum deles tem.

---

## 0. Premissa de design

A decisão mais importante do projeto inteiro, e ela vem antes de qualquer feature:

**O engine de simulação é a fonte da verdade. O LLM é narrador, não juiz.**

Todos os concorrentes usam LLM para julgar diagrama. Isso é ruidoso — o modelo premia o desenho que *parece* certo, não o que aguenta carga. Se o número (gargalo, p99, custo, SPOF) sai de um cálculo determinístico e o LLM só recebe esse resultado para explicar em linguagem natural, você elimina a alucinação da parte que mais importa e ganha uma coisa que o concorrente não tem: **reprodutibilidade**. Mesmo design, mesma nota, sempre.

Consequência prática: o engine é o coração do produto. Se ele for bom, o resto é UI. Se ele for fraco, você fez mais um wrapper de LLM.

---

## 1. Editor / Canvas

Paridade obrigatória. Nada aqui é diferencial — é o piso.

### 1.1 Paleta de componentes

| Categoria | Componentes |
|---|---|
| Entrada | Cliente (web/mobile), DNS, CDN, WAF |
| Roteamento | Load Balancer (L4/L7), API Gateway, Reverse Proxy, Service Mesh |
| Computação | App Server, Worker, Serverless Function, Cron/Scheduler |
| Dados | SQL (primary/replica), NoSQL (KV, documento, wide-column), Time-series |
| Cache | Cache distribuído, cache local, cache de CDN |
| Mensageria | Fila, Pub/Sub, Stream (log particionado) |
| Armazenamento | Object storage, Block storage |
| Busca | Índice invertido, Vector DB |
| Suporte | Auth Service, Rate Limiter, Feature Flag, Observabilidade |
| Bloco custom | Componente definido pelo usuário com specs manuais |

Cada componente carrega **specs verificáveis**: throughput máximo, latência base (p50/p99), custo mensal, modos de falha e knobs de configuração.

### 1.2 Configuração por componente

- Réplicas / instâncias, região / AZ
- Cache: política de eviction, TTL, hit rate esperado
- DB: estratégia de replicação, chave de sharding, nível de consistência, pool de conexões
- Fila: profundidade máxima, consumidores, política de retry, DLQ
- LB: algoritmo (round robin, least connections, hash), health check

### 1.3 Conexões

- Direcionadas e tipadas: **leitura / escrita / assíncrona / replicação**
- Protocolo (HTTP, gRPC, WebSocket, TCP)
- Aresta assíncrona sai do cálculo de latência do usuário — isso precisa estar explícito, é onde a galera erra
- Peso / porcentagem de tráfego para split

### 1.4 Ferramentas de canvas

- Arrastar-e-soltar, snap to grid, zoom/pan, minimapa
- Agrupamento por região / AZ / VPC (container visual)
- Undo/redo, copiar/colar, multi-seleção
- Anotações e sticky notes
- Autosave + versionamento
- Import/export: JSON nativo, Mermaid, PNG/SVG
- Compartilhar por URL

---

## 2. Biblioteca de problemas

### 2.1 Anatomia de um problema

1. **Enunciado** curto e ambíguo de propósito (o usuário precisa aprender a perguntar)
2. **Fase de clarificação** — perguntas que o usuário escolhe fazer; cada uma revela uma constraint
3. **Requisitos funcionais** (o que faz)
4. **Requisitos não-funcionais** (SLA de latência, disponibilidade, consistência, budget)
5. **Escala** — DAU, razão leitura/escrita, tamanho médio de payload, pico vs. média
6. **Rubrica escondida** — os itens avaliados
7. **Solução de referência** com o raciocínio, não só o diagrama

### 2.2 Conjunto inicial (12 problemas cobrem 80% dos padrões)

| Problema | Padrão que ensina |
|---|---|
| Encurtador de URL | Hashing, cache read-heavy, geração de ID |
| Rate limiter distribuído | Token bucket, sliding window, estado compartilhado |
| Sistema de notificações | Fan-out, fila, retry, idempotência |
| Feed de notícias | Fan-out on write vs. on read |
| Chat em tempo real | WebSocket, presença, ordenação de mensagens |
| Upload/streaming de vídeo | Object storage, transcoding assíncrono, CDN |
| Google Drive | Sincronização, chunking, deduplicação, conflito |
| Uber / matching geoespacial | Índice geoespacial, escrita alta, estado efêmero |
| Sistema de pagamento (Pix) | Idempotência, exactly-once, conciliação, auditoria |
| Leaderboard | Sorted set, hot key, aproximação |
| Web crawler | Fila de trabalho, politeness, dedupe em escala |
| Agregador de cliques em ads | Stream processing, janelas, contagem aproximada |

Categorias: HLD, LLD, API design, data-intensive, tempo real, GenAI/RAG.

### 2.3 Calculadora de capacidade (back-of-envelope)

Painel embutido que converte DAU → QPS → armazenamento → banda, com pico configurável. Mostra a conta, não só o resultado — a conta é o aprendizado.

---

## 3. Engine de simulação — o núcleo técnico

Onde você mais vai aprender. Modelo analítico (não discrete-event) já entrega 90% do valor e roda no browser em milissegundos.

### 3.1 Modelo base

**Vazão pelo caminho** — throughput real é o mínimo da capacidade ao longo do caminho:
```
throughput = min(capacidade de cada nó no caminho da requisição)
```
Nunca reportar throughput acima da carga oferecida. Nó saturado colapsa o que vem depois.

**Utilização**:
```
ρ = λ / (c · μ)      λ = chegada, μ = serviço por instância, c = instâncias
```

**Fila (M/M/1)** — é isso que faz a latência explodir perto da saturação:
```
W = 1 / (μ − λ)      →  ρ = 0.5 → tranquilo
                        ρ = 0.9 → 10x o tempo de serviço
                        ρ = 0.99 → 100x
```
Esse gráfico subindo na tela ensina mais que dez artigos.

**Lei de Little**:
```
L = λ · W            (requisições em voo = taxa × tempo)
```

**Cache**:
```
latência_efetiva = h · L_cache + (1 − h) · (L_cache + L_db)
carga_no_db      = λ · (1 − h)
```
Deixe o usuário ver o que acontece com hit rate 0.99 → 0.95 (o DB leva 5x mais carga).

**Amplificação de cauda em fan-out** — o insight mais subestimado do system design:
```
P(todas as N chamadas rápidas) = (1 − p)^N
N = 100 e p99 individual → ~63% das requisições pegam a cauda
```

**Tempestade de retry**:
```
λ_efetivo = λ · (1 + taxa_retry + taxa_retry² + ...)
```
Retry sem backoff em sistema saturado = feedback positivo = colapso. Mostrar isso acontecendo é ouro.

**Disponibilidade**:
```
série:    A = A₁ · A₂ · A₃        (dependências multiplicam a falha)
paralelo: A = 1 − (1 − a)^n       (redundância)
```

**Quórum**: `R + W > N` para consistência forte — validar visualmente a config do usuário.

### 3.2 Análises estáticas do grafo

Rodam antes da simulação, sem custo:

- **SPOF** — nó sem redundância no caminho crítico
- **Nó desconectado** — cache jogado no canvas sem ligação **não pontua** (regra anti-decoreba)
- **Ciclo** — separando quem é membro do ciclo de quem está só a jusante
- **Caminho de escrita sem durabilidade**
- **Ausência de idempotência em caminho com retry**
- **Hot key / hot shard** dado o campo de particionamento escolhido

### 3.3 Chaos / injeção de falha

Derrubar nó, derrubar AZ inteira, partição de rede, pico de latência, cache frio (thundering herd), esgotamento de pool de conexão. Cada um recalcula e mostra o efeito cascata.

### 3.4 Custo

Cada componente tem custo/mês. Toda decisão de arquitetura vira dinheiro na tela em tempo real.

---

## 4. Avaliação

### 4.1 Score multidimensional (nunca uma nota só)

Escalabilidade · Disponibilidade · Latência · Consistência · Custo · Complexidade operacional · Segurança

Nota única esconde o trade-off, que é justamente a coisa que o usuário precisa aprender. Um design pode ser 9 em latência e 3 em custo — e estar **certo** para o requisito dado.

### 4.2 Camadas de feedback

1. **Determinístico** (engine): números, gargalos, violações de SLA
2. **Rubrica** (checklist): itens esperados presentes/ausentes
3. **LLM** (narrador): recebe o resultado do engine + o design e explica *por quê*, sugere o próximo passo — nunca inventa número

### 4.3 Defesa do design

O usuário justifica em texto as escolhas principais. O LLM avalia o **raciocínio**, não o desenho. É aqui que ele pode ser generoso, porque raciocínio é exatamente o que LLM avalia bem.

---

## 5. Conteúdo de aprendizado

- Wiki de conceitos: caching, sharding, replicação, consenso, CAP/PACELC, filas, idempotência, backpressure
- **Widgets animados interativos**: hashing consistente, Raft, bloom filter, LSM tree vs. B-tree, níveis de isolamento, backoff exponencial
- Cada problema linka os conceitos que ele exercita, e cada conceito linka os problemas onde aparece
- Casos reais: como Netflix, Discord, iFood, Nubank resolveram — com link para o engineering blog
  (versão carregável no canvas, como preset explicado componente a componente pelo narrador LLM,
  é o marco **M2.5** — `docs/product-context.md` §10, decisão do autor em 2026-08-13)

---

## 6. Conta, progresso e social

- Salvar designs, histórico de versões, portfólio público
- Progresso por conceito (não por problema) — "você é fraco em consistência"
- Compartilhar design por URL
- Galeria da comunidade: melhores designs por problema, filtráveis por dimensão (mais barato, mais rápido, mais resiliente)

---

## 7. DIFERENCIAIS — o que ninguém tem

Em ordem de "impacto ÷ esforço". Os quatro primeiros são os que eu construiria.

### 7.1 ⭐ Modo Campanha — a arquitetura evolui, não recomeça

O maior buraco de todos os concorrentes: eles tratam system design como problema estático de uma tacada. Na vida real, ninguém projeta para 10M de usuários no dia 1 — você projeta para 10k e **evolui sob pressão**.

Como funciona: o mesmo problema em fases sucessivas.

| Fase | O que muda |
|---|---|
| 1 | 10k DAU, budget apertado — monolito é a resposta certa aqui |
| 2 | 500k DAU — aparece gargalo real, você tem que evoluir **o seu design**, não começar do zero |
| 3 | Requisito novo: multi-região, LGPD, dados não podem sair do país |
| 4 | Corte de 40% no budget — o que você desliga? |
| 5 | Incidente: a fase anterior criou uma dívida que agora explode |

O score inclui **custo de migração**: soluções que exigem reescrever tudo perdem pontos. Isso ensina a coisa mais difícil e menos ensinada da profissão — decidir o que *não* construir ainda. Nenhum playground faz.

### 7.2 ⭐ Modo Incidente (system design invertido)

Você recebe uma arquitetura **pronta** e um alerta: p99 subiu 8x às 3h da manhã. Só tem acesso a "métricas" simuladas — gráficos por componente, profundidade de fila, taxa de erro. Precisa diagnosticar e propor o fix.

Por que é forte:
- Ensina o outro lado da moeda (operação), que é o que o dev realmente faz
- É **muito mais fácil de avaliar objetivamente** que design aberto — existe uma causa raiz plantada
- Reaproveita 100% do engine que você já construiu
- Vira conteúdo viral sozinho ("consegue achar esse bug de arquitetura?")

### 7.3 ⭐ Budget forçado + fronteira de Pareto

Todo problema vem com teto de custo. Isso mata a estratégia burra de "coloco cache, fila e réplica em tudo" que os playgrounds com LLM-juiz premiam por engano.

Depois de submeter, plota o design do usuário num gráfico **custo × latência** junto com os designs de todo mundo, com a fronteira de Pareto destacada. Ver que você está dominado por uma solução mais barata *e* mais rápida ensina mais rápido que qualquer texto.

### 7.4 ⭐ Ponte com o mundo real (import/export)

- **Import**: cola um `docker-compose.yml`, manifesto k8s ou Terraform → vira canvas automaticamente. Agora dá para simular a arquitetura do teu próprio projeto.
- **Export**: o design vira esqueleto de `docker-compose` ou ADR em markdown.

Isso quebra a parede entre "estudo" e "trabalho" e é o tipo de feature que faz alguém compartilhar.

### 7.5 Modo Crítica (achar o erro)

Recebe um design plausível mas defeituoso e tem que apontar o SPOF, o hot shard, o retry sem backoff. Aprender a criticar é mais rápido que aprender a criar — e é trivialmente avaliável.

### 7.6 Replay e diff da própria evolução

Timeline das suas tentativas, diff visual entre v1 e v5, e o gráfico da sua nota por dimensão ao longo do tempo. Ver o próprio progresso é a mecânica de retenção mais barata que existe.

### 7.7 Multiplayer colaborativo

Dois ou mais usuários no mesmo canvas, com cursores, presença e chat. Um faz de entrevistador.

**Nota importante para você**: esse é exatamente o mesmo problema técnico do canvas multiplayer do teu outro projeto — CRDT (Yjs), awareness, resolução de conflito, sincronização de estado. Resolver aqui, num contexto de baixo risco e sem cliente pagando, é ensaio direto para lá. Isso sozinho já justifica o projeto.

### 7.8 Modo Turma

Sala de aula, exercício com prazo, rubrica configurável, painel do professor com progresso da turma e detecção de designs iguais. É o único caminho que transforma isso em algo que uma instituição usa — e você tem acesso a esse ambiente.

### 7.9 Conteúdo brasileiro

Problemas ancorados na realidade daqui: idempotência e conciliação de Pix, fan-out do iFood, pico de Black Friday. Não é tradução — é conteúdo que não existe em lugar nenhum.

---

## 8. Espinha técnica sugerida

| Camada | Escolha | Por quê |
|---|---|---|
| Canvas | React Flow (ou tldraw) | Nós/arestas customizados, handles tipados, pronto para grafo |
| Estado | Zustand + Immer | Undo/redo e snapshot ficam triviais |
| Engine | TypeScript puro, **zero dependência de UI** | Testável, roda no browser e no servidor, e é o ativo real |
| Persistência | Postgres + JSONB para o grafo | Versionamento sem migração a cada componente novo |
| LLM | Chamada com o output do engine no prompt, saída em JSON estruturado | O modelo explica; não inventa número |
| Multiplayer (depois) | Yjs + WebSocket | Padrão de fato para CRDT |
| Widgets de conceito | SVG + Framer Motion | Animação declarativa |

**Regra de arquitetura que vale para o projeto todo**: o engine é um pacote separado, com testes unitários, que recebe `{grafo, carga}` e devolve `{métricas, violações, custo}`. Sem React dentro. É o que te permite trocar toda a UI depois sem medo — e é a parte que vai para o portfólio.

---

## 9. Ordem de construção

"App completo com tudo" é o jeito mais rápido de abandonar o projeto no mês 2. Fatia vertical, cada fase utilizável sozinha:

**Fase 1 — o engine (sem UI bonita)**
Grafo em JSON → cálculo de gargalo, latência, custo. Testes unitários. 3 problemas hardcoded. Se isso não estiver certo, nada mais importa.

**Fase 2 — canvas + submissão**
React Flow, paleta com ~10 componentes, ligação, submeter, ver o resultado do engine. Já é um produto usável.

**Fase 3 — feedback e rubrica**
LLM narrando o output do engine, score por dimensão, solução de referência.

**Fase 4 — o primeiro diferencial**
Modo Incidente ou Modo Campanha. Escolhe **um**. É o que faz alguém contar para outra pessoa.

**Fase 5 — conta, progresso, biblioteca completa**

**Fase 6 — multiplayer / turma**

---

## 10. Trade-offs assumidos e o que eu revisitaria

- **Modelo analítico em vez de discrete-event simulation**: mais simples, roda no browser, mas não captura burstiness real nem correlação entre falhas. Revisitar se o feedback começar a parecer "limpo demais".
- **Engine determinístico**: reprodutível e barato, mas pode punir designs criativos que não estão no modelo. Mitigação: a camada de defesa em texto (4.3) dá espaço para o raciocínio que o engine não enxerga.
- **Gratuito**: sem receita, o custo de LLM é o único gasto que escala com uso. Manter o LLM fora do caminho crítico (engine resolve; LLM só narra) mantém a conta baixa. Se apertar, cache de explicação por assinatura do grafo.
- **Escopo**: a lista acima é grande demais para uma pessoa fazer inteira. Ela é um mapa, não um backlog. Corta sem dó.