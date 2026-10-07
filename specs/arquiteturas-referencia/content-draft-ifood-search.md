# Rascunho de conteúdo — M2.5, preset iFood — busca — aguardando aprovação do autor

> **Gate (FR-008)**: rascunho assistido por LLM. Cada afirmação foi tirada de uma página que **abriu e
> foi lida** em 2026-10-07 (registro em `research.md` §1); as frases são paráfrase da fonte. Este texto
> foi gerado do mesmo dado que já passou nas checagens dos testes (validador dos 7 invariantes, matriz
> de conexões do canvas e `simulate()` sem violação) — aprovado, ele vira `presets/ifood-search.ts` literal.

## Identidade

- **Nome no menu**: iFood — busca · **id**: `ifood-search`
- **Resumo**: "A busca do iFood é um pipeline distribuído coordenado pelo Discovery Search Service: entende a intenção do termo, enriquece a consulta, recupera candidatos no Elasticsearch (busca léxica, semântica e híbrida) e reordena o resultado com dados consultados na hora em APIs de outros times."

## Fontes

1. [Como Funciona a Busca do iFood?](https://tech.ifood.com.br/engenharia/como-funciona-a-busca-do-ifood/) — publicador: iFood

## Componentes

`entryNodeIds: ['discovery-search']` — o cliente é o nó visual do canvas.

| id | Rótulo | Tipo no catálogo | Réplicas | Fonte | Explicação ("Por que está aqui") |
|---|---|---|---|---|---|
| `discovery-search` | Discovery Search Service | `app_server` | 6 *(ilustrativo)* | [1] | "O Discovery Search Service coordena a busca. Modelos de machine learning estimam a intenção do termo (um item, um restaurante, um tipo de loja; restaurante, farmácia, mercado...) e escolhem quais índices consultar; um parser, classificadores e um corretor com sinônimos montam os filtros, e o termo é vetorizado. Depois da recuperação, uma etapa de reranking reordena os resultados com sinais como cliques, pedidos, distância, frete e preço. No período citado no post, o p99 do serviço ficou em torno de 1,2 s." |
| `elasticsearch` | Elasticsearch | `vector_db` *(aproximação)* | 3 *(ilustrativo)* | [1] | "O Elasticsearch guarda os índices da busca: o autocomplete (os termos mais frequentes por prefixo, geolocalização, dia da semana e período do dia) e os documentos recuperados por busca léxica, semântica (vetores com HNSW) ou híbrida, combinadas por Reciprocal Rank Fusion. A área de entrega é resolvida com hexágonos H3, o que transforma a geolocalização numa correspondência de texto. <br>*Aproximação:* O Elasticsearch é aproximado por Vector DB: cobre o índice vetorial (HNSW), não a busca léxica nem o autocomplete." |
| `merchant-enrichment` | Merchant Enrichment API | `third_party_api` *(aproximação)* | 2 *(ilustrativo)* | [1] | "Os documentos recuperados têm dados que outras equipes gerenciam e que precisam ser consultados na hora da busca, como nome, descrição e geolocalização dos estabelecimentos, para aplicar regras de negócio antes do reranking. <br>*Aproximação:* É uma API interna de outro time do iFood, aproximada por 3rd Party API (o catálogo não liga um App Server a outro)." |
| `item-enrichment` | Item Enrichment API | `third_party_api` *(aproximação)* | 2 *(ilustrativo)* | [1] | "Mesmo papel da Merchant Enrichment API, para os itens: os dados dos itens recuperados são consultados na hora da busca para enriquecer a requisição antes do reranking. <br>*Aproximação:* É uma API interna de outro time do iFood, aproximada por 3rd Party API (o catálogo não liga um App Server a outro)." |

## Conexões

| id | De → Para | Tipo de aresta | Base | Fonte / justificativa |
|---|---|---|---|---|
| `e1` | Discovery Search Service → Elasticsearch | `read` | **afirmada** | [1] |
| `e2` | Discovery Search Service → Merchant Enrichment API | `read` | **afirmada** | [1] |
| `e3` | Discovery Search Service → Item Enrichment API | `read` | **afirmada** | [1] |

Todas as arestas (e as do Cliente até cada entrada) são aceitas pela matriz de conexões do canvas.

## O que a simulação não modela (limitações exibidas no preset)

1. Os modelos de machine learning (intenção, classificação, vetorização) e o reranking não são componentes do catálogo; no preset eles ficam dentro do Discovery Search Service.
2. O Elasticsearch é aproximado por Vector DB, e as APIs de enriquecimento de outros times, por 3rd Party API.
3. O preset cobre só a busca, não o resto do iFood (pedidos, logística, pagamentos), e não tem balanceador nem gateway porque a fonte não os descreve.
4. O engine divide a carga entre as três consultas; na busca real, uma requisição consulta o Elasticsearch e as APIs de enriquecimento em sequência.

## Decisões para o autor

- O recorte é **só a busca** — é a única parte do iFood com arquitetura descrita em fonte primária lida. Pedidos e logística ficam fora.
- Elasticsearch aproximado por **Vector DB** (o catálogo não tem um banco de busca; o componente "Search" do catálogo é um serviço de computação e não pode ser chamado por um App Server).
- As duas APIs de enriquecimento são serviços internos de outros times, aproximadas por **3rd Party API**.
