# Research: M1 — Canvas e submissão

**Input**: [plan.md](plan.md) Technical Context, [spec.md](spec.md).

## §1. `@sdp/engine` no browser — decisão já tomada e verificada nesta sessão

**Decisão**: `apps/web` consome `@sdp/engine` como dependência `workspace:*`, sem build step
(mesma decisão de M0: `main`/`types` de `packages/engine/package.json` apontam direto para
`src/index.ts`). Duas configurações em `next.config.ts` são necessárias:

```ts
transpilePackages: ["@sdp/engine"],
webpack(config) {
  config.resolve.extensionAlias = { ...config.resolve.extensionAlias, ".js": [".ts", ".tsx", ".js"] };
  return config;
},
```

**Motivo de cada uma**:
- `transpilePackages`: Next.js não transpila TypeScript de pacotes do workspace por padrão — sem
  isso, o import falha silenciosamente na hora do build.
- `resolve.extensionAlias`: `packages/engine` usa imports relativos com extensão `.js`
  (`import { x } from './y.js'`), convenção do `moduleResolution: "NodeNext"` do TypeScript mesmo
  apontando para arquivos `.ts`. `tsc`/Vitest resolvem isso nativamente; o webpack do Next não —
  sem essa configuração, o erro é `Module not found: Can't resolve './catalog/components.js'`.

**Verificação empírica**: confirmado nesta sessão via spike (rota temporária, removida) — um
Client Component importando `simulate` de `@sdp/engine`, rodando com um `Design`/`Workload`
hardcoded, retornou um `SimulationResult` correto no browser. Configuração já commitada
(`feat: wire @sdp/engine into apps/web`), antes mesmo deste plano — não é mais um risco a mitigar
neste marco, só uma decisão a documentar.

**Alternativa considerada e rejeitada**: dar um build step a `packages/engine` (compilar para
`dist/`, apontar `main`/`types` para lá). Rejeitada porque resolve o mesmo problema com mais
complexidade (mais um passo de build, mais uma fonte de "esqueci de rodar o build" durante
desenvolvimento) do que a correção de config acima, que resolve na raiz sem exigir nenhuma mudança
em `packages/engine`.

## §2. React Flow (`@xyflow/react`) — canvas (ADR-002)

**Decisão**: `@xyflow/react` (pacote atual do React Flow desde o rebranding para "xyflow" — o nome
antigo `reactflow` está deprecado), versão `^12.11.3` (via WebFetch em reactflow.dev, 2026-08-17).

**Nós e arestas customizados**: cada `ComponentType` (11 tipos) + o nó "Cliente" (2 variantes
visuais, não-computável — Clarifications, FR-006) é renderizado por um `nodeType` customizado do
React Flow (`nodeTypes` prop), parametrizado pelo tipo em vez de 12 componentes separados — evita
duplicação, já que o layout visual (ícone + nome + status) é o mesmo, só o conteúdo muda. Arestas
customizadas (`edgeTypes`) representam os 4 `EdgeKind` com cor/traço distintos e marcador de seta
(`MarkerType.ArrowClosed`).

**Drag-and-drop da paleta para o canvas** (via WebFetch, exemplo oficial
`/examples/interaction/drag-and-drop`): a paleta marca o tipo arrastado em
`onDragStart` (`event.dataTransfer.setData(...)`); o canvas aceita em `onDragOver`
(`event.preventDefault()`) e cria o nó em `onDrop`, convertendo a posição de tela para posição do
canvas via `screenToFlowPosition({ x: event.clientX, y: event.clientY })` (cuida de zoom/pan
automaticamente — não reimplementar essa conta).

**Integração com Zustand** (via WebFetch, `/learn/advanced-use/state-management`): a documentação
oficial recomenda mover `nodes`, `edges`, `onNodesChange`, `onEdgesChange`, `onConnect` para dentro
da store externa (em vez do estado interno padrão do `<ReactFlow>`), com o componente lendo via
`useStore`. Essa é a base que permite o resto do estado do canvas (seleção, undo/redo, autosave)
viver no mesmo lugar, em vez de espalhado entre estado local de componente e a store.

## §3. Zustand + Immer + undo/redo (ADR-004)

