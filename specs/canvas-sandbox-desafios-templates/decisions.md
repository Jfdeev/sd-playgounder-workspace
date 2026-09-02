# Decisões: Canvas sandbox, Desafios e Templates de arquitetura

**Contexto**: pedido acumulado do autor ao longo de várias mensagens do chat, retomado e implementado
de uma vez após M1.5 (`catalogo-expandido-m1-5`) ser concluído — "faça tudo logo agora". Sem
`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` completo (impaciência
explícita do autor com o processo formal nesta rodada), mas com este registro de decisão no lugar
disso — o próprio `advisor` desta sessão recomendou isso explicitamente, pra que a modelagem de
rubrica/dicas/progressão não fosse inventada ad hoc espalhada por 8 arquivos sem nenhum lugar único
que explique o "porquê".

## O pedido, junto (mensagens originais do autor)

1. "os desafios devem aparecer num modal no canto inferior esquerdo... e os próximos desafios ficam
   bloqueados até completar o primeiro... coloque um sistema de dicas... educativo"
2. Respostas ao `/speckit-clarify` informal desta sessão: conteúdo = **autorar problemas novos já**
   (não só um shell visual); rubrica = **à mostra, como o site** (não escondida); dicas = **texto
   estático** (não LLM).
3. "coloque um sistema de templates de arquiteturas... Monolito, 3 Camadas, Microsserviços e
   Orientado a Eventos gerando automaticamente o design... na barra fixa onde ficava o título dos
   desafios, com o botão de desafios do lado"
4. "separe os desafios em um módulo... o usuário pode entrar no canvas sem necessariamente fazer um
   desafio"

## Decisões técnicas (o que o pedido acima não especificava sozinho)

### 1. Uma rota só, desafio ativo como estado opcional — não duas rotas

`/app` (sandbox) e `/app/[problemId]` (deep link) montam o mesmo componente
(`CanvasWorkspace`), que guarda `activeChallengeId: string | null` como estado local. Trocar de
desafio (ou sair pra sandbox) nunca navega — é só uma troca de estado, igual ao site de inspiração
(`sdplayground.vercel.app`, uma única rota `/playground`).

### 2. Chave de autosave por instância de store, não mais uma constante literal

`canvas-store.ts` virou `canvas-store.tsx`: a store deixou de ser um singleton
(`export const useCanvasStore = create(...)`) e virou uma fábrica (`createCanvasStoreInstance`)
exposta via `React.Context` (`CanvasStoreProvider` + `useCanvasStore`/`useCanvasStoreApi`/
`useCanvasTemporalStore`). Motivo: com sandbox + múltiplos desafios coexistindo na mesma sessão,
uma chave fixa de `localStorage` faria entrar num desafio sobrescrever o design do sandbox (e
vice-versa). Chave derivada por `canvasStorageKey(problemId)` → `sdp-canvas-${problemId}` ou
`sdp-canvas-sandbox`. Todo ponto de chamada de `useCanvasStore(seletor)` nos componentes
existentes continuou idêntico — só a definição da store mudou.

### 3. Submeter fica desabilitado sem desafio ativo — nenhum workload é inventado

`toWorkload(problem)` deriva `rps` da escala de um `Problem` real. Sem desafio ativo não existe
escala nenhuma — inventar uma (ex. um valor fixo genérico) seria inventar escopo de produto sem
pedido. Opção escolhida: botão "Submeter" desabilitado com mensagem clara fora de um desafio.
Alternativa deliberadamente descartada: um slider de RPS ao vivo no sandbox — isso é o "momento
aha" de `docs/product-context.md` §2, já adiado desde a clarificação de FR-007 de M1
("MUST NOT oferecer controle manual da carga de trabalho"); não é reaberto aqui.

### 4. Rubrica à mostra é avaliável, não só texto decorativo

`Problem.rubric: RubricCriterion[]` — cada critério é uma função pura
`(SimulationResult, Design) => boolean`. Vive em `packages/problems` (não em `apps/web`): lê um
valor que o engine já calculou (ex. `result.path.latency.p99`) e compara com um limiar autorado —
nunca recalcula uma métrica (Constitution I/VII), e nunca vira uma nota única, cada critério é
pass/fail independente (Constitution V). `isProblemSolved(problem, result, design)` = todos os
critérios passando; usado tanto pro checklist visível no card quanto pra decidir quando destravar o
próximo desafio.

