'use client';

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { EDGE_KIND_UI } from '@/lib/canvas-ui-catalog';
import { useCanvasStore, type CanvasEdge } from '@/stores/canvas-store';

/**
 * Aresta customizada por `EdgeKind` (FR-003) — cor distinta por tipo, tracejada para assíncrona
 * (deixa explícito que ela sai do cálculo de latência do usuário — mesma regra do engine),
 * marcador de seta.
 *
 * Pedido direto do autor: tirar a legenda de texto ("Leitura"/"Escrita"/...) que aparecia fixa em
 * cima de toda aresta — poluía o canvas repetindo uma informação que a cor/traço já comunica. O
 * tipo continua 100% identificável (cor + tracejado pro assíncrono) e editável a qualquer momento
 * no painel de configuração da aresta selecionada (`EdgeConfigPanel` em `config-panel.tsx`) — só
 * o peso (`weight`, FR-004), que a cor não consegue expressar, continua com um rótulo no canvas.
 *
 * "Tráfego" animado (pedido direto do autor, "como no site de exemplo") — reaproveita a técnica
 * já usada no diagrama do hero da landing (`architecture-diagram.tsx`, `@keyframes flow-dash` em
 * `globals.css`): traço tracejado pequeno se deslocando continuamente (marching ants), não uma
 * partícula única viajando pela curva. Renderizado como uma SEGUNDA `<path>` por cima da aresta
 * "real" — nunca substitui o traço dela — pra não confundir a cor/tracejado que já tem significado
 * (tipo da aresta) com a decoração de tráfego. Só aparece quando há um resultado de simulação
 * (`lastResult`): antes de rodar "Simular"/"Submeter" não há requisição nenhuma fluindo ainda.
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
  const hasSimulated = useCanvasStore((s) => s.lastResult !== null);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...(markerEnd ? { markerEnd } : {})}
        className={`${kindUi.colorClass} ${selected ? 'opacity-100' : 'opacity-80'}`}
        style={kindUi.dashed ? { strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: '6 4' } : { strokeWidth: selected ? 2.5 : 1.5 }}
      />
      {hasSimulated && (
        <path
          d={edgePath}
          fill="none"
          stroke="#34d399"
          strokeWidth={selected ? 2 : 1.5}
          strokeLinecap="round"
          strokeDasharray="4 8"
          className="pointer-events-none opacity-70"
          style={{ animation: 'flow-dash 0.8s linear infinite' }}
        />
      )}
      {data?.weight !== undefined && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded bg-zinc-900/90 px-1.5 py-0.5 text-[10px] text-zinc-300"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data.weight}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
