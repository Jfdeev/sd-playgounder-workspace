/**
 * Forma canônica de um e-mail (relatório de segurança, item 9): sem espaços nas pontas e em minúsculas,
 * para que `Ana@x.com` e `ana@x.com` sejam a mesma conta no cadastro, no login e no vínculo com o Google.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
