'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import { AuthShell } from '../_components/auth-shell';
import {
  fieldErrorClassName,
  googleButtonClassName,
  inputClassName,
  primaryButtonClassName,
} from '../_components/form-styles';

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
    <AuthShell
      title="Criar conta"
      subtitle="Grátis, sem cartão de crédito."
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/entrar" className="font-medium text-violet-400 hover:text-violet-300">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
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
          {error?.field === 'email' && (
            <p role="alert" className={fieldErrorClassName}>
              {error.message}
            </p>
          )}
        </div>

        <div>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              required
              minLength={8}
            />
          </div>
          {error?.field === 'password' && (
            <p role="alert" className={fieldErrorClassName}>
              {error.message}
            </p>
          )}
        </div>

        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          Criar conta
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-600">ou</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <button type="button" onClick={() => signIn('google')} className={googleButtonClassName}>
        Entrar com Google
      </button>
    </AuthShell>
  );
}
