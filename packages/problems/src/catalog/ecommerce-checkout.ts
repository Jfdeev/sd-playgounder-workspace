/**
 * Problema: E-commerce Checkout — packages/problems/src/catalog/ecommerce-checkout.ts
 *
 * Terceiro desafio do catálogo — escrita-pesada e transacional (ao contrário dos dois anteriores,
 * leitura-pesada), e o primeiro a exigir um componente de M1.5 US2 (`payment`, categoria External)
 * no caminho crítico — mostra o catálogo expandido sendo genuinamente usado, não só existindo.
 *
 * Escala escolhida deliberadamente: com 1 réplica de SQL Primary (1.000 rps de capacidade) o banco
 * transacional satura (~1.389 rps de pico, o cenário de Black Friday embutido no peakMultiplier);
 * com 4 réplicas (4.000 rps) o design escoa a carga — mesmo "aha" de réplica dos outros dois
 * problemas, provado em `apps/web/test/ecommerce-checkout-scenario.spec.ts`.
 */

import type { Problem } from '../types.js';

const RUBRIC: Problem['rubric'] = [
  {
    id: 'latency-p99',
    label: 'Checkout responde em até 2000ms (p99)',
    evaluate: (result) => result.path.latency.p99 <= 2_000,
  },
  {
    id: 'no-saturated-node',
    label: 'Nenhum componente saturado',
    evaluate: (result) => Object.values(result.nodes).every((node) => node.status !== 'saturated'),
  },
  {
    id: 'uses-rate-limiter',
    label: 'Usa um Rate Limiter na entrada',
    evaluate: (_result, design) => design.nodes.some((node) => node.type === 'rate_limiter'),
  },
  {
    id: 'uses-payment',
    label: 'Processa pagamento via componente externo',
    evaluate: (_result, design) => design.nodes.some((node) => node.type === 'payment'),
  },
  {
    id: 'no-spof',
    label: 'Sem ponto único de falha no caminho crítico',
    evaluate: (result) => !result.violations.some((v) => v.type === 'spof'),
  },
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-strong-consistency',
    prompt: 'Por que este problema precisa de consistência forte, diferente dos outros dois?',
    body:
      'Vender o mesmo item de estoque duas vezes é um bug real de negócio, não só um dado ' +
      'levemente desatualizado — por isso o débito de estoque precisa de um banco relacional ' +
      '(SQL Primary) com transação, não um NoSQL de consistência eventual como o do Social Feed.',
  },
  {
    id: 'why-rate-limiter-here',
    prompt: 'Por que Rate Limiter é parte da rubrica deste problema especificamente?',
    body:
      'Checkout é um alvo natural de abuso (bots testando cartão roubado, scalpers automatizando ' +
      'compra) — colocar um Rate Limiter antes da lógica de checkout protege o resto do sistema ' +
      'de um pico artificial de tráfego malicioso, sem depender só da capacidade normal do design.',
  },
  {
    id: 'why-payment-is-slow',
    prompt: 'Por que a latência sobe tanto quando eu adiciono o Payment no caminho?',
    body:
      'Payment é uma dependência externa (você não controla a infraestrutura dela) — sua spec tem ' +
      'latência bem mais alta que qualquer componente interno, de propósito: é assim que uma ' +
      'chamada de rede pública real se comporta. O limite de 2000ms deste problema já reserva ' +
      'espaço pra essa latência externa — não é um bug do seu design, é o trade-off real de ' +
      'depender de um provedor de pagamento terceirizado.',
  },
];

export const ECOMMERCE_CHECKOUT: Problem = {
  id: 'ecommerce-checkout',
  title: 'E-commerce Checkout',

  statement:
    'Projete o fluxo de checkout de uma loja online: o usuário finaliza a compra dos itens do ' +
    'carrinho, o estoque é debitado e o pagamento é processado — nessa ordem de garantia, nunca ' +
    'ao contrário.',

  functionalRequirements: [
    'O usuário finaliza a compra dos itens do carrinho.',
    'Ao finalizar, o sistema debita o estoque dos itens comprados e processa o pagamento correspondente.',
    'Se o pagamento falhar, nenhum estoque é debitado — nem parcialmente.',
    'O mesmo item de estoque nunca é vendido duas vezes para pedidos concorrentes.',
  ],

  nonFunctionalRequirements: [
    'O checkout completo (débito de estoque + pagamento) responde em até 2000ms no p99 — inclui a latência de uma chamada de pagamento externa.',
    'Consistência forte no débito de estoque — não é aceitável overselling.',
    'Disponibilidade de 99,95% — checkout indisponível é receita perdida diretamente.',
    'O sistema resiste a picos de tráfego repentino (ex. Black Friday, flash sale) sem degradar para o resto dos usuários.',
  ],

  scale: {
    dau: 10_000_000,
    requestsPerUserPerDay: 3,
    readWriteRatio: 0.3,
    avgPayloadBytes: 1_000,
    peakMultiplier: 4,
  },

  rubric: RUBRIC,
  hints: HINTS,
};
