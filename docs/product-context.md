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
Vazão do caminho    throughput = min(capacidade de cada nó no caminho)
                    nunca reportar acima da carga oferecida
Utilização          ρ = λ / (c · μ)
Fila (M/M/1)        W = 1 / (μ − λ)        ρ=0.5 ok · ρ=0.9 → 10x · ρ=0.99 → 100x
Lei de Little       L = λ · W
Cache               latência = h·L_cache + (1−h)·(L_cache + L_db)
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

### M2 — Avaliação e biblioteca
Rubrica por problema · narrador LLM explicando o resultado do engine (nunca gerando
número) · score por dimensão · solução de referência com raciocínio · calculadora de
capacidade back-of-envelope · 6 problemas (P0). Fase de clarificação de requisitos,
defesa textual do design avaliada pelo LLM (P1).

**Critério de saída de M2:** o narrador nunca contradiz o engine em 20 submissões
de teste consecutivas.

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
| RNF-5 | Latência da explicação do narrador | < 5 s p95 |
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
- **D3** — ORM (Drizzle vs. Prisma).
- **D4** — Provedor de LLM do narrador.
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