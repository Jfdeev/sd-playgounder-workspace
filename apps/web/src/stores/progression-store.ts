'use client';

/**
 * Progresso de desafios completados — apps/web/src/stores/progression-store.ts
 *
 * Ao contrário de `canvas-store.tsx` (uma instância por design ativo), este é um singleton: "quais
 * desafios eu já completei" é um fato sobre a sessão do usuário como um todo, não sobre um design
 * específico. Persistido em `localStorage` sob sua própria chave — nunca compartilha storage com
 * nenhum design individual.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ProgressionState = {
  completedIds: string[];
  markCompleted: (problemId: string) => void;
};

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set) => ({
      completedIds: [],
      markCompleted: (problemId) =>
        set((state) => (state.completedIds.includes(problemId) ? state : { completedIds: [...state.completedIds, problemId] })),
    }),
    {
      name: 'sdp-challenge-progression',
      storage: {
        getItem: (key) => {
          try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {
            // autosave é best-effort — mesmo tratamento de canvas-store.tsx
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            // idem
          }
        },
      },
    },
  ),
);
