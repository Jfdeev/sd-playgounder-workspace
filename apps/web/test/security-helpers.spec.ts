import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '../src/lib/email-address';
import { attemptKey, ACCOUNT_WIDE_LOGIN_POLICY, recordFailedAttempt, SIGNUP_IP_POLICY } from '../src/lib/rate-limit';
import { isSessionCurrent, SESSION_RECHECK_INTERVAL_MS, sessionCheckNeeded } from '../src/lib/session-version';
import { hashToken } from '../src/lib/token-hash';

describe('normalizeEmail (item 9)', () => {
  it('tira espaços e passa para minúsculas', () => {
    expect(normalizeEmail('  Ana.Souza@Example.COM ')).toBe('ana.souza@example.com');
  });
});

describe('hashToken (item 13)', () => {
  it('é determinístico, em hex de 64 caracteres, e diferente do token', () => {
    const token = 'a'.repeat(64);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken('b')).not.toBe(hashToken('c'));
  });
});

describe('attemptKey e políticas novas (itens 6 e 11)', () => {
  it('separa as chaves de IP, de conta + IP e de cadastro', () => {
    expect(new Set([attemptKey.ip('1.2.3.4'), attemptKey.accountFromIp('u1', '1.2.3.4'), attemptKey.signup('1.2.3.4')]).size).toBe(3);
    expect(attemptKey.accountFromIp('u1', '1.2.3.4')).not.toBe(attemptKey.accountFromIp('u1', '5.6.7.8'));
  });

  it('o teto da conta inteira só trava na 50ª falha', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(recordFailedAttempt({ failedLoginAttempts: 48, lockedUntil: null }, now, ACCOUNT_WIDE_LOGIN_POLICY).lockedUntil).toBeNull();
    expect(recordFailedAttempt({ failedLoginAttempts: 49, lockedUntil: null }, now, ACCOUNT_WIDE_LOGIN_POLICY).lockedUntil).not.toBeNull();
  });

  it('o cadastro trava o IP por 1 hora na 5ª tentativa', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    const locked = recordFailedAttempt({ failedLoginAttempts: 4, lockedUntil: null }, now, SIGNUP_IP_POLICY);
    expect(locked.lockedUntil?.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
  });
});

describe('sessão revogável (item 12)', () => {
  const now = 1_000_000_000;

  it('confere no banco só depois do intervalo, ou quando o token não tem a marca', () => {
    expect(sessionCheckNeeded(undefined, now)).toBe('check');
    expect(sessionCheckNeeded(now - SESSION_RECHECK_INTERVAL_MS + 1, now)).toBe('skip');
    expect(sessionCheckNeeded(now - SESSION_RECHECK_INTERVAL_MS, now)).toBe('check');
  });

  it('versão igual mantém; diferente ou conta apagada derruba; token antigo vale como versão 0', () => {
    expect(isSessionCurrent(2, 2)).toBe(true);
    expect(isSessionCurrent(1, 2)).toBe(false);
    expect(isSessionCurrent(0, null)).toBe(false);
    expect(isSessionCurrent(undefined, 0)).toBe(true);
    expect(isSessionCurrent(undefined, 1)).toBe(false);
  });
});
