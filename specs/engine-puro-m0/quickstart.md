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

console.log(result.path.bottleneckId);     // 'app-1' (500 rps/instância × 2 réplicas = 1000 > 300, então
                                            // na verdade o gargalo aqui seria 'db-1', com 1000 rps de
                                            // capacidade única — ajuste os números do design pra testar
                                            // saturação de propósito)
console.log(result.violations);            // [{ type: 'spof', nodeIds: ['db-1'], ... }] — db-1 tem
                                            // replicas: 1, portanto é SPOF (FR-009)
```

## 4. Onde estão os designs de referência

`packages/engine/test/reference-designs/` — cada arquivo documenta a conta feita à mão (fórmula +
números) ao lado da asserção, para que qualquer pessoa possa conferir sem rodar o código.
