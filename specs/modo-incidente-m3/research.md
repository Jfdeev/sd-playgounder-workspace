# Research: M3 — Modo Incidente

## 1. O que o engine sabe hoje (lido em `packages/engine/src`)

- Capacidade de um nó = `replicas × maxThroughputRps`; latência de fila M/M/1 por nó; carga propagada
  pelas arestas (`graph/propagate.ts`); cache reduz a carga a jusante por `cacheHitRate`.
- Estado estacionário: não há série temporal. Não há modelo de erro: um nó saturado tem latência
  `Infinity` e vira gargalo, mas não "erra".
- `replicas < 1` vira a violação `invalid-replica-count`, que **cita o nó** — usar isso para "nó
  caído" entregaria a causa na tela.
- Não existe zona de disponibilidade, pool de conexões nem "partição" no modelo.

## 2. Falha como transformação relativa do design (decisão técnica)

**Decisão**: uma falha é uma função pura `applyFault(design, fault) → Design`, aplicada tanto ao
design do incidente (estado "durante") quanto ao design que o usuário submete como fix. Por isso ela
é **relativa** ("perde k instâncias"), nunca absoluta ("fica com 1"): uma falha absoluta tornaria
impossível corrigir adicionando réplicas.

| tipo | transformação | sintoma que o engine mostra |
|---|---|---|
| nó caído (`node-down`) | o alvo perde `k` instâncias; se ficar com 0, o nó **e suas arestas** são removidos (nunca `replicas: 0`) | parcial: alvo ou vizinhos saturam; total: componentes a jusante sem carga / violação de órfão |
| cache frio (`cache-cold`) | `cacheHitRate` do alvo → 0, sobrescrevendo o que vier | carga e latência sobem a jusante (o banco satura; o cache parece bem) |
| partição (`partition`) | remove as arestas entre dois ids dados | componentes do outro lado sem carga / órfão; a latência pode até **cair** — o alerta descreve "gravações não chegam", nunca "erros 5xx" |
| zona caída (`zone-down`) | regra fixa (gate 2): 3 zonas, réplicas distribuídas em rodízio; perder a zona remove `ceil(r/3)` instâncias de **cada** nó; nó com 1 réplica morre (remoção) | vários nós perdem capacidade ao mesmo tempo |
| pool esgotado (`pool-exhausted`) | precisa de algo novo (gate 3): `capacityFactor` opcional no nó, padrão 1, multiplicando a capacidade | o alvo satura sem ter perdido instância |

Alternativa rejeitada: falhas absolutas (estado fixo) — não deixam corrigir.

## 3. "O engine identifica a mesma causa plantada" — gate 1

`bottleneckId` aponta o **sintoma**, não a causa (com cache frio, o banco satura e o cache parece
normal). **Proposta**: para cada incidente, aplicar **todo par que o formulário de diagnóstico
permite** (todo componente × todo tipo de falha) ao design do incidente, rodar o engine e conferir
que **só o par plantado reproduz exatamente as métricas que a tela mostra**. Vira teste automático
(SC-001) e é a garantia de justiça das "tentativas ilimitadas": se duas causas produzem a mesma
tela, o incidente não tem solução por raciocínio.

Consequência: o teste compara exatamente os campos expostos (§5) — mostrar `offeredLoad` (carga que
chega ao nó) é o que separa "cache frio a montante" de "banco perdeu réplica".

## 4. Onde o conteúdo mora — o vazamento é o bundle, não a API

Se os incidentes ficassem num módulo que o cliente importa (como os desafios em `packages/problems`),
a causa plantada iria pro JavaScript de todo navegador — SC-003 cairia com o DevTools.

**Decisão**: dividir o dado em dois módulos dentro de `packages/problems`:
- **público** (`incidents/public.ts`, importável pelo cliente): id, título, alerta, design inicial,
  carga;
- **só servidor** (`incidents/secret.ts`): falha plantada, critério do fix, fix de referência —
  importado só por Route Handlers / Server Components, protegido com `import 'server-only'` no ponto
  de uso em `apps/web`.

Checagem extra depois do build: procurar em `.next/static` os ids-alvo junto dos nomes de falha →
zero ocorrências.

## 5. O que o servidor manda do estado "durante" — lista branca (gate 4)

Mesma técnica de `public-profile.ts`: um serializador monta campo a campo.
- **Envia**: por nó (do design **original**, por id) utilização, status e carga que chega; do caminho,
  latência p50/p95/p99 e throughput; violações (só tipo e nós afetados).
- **Nunca envia**: `replicas`, `capacity`, `cacheHitRate` nem o design com a falha aplicada (a
  capacidade sozinha entrega um nó caído).
- Nó removido pela falha aparece com carga 0 e status "sem tráfego" — o mesmo que um nó isolado.
- Teste afirma que o snapshot serializado não tem nenhum campo do design com falha.

O estado "antes" pode ser calculado no cliente (é o design original, público).

## 6. Critério do fix — mecânico, por incidente

Cada incidente declara, no módulo secreto, um critério checável pelo engine **com a falha aplicada ao
design submetido**: p99 ≤ limite, nenhum nó saturado, throughput ≥ carga do incidente, **o nó-alvo
continua presente e alcançável**, e nenhum órfão novo. Os dois últimos barram "fixes" que apagam o
componente problemático (US3 cenário 5). O design submetido passa pela mesma validação do M2.8
(`validateSubmittedDesign`, que monta o nó campo a campo — um `capacityFactor: 1000` enviado pelo
cliente é descartado).

Por incidente, antes de mostrar o rascunho ao autor (mesmo método do M2.5): sintoma presente no
estado "durante" e ausente no "antes"; busca de unicidade (§3) passa; fix de referência aceito;
design original recusado; design sem o alvo recusado.

## 7. Armazenamento — sem migração

`scoringEvents.type` é `text` no banco (o enum só existe no TypeScript — SQL da `0004`). Novos tipos:
`incident-diagnosis:<id>` (XP 0, registra o acerto do diagnóstico) e `incident:<id>` (XP 100,
incidente resolvido). Idempotência pela mesma chave única. `buildProgress`, a conquista
`all-challenges` e a trava de desafios já filtram `type === 'challenge'` — incidente não vira
"desafio resolvido". Rotas próprias (`/api/incidents/...`), fora da trava de desafios; mesma quota de
10/min (segura força bruta de N componentes × 5 tipos). Diagnóstico e fix contam pra ofensiva (opção
A do M2.8: atividade verificada pelo servidor).

## 8. `capacityFactor` × "reaproveita 100% do engine" — gate 3

O roadmap diz "reaproveita 100% do engine"; pool esgotado não cabe sem um campo novo. Se aprovado:
campo opcional, padrão 1 (ausente = comportamento atual); `canonicalizeDesign` do narrador não pode
mudar o hash de designs sem o campo; SC-006 vira um teste de snapshot de `simulate()` para todo
problema, template e preset antes/depois; `validateSubmittedDesign` continua descartando o campo
vindo do cliente. Alternativa sem mexer no engine: aproximar pool esgotado por "perda de instâncias"
— mas aí ele fica indistinguível de nó caído e a busca de unicidade (§3) falha.
