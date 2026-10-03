# System Design Playground — Contexto de Produto (fonte de verdade para SDD)

> Este documento é a referência funcional que toda fase do Spec-Driven Development
> (constitution, specify, plan, tasks, implement) deve respeitar. Documento completo
> com lista exaustiva de features, concorrentes e diferenciais: `docs/foundational-doc.md`.
> **Em caso de conflito, este arquivo vence** — é a versão condensada e atual.

## 1. O que é

Aplicação web gratuita onde o usuário monta arquiteturas de sistemas distribuídos
num canvas, submete o design, e recebe **métricas calculadas** (gargalo, latência
p50/p95/p99, throughput real, custo, SPOF) mais uma explicação em linguagem natural.
Projeto de aprendizado — sem monetização no escopo atual.

Concorrentes conhecidos: System Design Arena, ScaleDojo, SystemSloth, Scalcraft,
Codemia, mockingly.ai, systemdesignsandbox.com, SystemForge (open source),
paperdraw.dev. Todos gratuitos ou freemium. **Todos usam LLM como juiz.**

## 2. Tese — a decisão que define o produto inteiro

> **O engine de simulação é a fonte da verdade. O LLM é narrador, nunca juiz.**

Todo concorrente pede para um LLM julgar um diagrama. Isso é irreprodutível e
premia o desenho que *parece* certo em vez do que aguenta carga. Aqui, todo número
sai de cálculo determinístico; o LLM recebe o resultado pronto e explica em texto.

**Momento "aha" (norte de todo o produto):** o usuário arrasta o slider de carga,
vê a utilização de um nó passar de 0,9 e a latência explodir na tela — e entende
teoria de filas sem ter lido uma linha sobre teoria de filas.

## 3. Princípios de design (não-negociáveis)

1. **Nenhum número exibido pode ter origem em LLM.** Métrica vem do engine, sempre.
2. **O engine não conhece React.** Pacote puro, sem dependência de UI, rede ou IO.
3. **Determinismo.** Mesmo design + mesma carga → mesmo resultado, sempre. Sem
   aleatoriedade não-semeada.
4. **Só pontua o que está no caminho da requisição.** Componente jogado no canvas
   sem conexão vale zero — regra anti-decoreba.
5. **Nota única é proibida.** Score é sempre multidimensional. Nota única esconde
   o trade-off, que é exatamente a coisa a ser ensinada.
6. **Trade-off tem que doer.** Todo problema tem teto de custo; sem isso o usuário
   aprende a colocar cache e réplica em tudo.
7. **Ensinar > avaliar.** Todo feedback diz *por que* e *qual o próximo passo*.

## 4. Não-objetivos (fora de escopo por decisão, não por esquecimento)

- Não é ferramenta de diagramação genérica (isso é Excalidraw / draw.io).
- **Não é simulador de produção.** É modelo analítico pedagógico, e isso é
  comunicado na UI — nunca insinuar precisão de produção.
- Não executa infraestrutura real, não provisiona nada, não roda código do usuário.
- Não é plataforma de curso em vídeo.
- Sem app mobile nativo. Sem monetização, paywall ou billing no escopo atual.
- Sem multiplayer antes de M5 (ver §10).

## 5. Arquitetura — a decisão mais importante do sistema

**Três camadas com fronteira rígida. Nunca misturar.**

| | Engine | Aplicação | Narrador |
|---|---|---|---|
| Onde | `packages/engine` | `apps/web` | `packages/narrator` |
| Faz | calcula métricas | canvas, UI, persistência | explica em texto |
| Depende de | nada (TS puro) | engine, narrador, DB | resultado do engine |
| Determinístico | **sim** | — | não |
| Produz número | **sim** | não | **nunca** |

Anti-padrões proibidos:
- LLM produzindo qualquer métrica, nota ou número.
- `engine` importando React, Next, cliente HTTP ou SDK de LLM.
- UI recalculando métrica por conta própria em vez de chamar o engine.

