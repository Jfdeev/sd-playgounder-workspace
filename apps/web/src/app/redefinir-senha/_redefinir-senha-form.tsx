'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Lock } from 'lucide-react';
import { fieldErrorClassName, inputClassName, primaryButtonClassName } from '../_components/form-styles';

/** Senha nova a partir do link (specs/conta-lgpd, US1); deu certo, já entra com ela. */
export function RedefinirSenhaForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const response = await fetch('/api/account/password-reset/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { email?: string; message?: string } | null;

    if (!response?.ok || !body?.email) {
      setSubmitting(false);
      return setError(body?.message ?? 'Não deu pra redefinir agora. Tente de novo.');
    }
    const login = await signIn('credentials', { email: body.email, password, redirect: false });
    router.push(login && !login.error ? '/app' : '/entrar');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
          <input
            type="password"
            placeholder="Mínimo 8 caracteres"
            aria-label="Senha nova"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            required
            minLength={8}
          />
        </div>
        {error && (
          <p role="alert" className={fieldErrorClassName}>
            {error}
          </p>
        )}
      </div>
      <button type="submit" disabled={submitting} className={primaryButtonClassName}>
        Salvar senha nova
      </button>
    </form>
  );
}
