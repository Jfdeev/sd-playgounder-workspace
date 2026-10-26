import { NextResponse } from 'next/server';
import { diagnose, getIncident, isFaultType } from '@sdp/problems';
import { getIncidentSecret } from '@sdp/problems/server';
import { auth } from '@/auth';
import { consumeSubmissionQuota, creditEvent, creditUnlockedAchievements, recordActivityDay } from '@/db/gamification';
import { isSameOriginRequest } from '@/lib/csrf';

/**
 * Diagnóstico de um incidente (M3, US2): `{ nodeId, faultType }` comparado no servidor com a causa
 * plantada. Tentativas ilimitadas, mas sob a mesma quota das submissões (força bruta de todo
 * componente × tipo). O acerto vira o evento `incident-diagnosis:<id>` (XP 0), que destrava o fix; a
 * resposta nunca traz a causa certa.
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
  const nodeId = body?.nodeId;
  const faultType = body?.faultType;
  if (typeof nodeId !== 'string' || !incident.design.nodes.some((node) => node.id === nodeId) || !isFaultType(faultType)) {
    return NextResponse.json({ error: 'INVALID_DIAGNOSIS' }, { status: 400 });
  }

  try {
    if (!(await consumeSubmissionQuota(userId))) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }
    const now = new Date();
    const verdict = diagnose(secret.fault, nodeId, faultType);
    await recordActivityDay(userId, now);
    if (verdict === 'correct') {
      await creditEvent(userId, { eventKey: `incident-diagnosis:${id}`, type: 'incident-diagnosis', problemId: null, xp: 0 });
    }
    const { newAchievements, progress } = await creditUnlockedAchievements(userId, now, { solvedWithoutSpof: false });
    const credited = { achievements: newAchievements };
    return NextResponse.json(
      verdict === 'correct' ? { verdict, whatHappened: secret.whatHappened, credited, progress } : { verdict, credited, progress },
    );
  } catch {
    return NextResponse.json({ error: 'PROGRESS_UNAVAILABLE' }, { status: 503 });
  }
}
