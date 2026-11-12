'use client';

import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { toast } from 'sonner';

/** Faixa para conta não confirmada (specs/conta-lgpd, US2) — não bloqueia o uso, só lembra e reenvia. */
export function EmailConfirmationBanner({ email }: { email: string }) {
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    const response = await fetch('/api/account/confirmation', { method: 'POST' }).catch(() => null);
    setSending(false);
    if (response?.ok) return toast.success(`Link de confirmação enviado para ${email}.`);
    if (response?.status === 429) return toast.error('Você já pediu 3 links nesta hora — tente de novo mais tarde.');
    if (response?.status === 409) return toast.info('Seu email já está confirmado. Recarregue a página.');
    toast.error('Não deu pra reenviar agora. Tente de novo.');
  }

  return (
    <div role="status" className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-100">
      <MailWarning className="size-4 shrink-0 text-amber-300" aria-hidden />
      <span>Confirme seu email ({email}) pelo link que enviamos.</span>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={sending}
        className="ml-auto rounded-md border border-amber-400/40 px-2 py-0.5 text-amber-100 hover:bg-amber-400/10 disabled:opacity-50"
      >
        {sending ? 'Enviando…' : 'Reenviar'}
      </button>
    </div>
  );
}
