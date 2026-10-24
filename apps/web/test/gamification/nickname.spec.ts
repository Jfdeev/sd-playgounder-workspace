import { describe, expect, it } from 'vitest';
import { normalizeNickname } from '../../src/lib/gamification/nickname';

describe('normalizeNickname', () => {
  it('normaliza pra minúsculas e tira espaços das pontas (unicidade sem diferenciar maiúsculas)', () => {
    expect(normalizeNickname('  Joao_Dev ')).toEqual({ ok: true, nickname: 'joao_dev' });
    expect(normalizeNickname('Fulano')).toEqual(normalizeNickname('fulano'));
  });

  it.each(['abc', 'a'.repeat(20), 'dev_2026'])('aceita "%s"', (raw) => {
    expect(normalizeNickname(raw).ok).toBe(true);
  });

  it.each([
    ['ab', /3 a 20/],
    ['a'.repeat(21), /3 a 20/],
    ['1abc', /começando com uma letra/],
    ['_abc', /começando com uma letra/],
    ['joão', /sem acento/],
    ['joe dev', /sem acento/],
    ['joe-dev', /sem acento/],
  ])('recusa "%s"', (raw, reason) => {
    const result = normalizeNickname(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it('recusa o que não é texto', () => {
    expect(normalizeNickname(42).ok).toBe(false);
    expect(normalizeNickname(null).ok).toBe(false);
  });
});
