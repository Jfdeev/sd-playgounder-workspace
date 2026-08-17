/**
 * Problema: Encurtador de URL — packages/problems/src/catalog/url-shortener.ts
 *
 * Único problema completo de M1 (docs/product-context.md §10). Conteúdo com base em
 * docs/foundational-doc.md §2.1 (partes 1/3/4/5 da anatomia — as demais partes, fase de
 * clarificação/rubrica/solução de referência, são M2) e §2.2 (padrão que este problema ensina:
 * "Hashing, cache read-heavy, geração de ID").
 *
 * Escala escolhida deliberadamente para tornar a decisão de réplicas do app server visível: com
 * 1 réplica o app server satura (500 rps de capacidade < ~1737 rps de pico); com 4 réplicas
 * (2000 rps) o design passa a escoar a carga — o "aha" pedagógico de capacidade e redundância.
 */

import type { Problem } from '../types.js';

export const URL_SHORTENER: Problem = {
  id: 'url-shortener',
  title: 'Encurtador de URL',

  statement:
    'Projete um sistema que recebe uma URL longa e devolve uma URL curta e única; quem acessa a ' +
    'URL curta é redirecionado para a URL longa original.',

  functionalRequirements: [
    'Dada uma URL longa, o sistema gera um código curto único e devolve a URL encurtada correspondente.',
    'Dado um código curto, o sistema redireciona quem acessa para a URL longa original correspondente.',
    'Um código curto sempre aponta para a mesma URL longa, mesmo em acessos repetidos e distantes no tempo.',
    'Um código curto que nunca foi gerado, ou que corresponde a um link removido, retorna um erro claro em vez de redirecionar para qualquer lugar.',
  ],

  nonFunctionalRequirements: [
    'O redirecionamento (leitura) responde em menos de 100ms no p99 — é o caminho crítico do produto, a criação de um link tolera mais latência.',
    'Disponibilidade de 99,9% para o redirecionamento — um link já compartilhado por terceiros continua sendo acessado independente do sistema estar sob manutenção ou não.',
    'Consistência eventual entre a criação de um link e sua disponibilidade para redirecionamento é aceitável — não é necessário forte.',
    'Budget de infraestrutura é uma restrição real, não uma sugestão — o produto tem alto volume de leitura e baixo valor por requisição individual, então o custo por requisição precisa ser baixo.',
  ],

  scale: {
    dau: 10_000_000,
    requestsPerUserPerDay: 5,
    readWriteRatio: 0.99,
    avgPayloadBytes: 500,
    peakMultiplier: 3,
  },
};
