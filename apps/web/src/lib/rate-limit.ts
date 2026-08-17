export interface LoginAttemptState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface LoginAttemptCheck {
  allowed: boolean;
}

export interface LoginAttemptPolicy {
  maxAttempts: number;
  lockoutMs: number;
}

/** Nível de CONTA (FR-012, decisão do autor em `/speckit-clarify`): 5 tentativas / 15 minutos. */
export const ACCOUNT_LOGIN_POLICY: LoginAttemptPolicy = {
  maxAttempts: 5,
  lockoutMs: 15 * 60 * 1000,
};

/**
 * Nível de IP — camada secundária contra credential spraying (uma tentativa em muitas contas
 * diferentes, nenhuma isolada bate o limite por conta). Deliberadamente mais permissivo que a
 * política de conta, pra não punir IPs compartilhados legítimos (NAT, rede corporativa/escola) —
 * decisão do autor, 2026-08-14.
 */
export const IP_LOGIN_POLICY: LoginAttemptPolicy = {
  maxAttempts: 20,
  lockoutMs: 15 * 60 * 1000,
};

/**
 * Checa se uma tentativa de login pode prosseguir (FR-012). Chamada ANTES de verificar a senha —
 * se a conta (ou o IP) está bloqueada, a tentativa é negada sem sequer olhar a senha (evita que o
 * próprio rate limit vaze informação sobre se a senha estaria certa). Não depende da política —
 * só compara `lockedUntil` contra `now`, o que já foi decidido quando o bloqueio foi ativado.
 */
export function checkLoginAttempt(state: LoginAttemptState, now: Date): LoginAttemptCheck {
  if (state.lockedUntil !== null && now < state.lockedUntil) {
    return { allowed: false };
  }
  return { allowed: true };
}

/**
 * Registra uma tentativa de login malsucedida — incrementa o contador e, ao atingir o limite da
 * política, ativa o bloqueio pela duração da política. Mesma função serve conta (política padrão)
 * e IP (política explícita, mais permissiva) — o parâmetro é o único ponto de configuração.
 *
 * Se um bloqueio anterior já expirou (`lockedUntil` no passado), a sequência de "tentativas
 * malsucedidas CONSECUTIVAS" reinicia — sem isto, uma única tentativa errada depois do bloqueio
 * expirar já reativaria o bloqueio (5 → 6 ≥ 5), o que não é "5 consecutivas" (FR-012).
 */
export function recordFailedAttempt(
  state: LoginAttemptState,
  now: Date,
  policy: LoginAttemptPolicy = ACCOUNT_LOGIN_POLICY,
): LoginAttemptState {
  const previousAttempts =
    state.lockedUntil !== null && now >= state.lockedUntil ? 0 : state.failedLoginAttempts;
  const failedLoginAttempts = previousAttempts + 1;

  if (failedLoginAttempts >= policy.maxAttempts) {
    return {
      failedLoginAttempts,
      lockedUntil: new Date(now.getTime() + policy.lockoutMs),
    };
  }

  return { failedLoginAttempts, lockedUntil: null };
}

/** Registra uma tentativa de login bem-sucedida — reseta o contador e qualquer bloqueio ativo. */
export function recordSuccessfulAttempt(): LoginAttemptState {
  return { failedLoginAttempts: 0, lockedUntil: null };
}
