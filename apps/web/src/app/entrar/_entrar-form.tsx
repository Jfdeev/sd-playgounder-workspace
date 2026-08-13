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

export function EntrarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(() => {
    const urlError = searchParams.get('erro');
    if (urlError === 'link_invalido') return LINK_INVALID_ERROR;
    if (urlError === 'AccessDenied') return ACCOUNT_PENDING_ERROR;
    return null;
  });
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
