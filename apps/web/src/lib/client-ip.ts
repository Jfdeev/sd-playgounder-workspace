/**
 * IP do cliente para os limites de tentativa (login e cadastro) — relatório de segurança, item 7.
 *
 * O 1º valor de `X-Forwarded-For` é escrito por quem faz a requisição, então não serve para bloquear
 * nada: bastava trocá-lo a cada tentativa. Regras:
 * - `trustedHeader` definido (env `CLIENT_IP_HEADER`, ex. `x-real-ip` ou `x-vercel-forwarded-for`): usa só
 *   esse cabeçalho, que a plataforma de hospedagem garante.
 * - senão: o **último** valor de `X-Forwarded-For` — o que o proxy mais próximo anotou. Vale atrás de um
 *   proxy; sem nenhum proxy na frente, nenhum cabeçalho é confiável (o app ainda não está no ar).
 * - por fim `x-real-ip`, e `unknown` quando não há nada (dev local).
 */
export function getClientIp(headers: Headers, trustedHeader?: string): string {
  if (trustedHeader) {
    return firstValue(headers.get(trustedHeader)) ?? 'unknown';
  }

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const last = forwardedFor
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .at(-1);
    if (last) return last;
  }

  return firstValue(headers.get('x-real-ip')) ?? 'unknown';
}

function firstValue(raw: string | null): string | null {
  const value = raw?.split(',')[0]?.trim();
  return value ? value : null;
}