## 6. Contrato do engine (é a API mais importante do repo)

```ts
// packages/engine — função pura, sem side effects
simulate(design: Design, workload: Workload): SimulationResult

type Workload = {
  rps: number;              // carga oferecida
  readWriteRatio: number;   // 0..1
  payloadBytes: number;
  peakMultiplier: number;
};

type SimulationResult = {
  nodes: Record<NodeId, {
    offeredLoad: number;    // λ que chega nesse nó
    capacity: number;       // c · μ
    utilization: number;    // ρ
    queueLatencyMs: number;
    status: 'healthy' | 'warning' | 'saturated';
  }>;
  path: { throughputRps: number; bottleneckId: NodeId | null;
          latency: { p50: number; p95: number; p99: number } };
  violations: Violation[];  // SPOF, ciclo, nó órfão, escrita sem durabilidade,
                            // retry sem backoff, hot shard, quórum inválido
  cost: { monthlyTotal: number; byNode: Record<NodeId, number> };
  scores: Record<Dimension, number>;  // §9
};
```

## 7. Modelo matemático (o engine implementa exatamente isto)

```
Vazão do sistema    throughput = λ / max(1, ρ_max)   ρ_max = maior ρ entre os nós alcançáveis
                    gargalo = nó de ρ_max, só quando ρ_max ≥ 1
                    caminho linear sem split/cache ⇒ = min(λ, capacidade de cada nó)
                    nunca reportar acima da carga oferecida
Utilização          ρ = λ / (c · μ)
Fila (M/M/1)        W = 1 / (μ − λ)        ρ=0.5 ok · ρ=0.9 → 10x · ρ=0.99 → 100x
Lei de Little       L = λ · W
Cache               latência média = h·L_cache + (1−h)·(L_cache + L_db)
                    percentil p: nó após o cache conta inteiro se (1−h) ≥ (1−p), senão zero
                    (limiar de cauda — h=0.9 ⇒ db fora do p50, inteiro no p95/p99)
                    carga_no_db = λ · (1 − h)
Cauda em fan-out    P(todas rápidas) = (1 − p)^N
Retry storm         λ_efetivo = λ · (1 + r + r² + …)
Disponibilidade     série: A = ΠAᵢ    ·    paralelo: A = 1 − (1 − a)ⁿ
Quórum              R + W > N  para consistência forte
```

Aresta marcada como **assíncrona sai do cálculo de latência do usuário**. Isso é
regra, não detalhe — é onde a maioria dos designs erra.

## 8. Stack (decidida — ver `docs/foundational-doc.md` §8)

| ADR | Decisão | Motivo decisivo |
|---|---|---|
| ADR-001 | **Next.js (App Router) + TypeScript** | engine roda igual no browser (preview instantâneo) e no servidor (submissão oficial) |
| ADR-002 | **React Flow** para o canvas | nós/arestas customizados e handles tipados prontos; o produto é um grafo |
| ADR-003 | **Modelo analítico**, não discrete-event simulation | roda em ms no browser; DES é complexidade sem ganho pedagógico proporcional |
| ADR-004 | **Zustand + Immer** para estado do canvas | undo/redo e snapshot ficam triviais |
| ADR-005 | **Postgres + JSONB** para o grafo, hospedado no **Neon** (Postgres serverless) | versionamento sem migração a cada componente novo; Neon evita provisionar/gerenciar instância própria num produto gratuito (decisão do autor, M0.5) |
| ADR-006 | **LLM fora do caminho crítico**, saída JSON estruturada, cache por hash do design | custo previsível num produto gratuito; e reforça §3.1 |
| ADR-007 | **Auth.js (NextAuth)** para login, com provedores email/senha + Google OAuth | open source e gratuito (sem custo de SaaS de auth num produto sem monetização); cobre o caso comum (Google) e quem não quer conta Google (decisão do autor, M0.5) |

