/**
 * Dados do responsável pelo tratamento (LGPD) mostrados em /privacidade e /termos — specs/conta-lgpd.
 *
 * PREENCHER ANTES DE PUBLICAR: o autor é o controlador (pessoa física). Enquanto os valores abaixo forem os
 * marcadores, as páginas mostram o aviso destacado de "a preencher" (`isLegalInfoPending`).
 */
export const LEGAL_CONTROLLER = {
  name: '[NOME DO RESPONSÁVEL]',
  contactEmail: '[E-MAIL DE CONTATO DE PRIVACIDADE]',
} as const;

/** Data da versão em vigor das páginas legais — atualizar quando o texto mudar. */
export const LEGAL_UPDATED_AT = '2026-11-10';

export const MINIMUM_AGE = 18;

export function isLegalInfoPending(controller: { name: string; contactEmail: string } = LEGAL_CONTROLLER): boolean {
  return controller.name.startsWith('[') || controller.contactEmail.startsWith('[');
}
