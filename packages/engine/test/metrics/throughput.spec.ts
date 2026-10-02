import { describe, expect, it } from 'vitest';
import { calculateThroughput } from '../../src/metrics/throughput.js';

describe('calculateThroughput (FR-006, FR-007)', () => {
  it('retorna a carga ofertada como throughput quando nenhum nó satura', () => {
    const result = calculateThroughput(300, [
      { nodeId: 'lb-1', utilization: 0.03 },
      { nodeId: 'app-1', utilization: 0.3 },
    ]);

    expect(result.throughputRps).toBe(300);
    expect(result.bottleneckId).toBeNull();
  });

  it('nunca reporta throughput acima da carga ofertada', () => {
    const result = calculateThroughput(300, [{ nodeId: 'app-1', utilization: 0.03 }]);
    expect(result.throughputRps).toBeLessThanOrEqual(300);
  });

  it('limita o throughput a λ/ρ_max e aponta o nó de maior ρ como gargalo', () => {
    // λ=2000: lb ρ=0.2, app ρ=4 (cap 500), db ρ=2 (cap 1000) ⇒ 2000/4 = 500, gargalo app-1
    const result = calculateThroughput(2000, [
      { nodeId: 'lb-1', utilization: 0.2 },
      { nodeId: 'app-1', utilization: 4 },
      { nodeId: 'db-1', utilization: 2 },
    ]);

    expect(result.throughputRps).toBe(500);
    expect(result.bottleneckId).toBe('app-1');
  });

  it('ρ exatamente 1 é gargalo (o nó já não tem folga), throughput = λ', () => {
    const result = calculateThroughput(500, [{ nodeId: 'app-1', utilization: 1 }]);
    expect(result).toEqual({ throughputRps: 500, bottleneckId: 'app-1' });
  });

  it('nó com carga reduzida (atrás de cache/split) e ρ<1 não é gargalo, mesmo com capacidade < λ', () => {
    // db com capacidade 1000 recebendo só 500 de 5000 rps (cache h=0.9) ⇒ ρ=0.5
    const result = calculateThroughput(5000, [
      { nodeId: 'app-1', utilization: 0.83 },
      { nodeId: 'db-1', utilization: 0.5 },
    ]);
    expect(result).toEqual({ throughputRps: 5000, bottleneckId: null });
  });

  it('empate em ρ_max é decidido pelo menor nodeId, independente da ordem de entrada', () => {
    const forward = calculateThroughput(1200, [
      { nodeId: 'a1', utilization: 1.2 },
      { nodeId: 'a2', utilization: 1.2 },
    ]);
    const reversed = calculateThroughput(1200, [
      { nodeId: 'a2', utilization: 1.2 },
      { nodeId: 'a1', utilization: 1.2 },
    ]);

    expect(forward).toEqual({ throughputRps: 1000, bottleneckId: 'a1' });
    expect(reversed).toEqual(forward);
  });

  it('ρ infinito (capacidade zero) ⇒ throughput 0 finito, nunca NaN/Infinity', () => {
    const result = calculateThroughput(300, [{ nodeId: 'app-1', utilization: Infinity }]);
    expect(result.throughputRps).toBe(0);
    expect(Number.isFinite(result.throughputRps)).toBe(true);
    expect(result.bottleneckId).toBe('app-1');
  });

  it('retorna a carga ofertada e null quando não há nós', () => {
    expect(calculateThroughput(300, [])).toEqual({ throughputRps: 300, bottleneckId: null });
  });
});
