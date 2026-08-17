'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';
import { COMPONENT_UI, NODE_STATUS_UI } from '@/lib/canvas-ui-catalog';
import type { CanvasNode } from '@/stores/canvas-store';

/**
 * Nó customizado para os 11 `ComponentType` do engine — um único componente parametrizado pelo
 * tipo, em vez de 11 componentes quase idênticos (o layout visual é o mesmo, só ícone/nome/specs
 * mudam). O gargalo (FR-009) é destacado diretamente aqui via `data.result.isBottleneck`.
 */
export function ComponentNode({ data, selected }: NodeProps<CanvasNode>) {
  if (data.kind !== 'component') return null;

  const { label, icon: Icon } = COMPONENT_UI[data.componentType];
  const statusUi = data.result ? NODE_STATUS_UI[data.result.status] : null;
  const isBottleneck = data.result?.isBottleneck ?? false;

  return (
    <div
      className={`min-w-40 rounded-xl border-2 bg-zinc-900 px-4 py-3 shadow-lg transition ${
        isBottleneck
          ? 'border-red-500 shadow-red-500/30'
          : selected
            ? 'border-violet-400'
            : (statusUi?.colorClass.split(' ')[0] ?? 'border-zinc-700')
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{label}</p>
          <p className="text-xs text-zinc-500">
            {data.replicas}× réplica{data.replicas === 1 ? '' : 's'}
            {data.componentType === 'cache' && data.cacheHitRate !== undefined
              ? ` · ${Math.round(data.cacheHitRate * 100)}% hit`
              : ''}
          </p>
        </div>
        {isBottleneck && <AlertTriangle className="size-4 shrink-0 text-red-400" aria-label="Gargalo" />}
      </div>
      {statusUi && (
        <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusUi.colorClass}`}>
          {statusUi.label}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
    </div>
  );
}
