export interface ExistingUserByEmail {
  id: string;
  emailVerified: Date | null;
}

export interface AccountLinkingInput {
  existingUserByEmail: ExistingUserByEmail | null;
  /** O Google confirmou que esta pessoa é dona do e-mail (`profile.email_verified`). */
  googleEmailVerified: boolean;
}

export type AccountLinkingAction = 'create' | 'link' | 'claim' | 'reject';

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
 * - Conta existente com email NÃO confirmado e o Google confirmou o email → "claim" (relatório de
 *   segurança, item 10): quem cadastrou o email não provou ser dono dele, e o Google provou. O chamador
 *   apaga a senha da conta pendente, derruba as sessões dela e vincula o Google — fecha o sequestro
 *   (a senha de quem cadastrou deixa de valer) sem travar para sempre o login do dono real.
 * - Conta existente com email NÃO confirmado e o Google também não confirmou → "reject" (não funde nem
 *   cria uma segunda conta com o mesmo email — mitigação de sequestro de conta).
 */
export function decideAccountLinking(input: AccountLinkingInput): AccountLinkingDecision {
  const { existingUserByEmail, googleEmailVerified } = input;

  if (existingUserByEmail === null) {
    return { action: 'create' };
  }

  if (existingUserByEmail.emailVerified !== null) {
    return { action: 'link' };
  }

  return { action: googleEmailVerified ? 'claim' : 'reject' };
}
