'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Info } from 'lucide-react';
import { CLIENT_UI } from '@/lib/canvas-ui-catalog';
import type { CanvasNode } from '@/stores/canvas-store';

/**
 * Nó customizado para o Cliente (mobile/web/desktop) — puramente visual/semântico (FR-006): sem
 * badge de status, sem handle de entrada (nunca é destino de uma aresta, só origem).
 *
 * Handle na lateral direita (Position.Right), não embaixo — consistente com ComponentNode, o
 * canvas lê como um fluxo horizontal da esquerda (Cliente) pra direita.
 */
export function ClientNode({ data, selected }: NodeProps<CanvasNode>) {
  if (data.kind !== 'client') return null;

  const { label, icon: Icon, description } = CLIENT_UI[data.variant];

  return (
    <div
      className={`min-w-36 rounded-xl border-2 border-dashed bg-zinc-900/60 px-4 py-3 shadow-lg ${
        selected ? 'border-violet-400' : 'border-zinc-600'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="truncate text-sm font-medium text-zinc-100">{label}</p>
        <span title={description}>
          <Info className="size-3.5 shrink-0 text-zinc-600" aria-hidden />
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </div>
  );
}
