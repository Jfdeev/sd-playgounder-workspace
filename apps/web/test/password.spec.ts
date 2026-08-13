import { describe, expect, it } from 'vitest';
import { hashPassword, validatePasswordPolicy, verifyPassword } from '../src/lib/password';

describe('validatePasswordPolicy', () => {
  it('aceita uma senha com 8 caracteres ou mais', () => {
    expect(validatePasswordPolicy('12345678')).toEqual({ valid: true });
  });

  it('rejeita uma senha com menos de 8 caracteres, com mensagem', () => {
    const result = validatePasswordPolicy('1234567');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/8 caracteres/);
  });

  it('rejeita string vazia', () => {
    expect(validatePasswordPolicy('').valid).toBe(false);
  });

  it('aceita senha bem mais longa que o mínimo', () => {
    expect(validatePasswordPolicy('uma-senha-bem-longa-mesmo-123').valid).toBe(true);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('o hash nunca é igual à senha em texto puro (FR-008/SC-004)', async () => {
    const hash = await hashPassword('minha-senha-secreta');
    expect(hash).not.toBe('minha-senha-secreta');
  });

  it('verifyPassword aceita a senha correta contra o hash', async () => {
    const hash = await hashPassword('correta-123');
    await expect(verifyPassword('correta-123', hash)).resolves.toBe(true);
  });

  it('verifyPassword rejeita a senha incorreta contra o hash', async () => {
    const hash = await hashPassword('correta-123');
    await expect(verifyPassword('errada-456', hash)).resolves.toBe(false);
  });

  it('dois hashes da mesma senha são diferentes entre si (salt aleatório)', async () => {
    const [h1, h2] = await Promise.all([hashPassword('repetida'), hashPassword('repetida')]);
    expect(h1).not.toBe(h2);
  });
});
