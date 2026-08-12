import { describe, expect, it } from 'vitest';
import { calculateQueueWaitMs, calculateRequestsInFlight } from '../../src/metrics/queue.js';

describe('calculateQueueWaitMs (FR-004, W = 1/(μ−λ))', () => {
  it('calcula o tempo de espera para ρ=0.5 (tranquilo)', () => {
    // capacidade=1000rps, λ=500rps ⇒ W = 1/(1000-500) s = 0.002s = 2ms
    expect(calculateQueueWaitMs(500, 1000)).toBeCloseTo(2);
  });

  it('a latência em ρ=0.9 é ~10x o tempo de serviço base (docs/product-context.md §7)', () => {
    const capacityRps = 1000;
    const serviceTimeMs = (1 / capacityRps) * 1000; // tempo de serviço de 1 requisição, μ⁻¹

    const waitAt50 = calculateQueueWaitMs(capacityRps * 0.5, capacityRps);
    const waitAt90 = calculateQueueWaitMs(capacityRps * 0.9, capacityRps);

    // W = tempo de serviço / (1 − ρ): em ρ=0.5, W = 2x o tempo de serviço ("tranquilo")
    expect(waitAt50 / serviceTimeMs).toBeCloseTo(2, 1);
    expect(waitAt90 / serviceTimeMs).toBeCloseTo(10, 0); // ρ=0.9 ⇒ ~10x o tempo de serviço
  });

  it('a latência em ρ=0.99 é ~100x o tempo de serviço base', () => {
    const capacityRps = 1000;
    const serviceTimeMs = (1 / capacityRps) * 1000;
    const waitAt99 = calculateQueueWaitMs(capacityRps * 0.99, capacityRps);

    expect(waitAt99 / serviceTimeMs).toBeCloseTo(100, -1);
  });

  it('retorna Infinity (sentinela) quando ρ ≥ 1 (saturado)', () => {
    expect(calculateQueueWaitMs(1000, 1000)).toBe(Infinity);
    expect(calculateQueueWaitMs(1500, 1000)).toBe(Infinity);
  });
});

describe('calculateRequestsInFlight (Lei de Little, L = λ·W)', () => {
  it('calcula L a partir de λ e W', () => {
    // λ=500rps, W=2ms=0.002s ⇒ L = 500 * 0.002 = 1
    expect(calculateRequestsInFlight(500, 2)).toBeCloseTo(1);
  });

  it('propaga Infinity quando W é Infinity (nó saturado)', () => {
    expect(calculateRequestsInFlight(500, Infinity)).toBe(Infinity);
  });
});
