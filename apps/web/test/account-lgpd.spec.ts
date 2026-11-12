import { describe, expect, it } from 'vitest';
import { newToken, parseTokenIdentifier, tokenIdentifier } from '../src/lib/account-tokens';
import { isLegalInfoPending, LEGAL_CONTROLLER, MINIMUM_AGE } from '../src/lib/legal';
import { attemptKey, CONFIRMATION_RESEND_POLICY, PASSWORD_RESET_IP_POLICY, recordFailedAttempt } from '../src/lib/rate-limit';
import { hashToken } from '../src/lib/token-hash';

describe('tokens de conta (specs/conta-lgpd, FR-001)', () => {
  it('confirmação e redefinição usam identificadores diferentes para o mesmo email', () => {
    expect(tokenIdentifier('confirmation', 'ana@x.com')).toBe('ana@x.com');
    expect(tokenIdentifier('password-reset', 'ana@x.com')).toBe('password-reset:ana@x.com');
  });

  it('o identificador gravado diz o fluxo e o email (ida e volta)', () => {
    for (const purpose of ['confirmation', 'password-reset'] as const) {
      expect(parseTokenIdentifier(tokenIdentifier(purpose, 'ana@x.com'))).toEqual({ purpose, email: 'ana@x.com' });
    }
  });

  it('newToken devolve o token do link e o hash que o banco guarda', () => {
    const { token, hash } = newToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(token));
    expect(newToken().token).not.toBe(token);
  });
});

describe('limites novos (US1 e US2)', () => {
  const now = new Date('2026-11-10T12:00:00Z');

  it('chaves separadas para redefinição por IP e reenvio por conta', () => {
    expect(attemptKey.passwordReset('1.2.3.4')).toBe('password-reset:1.2.3.4');
    expect(attemptKey.confirmationResend('u1')).toBe('confirmation-resend:u1');
  });

  it('reenvio de confirmação: a 3ª tentativa ainda passa e trava a seguinte por 1 hora', () => {
    const third = recordFailedAttempt({ failedLoginAttempts: 2, lockedUntil: null }, now, CONFIRMATION_RESEND_POLICY);
    expect(third.lockedUntil?.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
  });

  it('redefinição: 5 pedidos por IP por hora', () => {
    expect(recordFailedAttempt({ failedLoginAttempts: 3, lockedUntil: null }, now, PASSWORD_RESET_IP_POLICY).lockedUntil).toBeNull();
    expect(recordFailedAttempt({ failedLoginAttempts: 4, lockedUntil: null }, now, PASSWORD_RESET_IP_POLICY).lockedUntil).not.toBeNull();
  });
});

describe('dados legais', () => {
  it('detecta os marcadores ainda não preenchidos', () => {
    expect(isLegalInfoPending({ name: '[NOME]', contactEmail: 'a@b.com' })).toBe(true);
    expect(isLegalInfoPending({ name: 'Ana', contactEmail: '[EMAIL]' })).toBe(true);
    expect(isLegalInfoPending({ name: 'Ana', contactEmail: 'privacidade@x.com' })).toBe(false);
  });

  it('os dados configurados estão preenchidos (sem aviso de rascunho), e a idade mínima é 18', () => {
    expect(LEGAL_CONTROLLER).toEqual({ name: 'System Design Playground', contactEmail: 'sd-playgrounder@gmail.com' });
    expect(isLegalInfoPending()).toBe(false);
    expect(MINIMUM_AGE).toBe(18);
  });
});
