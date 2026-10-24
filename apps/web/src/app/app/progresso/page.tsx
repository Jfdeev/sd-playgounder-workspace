import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProgressOverview } from '@/components/progress/progress-overview';
import { loadProfileSettings, loadProgress } from '@/db/gamification';
import { requireUserId } from '../_require-user-id';

export const metadata = { robots: { index: false } };

// Painel de progresso do próprio usuário (M2.8, US2–US4). O guard de sessão é o do layout de /app.
export default async function ProgressPage() {
  const userId = await requireUserId();
  const [progress, profile] = await Promise.all([loadProgress(userId, new Date()), loadProfileSettings(userId)]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Link href="/app" className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300">
          <ArrowLeft className="size-3.5" aria-hidden />
          Voltar ao canvas
        </Link>
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-zinc-100">Seu progresso</h1>
          <Link href="/app/ranking" className="text-xs text-violet-300 hover:text-violet-200">
            {profile.nickname ? `Ranking · @${profile.nickname}` : 'Ranking'}
          </Link>
        </div>
        <ProgressOverview
          data={{
            level: progress.level,
            xp: progress.xp,
            levelProgress: { xpIntoLevel: progress.xpIntoLevel, xpForNextLevel: progress.xpForNextLevel },
            solved: progress.solved,
            achievements: progress.achievements,
            streak: progress.streak,
            showLockedAchievements: true,
          }}
        />
      </div>
    </div>
  );
}
