import { AppPage } from '@/components/layout/app-page';
import { ProgressOverview } from '@/components/progress/progress-overview';
import { loadPublicProgress } from '@/db/gamification';
import { toPublicProfile } from '@/lib/gamification/public-profile';
import { requireUserId } from '../../_require-user-id';

export const metadata = { robots: { index: false } };

// Perfil público (M2.8, US5) — só usuários logados (guard do layout de /app). Tudo passa pelo
// serializador público (nunca e-mail, nome da conta nem design — FR-018). Perfil escondido e apelido
// inexistente dão a mesma página, pra não revelar que o apelido existe.
export default async function PublicProfilePage({ params }: { params: Promise<{ apelido: string }> }) {
  await requireUserId();
  const { apelido } = await params;
  const nickname = decodeURIComponent(apelido).toLowerCase();
  const progress = await loadPublicProgress(nickname, new Date());
  const profile = progress ? toPublicProfile(nickname, progress) : null;

  return (
    <AppPage title={profile ? `@${profile.nickname}` : 'Perfil'}>
        {profile ? (
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
        ) : (
          <p className="text-sm text-zinc-400">Perfil não encontrado.</p>
        )}
    </AppPage>
  );
}
