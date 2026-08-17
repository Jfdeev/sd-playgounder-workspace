/**
 * Mitigação de CSRF para rotas próprias que mudam estado (`POST /api/account/signup`) — as rotas
 * nativas do Auth.js já têm proteção própria embutida; as nossas não, por padrão. Compara o
 * header `Origin` (que navegadores sempre enviam em requisições "unsafe" same- ou cross-site,
 * desde a especificação fetch/CORS) contra a própria origem da requisição.
 *
 * Ausência de `Origin` é permitida — o ataque que isto mitiga exige um browser vítima fazendo a
 * requisição involuntariamente, e um browser real sempre envia `Origin` num POST; a ausência
 * normalmente indica uma ferramenta não-browser (curl, chamada servidor-a-servidor), fora do
 * escopo desta mitigação.
 */
export function isSameOriginRequest(requestOrigin: string | null, expectedOrigin: string): boolean {
  if (requestOrigin === null) {
    return true;
  }
  return requestOrigin === expectedOrigin;
}
