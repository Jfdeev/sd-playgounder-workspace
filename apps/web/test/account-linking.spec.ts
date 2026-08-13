import { describe, expect, it } from 'vitest';
import { decideAccountLinking } from '../src/lib/account-linking';

describe('decideAccountLinking', () => {
  it('retorna "create" quando não existe nenhuma conta com o email', () => {
    expect(decideAccountLinking({ existingUserByEmail: null })).toEqual({ action: 'create' });
  });

  it('retorna "link" quando existe conta com o email JÁ confirmado (FR-013)', () => {
    const result = decideAccountLinking({
      existingUserByEmail: { id: 'user-1', emailVerified: new Date('2026-01-01') },
    });
    expect(result).toEqual({ action: 'link' });
  });

  it('retorna "reject" quando existe conta com o email NÃO confirmado (FR-013a)', () => {
    const result = decideAccountLinking({
      existingUserByEmail: { id: 'user-1', emailVerified: null },
    });
    expect(result).toEqual({ action: 'reject' });
  });
});
