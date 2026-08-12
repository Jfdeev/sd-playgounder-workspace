import { describe, expect, it } from 'vitest';
import { calculateUtilization } from '../../src/metrics/utilization.js';

describe('calculateUtilization (FR-003, ρ = λ/(c·μ))', () => {
  it('calcula ρ corretamente para uma única instância', () => {
    // λ=300, c=1, μ=500 ⇒ ρ = 300/500 = 0.6
    expect(calculateUtilization(300, 1, 500)).toBeCloseTo(0.6);
  });

  it('calcula ρ corretamente com múltiplas réplicas', () => {
    // λ=600, c=2, μ=500 ⇒ ρ = 600/1000 = 0.6
    expect(calculateUtilization(600, 2, 500)).toBeCloseTo(0.6);
  });

  it('retorna ρ ≥ 1 quando a carga excede a capacidade agregada', () => {
    expect(calculateUtilization(1000, 1, 500)).toBeCloseTo(2);
  });

  it('retorna Infinity quando a capacidade agregada é zero', () => {
    expect(calculateUtilization(100, 0, 500)).toBe(Infinity);
  });
});
