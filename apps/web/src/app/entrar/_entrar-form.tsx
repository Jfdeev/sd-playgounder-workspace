'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Lock, Mail } from 'lucide-react';
import {
  fieldErrorClassName,
  googleButtonClassName,
  inputClassName,
  primaryButtonClassName,
} from '../_components/form-styles';

// Mensagem genérica única — nunca revela se a causa foi email inexistente, senha errada ou conta
// bloqueada (FR-010/SC-003), consistente com GENERIC_LOGIN_ERROR em src/auth.ts.
const GENERIC_ERROR = 'Email ou senha inválidos.';

const LINK_INVALID_ERROR =
  'Link inválido ou expirado. Se você já tem conta, entre normalmente abaixo.';

const ACCOUNT_PENDING_ERROR =
  'Já existe uma conta pendente de confirmação para este email. Confira sua caixa de entrada ou entre com email e senha.';

const EMAIL_CONFIRMED_MESSAGE = 'Email confirmado! Entre com sua conta abaixo.';

export function EntrarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(() => {
    // 'erro' é o parâmetro das nossas próprias rotas (confirm-email); 'error' é o parâmetro que
    // o Auth.js usa no redirect de pages.error (contracts/auth-api.md, verificado via Context7 —
    // authjs.dev/guides/pages/error) — os dois precisam ser checados, não são o mesmo nome.
    const ownError = searchParams.get('erro');
    if (ownError === 'link_invalido') return LINK_INVALID_ERROR;

    const authJsError = searchParams.get('error');
    if (authJsError === 'AccessDenied') return ACCOUNT_PENDING_ERROR;

    return null;
  });
  const [notice] = useState<string | null>(() =>
    searchParams.get('confirmado') === '1' ? EMAIL_CONFIRMED_MESSAGE : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn('credentials', { email, password, redirect: false });

    if (result?.error) {
      setError(GENERIC_ERROR);
      setSubmitting(false);
      return;
    }

    router.push('/app');
  }

  return (
    <>
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        {error && (
          <p role="alert" className={fieldErrorClassName}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          Entrar
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-600">ou</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: '/app' })}
        className={googleButtonClassName}
      >
        Entrar com Google
      </button>
    </>
  );
}
