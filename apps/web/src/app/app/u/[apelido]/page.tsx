import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProgressOverview } from '@/components/progress/progress-overview';
import { loadPublicProgress } from '@/db/gamification';
import { toPublicProfile } from '@/lib/gamification/public-profile';

export const metadata = { robots: { index: false } };

// Perfil público (M2.8, US5) — só usuários logados (guard do layout de /app). Tudo passa pelo
// serializador público (nunca e-mail, nome da conta nem design — FR-018). Perfil escondido e apelido
// inexistente dão a mesma página, pra não revelar que o apelido existe.
export default async function PublicProfilePage({ params }: { params: Promise<{ apelido: string }> }) {
  const { apelido } = await params;
  const nickname = decodeURIComponent(apelido).toLowerCase();
  const progress = await loadPublicProgress(nickname, new Date());
  const profile = progress ? toPublicProfile(nickname, progress) : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Link href="/app/ranking" className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300">
          <ArrowLeft className="size-3.5" aria-hidden />
          Ranking
        </Link>
        {profile ? (
          <>
            <h1 className="mb-6 text-lg font-semibold text-zinc-100">@{profile.nickname}</h1>
            <ProgressOverview
              data={{
                level: profile.level,
                xp: profile.xp,
                solved: profile.solvedChallenges,
                achievements: profile.achievements,
                streak: profile.streak,
                showLockedAchievements: false,
              }}
            />
          </>
        ) : (
          <p className="text-sm text-zinc-400">Perfil não encontrado.</p>
        )}
      </div>
    </div>
  );
}