**Decisão**: `zustand` `^5.x` com o middleware `immer` (permite mutação direta dentro de `set`,
convertida para update imutável — já era a razão do ADR-004 dizer "undo/redo e snapshot ficam
triviais") + `zundo` `^2.3.0` como middleware de histórico (undo/redo).

**Por que `zundo` em vez de implementar undo/redo manualmente**: é a integração de terceiros
oficialmente listada pela documentação do Zustand para essa finalidade, tem pegada mínima (<1kB),
funciona por cima de qualquer store Zustand sem exigir reestruturar o shape do estado, e resolve
exatamente FR-010 (desfazer/refazer, em ordem, histórico linear — descarta "redo" após uma edição
nova, que é o comportamento padrão do `zundo`). Reimplementar isso manualmente (pilha de snapshots)
seria reinventar uma peça pequena e já resolvida — contra o princípio de "nenhuma abstração antes
de precisar" na direção oposta (não vale a pena *não* usar uma dependência de <1kB só para evitar
uma dependência).

**Autosave (FR-011)**: middleware `persist` do próprio Zustand (não é uma lib externa — parte do
pacote `zustand/middleware`), com `storage` apontando para `localStorage` do navegador. Só persiste
`nodes`/`edges` (o design em si) — não persiste o histórico de undo/redo entre sessões (escopo
deliberadamente mínimo: FR-011 pede "restaurar o design", não "restaurar o histórico de undo").

**Alternativa considerada e rejeitada**: Redux Toolkit (tem `redux-undo` maduro). Rejeitada porque
ADR-004 já decidiu Zustand + Immer especificamente por simplicidade (`docs/product-context.md` §8)
— trocar de stack de estado não é uma decisão deste marco.

## §4. `canvas → Design/Workload` — o mapeamento que precisa de teste forte

**Decisão**: uma função pura `toDesign(nodes: FlowNode[], edges: FlowEdge[]): Design` e uma
constante/função `toWorkload(problem: Problem): Workload`, vivendo em `apps/web/src/lib/`, longe de
qualquer componente React — testadas isoladamente em Vitest, seguindo o mesmo padrão de
`src/lib/**` de M0.5 (cobertura restrita a módulos puros, não a wiring de framework).

