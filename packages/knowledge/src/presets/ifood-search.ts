import type { ReferenceArchitecture } from '../reference-architectures.js';

/**
 * Preset ifood-search — conteúdo aprovado pelo autor em 2026-10-08
 * (specs/arquiteturas-referencia/content-draft-ifood-search.md). Toda afirmação saiu das fontes abaixo,
 * lidas em 2026-10-07 (research.md §1). Réplicas são ilustrativas, salvo `replicasIllustrative: false`
 * com a fonte do número.
 */
export const IFOOD_SEARCH_PRESET: ReferenceArchitecture = {
  id: 'ifood-search',
  company: 'iFood — busca',
  summary:
    'A busca do iFood é um pipeline distribuído coordenado pelo Discovery Search Service: entende a intenção do termo, enriquece a consulta, recupera candidatos no Elasticsearch (busca léxica, semântica e híbrida) e reordena o resultado com dados consultados na hora em APIs de outros times.',
  sources: [
    { id: 'busca', title: 'Como Funciona a Busca do iFood?', publisher: 'iFood', url: 'https://tech.ifood.com.br/engenharia/como-funciona-a-busca-do-ifood/', accessedAt: '2026-10-07' },
  ],
  nodes: [
    {
      id: 'discovery-search', type: 'app_server', replicas: 6, label: 'Discovery Search Service', sourceIds: ['busca'], replicasIllustrative: true,
      explanation: {
        text: 'O Discovery Search Service coordena a busca. Modelos de machine learning estimam a intenção do termo (um item, um restaurante, um tipo de loja; restaurante, farmácia, mercado...) e escolhem quais índices consultar; um parser, classificadores e um corretor com sinônimos montam os filtros, e o termo é vetorizado. Depois da recuperação, uma etapa de reranking reordena os resultados com sinais como cliques, pedidos, distância, frete e preço. No período citado no post, o p99 do serviço ficou em torno de 1,2 s.',
        sourceIds: ['busca'],
      },
    },
    {
      id: 'elasticsearch', type: 'vector_db', replicas: 3, label: 'Elasticsearch', sourceIds: ['busca'],
      approximation: 'O Elasticsearch é aproximado por Vector DB: cobre o índice vetorial (HNSW), não a busca léxica nem o autocomplete.',
      replicasIllustrative: true,
      explanation: {
        text: 'O Elasticsearch guarda os índices da busca: o autocomplete (os termos mais frequentes por prefixo, geolocalização, dia da semana e período do dia) e os documentos recuperados por busca léxica, semântica (vetores com HNSW) ou híbrida, combinadas por Reciprocal Rank Fusion. A área de entrega é resolvida com hexágonos H3, o que transforma a geolocalização numa correspondência de texto.',
        sourceIds: ['busca'],
      },
    },
    {
      id: 'merchant-enrichment', type: 'third_party_api', replicas: 6, label: 'Merchant Enrichment API', sourceIds: ['busca'],
      approximation: 'É uma API interna de outro time do iFood, aproximada por 3rd Party API (o catálogo não liga um App Server a outro).',
      replicasIllustrative: true,
      explanation: {
        text: 'Os documentos recuperados têm dados que outras equipes gerenciam e que precisam ser consultados na hora da busca, como nome, descrição e geolocalização dos estabelecimentos, para aplicar regras de negócio antes do reranking.',
        sourceIds: ['busca'],
      },
    },
    {
      id: 'item-enrichment', type: 'third_party_api', replicas: 6, label: 'Item Enrichment API', sourceIds: ['busca'],
      approximation: 'É uma API interna de outro time do iFood, aproximada por 3rd Party API (o catálogo não liga um App Server a outro).',
      replicasIllustrative: true,
      explanation: {
        text: 'Mesmo papel da Merchant Enrichment API, para os itens: os dados dos itens recuperados são consultados na hora da busca para enriquecer a requisição antes do reranking.',
        sourceIds: ['busca'],
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'discovery-search', to: 'elasticsearch', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['busca'] },
    { id: 'e2', from: 'discovery-search', to: 'merchant-enrichment', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['busca'] },
    { id: 'e3', from: 'discovery-search', to: 'item-enrichment', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['busca'] },
  ],
  entryNodeIds: ['discovery-search'],
  limitations: [
    'Os modelos de machine learning (intenção, classificação, vetorização) e o reranking não são componentes do catálogo; no preset eles ficam dentro do Discovery Search Service.',
    'O Elasticsearch é aproximado por Vector DB, e as APIs de enriquecimento de outros times, por 3rd Party API.',
    'O preset cobre só a busca, não o resto do iFood (pedidos, logística, pagamentos), e não tem balanceador nem gateway porque a fonte não os descreve.',
    'O engine divide a carga entre as três consultas; na busca real, uma requisição consulta o Elasticsearch e as APIs de enriquecimento em sequência.',
  ],
};
