'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CLIENT_UI } from '@/lib/canvas-ui-catalog';
import type { CanvasNode } from '@/stores/canvas-store';

/**
 * Nó customizado para o Cliente (mobile/web/desktop) — puramente visual/semântico (FR-006): sem
 * badge de status, sem handle de entrada (nunca é destino de uma aresta, só origem).
 */
export function ClientNode({ data, selected }: NodeProps<CanvasNode>) {
  if (data.kind !== 'client') return null;

  const { label, icon: Icon } = CLIENT_UI[data.variant];

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
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
    </div>
  );
}