**Por que este é o módulo de maior risco do marco**: é onde a garantia da Constitution IV ("só
pontua o caminho da requisição") pode quebrar silenciosamente — se `entryNodeIds` for calculado
errado (ex.: incluir um nó Cliente por engano, ou não incluir um nó real conectado a um Cliente), o
engine ainda roda sem erro (nunca lança exceção, FR-016/FR-019 de M0), mas produz um resultado
plausível e **errado**, o pior tipo de bug num produto cuja promessa central é reprodutibilidade
determinística. Casos de teste mínimos: nó Cliente sem conexão (ignorado — nenhum `entryNodeId`);
um nó real conectado a dois Clientes diferentes (ainda um único `entryNodeId`, sem duplicata); dois
Clientes cada um conectado a um nó real diferente (dois `entryNodeIds`); pesos de aresta que não
somam 100% saindo do mesmo nó (normalizados, consistente com o próprio engine, FR-018 de M0 — o
mapper não duplica essa lógica, só repassa os pesos brutos e deixa o engine normalizar).

**Alternativa considerada e rejeitada**: normalizar peso de aresta no mapper antes de enviar ao
engine. Rejeitada — duplicaria uma responsabilidade que já pertence ao engine (FR-018 de M0), com
risco de as duas implementações divergirem no futuro. O mapper só traduz forma de dado, nunca
recalcula.

## §5. `packages/problems` — estrutura mínima

**Decisão**: pacote novo, TypeScript puro (mesmo padrão de `packages/engine`: sem build step,
`main`/`types` apontando para `src/index.ts`), exportando `getProblem(id): Problem | undefined` e
`ALL_PROBLEM_IDS: readonly string[]`. Um único registro no catálogo neste marco: `url-shortener`.

**Shape de `Problem`** (deriva de FR-012 e `docs/foundational-doc.md` §2.1, partes 1/3/4/5 — as
únicas exigidas neste marco):

```ts
type Problem = {
  id: string;
  title: string;
  statement: string;                 // parte 1 — enunciado curto e ambíguo de propósito
  functionalRequirements: string[];  // parte 3
  nonFunctionalRequirements: string[]; // parte 4 — SLA de latência, disponibilidade, budget
  scale: {                            // parte 5
    dau: number;
    readWriteRatio: number;           // 0..1, fração de leitura — mesmo shape de Workload.readWriteRatio
    avgPayloadBytes: number;
    peakMultiplier: number;
  };
};
```

**Por que um pacote separado em vez de um arquivo dentro de `apps/web`**: `docs/product-context.md`
§8 já documenta `packages/problems/` na estrutura esperada do monorepo ("catálogo de problemas +
rubricas, como dados versionados") — não é uma decisão nova deste plano, é seguir a estrutura já
definida antes mesmo de M0 começar. Manter como pacote separado também prepara para M2 (rubrica) e
M4 (biblioteca de 12 problemas) sem exigir mover código entre pastas depois.

**`Workload` da submissão**: `toWorkload(problem)` traduz `problem.scale` para o `Workload` do
engine. `dau` (usuários/dia) precisa virar `rps` (requisições/segundo) — conversão back-of-envelope
padrão (`docs/foundational-doc.md` §2.3 menciona essa calculadora como um painel futuro de M2; aqui
é só a conta interna, sem UI própria neste marco): `rps ≈ (dau · requisições_por_usuário_por_dia) /
86400`, com `peakMultiplier` do próprio problema aplicado por cima. O número exato de
"requisições por usuário por dia" para o encurtador de URL é conteúdo do problema em si (parte da
escala, FR-012), não uma decisão de arquitetura — resolvido ao escrever
`packages/problems/src/catalog/url-shortener.ts`.

## §6. Segurança — "nunca confiar no frontend" aplicado a este marco

**Decisão**: a submissão deste marco calcula `simulate()` inteiramente no cliente, sem round-trip a
um servidor. Isso **não viola** a restrição declarada pelo autor em M0.5 ("nunca confiar no
frontend") pelo motivo específico de que **nenhum efeito de servidor existe neste marco** — nenhum
design ou resultado é persistido em banco (autosave é `localStorage`, FR-011), nenhuma nota/score é
calculada (FR-013), nenhum progresso ou ranking é afetado. Não há nada, ainda, que um cliente
malicioso pudesse falsificar com consequência real — o "servidor" simplesmente não tem opinião
sobre o resultado de uma submissão neste marco.

**Quando essa suposição deixa de valer**: no momento em que qualquer marco futuro (M2 em diante)
passar a persistir ou pontuar uma submissão como "oficial" — nota por dimensão, progresso por
conceito, ranking, etc. A partir daí, o resultado usado para qualquer efeito registrado MUST ser
recalculado no servidor a partir do `Design` enviado (nunca aceito como o cliente o reportou) —
já registrado como ressalva explícita na seção Assumptions do spec.

## §7. Sem `middleware.ts` novo

**Decisão reaproveitada de M0.5** (research.md §6 daquele marco): a única rota protegida por este
marco (`/app/[problemId]`) continua chamando `auth()` diretamente no Server Component, igual ao
placeholder que ela substitui — nenhuma rota nova o bastante para justificar um `middleware.ts`
central ainda.

## §8. Testes — escopo

Mesmo critério de M0 (`packages/engine`: testes fortes em lógica pura) e M0.5 (`apps/web`: só
`src/lib/**`, sem testar wiring de framework):

- `packages/problems/test/catalog.spec.ts`: `getProblem` retorna o registro correto por id,
  `undefined` para id inexistente, shape do problema (`scale`, FRs, NFRs) presente e não-vazio.
- `apps/web/test/canvas-to-design.spec.ts`: casos do §4 acima — o módulo de maior risco do marco.
- `apps/web/test/canvas-to-workload.spec.ts` (ou incluído no mesmo arquivo): conversão
  DAU→RPS determinística para os valores do problema do encurtador de URL.
- **Não testado por unit test** (verificado manualmente no browser, via preview): interação do
  React Flow (drag-and-drop, seleção, renderização de nó/aresta customizados), a store Zustand em
  si (é wiring, não lógica pura — o que ela *faz* com o resultado do mapper é testado; como o React
  Flow dispara `onNodesChange` não é), o painel de configuração e o painel de resultado como
  componentes React.
