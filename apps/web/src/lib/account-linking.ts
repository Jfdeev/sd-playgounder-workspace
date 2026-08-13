export interface ExistingUserByEmail {
  id: string;
  emailVerified: Date | null;
}

export interface AccountLinkingInput {
  existingUserByEmail: ExistingUserByEmail | null;
}

export type AccountLinkingAction = 'create' | 'link' | 'reject';

export interface AccountLinkingDecision {
  action: AccountLinkingAction;
}

/**
 * Decide o que fazer quando um login Google chega com um email que pode já corresponder a uma
 * conta existente (FR-013/FR-013a). Chamada pelo callback `signIn` (src/auth.ts) — nunca decide
 * sozinha, só informa a ação; quem persiste é o chamador (contracts/auth-api.md).
 *
 * - Nenhuma conta com esse email → "create" (o Auth.js segue seu fluxo padrão).
 * - Conta existente com email JÁ confirmado → "link" (funde, FR-013).
 * - Conta existente com email NÃO confirmado → "reject" (não funde nem cria uma segunda conta com
 *   o mesmo email — mitigação de sequestro de conta, decisão do autor em `/speckit-plan`).
 */
export function decideAccountLinking(input: AccountLinkingInput): AccountLinkingDecision {
  const { existingUserByEmail } = input;

  if (existingUserByEmail === null) {
    return { action: 'create' };
  }

  if (existingUserByEmail.emailVerified !== null) {
    return { action: 'link' };
  }

  return { action: 'reject' };
}
