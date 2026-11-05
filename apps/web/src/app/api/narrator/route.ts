import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI, type GenerateContentResult, type GenerativeModel } from '@google/generative-ai';
import { simulate } from '@sdp/engine';
import {
  EXPLAIN_RESULT_SCHEMA,
  buildNarratorPrompt,
  hashDesign,
  parseNarratorExplanation,
  selectRelevantKnowledge,
} from '@sdp/narrator';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { consumeSubmissionQuota } from '@/db/gamification';
import { narratorExplanations } from '@/db/schema';
import { isSameOriginRequest } from '@/lib/csrf';
import { narratorCacheKey, parseNarratorRequest } from '@/lib/narrator-request';
import { scoreContextFor } from '@/lib/simulation-context';

/**
 * Route Handler do narrador — contracts/narrator-contract.md. `auth()` direto na rota (sem
 * middleware novo, mesma decisão de M0.5/M1) — requisição sem sessão devolve 401.
 *
 * Regra 1 do contrato, **revista em 2026-11-05** (relatório de segurança, item 2): o servidor recalcula
 * `simulate(design, workload)` com o contexto do desafio e ignora qualquer `result` do navegador. Antes
 * ele confiava no `result` do cliente e gravava a explicação num cache compartilhado — dava para
 * envenenar a explicação que todo mundo recebe para um design. `design`/`workload` seguem fora do
 * prompt; só o `result` (recalculado e resumido) vai. Cache miss cobra a mesma cota das submissões
 * (item 3) — a cota do Gemini é pequena e compartilhada.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
/**
 * RNF-5 — narrador nunca deve segurar a resposta além disso. Timeout próprio via Promise.race em
 * vez do `requestOptions.timeout` do SDK — mais simples de testar (mock não precisa simular o
 * comportamento exato de abort do SDK) e não depende de um detalhe de implementação da lib.
 *
 * Subido de 5s pra 15s (decisão do autor, 2026-09-27, specs/fundamentos-arquitetura/tasks.md
 * achado 4): 5s batia timeout na prática — uma chamada real medida contra `gemini-2.5-flash` com
 * o mesmo `responseSchema` desta rota levou ~5.8s. RNF-5/SC-003 (specs/avaliacao-biblioteca-m2) e
 * a tabela de NFRs de docs/product-context.md atualizados junto pra não ficarem descrevendo um
 * limite que o código não respeita mais.
 */
const NARRATOR_TIMEOUT_MS = 15_000;

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

  const parsed = parseNarratorRequest(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'INVALID_RESPONSE', message: `Corpo da requisição em formato inválido (${parsed.reason}).` },
      { status: 400 },
    );
  }
  const { design, workload, problem } = parsed.request;

  const designHash = narratorCacheKey(await hashDesign(design, workload), problem);

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

  const userId = session.user?.id;
  if (!userId || !(await consumeSubmissionQuota(userId))) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Muitas explicações seguidas — tente de novo em um minuto.' },
      { status: 429 },
    );
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
  const result = simulate(design, workload, scoreContextFor(problem));
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

  // FR-007 (achado durante /speckit-implement): `citation_id` já passou pelo enum do schema — é um
  // id REAL de @sdp/knowledge, mas o enum lista os 11 ids conhecidos, não só os que entraram no
  // prompt desta vez (`selectRelevantKnowledge(result)`). Aceitar sem groundar deixaria passar uma
  // citação "real, mas nunca mostrada ao modelo" — exatamente o que o edge case do spec proíbe
  // ("nunca inventa uma citação que não exista no conteúdo autorado... que não viu"). Groundar
  // aqui em vez de rejeitar a resposta inteira: a explicação em si continua boa, só a citação
  // solta é descartada.
  const groundedIds: ReadonlySet<string> = new Set(
    selectRelevantKnowledge(result).map((characteristic) => characteristic.dimension),
  );
  const citationId = explanation.citation_id && groundedIds.has(explanation.citation_id) ? explanation.citation_id : null;

  await db.insert(narratorExplanations).values({
    designHash,
    summary: explanation.summary,
    bottleneckExplanation: explanation.bottleneck_explanation,
    recommendation: explanation.recommendation ?? null,
    citationId,
  });

  return NextResponse.json({
    summary: explanation.summary,
    bottleneck_explanation: explanation.bottleneck_explanation,
    recommendation: explanation.recommendation,
    citation_id: citationId ?? undefined,
    cached: false,
  });
}
