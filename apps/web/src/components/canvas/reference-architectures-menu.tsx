'use client';

/**
 * Menu "Arquiteturas" — apps/web/src/components/canvas/reference-architectures-menu.tsx
 *
 * M2.5: presets de arquiteturas reais (`@sdp/knowledge`), no mesmo padrão de dropdown de
 * Templates/Calculadora. Escolher uma empresa abre o detalhe — resumo, fontes, o que a simulação
 * não modela e quais conexões são inferidas — ANTES de carregar (US1/US3): o usuário sabe o que é
 * real e o que é aproximação sem precisar carregar primeiro. Só no canvas livre (FR-009): dentro
 * de um desafio o botão fica desabilitado e, ao clicar, só mostra a dica de sair do desafio.
 */

import { useState } from 'react';
import { Building2, ChevronDown, ExternalLink } from 'lucide-react';
import { REFERENCE_ARCHITECTURES, type ReferenceArchitecture } from '@sdp/knowledge';

export function ReferenceArchitecturesMenu({
  open,
  disabled,
  onToggle,
  onSelect,
}: {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onSelect: (presetId: string) => void;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = REFERENCE_ARCHITECTURES.find((preset) => preset.id === detailId) ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm transition ${
          disabled ? 'cursor-not-allowed text-zinc-600' : 'text-zinc-200 hover:border-violet-500'
        }`}
      >
        <Building2 className={`size-4 ${disabled ? 'text-zinc-600' : 'text-violet-400'}`} aria-hidden />
        Arquiteturas
        <ChevronDown className="size-3.5 text-zinc-500" aria-hidden />
      </button>
      {open && disabled && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400 shadow-xl">
          As arquiteturas de referência ficam no canvas livre. Saia do desafio para explorar.
        </div>
      )}
      {open && !disabled && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-[70vh] w-96 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl">
          {detail ? (
            <PresetDetail preset={detail} onBack={() => setDetailId(null)} onLoad={() => onSelect(detail.id)} />
          ) : (
            REFERENCE_ARCHITECTURES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDetailId(preset.id)}
                className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition hover:bg-zinc-800"
              >
                <span className="text-sm font-medium text-zinc-200">{preset.company}</span>
                <span className="text-xs text-zinc-500">{preset.summary}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PresetDetail({ preset, onBack, onLoad }: { preset: ReferenceArchitecture; onBack: () => void; onLoad: () => void }) {
  const labelOf = new Map(preset.nodes.map((node) => [node.id, node.label]));
  const inferred = preset.edges.filter((edge) => edge.basis === 'inferida');

  return (
    <div className="space-y-3 p-2 text-xs text-zinc-400">
      <button type="button" onClick={onBack} className="text-zinc-500 hover:text-zinc-300">
        ← Todas as arquiteturas
      </button>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{preset.company}</p>
        <p className="mt-1">{preset.summary}</p>
      </div>

      <div>
        <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">Fontes</p>
        <ul className="space-y-1">
          {preset.sources.map((source) => (
            <li key={source.id}>
              <SourceLink title={source.title} publisher={source.publisher} url={source.url} />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">O que a simulação não modela</p>
        <ul className="list-disc space-y-1 pl-4">
          {preset.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>

      {inferred.length > 0 && (
        <div>
          <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">Conexões inferidas</p>
          <ul className="space-y-1">
            {inferred.map((edge) => (
              <li key={edge.id}>
                <span className="text-zinc-300">
                  {edge.id}: {labelOf.get(edge.from)} → {labelOf.get(edge.to)}
                </span>{' '}
                — {edge.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-amber-300/80">Réplicas e carga são ilustrativas — não são os números da empresa.</p>

      <button
        type="button"
        onClick={onLoad}
        className="w-full rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500"
      >
        Carregar no canvas
      </button>
    </div>
  );
}

export function SourceLink({ title, publisher, url }: { title: string; publisher: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-start gap-1 text-violet-300 hover:text-violet-200"
    >
      <span>
        {title} <span className="text-zinc-500">· {publisher}</span>
      </span>
      <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
    </a>
  );
}
