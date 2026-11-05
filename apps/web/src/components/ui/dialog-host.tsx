'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cancelCurrent, confirmCurrent, dialogStore } from '@/lib/dialogs';

/**
 * Desenha o diálogo pedido por `confirmDialog`/`promptDialog` (`@/lib/dialogs`). Radix cuida de foco
 * preso, Esc e leitor de tela; fechar por qualquer caminho que não seja o botão de confirmar = cancelar.
 */
export function DialogHost() {
  const current = useSyncExternalStore(dialogStore.subscribe, () => dialogStore.getState().current, () => null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (current?.kind === 'prompt') setText(current.defaultValue);
  }, [current]);

  const confirmClass =
    current?.kind === 'confirm' && current.tone === 'danger'
      ? 'bg-red-600 hover:bg-red-500'
      : 'bg-violet-600 hover:bg-violet-500';

  return (
    <Dialog.Root open={current !== null} onOpenChange={(open) => !open && cancelCurrent()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl data-[state=open]:animate-[pop-in_140ms_ease-out]"
          {...(current?.message ? {} : { 'aria-describedby': undefined })}
        >
          {current && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                confirmCurrent(current.kind === 'prompt' ? text : undefined);
              }}
            >
              <Dialog.Title className="text-sm font-semibold text-zinc-100">{current.title}</Dialog.Title>
              {current.message && <Dialog.Description className="mt-1.5 text-sm text-zinc-400">{current.message}</Dialog.Description>}
              {current.kind === 'prompt' && (
                <label className="mt-3 block text-xs text-zinc-500">
                  {current.label}
                  <input
                    autoFocus
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-violet-500"
                  />
                </label>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button type="submit" autoFocus={current.kind === 'confirm'} className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${confirmClass}`}>
                  {current.confirmLabel ?? (current.kind === 'prompt' ? 'Salvar' : 'Confirmar')}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
