/**
 * Revogação de sessão (relatório de segurança, item 12). O JWT guarda a `sessionVersion` da conta; quando
 * ela muda no banco, a sessão deixa de valer. Para não consultar o banco a cada requisição, a conferência
 * só acontece de tempos em tempos — o atraso máximo para uma revogação valer é este intervalo.
 */

export const SESSION_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export type SessionCheck = 'skip' | 'check';

/** `checkedAtMs` ausente (token antigo, de antes da revogação existir) sempre confere. */
export function sessionCheckNeeded(checkedAtMs: unknown, nowMs: number): SessionCheck {
  if (typeof checkedAtMs !== 'number') return 'check';
  return nowMs - checkedAtMs >= SESSION_RECHECK_INTERVAL_MS ? 'check' : 'skip';
}

/** Sessão continua válida? Conta apagada (`null`) ou versão diferente da do token derruba. */
export function isSessionCurrent(tokenVersion: unknown, accountVersion: number | null): boolean {
  return accountVersion !== null && (tokenVersion ?? 0) === accountVersion;
}