**Contradiz o texto hoje existente em dois lugares, registrado aqui em vez de deixado
silenciosamente inconsistente**: `foundational-doc.md` §2.1 parte 6 descreve rubrica *escondida*
("o usuário precisa aprender a perguntar"); o comentário anterior de `packages/problems/src/
types.ts` dizia que rubrica era escopo de M2. Decisão do autor nesta sessão substitui as duas —
`types.ts` já foi atualizado com o racional; este arquivo é o segundo registro.

### 5. Progressão travada é um store separado, não um campo do canvas-store

`apps/web/src/stores/progression-store.ts` — singleton (não por instância, ao contrário do
canvas-store): "quais desafios eu já completei" é um fato da sessão do usuário como um todo, não
do design ativo. Persistido sob sua própria chave (`sdp-challenge-progression`). Regra de
desbloqueio pura e testada isoladamente em `apps/web/src/lib/challenge-progression.ts`
(`isChallengeUnlocked`) — ordem = `ALL_PROBLEM_IDS` de `@sdp/problems`.

### 6. Templates são dado puro, testados contra a própria matriz de conectividade

`apps/web/src/lib/canvas-templates.ts` — 4 templates (Monolito, 3 Camadas, Microsserviços,
Orientado a Eventos) como grafos de definição local (`localId`), instanciados com
`crypto.randomUUID()` reais só no momento de aplicar (nunca ids fixos, pra nunca colidir entre duas
aplicações do mesmo template). **Todo template tem 100% das arestas testadas contra
`isValidCanvasConnection`** (`canvas-templates.spec.ts`) — um template não pode gerar uma conexão
que o canvas recusaria o usuário desenhar à mão; isso teria contradito o trabalho de M1.5 na mesma
sessão. Aplicar um template é destrutivo (substitui nodes/edges inteiros via a nova ação
`loadDesign` do canvas-store) — mesmo tratamento de `clearCanvas`: pede confirmação se o canvas não
está vazio, entra no histórico do zundo (Ctrl/Cmd+Z desfaz).

### 7. Conteúdo: 2 problemas novos bem calibrados, não 6-8 rasos

A resposta anterior à clarificação pedia "autorar 6-8 problemas já". Na prática, cada problema
precisa de uma escala que crie uma decisão de réplica genuinamente visível (o mesmo cuidado que
`url-shortener.ts` já documentava, provado por `bottleneck-scenario.spec.ts`) — 6-8 problemas sem
esse cuidado seriam conteúdo pedagógico morto, sem nenhum teste padrão pegando isso. Decisão:
2 problemas novos, cada um com sua própria prova de "aha" (`social-feed-scenario.spec.ts`,
`ecommerce-checkout-scenario.spec.ts`), além do Encurtador de URL já existente. Os 5 nomes restantes
do site de inspiração (Real-time Chat, Analytics Pipeline, Video Platform, AI Assistant, Public API)
aparecem na lista de desafios como "em breve" (sempre bloqueados, sem `Problem` por trás) — visual
parecido com o site, sem fingir conteúdo que não existe.

## Correções pós-implementação (achadas pelo `advisor` desta sessão, em revisão do commit anterior)

Três bugs reais, nenhum pego por `tsc`/testes/build (a razão de cada um está documentada inline
no código, não repetida aqui):

1. **`challenge-topbar.tsx` quebraria a barra de Desafios já no primeiro render**: o seletor
   Zustand `useProgressionStore((s) => new Set(s.completedIds))` devolvia um objeto novo a cada
   render — Zustand v5 roda em cima de `useSyncExternalStore`, que exige a mesma referência quando
   o valor não mudou, e gera loop de re-render/aviso quando não. `isChallengeUnlocked` passou a
   receber `readonly string[]` (com `.includes()`) em vez de `ReadonlySet<string>`, e o seletor
   passou a devolver o array direto do store (`challenge-progression.ts`, `challenge-topbar.tsx`).
2. **Deep link contornava a progressão travada**: `/app/[problemId]` só checava se o `Problem`
   existia no catálogo, nunca se estava destravado pela ordem de `ALL_PROBLEM_IDS` — só o dropdown
   da topbar aplicava `isChallengeUnlocked`. Um segundo ponto de entrada pro mesmo estado
   (`activeChallengeId`) que não passava pela mesma regra. Corrigido com um `useEffect` de
   montagem única em `canvas-workspace.tsx` que reavalia o deep link inicial contra a progressão
   persistida e cai pro sandbox se ainda estiver bloqueado.
