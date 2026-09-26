import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI, type GenerateContentResult, type GenerativeModel } from '@google/generative-ai';
import type { Design, SimulationResult, Workload } from '@sdp/engine';
import { EXPLAIN_RESULT_SCHEMA, buildNarratorPrompt, hashDesign, parseNarratorExplanation } from '@sdp/narrator';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { narratorExplanations } from '@/db/schema';
import { isSameOriginRequest } from '@/lib/csrf';

/**
 * Route Handler do narrador — contracts/narrator-contract.md. `auth()` direto na rota (sem
 * middleware novo, mesma decisão de M0.5/M1) — requisição sem sessão devolve 401.
 *
 * Regra 1 do contrato: NUNCA recalcula `simulate(design, workload)` pra conferir `result` — confia
 * no que o client já calculou (mesmo modelo de confiança de M1, submissão 100% client-side, sem
 * persistência "oficial" que dependa disso). `design`/`workload` só alimentam o hash de cache
 * (Regra 2) — nunca vão pro prompt do LLM, só `result` (já resumido) vai.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
/** RNF-5 — narrador nunca deve segurar a resposta além disso. Timeout próprio via Promise.race em
 *  vez do `requestOptions.timeout` do SDK — mais simples de testar (mock não precisa simular o
 *  comportamento exato de abort do SDK) e não depende de um detalhe de implementação da lib. */
const NARRATOR_TIMEOUT_MS = 5_000;

type NarratorRequestBody = { design: Design; workload: Workload; result: SimulationResult };

function isValidRequestBody(body: unknown): body is NarratorRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.design === 'object' &&
    candidate.design !== null &&
    typeof candidate.workload === 'object' &&
    candidate.workload !== null &&
    typeof candidate.result === 'object' &&
    candidate.result !== null
  );
}

class NarratorTimeoutError extends Error {}

function generateWithTimeout(model: GenerativeModel, prompt: string, timeoutMs: number): Promise<GenerateContentResult> {
  return Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new NarratorTimeoutError('narrator request timed out')), timeoutMs);
    }),
  ]);
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'PROVIDER_UNAVAILABLE', message: 'Não autenticado.' }, { status: 401 });
  }

  const requestOrigin = request.headers.get('origin');
  const expectedOrigin = new URL(request.url).origin;
  if (!isSameOriginRequest(requestOrigin, expectedOrigin)) {
    return NextResponse.json({ error: 'PROVIDER_UNAVAILABLE', message: 'Requisição inválida.' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isValidRequestBody(body)) {
    return NextResponse.json(
      { error: 'INVALID_RESPONSE', message: 'Corpo da requisição em formato inválido.' },
      { status: 400 },
    );
  }
  const { design, workload, result } = body;

  const designHash = await hashDesign(design, workload);

  const [cached] = await db
    .select()
    .from(narratorExplanations)
    .where(eq(narratorExplanations.designHash, designHash))
    .limit(1);

  if (cached) {
    return NextResponse.json({
      summary: cached.summary,
      bottleneck_explanation: cached.bottleneckExplanation,
      recommendation: cached.recommendation ?? undefined,
      citation_id: cached.citationId ?? undefined,
      cached: true,
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'PROVIDER_UNAVAILABLE', message: 'Narrador indisponível — chave de API não configurada.' },
      { status: 502 },
    );
  }

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json', responseSchema: EXPLAIN_RESULT_SCHEMA },
  });
  const prompt = buildNarratorPrompt(result);

  let rawText: string;
  try {
    const generation = await generateWithTimeout(model, prompt, NARRATOR_TIMEOUT_MS);
    rawText = generation.response.text();
  } catch (error) {
    if (error instanceof NarratorTimeoutError) {
      return NextResponse.json(
        { error: 'TIMEOUT', message: 'O narrador demorou demais pra responder.' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: 'PROVIDER_UNAVAILABLE', message: 'Não foi possível gerar a explicação agora.' },
      { status: 502 },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: 'INVALID_RESPONSE', message: 'O narrador devolveu uma resposta que não é JSON válido.' },
      { status: 502 },
    );
  }

  const explanation = parseNarratorExplanation(parsedJson);
  if (!explanation) {
    return NextResponse.json(
      { error: 'INVALID_RESPONSE', message: 'O narrador devolveu uma resposta fora do formato esperado.' },
      { status: 502 },
    );
  }

  await db.insert(narratorExplanations).values({
    designHash,
    summary: explanation.summary,
    bottleneckExplanation: explanation.bottleneck_explanation,
    recommendation: explanation.recommendation ?? null,
    citationId: explanation.citation_id ?? null,
  });

  return NextResponse.json({
    summary: explanation.summary,
    bottleneck_explanation: explanation.bottleneck_explanation,
    recommendation: explanation.recommendation,
    citation_id: explanation.citation_id,
    cached: false,
  });
}
