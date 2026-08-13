'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

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
      {notice && <p role="status">{notice}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          Entrar
        </button>
      </form>

      <button type="button" onClick={() => signIn('google', { callbackUrl: '/app' })}>
        Entrar com Google
      </button>
    </>
  );
}