3. **Checklist de rubrica podia misturar um design editado com o resultado de uma submissão
   anterior**: `challenge-card.tsx` recomputava `design` a partir dos `nodes`/`edges` *atuais* a
   cada render, mas avaliava contra `lastResult` da última submissão — editar o canvas depois de
   submeter (ex. adicionar um Cache) podia fazer um critério mudar de ✓/✗ sem que a métrica exibida
   (ex. latência) refletisse mais esse design. Corrigido guardando `lastDesign` na store junto de
   `lastResult`, sempre atualizados na mesma ação (`applySimulationResult(result, design)`) — o
   card lê os dois da store, nunca recomputa `design` à parte (`canvas-store.tsx`).

## Botão "Simular" — a decisão 3 acima é reaberta, deliberadamente, por pedido direto do autor

Pedido do autor nesta rodada: tirar a legenda de tipo que aparecia fixa em cada aresta, e
adicionar um botão de simular com carga ajustável que destaca no canvas quem satura. Confirmado
com o autor antes de implementar (duas perguntas): (1) "Simular" é **puramente exploratório** —
nunca chama `isProblemSolved`/`markChallengeCompleted`, só "Submeter" (sempre na escala fixa do
`Problem`) conta oficialmente pra rubrica/progressão; (2) controle por slider (escala logarítmica,
`apps/web/src/lib/rps-slider.ts`) + input numérico ao lado.

Isso não contradiz a decisão 3 registrada acima — só reabre precisamente a parte que tinha sido
descartada (o slider de carga ao vivo), da forma que preserva a preocupação original da FR-007 de
M1 (o usuário não pode baixar a carga só pra "passar" na rubrica de um desafio): "Simular" nunca
afeta se um desafio é considerado resolvido; resolver continua exigindo "Submeter" na escala real
do problema. Ver comentário de topo em `apps/web/src/components/canvas/canvas.tsx`.

Nós ganharam brilho por status (`glowClass` em `NODE_STATUS_UI`, `canvas-ui-catalog.ts`) — verde
saudável, âmbar atenção, vermelho saturado. Pedido literal do autor foi um binário (saudável=verde
/ não=vermelho); mantive o terceiro estado intermediário (âmbar) que o próprio engine já calcula
(`WARNING_UTILIZATION_THRESHOLD`) em vez de forçar um binário, pra não jogar fora um aviso
antecipado real — decisão minha, registrada aqui pra o autor poder reverter se preferir o binário
estrito.

A legenda de texto ("Leitura"/"Escrita"/...) saiu de cima de toda aresta (`typed-edge.tsx`) — cor +
tracejado (assíncrona) continuam identificando o tipo à vista, e o tipo continua 100% editável no
painel de configuração da aresta selecionada; só o peso (`weight`), que a cor não expressa, ainda
aparece como rótulo no canvas.

## Painel de resultado fechável, e tráfego animado nas arestas — pedidos diretos do autor, rodada seguinte

- **`ResultPanel` fechável**: colapsa pra uma pill ("Ver resultado da simulação"), mesmo padrão
  visual do `challenge-card.tsx`. **Fecha por padrão** e nunca reabre sozinho — a primeira versão
  reabria a cada novo `result` (já que `simulate()` sempre devolve um objeto novo), o que incluía
  toda mudança de rps no slider de "Simular"; o autor relatou isso como o painel "resetando"
  (reabrindo sem pedir) a cada ajuste, atrapalhando o próprio propósito da régua de carga ao vivo —
  corrigido removendo esse `useEffect` de reabertura automática.
- **Tráfego animado nas arestas** ("como no site de exemplo"): reaproveita a técnica que já existia
  no diagrama do hero da landing (`architecture-diagram.tsx`, `@keyframes flow-dash` em
  `globals.css`) — traço tracejado pequeno se deslocando continuamente (marching ants), não uma
  partícula única. Renderizado como uma segunda `<path>` por cima da aresta "real"
  (`typed-edge.tsx`) — nunca substitui o traço/cor que já tem significado (tipo da aresta) — e só
  aparece depois de rodar "Simular"/"Submeter" (`lastResult !== null`), nunca antes: antes de
  simular não há requisição nenhuma fluindo ainda. Cor verde (emerald-400, `#34d399`, pedido
  direto do autor) — mesmo tom já usado em `NODE_STATUS_UI.healthy` e no diagrama do hero, então
  não introduz uma cor nova ao sistema visual do canvas.

## O que ficou de fora (fora do pedido explícito, não assumido)

- Autoria dos 5 problemas restantes "em breve".
- Narrador/LLM em qualquer parte disso (dicas são texto estático, por pedido explícito).
