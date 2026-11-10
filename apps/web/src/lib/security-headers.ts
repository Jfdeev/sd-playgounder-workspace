/**
 * Cabeçalhos de segurança de todas as respostas (relatório de segurança, item 5), aplicados por
 * `next.config.ts`. A UI não carrega script, estilo, fonte nem imagem de fora — tudo fica em `'self'`.
 *
 * Limite conhecido: `script-src` precisa de `'unsafe-inline'` porque o Next injeta scripts inline de
 * hidratação; trocar por nonce exige renderização dinâmica em todas as páginas (inclusive as estáticas).
 * `frame-ancestors 'none'` fecha clickjacking; `form-action` inclui o Google por causa do login OAuth.
 * Em dev, o Next precisa de `'unsafe-eval'` (React Refresh) e de WebSocket para o HMR.
 */

export type SecurityHeader = { key: string; value: string };

export function contentSecurityPolicy(isDev: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(isDev ? ['ws:'] : [])],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", 'https://accounts.google.com'],
    'object-src': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

export function securityHeaders(isDev: boolean): SecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(isDev) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    // Só vale em HTTPS (o navegador ignora em http://localhost).
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ];
}
