/**
 * Confirmações e pedidos de texto no visual do app (ajustes gerais, 2026-11-05) — substituem
 * `window.confirm`/`window.prompt`. Chamáveis de qualquer lugar (`await confirmDialog(...)`); quem
 * desenha é `<DialogHost />`, montado uma vez no layout raiz. Um pedido novo cancela o que estiver aberto.
 */

import { createStore } from 'zustand/vanilla';

type Base = { title: string; message?: string; confirmLabel?: string };

export type DialogRequest =
  | (Base & { kind: 'confirm'; tone: 'default' | 'danger'; resolve: (value: boolean) => void })
  | (Base & { kind: 'prompt'; label: string; defaultValue: string; resolve: (value: string | null) => void });

export const dialogStore = createStore<{ current: DialogRequest | null }>(() => ({ current: null }));

function open(request: DialogRequest): void {
  cancelCurrent();
  dialogStore.setState({ current: request });
}

/** Fecha o diálogo aberto como "cancelar" (Esc, clique fora, botão Cancelar, ou um pedido novo). */
export function cancelCurrent(): void {
  const { current } = dialogStore.getState();
  if (!current) return;
  dialogStore.setState({ current: null });
  if (current.kind === 'confirm') current.resolve(false);
  else current.resolve(null);
}

/** Confirma o diálogo aberto; num prompt, `value` é o texto digitado. */
export function confirmCurrent(value?: string): void {
  const { current } = dialogStore.getState();
  if (!current) return;
  dialogStore.setState({ current: null });
  if (current.kind === 'confirm') current.resolve(true);
  else current.resolve(value ?? current.defaultValue);
}

export function confirmDialog(options: Base & { tone?: 'default' | 'danger' }): Promise<boolean> {
  return new Promise((resolve) => open({ ...options, kind: 'confirm', tone: options.tone ?? 'default', resolve }));
}

export function promptDialog(options: Base & { label: string; defaultValue?: string }): Promise<string | null> {
  return new Promise((resolve) => open({ ...options, kind: 'prompt', defaultValue: options.defaultValue ?? '', resolve }));
}

/** A confirmação de toda ação que troca o design inteiro do canvas (template, preset, referência, abrir design…). */
export function confirmReplaceCanvas(title: string): Promise<boolean> {
  return confirmDialog({
    title,
    message: 'Isso substitui todo o design atual do canvas. Dá pra desfazer com Ctrl/Cmd+Z.',
    confirmLabel: 'Substituir',
  });
}
