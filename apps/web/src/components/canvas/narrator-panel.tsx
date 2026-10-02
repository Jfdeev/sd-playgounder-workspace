'use client';

/**
 * Painel do narrador — apps/web/src/components/canvas/narrator-panel.tsx (M2, US2)
 *
 * Busca a explicação via `POST /api/narrator` só quando o usuário abre o painel (nunca automático
 * — evita gastar uma chamada ao provedor sem o usuário pedir). Estado de loading/erro
 * inteiramente próprio — nunca bloqueia `<ResultPanel>`/`<ScorePanel>` (FR-010), que já mostram o
 * resultado do engine antes mesmo deste componente terminar de carregar.
 *
 * Lê `lastDesign`/`lastWorkload`/`lastResult` da store — sempre o trio exato que `simulate()`
 * produziu junto (mesma disciplina já estabelecida pra `lastDesign`/`lastResult` em
 * `challenge-card.tsx`) — nunca reconstrói `design`/`workload` a partir do estado atual do canvas,
 * que pode já ter mudado desde a submissão.
 */

import { useEffect, useState } from 'react';
import { ChevronUp, Loader2, Sparkles, X } from 'lucide-react';
import { ARCHITECTURE_CHARACTERISTICS, ARCHITECTURE_STYLES, isKnownKnowledgeId, type TemplateId } from '@sdp/knowledge';
import type { Dimension } from '@sdp/engine';
import { useCanvasStore } from '@/stores/canvas-store';

type NarratorExplanation = {
  summary: string;
  bottleneck_explanation: string;
  recommendation?: string;
  citation_id?: string;
};

/**
 * Resolve `citation_id` pra uma ficha real (característica OU estilo, os dois domínios que
 * `@sdp/knowledge` cobre) — nunca exibe um id sem atribuição de fonte. `citation_id` já passou por
 * `parseNarratorExplanation` no servidor (só ids reais chegam aqui), mas resolve de novo aqui em
 * vez de confiar num texto pronto — a UI nunca deveria exibir uma citação que não consiga atribuir.
 */
function resolveCitation(citationId: string | undefined) {
  if (!citationId || !isKnownKnowledgeId(citationId)) return null;
  if (citationId in ARCHITECTURE_CHARACTERISTICS) {
    return ARCHITECTURE_CHARACTERISTICS[citationId as Dimension];
  }
  return ARCHITECTURE_STYLES[citationId as TemplateId];
}

type NarratorResponseBody = (NarratorExplanation & { cached: boolean }) | { error: string; message: string };

export function NarratorPanel() {
  const lastResult = useCanvasStore((s) => s.lastResult);
  const lastDesign = useCanvasStore((s) => s.lastDesign);
  const lastWorkload = useCanvasStore((s) => s.lastWorkload);

  const [collapsed, setCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<NarratorExplanation | null>(null);

  // Novo resultado (nova simulação) invalida a explicação carregada — nunca mostra a explicação
  // de uma submissão anterior pareada com o resultado atual.
  useEffect(() => {
    setExplanation(null);
    setError(null);
  }, [lastResult]);

  if (!lastResult) return null;

  async function fetchExplanation() {
    if (!lastDesign || !lastWorkload || !lastResult) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/narrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design: lastDesign, workload: lastWorkload, result: lastResult }),
      });
      const body = (await response.json()) as NarratorResponseBody;
      if (!response.ok || 'error' in body) {
        setError('message' in body ? body.message : 'Não foi possível gerar a explicação agora.');
        return;
      }
      setExplanation(body);
    } catch {
      setError('Não foi possível gerar a explicação agora.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setCollapsed(false);
    if (!explanation && !loading) {
      void fetchExplanation();
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-500 transition hover:text-zinc-300"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3.5" aria-hidden />
          Ver explicação do narrador
        </span>
        <ChevronUp className="size-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <section className="border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Sparkles className="size-3.5" aria-hidden />
          Narrador
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Fechar narrador"
          title="Fechar narrador"
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Gerando explicação...
        </p>
      )}

      {error && !loading && <p className="text-xs text-amber-400">{error}</p>}

      {explanation && !loading && (
        <div className="space-y-2 text-xs text-zinc-300">
          <p>{explanation.summary}</p>
          <p>{explanation.bottleneck_explanation}</p>
          {explanation.recommendation && <p className="text-zinc-400">{explanation.recommendation}</p>}
          {(() => {
            const citation = resolveCitation(explanation.citation_id);
            if (!citation) return null;
            return (
              <p className="border-t border-zinc-800 pt-2 text-zinc-500">
                Princípio citado: <span className="text-zinc-400">{citation.label}</span> — fonte:{' '}
                {citation.source.book}, {citation.source.author}
              </p>
            );
          })()}
        </div>
      )}
    </section>
  );
}
