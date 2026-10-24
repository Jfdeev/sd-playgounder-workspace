import { NextResponse } from 'next/server';
import { simulate } from '@sdp/engine';
import { applyFault, buildIncidentSnapshot, getIncident } from '@sdp/problems';
import { getIncidentSecret } from '@sdp/problems/server';
import { auth } from '@/auth';
import { hasEvent } from '@/db/gamification';

/**
 * Estado "durante o incidente" (M3, contracts/incident-api.md). O servidor aplica a falha plantada e
 * devolve só o snapshot da lista branca — nunca a falha, réplicas, capacidade ou o design com falha
 * (SC-003). "O que aconteceu" só vem depois do diagnóstico certo.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const { id } = await params;
  const incident = getIncident(id);
  const secret = getIncidentSecret(id);
  if (!incident || !secret) {
    return NextResponse.json({ error: 'UNKNOWN_INCIDENT' }, { status: 404 });
  }

  const snapshot = buildIncidentSnapshot(incident.design, simulate(applyFault(incident.design, secret.fault), incident.workload));
  try {
    const [diagnosed, resolved] = await Promise.all([hasEvent(userId, `incident-diagnosis:${id}`), hasEvent(userId, `incident:${id}`)]);
    return NextResponse.json({
      snapshot,
      status: { diagnosed, resolved },
      ...(diagnosed ? { whatHappened: secret.whatHappened } : {}),
    });
  } catch {
    return NextResponse.json({ snapshot, status: { diagnosed: false, resolved: false }, progressUnavailable: true });
  }
}
