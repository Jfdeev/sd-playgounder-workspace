import { describe, expect, it } from 'vitest';
import { decideAccountLinking } from '../src/lib/account-linking';

describe('decideAccountLinking', () => {
  it('retorna "create" quando não existe nenhuma conta com o email', () => {
    expect(decideAccountLinking({ existingUserByEmail: null, googleEmailVerified: true })).toEqual({ action: 'create' });
  });

  it('retorna "link" quando existe conta com o email JÁ confirmado (FR-013)', () => {
    const result = decideAccountLinking({
      existingUserByEmail: { id: 'user-1', emailVerified: new Date('2026-01-01') },
      googleEmailVerified: true,
    });
    expect(result).toEqual({ action: 'link' });
  });

  it('retorna "claim" quando a conta existente NÃO foi confirmada mas o Google confirma o email (item 10)', () => {
    const result = decideAccountLinking({
      existingUserByEmail: { id: 'user-1', emailVerified: null },
      googleEmailVerified: true,
    });
    expect(result).toEqual({ action: 'claim' });
  });

  it('retorna "reject" quando nem a conta existente nem o Google confirmaram o email (FR-013a)', () => {
    const result = decideAccountLinking({
      existingUserByEmail: { id: 'user-1', emailVerified: null },
      googleEmailVerified: false,
    });
    expect(result).toEqual({ action: 'reject' });
  });
});
