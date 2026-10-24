'use client';

/**
 * Progresso do usuário — apps/web/src/stores/progression-store.ts
 *
 * M2.8: a fonte da verdade passou a ser o servidor (`GET /api/progress`, XP e desafios resolvidos
 * verificados por ele). Este store só espelha o que o servidor devolve — nunca marca um desafio como
 * resolvido sozinho. `completedIds` continua com o mesmo nome e formato de antes pra trava de
 * desafios (`challenge-progression.ts`) não mudar; a chave antiga `sdp-challenge-progression` do
 * `localStorage` é apagada (todos começam do zero — Clarifications de 2026-10-23).
 */

import { create } from 'zustand';
import type { ProgressJson } from '@/lib/gamification/progress';

const LEGACY_STORAGE_KEY = 'sdp-challenge-progression';

type ProgressionState = {
  /** Ids dos desafios resolvidos segundo o servidor — array (não `Set`) pela mesma razão de antes: referência estável no seletor. */
  completedIds: string[];
  progress: ProgressJson | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  refresh: () => Promise<void>;
  applyProgress: (progress: ProgressJson) => void;
};

function forgetLegacyProgress() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage indisponível — nada a apagar
  }
}

export const useProgressionStore = create<ProgressionState>()((set, get) => ({
  completedIds: [],
  progress: null,
  status: 'idle',

  applyProgress: (progress) =>
    set({ progress, completedIds: progress.solved.map((s) => s.problemId), status: 'ready' }),

  refresh: async () => {
    forgetLegacyProgress();
    if (get().status === 'idle') set({ status: 'loading' });
    try {
      const response = await fetch('/api/progress', { cache: 'no-store' });
      if (!response.ok) throw new Error(`progress ${response.status}`);
      const { progress } = (await response.json()) as { progress: ProgressJson };
      get().applyProgress(progress);
    } catch {
      // Sem progresso do servidor a trava fica no estado mais conservador (só o 1º desafio).
      set({ status: 'error' });
    }
  },
}));
