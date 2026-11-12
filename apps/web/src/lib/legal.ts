/**
 * Dados do responsável pelo tratamento (LGPD) mostrados em /privacidade e /termos — specs/conta-lgpd.
 * O projeto é mantido por pessoa física (o autor) e se identifica pelo nome do projeto (decisão do autor,
 * 2026-11-11). Se algum valor voltar a ser um marcador entre colchetes, as páginas mostram o aviso de
 * "a preencher" (`isLegalInfoPending`).
 */
export const LEGAL_CONTROLLER = {
  name: 'System Design Playground',
  contactEmail: 'sd-playgrounder@gmail.com',
} as const;

/** Data da versão em vigor das páginas legais — atualizar quando o texto mudar. */
export const LEGAL_UPDATED_AT = '2026-11-10';

export const MINIMUM_AGE = 18;

export function isLegalInfoPending(controller: { name: string; contactEmail: string } = LEGAL_CONTROLLER): boolean {
  return controller.name.startsWith('[') || controller.contactEmail.startsWith('[');
}
