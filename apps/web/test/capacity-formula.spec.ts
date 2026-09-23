import { describe, expect, it } from 'vitest';
import { averageRps, peakRps } from '../src/lib/capacity-formula';

describe('averageRps', () => {
  it('converte DAU + requisições/usuário/dia em rps médio', () => {
    // (10_000_000 * 5) / 86400 ≈ 578.7
    expect(averageRps(10_000_000, 5)).toBeCloseTo(578.703, 2);
  });

  it('DAU ou requisições/usuário/dia zero resultam em rps médio zero', () => {
    expect(averageRps(0, 5)).toBe(0);
    expect(averageRps(10_000_000, 0)).toBe(0);
  });
});

describe('peakRps', () => {
  it('multiplica o rps médio pelo multiplicador de pico', () => {
    expect(peakRps(1000, 3)).toBe(3000);
  });

  it('multiplicador 1 mantém o rps médio inalterado', () => {
    expect(peakRps(1000, 1)).toBe(1000);
  });
});
