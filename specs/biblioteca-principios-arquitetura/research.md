# Research: M2.7 — Biblioteca de princípios de arquitetura

## 1. Inventário da primeira leva (aprovado pelo autor, 2026-10-03)

39 entradas. A lista veio de fontes públicas; **as definições ainda não** — essas estão em
`content-draft.md`, sujeitas ao gate do FR-006 (ver §5).

### Fonte de cada parte do inventário

| Parte | De onde veio a lista | Confiança |
|---|---|---|
| Clean Architecture (9) | Sumário do livro (O'Reilly): Parte III cap. 7–11 (SRP, OCP, LSP, ISP, DIP); cap. 17 *Boundaries: Drawing Lines*; cap. 22 *The Clean Architecture*; cap. 30 *The Database Is a Detail*; cap. 32 *Frameworks Are Details* | Títulos de capítulo confirmados; texto dos capítulos **não** lido |
| Características de Richards & Ford (19) | Cap. 4 *Architecture Characteristics Defined* — lista conferida contra resumos de terceiros (não contra o livro) | Média: o autor confere contra o livro |
| Fowler (11) | Catálogo oficial de PoEAA em martinfowler.com/eaaCatalog — nomes **e** descrição de uma linha de cada padrão | Alta: fonte primária, do próprio autor |

### Entradas

**Clean Architecture** (`source`: *Clean Architecture*, Robert C. Martin)

| id | Nome | Grupo |
|---|---|---|
| `srp` | Princípio da Responsabilidade Única (SRP) | Princípios de design (SOLID) |
| `ocp` | Princípio Aberto/Fechado (OCP) | Princípios de design (SOLID) |
| `lsp` | Princípio da Substituição de Liskov (LSP) | Princípios de design (SOLID) |
| `isp` | Princípio da Segregação de Interfaces (ISP) | Princípios de design (SOLID) |
| `dip` | Princípio da Inversão de Dependência (DIP) | Princípios de design (SOLID) |
| `dependency-rule` | A Regra de Dependência | Arquitetura |
| `boundaries` | Fronteiras | Arquitetura |
| `database-is-a-detail` | O banco de dados é um detalhe | Arquitetura |
| `frameworks-are-details` | Frameworks são detalhes | Arquitetura |

**Características de arquitetura** (`source`: *Fundamentals of Software Architecture*, Mark Richards & Neal Ford)
— as 7 dimensões de score (escalabilidade, disponibilidade, latência/performance, consistência, custo,
complexidade operacional, segurança) **ficam de fora**: já têm ficha no M2.6.

| Grupo | Entradas |
|---|---|
| Operacionais (4) | continuidade (`continuity`), recuperabilidade (`recoverability`), confiabilidade/segurança operacional (`reliability-safety`), robustez (`robustness`) |
| Estruturais (9) | configurabilidade, extensibilidade, instalabilidade, reaproveitamento (*leverageability*), localização, manutenibilidade, portabilidade, suportabilidade, atualizabilidade |
| Transversais (6) | acessibilidade, arquivabilidade, autenticação, autorização, legal, privacidade |

Observação: *Security* (transversal) é a dimensão `seguranca` — já coberta; autenticação e autorização
são entradas próprias, mas a ficha diz que a dimensão de segurança as engloba na plataforma.

**Padrões de Fowler** (`source`: *Patterns of Enterprise Application Architecture*, Martin Fowler) — todos
como **leitura recomendada**; o grupo é a categoria do próprio catálogo do Fowler:

| id | Padrão | Grupo (categoria de Fowler) |
|---|---|---|
| `service-layer` | Service Layer | Lógica de domínio |
| `data-mapper` | Data Mapper | Arquitetura de fonte de dados |
| `repository` | Repository | Mapeamento objeto-relacional (metadados) |
| `remote-facade` | Remote Facade | Distribuição |
| `data-transfer-object` | Data Transfer Object | Distribuição |
| `optimistic-offline-lock` | Optimistic Offline Lock | Concorrência offline |
| `pessimistic-offline-lock` | Pessimistic Offline Lock | Concorrência offline |
| `client-session-state` | Client Session State | Estado de sessão |
| `server-session-state` | Server Session State | Estado de sessão |
| `database-session-state` | Database Session State | Estado de sessão |
| `gateway` | Gateway | Padrões base |

Segunda leva (fora deste marco, decisão do autor): princípios de componentes (REP, CCP, CRP, ADP, SDP,
SAP), estilos de arquitetura além dos 4 templates, e os 40 padrões restantes do catálogo do Fowler.

## 2. Decisões técnicas

### 2.1 Casa do conteúdo: `packages/knowledge`

**Decisão**: novo módulo `library` dentro do pacote existente `@sdp/knowledge` (assumido em spec.md).
**Por quê**: já é o pacote de "dado puro com citação" (`Source`, as 3 constantes de obra); a
biblioteca reaproveita `Source` e nenhum consumidor novo de pacote é necessário.
**Alternativa descartada**: pacote novo `packages/library` — duplicaria `Source` ou criaria
dependência circular de volta pro `knowledge` por uma razão que não justifica um pacote.

### 2.2 Modelo: lista, não `Record` exaustivo

**Decisão**: `LIBRARY_ENTRIES: readonly LibraryEntry[]` com `id: string`, em vez do padrão
`Record<Dimension, …>`/`Record<TemplateId, …>` do M2.6.
**Por quê**: o padrão exaustivo do M2.6 funciona porque existe uma **união fechada** de chaves
(`Dimension`, `TemplateId`) que o compilador pode forçar a cobrir. Aqui não existe — SOLID não tem
dimensão nem template. A garantia que o compilador dava passa a ser **teste de integridade**:
ids únicos, toda entrada com `source` ∈ as 3 constantes, toda entrada de Clean Architecture com
`topology` preenchida (FR-004), toda característica marcada como não-medida.

### 2.3 Superfície: rota `/app/biblioteca`

**Decisão**: página própria, filha de `apps/web/src/app/app/layout.tsx`.
**Por quê**: 39 entradas não cabem num dropdown como o da Calculadora; e a rota filha **herda** o
guard de autenticação do layout (`auth()` + `redirect('/entrar')`) sem código de auth novo. Dentro do
canvas, perder o design ao navegar não é risco — o autosave por design já persiste no `localStorage`.
**Alternativa descartada**: painel/modal dentro do `CanvasWorkspace` — sobrecarrega o canvas e
dificulta link direto pra uma entrada (US4).

### 2.4 Navegação e busca

**Decisão**: entradas agrupadas por categoria → grupo; busca client-side por nome (sem acento,
case-insensitive) como função pura em `apps/web/src/lib/library-search.ts` (testável, padrão M0.5);
link direto por query string `?entry=<id>` que abre a entrada.
**Por quê**: SC-003 pede ≤ 3 interações; com 39 entradas, filtro por texto + grupos colapsáveis cumpre
sem biblioteca de busca nova (nenhuma dependência nova).

### 2.5 US4: ligação dica → entrada

**Decisão**: `Hint` ganha `libraryEntryId?: string` (opcional, retrocompatível), ao lado do `source?`
do M2.6. A dica mostra "Ler na biblioteca" só quando o campo existe. Um teste em `packages/problems`
garante que todo `libraryEntryId` resolve para uma entrada real (nunca link morto — US4 cenário 2).
As 3 dicas de responsabilidade/acoplamento existentes ganham o vínculo: `url-shortener` e
`social-feed` → `srp`; `ecommerce-checkout` → `dip` (a dica fala de isolar dependência volátil).
**Não** há link a partir das fichas das 7 dimensões — elas não têm entrada correspondente na
biblioteca (por construção), então o link seria sempre morto.

### 2.6 O que NÃO muda (FR-009, FR-005)

Nenhum arquivo de `packages/engine` ou `packages/narrator`; `NARRATOR_PROMPT_VERSION` fica como está
(mexer invalida o cache e a verificação do M2); catálogo de componentes do canvas intocado; sem banco
(nenhuma migração).

## 3. Honestidade de topologia (FR-004)

Cada entrada de Clean Architecture carrega `topology: { relation: 'analogia' | 'nenhuma'; note }`.
`'direta'` não existe como valor: a plataforma não **calcula** nenhum desses princípios, então
nenhuma correspondência é direta. `'analogia'` é a relação com a topologia que a plataforma desenha;
`'nenhuma'` diz explicitamente que é de nível de código/classe (LSP, ISP, frameworks). A nota é
curta e nunca promete que a plataforma mede o princípio.

## 4. Constitution Check (pós-design)

Sem violação — ver tabela em `plan.md`. Risco único: a biblioteca parecer progresso/nota do usuário
(FR-010); mitigado por a página não ter nenhum estado de usuário.

## 5. Gate de conteúdo (FR-006)

`content-draft.md` foi rascunhado por LLM sem acesso aos livros. Regras:

- Citação só no nível **obra + autor** (FR-007) — nenhum capítulo/página/trecho nas fichas. (Os números
  de capítulo desta página existem só pra rastrear o inventário, não vão pro conteúdo.)
- As 11 definições de Fowler partem da descrição oficial de uma linha do catálogo dele.
- As 19 características partem de resumos de terceiros — **o autor confere contra o cap. 4**.
- As 9 de Clean Architecture são redação minha a partir do conhecimento geral dos princípios — **o
  autor confere** (é o grupo com mais risco de imprecisão sutil, principalmente a nota de topologia).

**Nada do `content-draft.md` entra em código antes da aprovação do autor.**
