import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export interface PasswordPolicyResult {
  valid: boolean;
  message?: string;
}

/**
 * Política mínima de senha (FR-009, Assumptions do spec: "mínimo 8 caracteres" — prática padrão
 * de mercado, não uma decisão de escopo do produto).
 */
export function validatePasswordPolicy(plain: string): PasswordPolicyResult {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  return { valid: true };
}

/** Hash de senha via bcrypt (FR-008) — nunca a senha em texto puro é persistida (SC-004). */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

/** Compara uma senha em texto puro contra um hash já persistido. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
