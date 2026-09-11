'use client';

/**
 * Barra de utilitários do canvas — apps/web/src/components/canvas/challenge-topbar.tsx
 *
 * Substitui o antigo `problem-brief.tsx` (uma barra fixa no topo que só mostrava o título/enunciado
 * do problema — sempre um único problema fixo). Pedido direto do autor: essa barra agora hospeda
 * utilitários — botão de Desafios (trocar/escolher desafio) e botão de Templates (arquitetura
 * pronta) lado a lado — o conteúdo do desafio ativo (enunciado, rubrica, dicas) migrou pro card no
 * canto inferior esquerdo (`challenge-card.tsx`), igual ao site de inspiração.
 */

import { useEffect, useRef, useState } from 'react';
import { Blocks, ChevronDown, Lock, Sparkles } from 'lucide-react';
import { ALL_PROBLEM_IDS, getProblem } from '@sdp/problems';
import { ARCHITECTURE_TEMPLATES, type ArchitectureTemplate } from '@/lib/canvas-templates';
import { isChallengeUnlocked } from '@/lib/challenge-progression';
import { useProgressionStore } from '@/stores/progression-store';

// Nomes do site de inspiração que ainda não têm um Problem completo autorado — aparecem na lista
// como "em breve" (sempre bloqueados), pra manter a lista visualmente parecida com o site sem
// fingir que existe conteúdo que não existe.
const COMING_SOON_TITLES = ['Real-time Chat', 'Analytics Pipeline', 'Video Platform', 'AI Assistant', 'Public API'];

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

export function ChallengeTopBar({
  activeChallengeId,
  onSelectChallenge,
  onApplyTemplate,
}: {
  activeChallengeId: string | null;
  onSelectChallenge: (problemId: string) => void;
  onApplyTemplate: (template: ArchitectureTemplate) => void;
}) {
  const [openMenu, setOpenMenu] = useState<'challenges' | 'templates' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpenMenu(null));

  // Seleciona o array direto do store, sem embrulhar num `new Set(...)` aqui: um seletor Zustand
  // precisa devolver a mesma referência entre renders quando o valor não mudou (v5 roda em cima de
  // `useSyncExternalStore`, que compara snapshots com `Object.is`) — criar um objeto novo a cada
  // render gera loop de re-render. Ver o comentário em challenge-progression.ts.
  const completedIds = useProgressionStore((s) => s.completedIds);

  return (
    <div ref={containerRef} className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'challenges' ? null : 'challenges'))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-violet-500"
        >
          <Sparkles className="size-4 text-violet-400" aria-hidden />
          Desafios
          <ChevronDown className="size-3.5 text-zinc-500" aria-hidden />
        </button>
        {openMenu === 'challenges' && (
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl">
            {ALL_PROBLEM_IDS.map((id) => {
              const problem = getProblem(id);
              if (!problem) return null;
              const unlocked = isChallengeUnlocked(id, ALL_PROBLEM_IDS, completedIds);
              const solved = completedIds.includes(id);
              const active = activeChallengeId === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    onSelectChallenge(id);
                    setOpenMenu(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition ${
                    active ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-200 hover:bg-zinc-800'
                  } disabled:cursor-not-allowed disabled:text-zinc-600 disabled:hover:bg-transparent`}
                >
                  <span>{problem.title}{solved ? ' ✓' : ''}</span>
                  {!unlocked && <Lock className="size-3.5 shrink-0" aria-hidden />}
                </button>
              );
            })}
            {COMING_SOON_TITLES.map((title) => (
              <div
                key={title}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm text-zinc-600"
              >
                <span>{title}</span>
                <Lock className="size-3.5 shrink-0" aria-hidden />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'templates' ? null : 'templates'))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-violet-500"
        >
          <Blocks className="size-4 text-violet-400" aria-hidden />
          Templates
          <ChevronDown className="size-3.5 text-zinc-500" aria-hidden />
        </button>
        {openMenu === 'templates' && (
          <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl">
            {ARCHITECTURE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onApplyTemplate(template);
                  setOpenMenu(null);
                }}
                className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition hover:bg-zinc-800"
              >
                <span className="text-sm font-medium text-zinc-200">{template.label}</span>
                <span className="text-xs text-zinc-500">{template.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
