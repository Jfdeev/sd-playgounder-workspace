import { describe, expect, it } from 'vitest';
import { RPS_MAX, RPS_MIN, RPS_SLIDER_RESOLUTION, clampRps, rpsToSliderPosition, sliderPositionToRps } from '../src/lib/rps-slider';

describe('sliderPositionToRps', () => {
  it('a posição 0 mapeia pro rps mínimo', () => {
    expect(sliderPositionToRps(0)).toBe(RPS_MIN);
  });

  it('a posição máxima da resolução mapeia pro rps máximo', () => {
    expect(sliderPositionToRps(RPS_SLIDER_RESOLUTION)).toBe(RPS_MAX);
  });

  it('a metade do curso não é a metade linear do intervalo — escala exponencial, não linear', () => {
    const midpoint = sliderPositionToRps(RPS_SLIDER_RESOLUTION / 2);
    const linearMidpoint = (RPS_MIN + RPS_MAX) / 2;
    expect(midpoint).toBeLessThan(linearMidpoint);
    // Ponto médio geométrico esperado: sqrt(RPS_MIN * RPS_MAX) ≈ 316 — tolerância de
    // arredondamento generosa, o que importa é a ordem de grandeza, não o valor exato.
    const expectedGeometricMidpoint = Math.sqrt(RPS_MIN * RPS_MAX);
    expect(Math.abs(midpoint - expectedGeometricMidpoint)).toBeLessThan(5);
  });

  it('é monotonicamente crescente — nunca desce ao mover o slider pra frente', () => {
    const samples = [0, 100, 250, 500, 750, 900, RPS_SLIDER_RESOLUTION].map(sliderPositionToRps);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]!);
    }
  });

  it('confina posições fora da faixa 0..RESOLUTION', () => {
    expect(sliderPositionToRps(-50)).toBe(RPS_MIN);
    expect(sliderPositionToRps(RPS_SLIDER_RESOLUTION + 500)).toBe(RPS_MAX);
  });
});

describe('rpsToSliderPosition', () => {
  it('é o inverso de sliderPositionToRps nos extremos', () => {
    expect(rpsToSliderPosition(RPS_MIN)).toBe(0);
    expect(rpsToSliderPosition(RPS_MAX)).toBe(RPS_SLIDER_RESOLUTION);
  });

  it('faz ida e volta aproximada pra um valor no meio da faixa', () => {
    const rps = 1_000;
    const position = rpsToSliderPosition(rps);
    const roundTripped = sliderPositionToRps(position);
    // Arredondamento de posição inteira introduz um pouco de erro — tolerância de 5%.
    expect(Math.abs(roundTripped - rps) / rps).toBeLessThan(0.05);
  });

  it('confina rps fora de RPS_MIN..RPS_MAX antes de calcular a posição', () => {
    expect(rpsToSliderPosition(0)).toBe(0);
    expect(rpsToSliderPosition(-100)).toBe(0);
    expect(rpsToSliderPosition(RPS_MAX * 10)).toBe(RPS_SLIDER_RESOLUTION);
  });
});

describe('clampRps', () => {
  it('confina abaixo do mínimo pro mínimo', () => {
    expect(clampRps(0)).toBe(RPS_MIN);
    expect(clampRps(-5)).toBe(RPS_MIN);
  });

  it('confina acima do máximo pro máximo', () => {
    expect(clampRps(RPS_MAX + 1)).toBe(RPS_MAX);
  });

  it('arredonda um valor fracionário dentro da faixa', () => {
    expect(clampRps(42.6)).toBe(43);
  });

  it('trata NaN/Infinity como o mínimo, nunca propaga um valor inválido', () => {
    expect(clampRps(Number.NaN)).toBe(RPS_MIN);
    expect(clampRps(Number.POSITIVE_INFINITY)).toBe(RPS_MIN);
  });

  it('mantém um valor já válido dentro da faixa', () => {
    expect(clampRps(500)).toBe(500);
  });
});
