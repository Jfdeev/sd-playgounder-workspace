const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos (FR-012, decisão do autor em /speckit-clarify)

export interface LoginAttemptState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface LoginAttemptCheck {
  allowed: boolean;
}

/**
 * Checa se uma tentativa de login pode prosseguir (FR-012). Chamada ANTES de verificar a senha —
 * se a conta está bloqueada, a tentativa é negada sem sequer olhar a senha (evita que o próprio
 * rate limit vaze informação sobre se a senha estaria certa).
 */
export function checkLoginAttempt(state: LoginAttemptState, now: Date): LoginAttemptCheck {
  if (state.lockedUntil !== null && now < state.lockedUntil) {
    return { allowed: false };
  }
  return { allowed: true };
}

/**
 * Registra uma tentativa de login malsucedida (senha errada) — incrementa o contador e, ao
 * atingir o limite, ativa o bloqueio por LOCKOUT_MS (FR-012).
 *
 * Se um bloqueio anterior já expirou (`lockedUntil` no passado), a sequência de "tentativas
 * malsucedidas CONSECUTIVAS" reinicia — sem isto, uma única tentativa errada depois do bloqueio
 * expirar já reativaria o bloqueio (5 → 6 ≥ 5), o que não é "5 consecutivas" (FR-012).
 */
export function recordFailedAttempt(state: LoginAttemptState, now: Date): LoginAttemptState {
  const previousAttempts =
    state.lockedUntil !== null && now >= state.lockedUntil ? 0 : state.failedLoginAttempts;
  const failedLoginAttempts = previousAttempts + 1;

  if (failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginAttempts,
      lockedUntil: new Date(now.getTime() + LOCKOUT_MS),
    };
  }

  return { failedLoginAttempts, lockedUntil: null };
}

/** Registra uma tentativa de login bem-sucedida — reseta o contador e qualquer bloqueio ativo. */
export function recordSuccessfulAttempt(): LoginAttemptState {
  return { failedLoginAttempts: 0, lockedUntil: null };
}
