'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import { MINIMUM_AGE } from '@/lib/legal';
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
  // Relatório de segurança, item 8: o servidor responde igual para email novo e existente; se o login
  // automático não entra, a pessoa provavelmente já tinha conta — a tela diz isso sem confirmar nada.
  const [neutralNotice, setNeutralNotice] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeutralNotice(false);
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

      // 201 — signup não autentica sozinho (contracts/auth-api.md); o cliente autentica em seguida. Se não
      // entrar, o email já tinha conta (com outra senha): mensagem neutra, sem revelar isso.
      const login = await signIn('credentials', { email, password, redirect: false });
      if (!login || login.error) {
        setNeutralNotice(true);
        setSubmitting(false);
        return;
      }
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
      {neutralNotice && (
        <p role="status" className="mb-4 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm text-zinc-200">
          Se este email for novo, sua conta foi criada e enviamos um link de confirmação. Se você já tem conta
          com ele,{' '}
          <Link href="/entrar" className="font-medium text-violet-300 hover:text-violet-200">
            entre por aqui
          </Link>
          .
        </p>
      )}
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
        <p className="text-xs text-zinc-500">
          Ao criar a conta, você confirma ter {MINIMUM_AGE} anos ou mais e concorda com os{' '}
          <Link href="/termos" className="text-violet-400 hover:text-violet-300">
            Termos de uso
          </Link>{' '}
          e a{' '}
          <Link href="/privacidade" className="text-violet-400 hover:text-violet-300">
            Política de privacidade
          </Link>
          .
        </p>
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
