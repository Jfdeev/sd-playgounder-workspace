import { NextResponse } from 'next/server';
import { ALL_PROBLEM_IDS, getProblem } from '@sdp/problems';
import { auth } from '@/auth';
import { consumeSubmissionQuota, creditEvent, creditUnlockedAchievements, loadSolvedProblemIds, recordActivityDay } from '@/db/gamification';
import { isChallengeUnlocked } from '@/lib/challenge-progression';
import { isSameOriginRequest } from '@/lib/csrf';
import { validateSubmittedDesign } from '@/lib/gamification/design-validation';
import { CHALLENGE_XP, challengeEventKey, evaluateSubmission, parseSubmissionBody } from '@/lib/gamification/scoring';

/**
 * Submissão verificada pelo servidor (M2.8, contracts/gamification-api.md). O corpo só traz
 * `problemId` + `design`; o servidor valida o design, recalcula tudo (`evaluateSubmission`) e credita
 * eventos idempotentes. Toda submissão reexecutada conta como dia de atividade (ofensiva, opção A do
 * content-draft); só a primeira resolução de um desafio dá XP. A trava de desafios também vale aqui:
 * um desafio que o servidor ainda não destravou pra esta conta é recusado (403) — senão bastaria um
 * `fetch` pelo DevTools pra pular a ordem (gate 2 do plan: "não dá pra burlar editando o navegador").
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (!isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = parseSubmissionBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const problem = getProblem(body.problemId);
  if (!problem) {
    return NextResponse.json({ error: 'UNKNOWN_PROBLEM' }, { status: 404 });
  }
  const validation = validateSubmittedDesign(body.design);
  if (!validation.ok) {
    return NextResponse.json({ error: 'INVALID_DESIGN', reason: validation.reason }, { status: 400 });
  }

  const now = new Date();
  try {
    if (!(await consumeSubmissionQuota(userId))) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }
    if (!isChallengeUnlocked(problem.id, ALL_PROBLEM_IDS, await loadSolvedProblemIds(userId))) {
      return NextResponse.json({ error: 'CHALLENGE_LOCKED' }, { status: 403 });
    }

    const { solved, solvedWithoutSpof } = evaluateSubmission(problem, validation.design);
    await recordActivityDay(userId, now);
    const creditedChallenge =
      solved &&
      (await creditEvent(userId, { eventKey: challengeEventKey(problem.id), type: 'challenge', problemId: problem.id, xp: CHALLENGE_XP }));

    const { newAchievements, progress } = await creditUnlockedAchievements(userId, now, { solvedWithoutSpof });
    return NextResponse.json({
      solved,
      credited: { xp: creditedChallenge ? CHALLENGE_XP : 0, achievements: newAchievements },
      progress,
    });
  } catch {
    // FR-013: o cliente continua mostrando o resultado local; nenhum XP aparece sem estar gravado.
    return NextResponse.json({ error: 'PROGRESS_UNAVAILABLE' }, { status: 503 });
  }
}
