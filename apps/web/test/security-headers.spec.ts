import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from '../src/lib/security-headers';

describe('securityHeaders (relatório de segurança, item 5)', () => {
  const byKey = (isDev: boolean) => Object.fromEntries(securityHeaders(isDev).map((h) => [h.key, h.value]));

  it('manda os cabeçalhos de segurança esperados', () => {
    expect(Object.keys(byKey(false)).sort()).toEqual(
      ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options'].sort(),
    );
    expect(byKey(false)['X-Frame-Options']).toBe('DENY');
    expect(byKey(false)['X-Content-Type-Options']).toBe('nosniff');
  });

  it('CSP de produção fecha frame, objetos e base, sem eval nem websocket', () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('ws:');
  });

  it('em dev libera só o necessário para o HMR', () => {
    const csp = contentSecurityPolicy(true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
  });

  it('o login com Google continua podendo enviar o formulário', () => {
    expect(contentSecurityPolicy(false)).toContain("form-action 'self' https://accounts.google.com");
  });
});
