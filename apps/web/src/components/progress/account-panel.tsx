'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { promptDialog } from '@/lib/dialogs';

/**
 * Direitos do titular (LGPD, specs/conta-lgpd US3): baixar os próprios dados e excluir a conta na hora.
 * A exclusão pede o email digitado de novo — o servidor confere o mesmo.
 */
export function AccountPanel() {
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    const typed = await promptDialog({
      title: 'Excluir minha conta',
      message:
        'Apaga na hora sua conta, designs, versões, XP, conquistas e perfil do ranking. Não dá pra desfazer. Para confirmar, digite seu email.',
      label: 'Seu email',
      confirmLabel: 'Excluir para sempre',
    });
    if (typed === null) return;

    setDeleting(true);
    const response = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmEmail: typed }),
    }).catch(() => null);
    if (response?.status === 204) {
      toast.success('Conta excluída.');
      await signOut({ callbackUrl: '/' });
      return;
    }
    setDeleting(false);
    toast.error(response?.status === 400 ? 'O email digitado não é o desta conta.' : 'Não deu pra excluir agora. Tente de novo.');
  }

  return (
    <section className="mt-8 border-t border-zinc-800 pt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Sua conta</h2>
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/account/export"
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-violet-500"
        >
          <Download className="size-4 text-violet-400" aria-hidden /> Baixar meus dados
        </a>
        <button
          type="button"
          onClick={() => void deleteAccount()}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden /> {deleting ? 'Excluindo…' : 'Excluir minha conta'}
        </button>
      </div>
    </section>
  );
}
