'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { AuthShell } from '../_components/auth-shell';
import { fieldErrorClassName, inputClassName, primaryButtonClassName } from '../_components/form-styles';

/**
 * Pedir o link de redefinição (specs/conta-lgpd, US1). A mensagem de sucesso é a mesma exista o e-mail ou
 * não — o servidor também responde igual (FR-002).
 */
export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const response = await fetch('/api/account/password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setSubmitting(false);
    if (response?.ok) return setSent(true);
    setError(
      response?.status === 429
        ? 'Muitos pedidos a partir desta rede — tente de novo mais tarde.'
        : response?.status === 400
          ? 'Informe um email válido.'
          : 'Não deu pra enviar agora. Tente de novo.',
    );
  }

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Enviamos um link para criar uma senha nova."
      footer={
        <Link href="/entrar" className="font-medium text-violet-400 hover:text-violet-300">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="text-sm text-zinc-300">
          Se existir uma conta com esse email, você vai receber um link em instantes. Ele vale 1 hora e funciona
          uma vez.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
              <input
                type="email"
                placeholder="voce@email.com"
                aria-label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                required
              />
            </div>
            {error && (
              <p role="alert" className={fieldErrorClassName}>
                {error}
              </p>
            )}
          </div>
          <button type="submit" disabled={submitting} className={primaryButtonClassName}>
            Enviar link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
