import { afterEach, describe, expect, it } from 'vitest';
import { cancelCurrent, confirmCurrent, confirmDialog, confirmReplaceCanvas, dialogStore, promptDialog } from '../src/lib/dialogs';

afterEach(() => cancelCurrent());

describe('confirmDialog', () => {
  it('abre um pedido de confirmação e resolve true ao confirmar', async () => {
    const answer = confirmDialog({ title: 'Apagar?', tone: 'danger' });
    expect(dialogStore.getState().current).toMatchObject({ kind: 'confirm', title: 'Apagar?', tone: 'danger' });
    confirmCurrent();
    await expect(answer).resolves.toBe(true);
    expect(dialogStore.getState().current).toBeNull();
  });

  it('resolve false ao cancelar, com tom padrão', async () => {
    const answer = confirmDialog({ title: 'Seguir?' });
    expect(dialogStore.getState().current).toMatchObject({ tone: 'default' });
    cancelCurrent();
    await expect(answer).resolves.toBe(false);
  });

  it('um pedido novo cancela o que estava aberto', async () => {
    const first = confirmDialog({ title: 'Primeiro' });
    const second = confirmDialog({ title: 'Segundo' });
    await expect(first).resolves.toBe(false);
    expect(dialogStore.getState().current?.title).toBe('Segundo');
    confirmCurrent();
    await expect(second).resolves.toBe(true);
  });
});

describe('promptDialog', () => {
  it('resolve com o texto digitado', async () => {
    const answer = promptDialog({ title: 'Nome', label: 'Nome do design', defaultValue: 'Meu design' });
    expect(dialogStore.getState().current).toMatchObject({ kind: 'prompt', defaultValue: 'Meu design' });
    confirmCurrent('Outro nome');
    await expect(answer).resolves.toBe('Outro nome');
  });

  it('sem texto informado, usa o valor inicial; cancelar dá null', async () => {
    const kept = promptDialog({ title: 'Nome', label: 'Nome' });
    confirmCurrent();
    await expect(kept).resolves.toBe('');
    const cancelled = promptDialog({ title: 'Nome', label: 'Nome', defaultValue: 'x' });
    cancelCurrent();
    await expect(cancelled).resolves.toBeNull();
  });
});

describe('confirmReplaceCanvas', () => {
  it('é uma confirmação com o aviso de substituir o canvas', async () => {
    const answer = confirmReplaceCanvas('Aplicar o template?');
    expect(dialogStore.getState().current).toMatchObject({ kind: 'confirm', title: 'Aplicar o template?', confirmLabel: 'Substituir' });
    confirmCurrent();
    await expect(answer).resolves.toBe(true);
  });

  it('confirmar ou cancelar sem nada aberto não faz nada', () => {
    expect(() => {
      confirmCurrent();
      cancelCurrent();
    }).not.toThrow();
  });
});