Estrutura de monorepo esperada:
```
apps/web/            # Next.js: canvas, problemas, resultado
packages/engine/     # cálculo puro — o ativo real do projeto
packages/narrator/   # prompt + parsing da explicação em linguagem natural
packages/problems/   # catálogo de problemas + rubricas, como dados versionados
packages/ui/         # componentes compartilhados
```

## 9. Score multidimensional (nunca uma nota só)

`escalabilidade · disponibilidade · latência · consistência · custo · complexidade
operacional · segurança`

Cada dimensão de 0 a 10, com a justificativa vindo do engine. Um design 9 em
latência e 3 em custo pode estar **certo** para o requisito dado — a UI precisa
comunicar isso, não punir.

## 10. Requisitos funcionais por marco

Prioridade: **P0** bloqueia o marco · **P1** importante · **P2** desejável.

### M0 — Engine puro (executar ANTES de qualquer linha de UI)
Sem React, sem canvas, sem banco. Só `packages/engine` com testes.
- Tipos `Design`, `Workload`, `SimulationResult` fechados (P0)
- Propagação de carga pelo grafo, com split por peso de aresta (P0)
- Cálculo de ρ, fila M/M/1, latência p50/p95/p99 do caminho (P0)
- Throughput limitado pelo gargalo, sem número fantasma acima da carga (P0)
- Efeito de cache sobre carga do DB e latência (P0)
- Análises estáticas: SPOF, nó órfão, ciclo, aresta async fora da latência (P0)
- Custo mensal por nó e total (P0)
- Catálogo de ~10 tipos de componente com specs (capacidade, latência, custo) (P0)
- Suíte de testes com casos calculados à mão como referência (P0)

**Critério de saída de M0:** para 3 designs de referência, o resultado do engine
bate com a conta feita à mão; simulação de grafo com 30 nós roda em < 50 ms;
cobertura de teste do pacote ≥ 80%. Nenhum componente de UI existe ainda.

### M0.5 — Landing page e conta (inserido antes do M1 — decisão do autor)
Primeira linha de UI do produto, antes do canvas. Landing page completa de
apresentação (hero, proposta de valor, diferenciais de §7 e comparação com os
concorrentes de `docs/foundational-doc.md` §0, CTA de entrada) · criação de conta
e login via Auth.js — email/senha + Google OAuth (ADR-007) — com Neon (Postgres
serverless, ADR-005) como banco (P0). **Login sai do M4 e entra aqui** — a decisão
é ter o produto inteiro construído dentro de um contexto autenticado desde o
início, em vez de adicionar auth depois de M1-M3 já existirem. Sem progresso por
conceito, histórico de versões nem biblioteca de problemas ainda — isso continua
em M4. Sem paywall/billing (§4, inalterado).

**Critério de saída de M0.5:** uma pessoa consegue criar conta, fazer login e
logout, sem nenhuma tela do canvas/engine ainda existir.

### M1 — Canvas e submissão (P0 do produto)
Paleta com os componentes de M0 · arrastar, conectar, configurar · arestas tipadas
(leitura/escrita/async/replicação) · painel de configuração por nó · submeter e ver
o resultado do engine · gargalo destacado em vermelho · undo/redo · autosave local ·
1 problema completo (encurtador de URL) (todos P0). Import/export JSON e Mermaid,
export PNG (P1). Minimapa, agrupamento por região (P2).

**Critério de saída de M1:** uma pessoa que nunca viu o produto resolve o problema
do encurtador do zero, sem ajuda, e entende por que o resultado foi aquele (gargalo,
latência, custo, violações estruturais — score por dimensão é escopo de M2; decisão
do autor, 2026-08-17, `specs/canvas-submissao-m1/spec.md`).

### M1.5 — Catálogo expandido de componentes (inserido após M1 — decisão do autor)
Paleta reorganizada em 9 categorias · 33 `ComponentType` novos (Traffic & Edge, Compute,
Storage, Messaging, AI & Agents, External, Observability, Network) sobre os 11 originais
de M0/M1, cada um com matriz de conectividade e spec de capacidade/latência próprias
(P0). Concluído — `specs/catalogo-expandido-m1-5/spec.md`.

