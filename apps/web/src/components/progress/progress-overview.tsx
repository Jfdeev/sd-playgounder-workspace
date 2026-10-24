import { Flame, Lock, Trophy } from 'lucide-react';
import { getIncident, getProblem } from '@sdp/problems';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';

/**
 * Visão do progresso (M2.8) — usada pelo painel do próprio usuário (`/app/progresso`) e pelo perfil
 * público (`/app/u/[apelido]`). Só apresenta; os números já chegam derivados pelo servidor. XP é
 * rotulado como "XP de estudo": mede atividade, nunca a qualidade de um design (FR-005).
 */

export type ProgressOverviewData = {
  level: number;
  xp: number;
  /** Só no painel do próprio usuário — o perfil público mostra nível e XP, sem a barra. */
  levelProgress?: { xpIntoLevel: number; xpForNextLevel: number };
  solved: { problemId: string; solvedAt: Date | string }[];
  /** M3 — só no painel do próprio usuário (o perfil público segue a lista branca do M2.8). */
  incidentsResolved?: { incidentId: string; resolvedAt: Date | string }[];
  achievements: { id: string; unlockedAt: Date | string }[];
  streak: { current: number; best: number };
  /** Painel próprio mostra também as conquistas bloqueadas, com a condição (US4 cenário 3). */
  showLockedAchievements: boolean;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' });
const formatDate = (value: Date | string) => dateFormatter.format(new Date(value));

export function ProgressOverview({ data }: { data: ProgressOverviewData }) {
  const unlocked = new Map(data.achievements.map((a) => [a.id, a.unlockedAt]));
  const achievementsToShow = ACHIEVEMENTS.filter((a) => data.showLockedAchievements || unlocked.has(a.id));

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">Nível</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">{data.level}</p>
          <p className="text-xs text-zinc-500">{data.xp} XP de estudo</p>
          {data.levelProgress && (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-violet-500"
                  style={{ width: `${(100 * data.levelProgress.xpIntoLevel) / data.levelProgress.xpForNextLevel}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Faltam {data.levelProgress.xpForNextLevel - data.levelProgress.xpIntoLevel} XP pro nível {data.level + 1}
              </p>
            </>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Flame className="size-3.5 text-orange-400" aria-hidden /> Ofensiva
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">
            {data.streak.current} {data.streak.current === 1 ? 'dia' : 'dias'}
          </p>
          <p className="text-xs text-zinc-500">Recorde: {data.streak.best}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Desafios resolvidos</h2>
        {data.solved.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum desafio resolvido ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.solved.map((s) => (
              <li key={s.problemId} className="flex justify-between rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200">
                <span>{getProblem(s.problemId)?.title ?? s.problemId}</span>
                <span className="text-xs text-zinc-500">{formatDate(s.solvedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.incidentsResolved && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Incidentes resolvidos</h2>
          {data.incidentsResolved.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum incidente resolvido ainda.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.incidentsResolved.map((r) => (
                <li key={r.incidentId} className="flex justify-between rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200">
                  <span>{getIncident(r.incidentId)?.title ?? r.incidentId}</span>
                  <span className="text-xs text-zinc-500">{formatDate(r.resolvedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Conquistas</h2>
        {achievementsToShow.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma conquista ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {achievementsToShow.map((a) => {
              const unlockedAt = unlocked.get(a.id);
              return (
                <li
                  key={a.id}
                  className={`rounded-md border px-3 py-2 text-sm ${unlockedAt ? 'border-violet-500/40 bg-violet-500/5 text-zinc-100' : 'border-zinc-800 text-zinc-500'}`}
                >
                  <p className="flex items-center gap-1.5 font-medium">
                    {unlockedAt ? <Trophy className="size-3.5 text-violet-400" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                    {a.name}
                  </p>
                  <p className="mt-0.5 text-xs">{unlockedAt ? `Desbloqueada em ${formatDate(unlockedAt)}` : a.condition}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
