import type { SavedCanvas } from './saved-canvas';
import type { DesignContextKind } from './shared-view';
import { validateDesignContext, validateSavedCanvas } from './validate-saved-canvas';

/**
 * "Abrir um design" que precisa atravessar uma troca de contexto ou de página (M4.1): abrir um design
 * salvo de um desafio muda o canvas pra aquele desafio; "abrir uma cópia" de um link compartilhado sai
 * de `/app/d/[token]` e vai pro canvas livre. O pedido fica guardado (no `sessionStorage`, quando cruza
 * página) até o canvas certo montar. O que é lido de volta é revalidado — o storage é editável à mão.
 */

export type PendingOpen = {
  canvas: SavedCanvas;
  contextKind: DesignContextKind;
  contextId: string | null;
  /** Design salvo que passa a ficar aberto; `null` = cópia solta (não vira versão de nada). */
  openDesign: { id: string; name: string } | null;
};

export const PENDING_OPEN_KEY = 'sdp-pending-open';

export function writePendingOpen(storage: Pick<Storage, 'setItem'>, pending: PendingOpen): void {
  try {
    storage.setItem(PENDING_OPEN_KEY, JSON.stringify(pending));
  } catch {
    // storage cheio/bloqueado: a cópia não atravessa a página, mas nada quebra
  }
}

/** Lê e apaga o pedido pendente; `null` se não houver ou se não passar na validação. */
export function takePendingOpen(storage: Pick<Storage, 'getItem' | 'removeItem'>): PendingOpen | null {
  let raw: string | null;
  try {
    raw = storage.getItem(PENDING_OPEN_KEY);
    storage.removeItem(PENDING_OPEN_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const canvas = validateSavedCanvas(parsed.canvas);
  const context = validateDesignContext(parsed.contextKind, parsed.contextId);
  if (!canvas.ok || !context.ok) return null;
  const open = parsed.openDesign as { id?: unknown; name?: unknown } | null | undefined;
  const openDesign = open && typeof open.id === 'string' && typeof open.name === 'string' ? { id: open.id, name: open.name } : null;
  return { canvas: canvas.canvas, contextKind: context.contextKind, contextId: context.contextId, openDesign };
}