**Critério de saída de M1.5:** todo `ComponentType` novo tem categoria de paleta,
matriz de conectividade e spec de capacidade cobertos por teste exaustivo
(`Record<ComponentType, ...>` força isso em tempo de compilação).

### Canvas sandbox, desafios e templates (resgate de pedidos de chat, fora do fluxo formal — decisão do autor)
Entre M1.5 e M2, por pedido direto do autor ("faça tudo logo agora", sem passar pelo
fluxo `/speckit-specify` → clarify → plan → tasks completo — registrado em
`specs/canvas-sandbox-desafios-templates/decisions.md`, que é a fonte de racional
detalhado destas decisões):

- **Canvas sandbox**: uma rota só (`/app`), desafio como estado opcional — o usuário
  monta e simula um design sem precisar de um problema ativo.
- **Módulo de desafios**: card de desafio no canto inferior esquerdo, **rubrica à
  mostra** (reverte a "rubrica escondida" de `foundational-doc.md` §2.1 parte 6 — ver
  `packages/problems/src/types.ts`), dicas estáticas colapsáveis, progressão travada
  (desafio N só destrava com o desafio N-1 resolvido). 3 problemas completos hoje
  (Encurtador de URL, Social Feed, E-commerce Checkout).
- **Templates de arquitetura**: Monolito, 3 Camadas, Microsserviços, Orientado a
  Eventos — geram o design automaticamente, validados contra a mesma matriz de
  conectividade do canvas.
- **Botão "Simular"**: roda o engine com um rps ajustável por slider/input, **sempre
  exploratório** — nunca conta pra rubrica/progressão (só "Submeter", na escala fixa
  do problema, faz isso). Nós brilham por status (verde/âmbar/vermelho); arestas
  mostram tráfego animado depois de simular.

Isso muda o ponto de partida de M2 abaixo: rubrica visível e progressão travada já
existem para 3 problemas — M2 estende isso (score por dimensão, narrador, solução de
referência), não o introduz do zero.

### M2 — Avaliação e biblioteca
Rubrica por problema · narrador LLM explicando o resultado do engine (nunca gerando
número) · score por dimensão · solução de referência com raciocínio · calculadora de
capacidade back-of-envelope · 6 problemas (P0). Fase de clarificação de requisitos,
defesa textual do design avaliada pelo LLM (P1).

**Código completo** ([specs/avaliacao-biblioteca-m2/](../specs/avaliacao-biblioteca-m2/spec.md)) —
score por dimensão real (US1), narrador via Google Gemini `gemini-2.5-flash` (US2), solução de
referência carregável por problema (US3), calculadora de capacidade independente (US4). 381 testes
automatizados (engine/problems/narrator/web) e build de produção limpos. **Catálogo permanece em 3
problemas** (não 6) — decisão de `/speckit-clarify`, 2026-09-23: os 3 problemas novos ficam pra um
incremento futuro separado.

**Critério de saída de M2:** o narrador nunca contradiz o engine em 20 submissões de teste
consecutivas. **Concluído com ressalva (decisão do autor, 2026-10-03)**: 17 de 20 submissões reais (prompt v3, `gemini-2.5-flash`) com 0 contradições; as 3 restantes ficaram sem resposta por 503/429 (cota do free tier, 20 req/dia), não por contradição — o
autor aceitou 17/20 como suficiente. Detalhes em `specs/avaliacao-biblioteca-m2/tasks.md` (T041).
**Em aberto**: RNF-5/SC-003 (95% em até 15s) não passou na mesma rodada (5 de 17 acima de 15s,
sob 503 por alta demanda) e a cota de 20 req/dia limita o narrador em produção.

