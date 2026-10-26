/**
 * Caminho de volta depois do login (M4.1, research §6): `/entrar?voltar=...` só aceita caminho interno
 * do app (`/app/...`). Qualquer outra coisa — URL absoluta, `//host`, barra invertida, `..` — vira
 * `/app`, pra o link de login nunca servir de redirecionamento pra fora (*open redirect*).
 */

const FALLBACK = '/app';
const SAFE_PATH = /^\/app(\/[A-Za-z0-9._~\-/]*)?$/;

export function safeReturnPath(raw: unknown): string {
  if (typeof raw !== 'string') return FALLBACK;
  if (!SAFE_PATH.test(raw) || raw.includes('//') || raw.split('/').includes('..')) return FALLBACK;
  return raw;
}
