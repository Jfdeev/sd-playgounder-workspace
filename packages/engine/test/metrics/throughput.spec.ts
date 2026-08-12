import { describe, expect, it } from 'vitest';
import { calculateThroughput } from '../../src/metrics/throughput.js';

describe('calculateThroughput (FR-006, FR-007)', () => {
  it('retorna a carga ofertada como throughput quando nenhum nó satura', () => {
    const result = calculateThroughput(300, [
      { nodeId: 'lb-1', capacityRps: 10_000 },
      { nodeId: 'app-1', capacityRps: 1_000 },
    ]);

    expect(result.throughputRps).toBe(300);
    expect(result.bottleneckId).toBeNull();
  });

  it('nunca reporta throughput acima da carga ofertada', () => {
    const result = calculateThroughput(300, [{ nodeId: 'app-1', capacityRps: 10_000 }]);
    expect(result.throughputRps).toBeLessThanOrEqual(300);
  });

  it('identifica o nó gargalo quando sua capacidade é menor que a carga ofertada', () => {
    const result = calculateThroughput(2000, [
      { nodeId: 'lb-1', capacityRps: 10_000 },
      { nodeId: 'app-1', capacityRps: 500 },
      { nodeId: 'db-1', capacityRps: 1_000 },
    ]);

    expect(result.throughputRps).toBe(500);
    expect(result.bottleneckId).toBe('app-1');
  });

  it('retorna a carga ofertada e null quando o caminho não tem nós', () => {
    expect(calculateThroughput(300, [])).toEqual({ throughputRps: 300, bottleneckId: null });
  });
});