### M2.5 — Arquiteturas de referência (inserido após M2 — decisão do autor)
Presets de arquiteturas reais de empresas conhecidas, **pesquisadas previamente** (não
geradas pela LLM na hora — fidelidade real, não invenção) e carregáveis no canvas como ponto
de partida. O narrador LLM (M2) explica cada componente da arquitetura carregada — por que
aquele componente existe ali, que problema resolve — sempre a partir de um design já
carregado e pesquisado, nunca inventando a arquitetura em si (mesma regra do narrador: nunca
gera número nem estrutura, só explica o que já existe). Primeira leva de presets: Netflix,
Discord, iFood, Nubank (já citados como estudos de caso em `docs/foundational-doc.md` §5),
mais GitHub (P0) (decisão do autor, 2026-08-13).

**Critério de saída de M2.5:** uma pessoa consegue carregar ao menos 1 preset, ver a
explicação de cada componente pela LLM, e entender por que aquela empresa fez aquela escolha
de arquitetura.

### M2.6 — Fundamentos de arquitetura (inserido após M2.5 — decisão do autor, 2026-09-24)

Base de conhecimento **pesquisada previamente** (mesma regra de M2.5: fidelidade real, nunca
gerada pela LLM na hora) condensando princípios da literatura clássica de arquitetura de
software — *Clean Architecture* (Robert C. Martin), *Fundamentals of Software Architecture*
(Mark Richards & Neal Ford) e *Patterns of Enterprise Application Architecture* (Martin Fowler)
— em conteúdo que a própria plataforma já sabe onde encaixar, porque conecta direto em mecânica
que M1/M1.5/M2 já construíram:

- **Características de arquitetura** (Richards & Ford) — o vocabulário formal por trás das 7
  dimensões de score que o engine já calcula (M2): cada dimensão (escalabilidade, disponibilidade,
  latência, consistência, custo, complexidade operacional, segurança) ganha uma ficha curta com
  definição formal, a fonte, e o trade-off que ela representa contra as outras. Nunca um score
  novo — só vocabulário e contexto por trás do que o engine já mede (Constitution I/V/VI
  continuam valendo sem exceção).
- **Estilos de arquitetura** (Richards & Ford) — ficha curta por template já existente (Monolito,
  3 Camadas, Microsserviços, Orientado a Eventos — `canvas-templates.ts`, M1.5) com quando usar
  cada um e os trade-offs principais, citando a fonte. Escopo fechado nos 4 templates já
  existentes (decisão tomada em `/speckit-plan`, Session 2026-09-25 — ver
  `specs/fundamentos-arquitetura/research.md` §1.3): agregar um estilo novo exige catálogo de
  componentes/template novos, fora do escopo deste marco.
- **Responsabilidade e acoplamento** (Clean Architecture) — adaptado pro vocabulário de
  infraestrutura da plataforma (a Regra de Dependência de Martin fala de camadas de código, não
  de topologia de sistema — a tradução pro domínio daqui é o alvo desta parte, não uma cópia
  literal): dicas estáticas novas (mesmo padrão de `Hint` já usado em M1) que citam o princípio
  quando um design mostra um nó concentrando responsabilidade demais, ou acoplamento direto entre
  partes que deveriam estar isoladas.
- Narrador (M2) ganha esse conteúdo como contexto adicional no prompt — pode citar o nome do
  princípio/padrão relevante ao explicar um resultado, sempre atribuído à fonte, nunca inventando
  uma citação (mesma regra que já proíbe o narrador de inventar número).

**Explicitamente fora de escopo**: nenhum padrão de *PoEAA* específico de camada de dado
(Repository, Data Mapper, Active Record, Table Module) vira mecânica nova — a plataforma simula
infraestrutura/topologia, não a estrutura de código interno de uma aplicação; esses padrões
ficam só como leitura recomendada dentro da ficha de conceito, nunca como um componente novo do
canvas ou um cálculo novo do engine.

**Critério de saída de M2.6:** pra qualquer uma das 7 dimensões de score e qualquer um dos 4
templates já existentes, uma pessoa consegue abrir a ficha correspondente e ver a definição
formal + a fonte bibliográfica exata — nenhum conteúdo sem citação rastreável.

