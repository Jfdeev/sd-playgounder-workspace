# Contrato: API pública de `packages/engine`

M0 não expõe endpoint HTTP nem CLI — é uma biblioteca TypeScript. O "contrato" é a assinatura pública
e as garantias comportamentais da função exportada, consumida hoje por testes e a partir de M1 por
`apps/web`.

## Assinatura

```ts
import type { Design, Workload, SimulationResult } from './types';

export function simulate(design: Design, workload: Workload): SimulationResult;
```

## Garantias (contrato comportamental — testável, não apenas de tipos)

1. **Pura e determinística** (constitution II, III): mesma dupla `(design, workload)` ⇒ mesmo
   `SimulationResult`, sempre. Sem `Math.random()` não-semeado, sem `Date.now()`, sem leitura de
   variável de ambiente ou estado global mutável em qualquer caminho de cálculo.
2. **Nunca lança** (FR-019): entrada estruturalmente inválida vira `Violation` no resultado, nunca
   uma exceção não tratada. `simulate()` sempre retorna um `SimulationResult` sintaticamente válido.
3. **Throughput nunca fantasma** (FR-006): `path.throughputRps ≤ workload.rps` sempre, e
   `path.throughputRps ≤ capacidade de qualquer nó no caminho`.
4. **Nó órfão vale zero** (FR-010): nós não alcançáveis a partir de `design.entryNodeIds` não
   contribuem para `path`, `cost.monthlyTotal` nem `scores` — apenas aparecem como `Violation`.
5. **Assíncrono fora da latência do usuário** (FR-012): a soma de latência em `path.latency` exclui
   qualquer trecho cuja aresta de entrada tenha `kind === 'async'`.
6. **Score sempre multidimensional** (constitution V): `scores` sempre tem as 7 chaves de `Dimension`
   preenchidas — nunca um único número agregado em lugar do `Record`.
7. **Zero dependência de runtime** (constitution II, FR-017): o módulo não importa `react`, `next`,
   nenhum cliente HTTP nem SDK de LLM — verificável estaticamente (lint de import, ver plan.md).

## Exemplo de uso (ver quickstart.md para o passo a passo completo)

```ts
const result = simulate(design, { rps: 1000, readWriteRatio: 0.9, payloadBytes: 2048, peakMultiplier: 3 });

result.path.bottleneckId;              // NodeId | null
result.nodes['app-server-1'].status;   // 'healthy' | 'warning' | 'saturated'
result.violations;                     // Violation[]
result.cost.monthlyTotal;              // number
result.scores.disponibilidade;         // 0..10
```
