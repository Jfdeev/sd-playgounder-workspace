'use client';

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { EDGE_KIND_UI } from '@/lib/canvas-ui-catalog';
import type { CanvasEdge } from '@/stores/canvas-store';

/**
 * Aresta customizada por `EdgeKind` (FR-003) — cor distinta por tipo, tracejada para assíncrona
 * (deixa explícito que ela sai do cálculo de latência do usuário — mesma regra do engine),
 * marcador de seta e rótulo com o peso efetivo quando presente (FR-004).
 */
export function TypedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps<CanvasEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const kindUi = EDGE_KIND_UI[data?.kind ?? 'read'];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...(markerEnd ? { markerEnd } : {})}
        className={`${kindUi.colorClass} ${selected ? 'opacity-100' : 'opacity-80'}`}
        style={kindUi.dashed ? { strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: '6 4' } : { strokeWidth: selected ? 2.5 : 1.5 }}
      />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute rounded bg-zinc-900/90 px-1.5 py-0.5 text-[10px] text-zinc-300"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {kindUi.label}
          {data?.weight !== undefined ? ` · ${data.weight}` : ''}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
