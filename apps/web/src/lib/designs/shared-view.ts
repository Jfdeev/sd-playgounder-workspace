import type { SavedCanvas } from './saved-canvas';

/**
 * O que quem abre um link de compartilhamento recebe (M4.1, FR-009, SC-004). Montado campo a campo:
 * nunca o id da conta, o e-mail nem o token; o apelido do dono só aparece se ele tiver um e o perfil
 * estiver visível (decisão do autor, 2026-10-25), senão o design é anônimo.
 */

export type DesignContextKind = 'sandbox' | 'challenge' | 'incident';

export type SharedDesignView = {
  name: string;
  contextKind: DesignContextKind;
  contextId: string | null;
  ownerNickname: string | null;
  version: { number: number; createdAt: string; content: SavedCanvas };
};

export function toSharedDesignView(input: {
  name: string;
  contextKind: DesignContextKind;
  contextId: string | null;
  owner: { nickname: string | null; isPublic: boolean };
  version: { number: number; createdAt: Date; content: SavedCanvas };
}): SharedDesignView {
  return {
    name: input.name,
    contextKind: input.contextKind,
    contextId: input.contextId,
    ownerNickname: input.owner.nickname && input.owner.isPublic ? input.owner.nickname : null,
    version: { number: input.version.number, createdAt: input.version.createdAt.toISOString(), content: input.version.content },
  };
}
