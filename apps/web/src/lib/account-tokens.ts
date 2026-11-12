import { randomBytes } from 'node:crypto';
import { hashToken } from './token-hash';

/**
 * Tokens de e-mail da conta (confirmação e redefinição de senha) — guardados em `verificationToken`
 * só como hash. Cada fluxo tem seu identificador, para um token de um nunca valer no outro (FR-001 de
 * specs/conta-lgpd).
 */

export const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const RESET_PREFIX = 'password-reset:';

export type TokenPurpose = 'confirmation' | 'password-reset';

export function tokenIdentifier(purpose: TokenPurpose, email: string): string {
  return purpose === 'password-reset' ? `${RESET_PREFIX}${email}` : email;
}

/** Para qual fluxo um identificador gravado foi emitido, e o e-mail dele. */
export function parseTokenIdentifier(identifier: string): { purpose: TokenPurpose; email: string } {
  return identifier.startsWith(RESET_PREFIX)
    ? { purpose: 'password-reset', email: identifier.slice(RESET_PREFIX.length) }
    : { purpose: 'confirmation', email: identifier };
}

/** Token novo: `token` vai no link; `hash` é o que o banco guarda. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}
