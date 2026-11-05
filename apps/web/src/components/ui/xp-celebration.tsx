'use client';

import { Sparkles, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';

/**
 * Animação de XP ganho (ajustes gerais, US2) — só quando o servidor confirmou o crédito; nunca mostra XP
 * que não foi gravado (regra do M2.8).
 */
function XpCelebration({ xp, achievementIds, label }: { xp: number; achievementIds: readonly string[]; label: string }) {
  const names = achievementIds.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id);
  return (
    <div className="w-80 rounded-xl border border-violet-500/50 bg-zinc-900 p-4 shadow-2xl shadow-violet-900/40">
      <div className="flex items-center gap-3 animate-[xp-rise_700ms_cubic-bezier(.2,.9,.3,1.3)_both]">
        <span className="grid size-11 place-items-center rounded-full bg-violet-600/20 text-violet-300">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p
            className="bg-gradient-to-r from-violet-300 via-white to-violet-300 bg-[length:200%_100%] bg-clip-text text-2xl font-bold text-transparent animate-[xp-shine_1.6s_linear_2]"
          >
            +{xp} XP
          </p>
          <p className="text-xs text-zinc-400">{label}</p>
        </div>
      </div>
      {names.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-zinc-800 pt-2 text-xs text-amber-200">
          <Trophy className="size-3.5" aria-hidden /> {names.length === 1 ? 'Conquista' : 'Conquistas'}: {names.join(', ')}
        </p>
      )}
    </div>
  );
}

/** Mostra a animação quando `xp > 0`; sem XP novo, não faz nada (quem chama mostra o texto de sempre). */
export function celebrateXp(xp: number, achievementIds: readonly string[], label: string): void {
  if (xp <= 0) return;
  toast.custom(() => <XpCelebration xp={xp} achievementIds={achievementIds} label={label} />, { duration: 5000 });
}
