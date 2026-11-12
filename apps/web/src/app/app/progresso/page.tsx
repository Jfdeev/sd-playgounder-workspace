import { CONCEPT_ENTRIES } from '@sdp/knowledge';
import { ALL_PROBLEMS } from '@sdp/problems';
import { AppPage } from '@/components/layout/app-page';
import { AccountPanel } from '@/components/progress/account-panel';
import { ConceptProgressPanel } from '@/components/progress/concept-progress-panel';
import { ProgressOverview } from '@/components/progress/progress-overview';
import { conceptProgress } from '@/lib/gamification/concept-progress';
import { loadProfileSettings, loadProgress } from '@/db/gamification';
import { requireUserId } from '../_require-user-id';

export const metadata = { robots: { index: false } };

// Painel de progresso do próprio usuário (M2.8, US2–US4). O guard de sessão é o do layout de /app.
export default async function ProgressPage() {
  const userId = await requireUserId();
  const [progress, profile] = await Promise.all([loadProgress(userId, new Date()), loadProfileSettings(userId)]);
  const solvedIds = progress.solved.map((s) => s.problemId);
  const conceptIds = CONCEPT_ENTRIES.map((entry) => entry.id);

  return (
    <AppPage title="Seu progresso" description={profile.nickname ? `Você aparece no ranking como @${profile.nickname}.` : undefined}>
      <ProgressOverview
        data={{
          level: progress.level,
          xp: progress.xp,
          levelProgress: { xpIntoLevel: progress.xpIntoLevel, xpForNextLevel: progress.xpForNextLevel },
          solved: progress.solved,
          incidentsResolved: progress.incidentsResolved,
          achievements: progress.achievements,
          streak: progress.streak,
          showLockedAchievements: true,
        }}
      />
      <ConceptProgressPanel progress={conceptProgress(conceptIds, ALL_PROBLEMS, solvedIds)} anySolved={solvedIds.length > 0} />
      <AccountPanel />
    </AppPage>
  );
}
