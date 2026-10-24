import { NextResponse } from 'next/server';
import { simulate } from '@sdp/engine';
import { applyFault, buildIncidentSnapshot, evaluateFix, getIncident } from '@sdp/problems';
import { getIncidentSecret } from '@sdp/problems/server';
import { auth } from '@/auth';
import { consumeSubmissionQuota, creditEvent, creditUnlockedAchievements, hasEvent, recordActivityDay } from '@/db/gamification';
import { isSameOriginRequest } from '@/lib/csrf';
import { validateSubmittedDesign } from '@/lib/gamification/design-validation';
import { INCIDENT_XP } from '@/lib/gamification/scoring';

/**
 * Fix de um incidente (M3, US3): só depois do diagnóstico certo (409 antes). O servidor aplica a
 * falha plantada ao design submetido e roda o critério do incidente; resolvido → `incident:<id>`
 * (100 XP, uma vez). A resposta diz quais checagens falharam, nunca os limites internos.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (!isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const { id } = await params;
  const incident = getIncident(id);
  const secret = getIncidentSecret(id);
  if (!incident || !secret) {
    return NextResponse.json({ error: 'UNKNOWN_INCIDENT' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const validation = validateSubmittedDesign(body?.design);
  if (!validation.ok) {
    return NextResponse.json({ error: 'INVALID_DESIGN', reason: validation.reason }, { status: 400 });
  }

  const now = new Date();
  try {
    if (!(await consumeSubmissionQuota(userId))) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }
    if (!(await hasEvent(userId, `incident-diagnosis:${id}`))) {
      return NextResponse.json({ error: 'DIAGNOSIS_REQUIRED' }, { status: 409 });
    }

    const design = validation.design;
    const { resolved, failing } = evaluateFix(design, incident.design, secret.fault, secret.fixCriterion, incident.workload);
    const snapshot = buildIncidentSnapshot(design, simulate(applyFault(design, secret.fault), incident.workload));
    await recordActivityDay(userId, now);
    const credited =
      resolved && (await creditEvent(userId, { eventKey: `incident:${id}`, type: 'incident', problemId: null, xp: INCIDENT_XP }));

    const { newAchievements, progress } = await creditUnlockedAchievements(userId, now, { solvedWithoutSpof: false });
    return NextResponse.json({
      resolved,
      failing,
      snapshot,
      credited: { xp: credited ? INCIDENT_XP : 0, achievements: newAchievements },
      progress,
    });
  } catch {
    return NextResponse.json({ error: 'PROGRESS_UNAVAILABLE' }, { status: 503 });
  }
}
