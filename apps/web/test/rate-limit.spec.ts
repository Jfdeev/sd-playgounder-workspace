import { describe, expect, it } from 'vitest';
import {
  checkLoginAttempt,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from '../src/lib/rate-limit';

const NOW = new Date('2026-08-12T12:00:00Z');

describe('checkLoginAttempt', () => {
  it('permite tentativa quando não há bloqueio ativo (lockedUntil null)', () => {
    expect(
      checkLoginAttempt({ failedLoginAttempts: 2, lockedUntil: null }, NOW),
    ).toEqual({ allowed: true });
  });

  it('nega tentativa quando lockedUntil está no futuro', () => {
    const lockedUntil = new Date(NOW.getTime() + 60_000);
    expect(
      checkLoginAttempt({ failedLoginAttempts: 5, lockedUntil }, NOW),
    ).toEqual({ allowed: false });
  });

  it('permite tentativa quando lockedUntil já passou (bloqueio expirado)', () => {
    const lockedUntil = new Date(NOW.getTime() - 1);
    expect(
      checkLoginAttempt({ failedLoginAttempts: 5, lockedUntil }, NOW),
    ).toEqual({ allowed: true });
  });

  it('permite tentativa exatamente no instante em que o bloqueio expira (now === lockedUntil)', () => {
    expect(
      checkLoginAttempt({ failedLoginAttempts: 5, lockedUntil: NOW }, NOW),
    ).toEqual({ allowed: true });
  });
});

describe('recordFailedAttempt', () => {
  it('incrementa o contador sem bloquear abaixo do limite', () => {
    const result = recordFailedAttempt({ failedLoginAttempts: 1, lockedUntil: null }, NOW);
    expect(result).toEqual({ failedLoginAttempts: 2, lockedUntil: null });
  });

  it('ativa o bloqueio por 15 minutos na 5ª tentativa consecutiva (FR-012)', () => {
    const result = recordFailedAttempt({ failedLoginAttempts: 4, lockedUntil: null }, NOW);
    expect(result.failedLoginAttempts).toBe(5);
    expect(result.lockedUntil).toEqual(new Date(NOW.getTime() + 15 * 60 * 1000));
  });

  it('mantém o bloqueio (e o contador crescendo) se novas tentativas erradas ocorrem já bloqueado', () => {
    const result = recordFailedAttempt({ failedLoginAttempts: 5, lockedUntil: NOW }, NOW);
    expect(result.failedLoginAttempts).toBe(6);
    expect(result.lockedUntil).toEqual(new Date(NOW.getTime() + 15 * 60 * 1000));
  });
});

describe('recordSuccessfulAttempt', () => {
  it('reseta contador e bloqueio', () => {
    expect(recordSuccessfulAttempt()).toEqual({ failedLoginAttempts: 0, lockedUntil: null });
  });
});