**Status (2026-09-26)**: código completo de US1-US4 — `packages/knowledge` (novo), fichas das 7
dimensões + 4 estilos, dicas de responsabilidade/acoplamento nos 3 problemas, UI nova em
`ScorePanel`/`ChallengeTopBar` (botão "?" abrindo a ficha), narrador (`packages/narrator`) citando
uma ficha real via `citation_id` (validado contra o catálogo de `@sdp/knowledge`, nunca uma citação
inventada — FR-007) e a UI do narrador exibindo "Princípio citado" com a fonte atribuída — `tsc`/
testes/build limpos nos 5 pacotes do monorepo (433 testes). **US4 foi desbloqueada e implementada
antes do critério de saída de M2 ser verificado** — decisão do autor, 2026-09-26 (ver "Ordem fora
de sequência" abaixo): consequência assumida é que a verificação de 20 submissões consecutivas de
M2 precisa ser refeita contra o prompt atual (`NARRATOR_PROMPT_VERSION`), não contra o prompt de M2
original. `hashDesign` inclui `promptVersion` no hash de cache exatamente pra isso não colidir
silenciosamente com explicações cacheadas do prompt antigo.

**Verificação manual concluída em 2026-09-27** (migração `0003` aplicada ao Neon live; login via
conta de teste throwaway criada e apagada na mesma sessão) — US1/US2/US3/US4 confirmados
funcionando de ponta a ponta com dados reais (banco live, narrador via Gemini real). Achou e
corrigiu 1 bug real pré-existente de M2 (`POST /api/narrator` 500-ava pra qualquer design saturado
— `Infinity` da latência não sobrevive à travessia JSON, vira `null`; `packages/narrator/src/
prompt.ts`, commit `9956fcf`). Encontrou 1 problema de RNF-5 (`NARRATOR_TIMEOUT_MS = 5_000` curto
demais na prática pra `gemini-2.5-flash` com `responseSchema` — medido diretamente em ~5.8s,
batendo 504 duas vezes seguidas na verificação) — **resolvido em 2026-09-27** subindo o timeout
pra 15s (decisão do autor); RNF-5/SC-003 de M2 (`spec.md`, `plan.md`, `contracts/narrator-
contract.md`) e a tabela de NFRs acima atualizados pro novo valor. Ver
`specs/fundamentos-arquitetura/tasks.md` (achados 3 e 4) e `quickstart.md`.

**Ordem fora de sequência (decisão do autor, 2026-09-26, mesmo padrão de M2.5)**: M2.6 (incluindo
US4) foi implementado antes do M2 chegar a `Done` (falta a verificação empírica das 20 submissões,
acima) e antes do M2.5 — furando, na prática, a regra de `CLAUDE.md` ("nenhum marco começa antes
do critério de saída do anterior ser atingido"). Nenhuma dependência de código real força essa
ordem (M2.5 é ortogonal a M2.6; a única dependência real de M2.6 em M2 era não invalidar a
verificação pendente de M2, resolvida pelo versionamento do prompt), então o autor optou por deixar
a sequência de implementação avançar assim em vez de bloquear M2.6 até M2/M2.5 fecharem
formalmente — igual à decisão que já tinha inserido M0.5/M1.5/M2.5 fora da ordem original do
roadmap.

### M2.7 — Biblioteca de princípios de arquitetura (inserido após M2.6 — decisão do autor, 2026-10-03)

Ampliação da base de conhecimento do M2.6, que ficou rasa perto do que as obras-fonte cobrem (o
autor apontou SOLID como exemplo de ausência — nenhuma ocorrência no catálogo hoje). Mesma regra
do M2.6 (FR-006): conteúdo **pesquisado previamente e revisado pelo autor**, nunca gerado pela LLM
na hora. Três frentes, por obra:

- **Princípios de *Clean Architecture*** (Robert C. Martin), incluindo SOLID — princípios de nível
  de código/módulo, que a plataforma (que simula topologia de infraestrutura) não calcula; entram
  como biblioteca de leitura, com o vínculo à topologia explicado quando existir (mesmo critério
  do M2.6 para padrões de camada de dado: referência, nunca mecânica nova no engine).
- **Características de arquitetura** (*Fundamentals of Software Architecture*, Richards & Ford)
  além das 7 que já são dimensões de score.
- **Padrões de *Patterns of Enterprise Application Architecture*** (Martin Fowler) — só como
  leitura recomendada, sem virar componente do canvas nem cálculo do engine (decisão do M2.6
  mantida).

Fora de escopo: alterar o prompt do narrador (continua v3 — mexer nele invalida o cache e a
verificação do M2); mecânica nova no engine; progresso por conceito e a ligação completa
problema ↔ conceito, que são a "wiki de conceitos" do M4 (M2.7 entrega a biblioteca, M4 a conecta
ao progresso).

**Critério de saída de M2.7:** pra qualquer princípio da lista aprovada pelo autor, uma pessoa
consegue abrir a biblioteca, encontrá-lo e ver definição + fonte bibliográfica exata — nenhum
conteúdo sem citação rastreável.

**Status (2026-10-03)**: código completo — `packages/knowledge` ganhou a biblioteca (39 entradas
aprovadas pelo autor: 9 de Clean Architecture incluindo os 5 SOLID, 19 características de Richards &
Ford fora das 7 dimensões, 11 padrões do Fowler só como leitura), rota `/app/biblioteca`, busca e o
link "Ler na biblioteca" nas 3 dicas do M2.6. `tsc`/481 testes/build limpos; engine, narrador, banco e
`NARRATOR_PROMPT_VERSION` intocados. **Pendente**: verificação manual no browser
(`specs/biblioteca-principios-arquitetura/quickstart.md`) — o `spec.md` fica `Ready` até lá.

### M2.8 — Gamificação e progresso na conta (inserido após M2.7 — decisão do autor, 2026-10-03)

Hoje a conta do usuário não guarda nada de útil: progresso de desafios e designs ficam só no
`localStorage` do navegador. M2.8 dá à conta um motivo de existir — um sistema de gamificação que
incentive o estudo (pontos de experiência, níveis, ofensiva de dias seguidos, conquistas),
persistido no servidor, ligado à conta. XP só vem de ações verificáveis no servidor — uma
submissão só pontua depois de o servidor reexecutar `simulate()` (a regra de "nunca confiar no
frontend" deixa de ser adiável aqui: é a primeira vez que um marco pontua uma submissão como
oficial). XP e nível medem **atividade de estudo**, nunca viram uma nota agregada de qualidade do
design (Constitution V).

Escopo exato (o que dá XP, ranking entre usuários, e a fronteira com o M4 — "salvar designs com
histórico" e "progresso por conceito" já estão no M4) fica pro `/speckit-clarify` de M2.8.

> Nota de quem escreveu isto: numeração (M2.7, M2.8), posição (após M2.6, antes de M3) e o corte
> entre os dois marcos são uma proposta — mesmo tipo de decisão que M2.5/M2.6 registraram como
> "decisão do autor" quando foram inseridos. O autor pediu os dois itens em 2026-10-03; a ordem
> fora de sequência em relação a M2.5 segue o mesmo precedente de M2.6.

### M3 — Primeiro diferencial: Modo Incidente
Arquitetura pronta + alerta + métricas simuladas; o usuário diagnostica a causa raiz
plantada e propõe o fix. Reaproveita 100% do engine. Chaos: derrubar nó, derrubar AZ,
partição, cache frio, esgotamento de pool (P0). Placar de tempo até diagnóstico (P2).

**Critério de saída de M3:** 5 cenários de incidente com causa raiz verificável, e
o engine identifica a mesma causa que o autor plantou.

### M4 — Progresso e conteúdo
Login já existe desde M0.5. Aqui: salvar designs com histórico de versões · progresso
**por conceito**, não por problema · biblioteca de 12 problemas · wiki de conceitos
linkada aos problemas · compartilhar design por URL (P0). Widgets animados de conceito,
galeria da comunidade com fronteira de Pareto custo × latência (P1).

### M5 — Modo Campanha, multiplayer e turma
Campanha (mesmo problema em fases, com custo de migração no score) · canvas colaborativo
via Yjs · modo turma com painel do professor. **Nada aqui começa antes de M4 fechar.**

## 11. Requisitos não-funcionais (metas mensuráveis)

| ID | Requisito | Alvo |
|---|---|---|
| RNF-1 | Simulação de grafo com 30 nós | < 50 ms |
| RNF-2 | Preview de métrica ao editar o canvas | < 100 ms, no browser |
| RNF-3 | Cobertura de teste de `packages/engine` | ≥ 80% |
| RNF-4 | Determinismo | 100% reprodutível, sem RNG não-semeado |
| RNF-5 | Latência da explicação do narrador | < 15 s p95 (subido de 5s em 2026-09-27 — 5s batia timeout na prática contra `gemini-2.5-flash` com `responseSchema`, medido em ~5.8s; decisão do autor, `specs/fundamentos-arquitetura/tasks.md` achado 4) |
| RNF-6 | Custo de LLM por submissão | zero em cache hit; 1 chamada em cache miss |
| RNF-7 | Canvas fluido | 60 fps até 50 nós |
| RNF-8 | Acessibilidade | navegação por teclado no canvas |

## 12. Riscos que devem influenciar decisões técnicas do dia a dia

| Risco | Consequência prática para quem está codando |
|---|---|
| **Escopo grande demais para uma pessoa** | Critérios de saída de marco (§10) são obrigatórios, não sugestão |
| Engine errado invalida o produto inteiro | M0 tem teste com conta feita à mão; sem isso, nada avança |
| Modelo analítico não captura burstiness nem falha correlacionada | Comunicar limitação na UI; não prometer precisão de produção |
| Engine determinístico pode punir design criativo válido | Defesa textual (M2/P1) é a válvula de escape — não remover |
| Custo de LLM num produto gratuito | ADR-006 é regra: cache por hash, 1 chamada por submissão nova |
| Concorrentes gratuitos e open source | Não competir em quantidade de problemas — competir em qualidade de avaliação |

## 13. Decisões abertas (a definir com o autor, não pelo agente)

- **D1** — Nome do produto e do repositório. Trabalhando com "System Design Playground",
  que é descritivo, não definitivo.
- **D2** — Gerenciador de pacote do monorepo (pnpm vs. npm workspaces).
- ~~**D3** — ORM (Drizzle vs. Prisma).~~ **Resolvido**: Drizzle — já em uso desde M0.5
  (`apps/web/src/db/`, `@auth/drizzle-adapter`), nunca foi de fato uma escolha em
  aberto na prática.
- ~~**D4** — Provedor de LLM do narrador.~~ **Resolvido**: Google Gemini, modelo
  `gemini-2.5-flash` — decisão do autor durante a implementação de M2, revertendo a
  escolha inicial (Anthropic Claude API). Saída JSON estruturada via `responseSchema`
  nativo do Gemini (exigência de ADR-006), chave de API (`GEMINI_API_KEY`) server-only.
- **D5** — Fonte dos números de custo dos componentes (tabela fixa vs. baseada em
  preço real de cloud).

## 14. Glossário mínimo

**ρ (utilização)** — fração da capacidade em uso; a latência explode quando se
aproxima de 1. **Lei de Little** — requisições em voo = taxa × tempo de resposta.
**SPOF** — componente único cuja falha derruba o caminho inteiro. **Fan-out** — uma
requisição gerando N chamadas paralelas; amplifica a cauda de latência. **Retry
storm** — retentativas sem backoff realimentando um sistema saturado até o colapso.
**Hot shard** — partição que recebe tráfego desproporcional por má escolha de chave.
**Back-of-envelope** — estimativa de capacidade feita com conta grosseira.