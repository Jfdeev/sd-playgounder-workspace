/**
 * Extrai o IP do cliente a partir dos headers de proxy padrão (`x-forwarded-for`, depois
 * `x-real-ip`) — usado pelo rate limiting de IP (FR-012, camada secundária, `IP_LOGIN_POLICY`).
 * Em dev local sem proxy na frente, nenhum dos dois headers existe — cai no bucket `"unknown"`
 * (todas as tentativas locais compartilham o mesmo estado de rate limit de IP; limitação
 * conhecida e aceitável para desenvolvimento, sem proxy real até o deploy).
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Pode vir "client, proxy1, proxy2" — o primeiro é o IP original do cliente.
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}
