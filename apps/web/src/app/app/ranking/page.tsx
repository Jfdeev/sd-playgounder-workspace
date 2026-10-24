import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { ProfileSettingsForm } from '@/components/progress/profile-settings-form';
import { loadProfileSettings, loadRankingEntries } from '@/db/gamification';
import { levelForXp } from '@/lib/gamification/levels';
import { sortRanking } from '@/lib/gamification/ranking';

export const metadata = { robots: { index: false } };

// Ranking por XP de estudo (M2.8, US5). Só aparece quem tem apelido e não se escondeu; só usuários
// logados chegam aqui (guard do layout de /app). Nunca mostra e-mail nem design (FR-018).
export default async function RankingPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const [entries, profile] = await Promise.all([loadRankingEntries(), loadProfileSettings(userId)]);
  const ranking = sortRanking(entries);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Link href="/app/progresso" className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300">
          <ArrowLeft className="size-3.5" aria-hidden />
          Seu progresso
        </Link>
        <h1 className="mb-1 text-lg font-semibold text-zinc-100">Ranking</h1>
        <p className="mb-4 text-xs text-zinc-500">
          Ordenado por XP de estudo — mede desafios resolvidos, não a qualidade de um design.
        </p>

        <div className="mb-6">
          {!profile.nickname && (
            <p className="mb-2 text-sm text-zinc-300">Escolha um apelido pra aparecer no ranking e ter um perfil público.</p>
          )}
          <ProfileSettingsForm nickname={profile.nickname} isPublic={profile.isPublic} />
        </div>

        {ranking.length === 0 ? (
          <p className="text-sm text-zinc-500">Ninguém no ranking ainda.</p>
        ) : (
          <ol className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {ranking.map((entry, index) => (
              <li key={entry.nickname} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-6 text-right text-xs text-zinc-500">{index + 1}</span>
                <Link href={`/app/u/${entry.nickname}`} className="flex-1 text-zinc-100 hover:text-violet-300">
                  @{entry.nickname}
                  {entry.nickname === profile.nickname && <span className="ml-2 text-xs text-violet-300">(você)</span>}
                </Link>
                <span className="text-xs text-zinc-400">nível {levelForXp(entry.xp).level}</span>
                <span className="w-16 text-right text-xs text-zinc-300">{entry.xp} XP</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
