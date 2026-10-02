# Research: M2.6 — Fundamentos de arquitetura

**Aviso de gate**: o conteúdo autorado abaixo (fichas + dicas) foi rascunhado com assistência de
LLM nesta sessão de planejamento — nunca visitado/conferido linha a linha contra os livros
originais. Isso é exatamente o tipo de risco que FR-006 (reformulado nesta sessão, ver spec.md)
exige mitigar: mesmo padrão de gate já usado pras 7 fórmulas de score em M2 (Constitution VI).
Nenhuma citação abaixo tem número de página/capítulo — só livro + autor, o nível que FR-004 exige e
que pode ser verificado sem reabrir o livro.

**Aprovação (2026-09-26)**: o autor aprovou este conteúdo como está, ao responder a pergunta de
fechamento do `/speckit-plan` ("Posso seguir com o conteúdo das 11 fichas em research.md (§2-§4)
como está, ou você quer revisar antes?") com "Aprovado como está". Isso é aprovação do texto
proposto — não uma conferência linha a linha contra os livros originais, que continua fora do
alcance desta sessão (nenhum acesso aos livros-fonte). Uma imprecisão de citação encontrada numa
leitura real ainda pode ser corrigida depois sem reabrir o gate de Constitution VI — só editar o
texto; os testes de `packages/knowledge` continuam garantindo a estrutura (fonte sempre uma das 3
constantes, >= 1 trade-off por ficha), não o conteúdo em si.

## 1. Decisões de arquitetura (technical, não de conteúdo)

### 1.1 Onde o conteúdo mora

**Decisão**: pacote novo `packages/knowledge`, dado puro (mesmo padrão de `packages/problems`).
**Origem**: `/speckit-clarify`, Session 2026-09-25 (ver spec.md `## Clarifications`).

### 1.2 `TemplateId` migra de `apps/web` pra `packages/knowledge`

**Decisão**: `TemplateId` (união fechada dos 4 ids: `'monolith' | 'three-tier' | 'microservices' |
'event-driven'`) passa a ser definido em `packages/knowledge`, não em
`apps/web/src/lib/canvas-templates.ts`. `ArchitectureTemplate.id` (em `canvas-templates.ts`) importa
esse tipo em vez de usar `string`. `ARCHITECTURE_STYLES: Record<TemplateId, ArchitectureStyle>` em
`packages/knowledge` fica exaustivo por construção — impossível não compilar se uma ficha faltar
pra um `TemplateId` válido.

**Risco não coberto por essa garantia (achado do `/speckit-plan`)**: `Record<TemplateId, ...>` prova
que toda ficha aponta pra um id válido, mas **não** prova a mão inversa — que todo `TemplateId` tem
um template real em `ARCHITECTURE_TEMPLATES`, nem que os 4 ids do array não têm duplicata. Um teste
novo (`apps/web/test/template-ids.spec.ts`) faz essa segunda prova em runtime, comparando o
`Set` dos ids do array com o `Set` das chaves de `TemplateId` (via
`Object.keys(ARCHITECTURE_STYLES)`).

**Alternativa descartada**: manter `id: string` solto e confiar só num teste teria a mesma garantia
fraca — a vantagem real de migrar `TemplateId` é o erro de _um_ tipo errado (template novo sem
atualizar `TemplateId`) já quebrar `tsc`, antes até de rodar teste.

### 1.3 Escopo fechado nos 4 templates/estilos já existentes

**Decisão**: nenhum estilo novo (Microkernel, Baseado em Serviços, etc.) neste marco — mesmo se
existisse na literatura, agregar um estilo novo exige catálogo de componentes/canvas-templates.ts
novos, fora do escopo desta feature (que é só conteúdo sobre o que já existe). Revisado durante
`/speckit-plan`: a redação original do input do `/speckit-specify` ("avaliar 2-3 estilos novos... se
couberem") criava um escopo elástico incompatível com `Record<TemplateId, ...>` exaustivo — ou tem
os 4, ou teria N, nunca "0 a 3 extras opcionais". Resolvido fechando em 4 (spec.md Key Entities e
Assumptions atualizados).

### 1.4 `next.config.ts` precisa de `@sdp/knowledge` em `transpilePackages`

**Achado do `/speckit-plan`** (faltava no levantamento original): `apps/web` importa
`@sdp/knowledge` direto (UI de ficha) e transitivamente via `@sdp/problems` (campo `source` em
`Hint`) e `@sdp/narrator` (prompt). Sem entrar em `transpilePackages`, o build do Next.js falha do
mesmo jeito que falharia sem `@sdp/engine` lá (motivo já documentado em M1: webpack não resolve os
imports `.js` estilo NodeNext do pacote sem transpilação explícita).

### 1.5 Teste de cobertura de `hints-source.spec.ts` precisa de asserção positiva

**Achado do `/speckit-plan`**: a formulação original ("toda hint com source cita uma das 3 obras")
passa trivialmente se **nenhuma** hint tiver `source` — não prova que FR-003 foi cumprido. O teste
precisa de duas asserções: (a) toda hint com `source` cita uma das constantes reais de
`packages/knowledge` — nunca uma string solta reinventada; (b) todo problema do catálogo tem **pelo
menos uma** hint com `source` definido.

### 1.6 US4 — como o narrador recebe conteúdo sem violar Contract Rule 2

**Restrição de partida**: `buildNarratorPrompt` só recebe `SimulationResult` — nunca `Design`/
`Workload` (contracts/narrator-contract.md Regra 2 de M2). Todo o conteúdo de `packages/knowledge`
relevante pra explicar um resultado tem que ser selecionável a partir só do que já existe em
`SimulationResult` (`violations`, `scores`).

**Decisão — seleção**: mapear `Violation.type` → ficha de característica relacionada (ex.
`'spof'` → ficha de Disponibilidade) e dimensão com `scores[dimension] < 40` (mesmo limiar que já
pinta vermelho no `ScorePanel`, `apps/web/src/lib/canvas-ui-catalog.ts`) → ficha da própria
dimensão. Só as fichas relevantes (tipicamente 0-3) entram no prompt como contexto adicional —
nunca o catálogo inteiro. `packages/narrator` importa esse mapeamento de `@sdp/knowledge`.

**Decisão — nunca inventar citação (FR-007), tornado testável**: `EXPLAIN_RESULT_SCHEMA` ganha um
campo opcional `citation_id: { type: SchemaType.STRING, enum: [...todos os ids válidos de
characteristic/style] }`. Verificado no `.d.ts` instalado do SDK
(`node_modules/@google/generative-ai/dist/generative-ai.d.ts`, `Schema.enum?: string[]`) que
`enum` existe e é suportado em campo `STRING` — não é invenção, é a mesma API já usada pra
`summary`/`bottleneck_explanation`. `parseNarratorExplanation` passa a rejeitar (retornar `null`,
mesmo tratamento de `INVALID_RESPONSE` que já existe) qualquer `citation_id` fora do enum — o
provedor tecnicamente pode devolver uma string livre mesmo com `responseSchema` configurado
(mesma desconfiança já documentada no comentário de `parseNarratorExplanation`), então a validação
em código é a garantia real, o schema é só a primeira linha de defesa.

**Decisão — cache precisa de versão**: `hashDesign(design, workload)` (cache key em
`narratorExplanations`) não muda quando só o prompt muda — uma explicação já cacheada de antes de
M2.6 seria servida de novo pro mesmo design, sem nunca ganhar uma citação, mesmo depois do deploy.
`hashDesign` ganha um terceiro parâmetro opcional `promptVersion` (default = uma constante nova
`NARRATOR_PROMPT_VERSION` exportada de `packages/narrator/src/prompt.ts`, incrementada nesta
feature). Isso invalida o cache de todas as explicações antigas — aceitável, é só texto, sem custo
de correção de dado.

### 1.7 PoEAA (Martin Fowler) — onde ele aparece, já que não vira mecânica (FR-005)

**Decisão**: PoEAA não recebe ficha própria neste marco (nenhuma dimensão nem template é "sobre"
PoEAA) — ele aparece só como nota de "leitura recomendada" em texto livre dentro da ficha de
Microsserviços (§2.3 abaixo), nunca como o campo `source` estruturado de nenhuma ficha. Isso separa
FR-004 (toda ficha/dica tem uma citação estruturada rastreável — sempre Richards&Ford ou Martin
neste marco) de "os 3 livros aparecem em algum lugar do conteúdo" (satisfeito pela nota solta).

## 2. Conteúdo proposto — fichas de característica (FR-001)

Fonte de todas as 7: **Fundamentals of Software Architecture**, Mark Richards & Neal Ford — nível
de citação: livro + autor, sem número de página/capítulo.

**Nota honesta (achado do advisor durante `/speckit-plan`)**: as 7 dimensões do engine não mapeiam
1:1 pra uma lista fechada de "-ilities" do livro. Escalabilidade, Disponibilidade, Latência
(performance) e Segurança correspondem a características nomeadas explicitamente no livro.
Consistência, Custo e Complexidade operacional são discutidas no livro como fatores centrais de
toda análise de trade-off entre estilos de arquitetura (e, no caso de Consistência, no contexto do
teorema CAP em arquitetura distribuída) — mas não aparecem como um item isolado numa lista de
"-ilities" nomeada. As 3 fichas abaixo marcadas "nota" refletem isso explicitamente no texto, em
vez de fingir uma citação mais precisa do que ela é.

1. **Escalabilidade** — capacidade de manter o comportamento (latência, disponibilidade) sob
   aumento de carga, adicionando recursos (réplicas). Trade-off nomeado: compete com **Custo** (mais
   réplicas custam mais) e com **Complexidade operacional** (mais instâncias pra orquestrar/observar).

2. **Disponibilidade** — probabilidade do sistema responder corretamente quando solicitado
   (medida em "noves"). Cresce com redundância sem ponto único de falha. Trade-off nomeado: compete
   com **Custo** (redundância custa) e, em sistemas distribuídos, com **Consistência** (teorema
   CAP — sob partição de rede, não se maximiza os dois).

3. **Latência** — tempo de resposta de uma requisição (percentis p50/p95/p99). Trade-off nomeado:
   compete com **Consistência** (replicação síncrona pra consistência forte adiciona latência) e com
   **Custo** (componentes mais rápidos — cache, réplicas — custam mais).

4. **Consistência** *(nota: ver acima — território de CAP/dados distribuídos, não uma "-ility"
   isolada no livro)* — garantia de que réplicas/observadores veem o mesmo dado ao mesmo tempo
   (forte) vs. aceitar uma janela de defasagem (eventual). Trade-off nomeado: compete diretamente com
   **Disponibilidade** (CAP) e com **Latência** (replicação síncrona).

5. **Custo** *(nota: discutido como fator de decisão em toda comparação de estilo, não uma
   "-ility" isolada)* — gasto de infraestrutura pra operar o design. Trade-off nomeado: compete com
   **Escalabilidade** e **Disponibilidade** (redundância = mais gasto).

6. **Complexidade operacional** *(nota: discutido centralmente ao comparar estilos — ex.
   microsserviços vs. monolito — não uma "-ility" isolada)* — esforço pra implantar, monitorar e
   depurar o design (número de componentes independentes, pontos de falha a observar). Trade-off
   nomeado: compete com **Escalabilidade** — é o motivo central pelo qual microsserviços trocam
   simplicidade por escala independente.

7. **Segurança** — presença de controles contra acesso não autorizado e abuso (autenticação, rate
   limiting, WAF) — listada explicitamente como característica cross-cutting no livro. Trade-off
   nomeado: compete com **Complexidade operacional** (mais camadas de controle = mais componentes a
   manter) e por vezes com **Latência** (validação adicional por requisição).

## 3. Conteúdo proposto — fichas de estilo (FR-002)

Fonte das 4: **Fundamentals of Software Architecture**, Mark Richards & Neal Ford.

1. **Monolito** — quando usar: aplicações pequenas/médias, equipe única, baixa necessidade de
   escalar partes independentemente, prioridade em simplicidade de deploy. Trade-offs: simplicidade
   operacional alta; escalabilidade é tudo-ou-nada (não escala só a parte quente); falha de um módulo
   pode derrubar o todo (baixo isolamento de falha).

2. **3 Camadas** — quando usar: separação clara entre apresentação, lógica de negócio e dados
   quando a aplicação já não cabe confortavelmente num monolito simples, mas a escala ainda não
   justifica microsserviços. Trade-offs: melhora modularidade e permite escalar a camada certa (ex.
   só o App Server); ainda é um deploy relativamente acoplado entre camadas; a camada de dados
   costuma ser ponto único se não replicada.

3. **Microsserviços** — quando usar: partes do sistema com perfis de carga/escala muito diferentes
   entre si, times operando serviços de forma independente. Trade-offs: escalabilidade independente e
   isolamento de falha altos; complexidade operacional (orquestração, observabilidade, comunicação de
   rede entre serviços) sobe muito; consistência entre serviços vira problema explícito. **Leitura
   recomendada** (fora do escopo de mecânica, FR-005): *Patterns of Enterprise Application
   Architecture* (Martin Fowler) discute padrões de acesso a dado (Repository, Data Mapper) comuns
   dentro de cada serviço — não virou componente novo do catálogo neste marco.

4. **Orientado a eventos** — quando usar: componentes que precisam reagir a mudanças de estado de
   forma assíncrona e desacoplada, tolerando consistência eventual em troca de menor acoplamento
   temporal entre produtor e consumidor. Trade-offs: alto desacoplamento e boa resiliência a picos
   (buffer via fila/broker); consistência vira eventual por padrão; depurar o fluxo fim-a-fim
   (rastrear uma requisição por múltiplos eventos assíncronos) é operacionalmente mais complexo.

## 4. Conteúdo proposto — dicas de responsabilidade/acoplamento (FR-003)

Fonte das 3: **Clean Architecture**, Robert C. Martin — nível de citação: livro + autor. Adaptado
pro vocabulário de infraestrutura da plataforma (nós/topologia), não camadas de código, conforme já
pedido no input original desta feature.

1. **`url-shortener`** (nós: App Server → Cache → NoSQL Store) — dica nova: por que separar Cache e
   Store em vez do App Server acessar tudo direto. Cita responsabilidade única + regra de
   dependência: App Server é responsável por servir a requisição; Cache e Store são responsáveis por
   guardar o dado em velocidades diferentes. Concentrar as duas coisas (decidir onde o dado mora E
   reconciliar fontes) no App Server seria acumular uma responsabilidade que não é dele.

2. **`social-feed`** (nós: App Server → Cache → NoSQL Store) — dica nova: por que Cache e NoSQL
   Store guardarem o mesmo feed não é duplicação de responsabilidade. Cita a separação entre política
   de alto nível (regra de negócio) e detalhe de baixo nível (mecanismo de armazenamento): o NoSQL
   Store é a fonte da verdade; o Cache é um mecanismo de acesso rápido a uma cópia — concentrar as
   duas coisas num componente só seria o tipo de acoplamento que a topologia em nós distintos evita.

3. **`ecommerce-checkout`** (nós: Rate Limiter → App Server → SQL Primary / Payment) — dica nova:
   por que Payment é um nó próprio, e por que Rate Limiter vem antes do App Server. Cita isolar uma
   dependência volátil (um serviço externo lento e fora de controle nunca fica acoplado direto à
   lógica central) e separação de responsabilidade (decidir limitar tráfego é uma responsabilidade
   diferente de processar o pedido — inverter a ordem misturaria as duas).

## 5. Constitution Check (pós-design)

Sem mudança em relação ao plan.md — nenhuma decisão desta fase (research) introduz score novo,
dependência do engine, não-determinismo, ou violação de fronteira. O único item novo de risco
(citação inventada pelo narrador) ganhou uma garantia mecânica adicional (§1.6, enum + validação)
em vez de depender só de instrução de prompt.
