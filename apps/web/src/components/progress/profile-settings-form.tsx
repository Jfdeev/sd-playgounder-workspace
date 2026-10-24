'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Apelido e visibilidade do perfil público (M2.8, US5) — grava via `PUT /api/profile` e recarrega a
 * página (Server Component) pra o ranking refletir a mudança. A validação de verdade é do servidor;
 * aqui só se mostra o motivo que ele devolver.
 */

const ERROR_MESSAGES: Record<string, string> = {
  NICKNAME_TAKEN: 'Esse apelido já é de outra pessoa.',
  UNAUTHENTICATED: 'Sua sessão expirou — entre de novo.',
};

export function ProfileSettingsForm({ nickname, isPublic }: { nickname: string | null; isPublic: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(nickname ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(patch: { nickname?: string; isPublic?: boolean }) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
        setError(body.reason ?? ERROR_MESSAGES[body.error ?? ''] ?? 'Não deu pra salvar agora.');
        return;
      }
      router.refresh();
    } catch {
      setError('Não deu pra salvar agora.');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void save({ nickname: draft });
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Apelido público
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ex.: joao_dev"
            maxLength={20}
            className="w-56 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-violet-500"
          />
        </label>
        <button
          type="submit"
          disabled={saving || draft.trim() === '' || draft.trim().toLowerCase() === nickname}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {nickname ? 'Trocar apelido' : 'Escolher apelido'}
        </button>
      </form>
      <p className="mt-1 text-xs text-zinc-500">3 a 20 caracteres: letras sem acento, números e _, começando com letra. Seu e-mail nunca aparece.</p>
      {nickname && (
        <label className="mt-3 flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={isPublic} disabled={saving} onChange={(e) => void save({ isPublic: e.target.checked })} />
          Aparecer no ranking e ter perfil público (só usuários logados veem)
        </label>
      )}
      {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
    </div>
  );
}
