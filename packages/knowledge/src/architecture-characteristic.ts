import type { Dimension } from '@sdp/engine';
import { FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE, type Source } from './source.js';

export type Tradeoff = { against: Dimension; explanation: string };

export type ArchitectureCharacteristic = {
  dimension: Dimension;
  label: string;
  definition: string;
  /**
   * Presente quando a característica não é uma "-ility" isolada e nomeada explicitamente na
   * obra-fonte — ver research.md §2 (achado do /speckit-plan, Session 2026-09-25).
   */
  note?: string;
  source: Source;
  tradeoffs: Tradeoff[];
};

export const ARCHITECTURE_CHARACTERISTICS: Record<Dimension, ArchitectureCharacteristic> = {
  escalabilidade: {
    dimension: 'escalabilidade',
    label: 'Escalabilidade',
    definition:
      'Capacidade de manter o comportamento (latência, disponibilidade) sob aumento de carga, ' +
      'adicionando recursos — normalmente réplicas (escala horizontal).',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    tradeoffs: [
      { against: 'custo', explanation: 'mais réplicas para escalar significam mais gasto de infraestrutura.' },
      {
        against: 'complexidade_operacional',
        explanation: 'mais instâncias independentes significam mais coisa para orquestrar e observar.',
      },
    ],
  },
  disponibilidade: {
    dimension: 'disponibilidade',
    label: 'Disponibilidade',
    definition:
      'Probabilidade do sistema responder corretamente quando solicitado (medida em "noves"). ' +
      'Cresce com redundância — réplicas sem ponto único de falha.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    tradeoffs: [
      { against: 'custo', explanation: 'redundância (réplicas extras, multi-região) custa mais para operar.' },
      {
        against: 'consistencia',
        explanation:
          'em sistemas distribuídos, sob partição de rede, não se maximiza disponibilidade e ' +
          'consistência forte ao mesmo tempo (teorema CAP).',
      },
    ],
  },
  latencia: {
    dimension: 'latencia',
    label: 'Latência',
    definition: 'Tempo de resposta de uma requisição, tipicamente medido em percentis (p50/p95/p99).',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    tradeoffs: [
      {
        against: 'consistencia',
        explanation: 'replicação síncrona para garantir consistência forte adiciona latência a cada escrita.',
      },
      {
        against: 'custo',
        explanation: 'componentes mais rápidos (cache, réplicas geo-distribuídas) custam mais.',
      },
    ],
  },
  consistencia: {
    dimension: 'consistencia',
    label: 'Consistência',
    definition:
      'Garantia de que todas as réplicas/observadores veem o mesmo dado ao mesmo tempo ' +
      '(consistência forte) vs. aceitar uma janela de defasagem entre elas (consistência eventual).',
    note:
      'Não é uma "-ility" isolada no catálogo formal da obra-fonte — mapeada aqui ao território ' +
      'que o livro discute no contexto de arquitetura distribuída e do teorema CAP.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    tradeoffs: [
      {
        against: 'disponibilidade',
        explanation: 'teorema CAP — sob partição de rede, não se maximiza os dois ao mesmo tempo.',
      },
      {
        against: 'latencia',
        explanation: 'consistência forte normalmente exige replicação síncrona, que adiciona latência.',
      },
    ],
  },
  custo: {
    dimension: 'custo',
    label: 'Custo',
    definition: 'Gasto de infraestrutura necessário para operar o design (compute, storage, transferência).',
    note:
      'Discutido na obra-fonte como fator central em toda análise de trade-off entre estilos de ' +
      'arquitetura, não como uma "-ility" nomeada isoladamente.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    tradeoffs: [
      { against: 'escalabilidade', explanation: 'escalar horizontalmente significa pagar por mais réplicas.' },
      { against: 'disponibilidade', explanation: 'redundância para eliminar pontos únicos de falha custa mais.' },
    ],
  },
  complexidade_operacional: {
    dimension: 'complexidade_operacional',
    label: 'Complexidade operacional',
    definition:
      'Esforço necessário para implantar, monitorar e depurar o design — número de componentes ' +
      'independentes, pontos de falha a observar.',
    note:
      'Discutido na obra-fonte centralmente ao comparar estilos de arquitetura (ex. microsserviços ' +
      'vs. monolito), não listado como uma "-ility" isolada.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    tradeoffs: [
      {
        against: 'escalabilidade',
        explanation:
          'mais réplicas/serviços independentes para escalar significam mais coisa a operar — o ' +
          'motivo central pelo qual microsserviços trocam simplicidade por escala independente.',
      },
    ],
  },
  seguranca: {
    dimension: 'seguranca',
    label: 'Segurança',
    definition:
      'Presença de controles que protegem o sistema contra acesso não autorizado e abuso ' +
      '(autenticação, rate limiting, WAF) — listada explicitamente como característica ' +
      'cross-cutting na obra-fonte.',
    source: FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
    tradeoffs: [
      {
        against: 'complexidade_operacional',
        explanation: 'mais camadas de controle significam mais componentes independentes para manter.',
      },
      { against: 'latencia', explanation: 'validação adicional por requisição pode adicionar latência.' },
    ],
  },
};
