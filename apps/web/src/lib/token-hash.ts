import { createHash } from 'node:crypto';

/**
 * O banco guarda só o hash do token de confirmação de e-mail (relatório de segurança, item 13): quem ler
 * a tabela não consegue confirmar a conta de ninguém. O link enviado por e-mail continua com o token em
 * claro; a rota de confirmação faz o hash antes de procurar.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
