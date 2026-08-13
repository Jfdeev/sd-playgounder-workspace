'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface FieldError {
  field: 'email' | 'password';
  message: string;
}

export default function CriarContaPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<FieldError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/account/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const parsed =
          body && typeof body === 'object' && 'field' in body && 'message' in body
            ? (body as FieldError)
            : { field: 'email' as const, message: 'Não foi possível criar a conta.' };
        setError(parsed);
        setSubmitting(false);
        return;
      }

      // Conta criada (201) — signup não autentica sozinho (contracts/auth-api.md); o cliente
      // autentica em seguida chamando signIn diretamente.
      await signIn('credentials', { email, password, redirect: false });
      router.push('/app');
    } catch {
      setError({ field: 'email', message: 'Erro de rede. Tente novamente.' });
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Criar conta</h1>
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
        {error?.field === 'email' && <p role="alert">{error.message}</p>}

        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error?.field === 'password' && <p role="alert">{error.message}</p>}

        <button type="submit" disabled={submitting}>
          Criar conta
        </button>
      </form>

      <button type="button" onClick={() => signIn('google')}>
        Entrar com Google
      </button>
    </main>
  );
}
