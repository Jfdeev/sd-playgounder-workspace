# Quickstart: `packages/engine` (M0)

Passo a passo para validar que o engine está funcionando — o mesmo caminho que a suíte de testes de
referência (FR-015, SC-001) automatiza.

## 1. Instalar dependências do workspace

```bash
pnpm install
```

## 2. Rodar a suíte de testes do pacote

```bash
pnpm --filter @sdp/engine test
```

Critério de saída (SC-002, SC-003): todos os testes passam, incluindo os 3 designs de referência
calculados à mão, e o relatório de cobertura reporta ≥80% em lines/functions/branches/statements.

## 3. Uso mínimo (o mesmo exemplo do contrato)

```ts
import { simulate } from '@sdp/engine';
import type { Design, Workload } from '@sdp/engine';

const design: Design = {
  entryNodeIds: ['lb-1'],
  nodes: [
    { id: 'lb-1', type: 'load_balancer', replicas: 1 },
    { id: 'app-1', type: 'app_server', replicas: 2 },
    { id: 'db-1', type: 'sql_primary', replicas: 1 },
  ],
  edges: [
    { id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 },
    { id: 'e2', from: 'app-1', to: 'db-1', kind: 'read', weight: 100 },
  ],
};

const workload: Workload = { rps: 300, readWriteRatio: 0.9, payloadBytes: 2048, peakMultiplier: 1 };

const result = simulate(design, workload);

console.log(result.path.bottleneckId);     // null — toda capacidade do caminho (lb-1: 10 000,
                                            // app-1: 2×500=1 000, db-1: 1 000) excede a carga
                                            // ofertada (300); ajuste os números do design pra
                                            // testar saturação de propósito.
console.log(result.violations);            // 2 violações 'spof': lb-1 e db-1 têm 1 réplica cada
                                            // (FR-009) — só app-1 (2 réplicas) não é SPOF.
```

Este exemplo é validado automaticamente por `packages/engine/test/quickstart.spec.ts` — se o
comportamento do engine mudar, esse teste (não só este arquivo) precisa ser atualizado.

## 4. Onde estão os designs de referência

`packages/engine/test/reference-designs/` — cada arquivo documenta a conta feita à mão (fórmula +
números) ao lado da asserção, para que qualquer pessoa possa conferir sem rodar o código.
