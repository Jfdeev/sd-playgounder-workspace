'use client';

import { useState, type ChangeEvent } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { COMPONENT_UI, CLIENT_UI } from '@/lib/canvas-ui-catalog';

/**
 * Painel de configuração do nó selecionado (FR-005) — limitado aos campos que o engine
 * efetivamente lê: réplicas (todos os componentes) e taxa de acerto de cache (só `cache`). Nada é
 * exibido para um nó Cliente (FR-006, não é configurável).
 *
 * FR-014: impede confirmar um valor de réplicas inválido (< 1 ou não-numérico) diretamente no
 * campo — o valor só é aplicado à store quando é um inteiro válido ≥ 1.
 */
export function ConfigPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId));
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);

  const [replicasInput, setReplicasInput] = useState<string | null>(null);

  if (!selectedNodeId || !node) {
    return (
      <aside className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
        Selecione um nó no canvas para configurá-lo.
      </aside>
    );
  }

  if (node.data.kind === 'client') {
    return (
      <aside className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-1 text-sm font-semibold text-zinc-200">{CLIENT_UI[node.data.variant].label}</h2>
        <p className="text-xs text-zinc-500">
          Nó de entrada — puramente visual, sem configuração. Todo componente conectado
          diretamente a ele vira um ponto de entrada de carga na submissão.
        </p>
      </aside>
    );
  }

  const currentReplicas = replicasInput ?? String(node.data.replicas);
  const replicasAsNumber = Number(currentReplicas);
  const replicasIsValid = Number.isInteger(replicasAsNumber) && replicasAsNumber >= 1;

  function handleReplicasChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setReplicasInput(value);
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1) {
      updateNodeConfig(selectedNodeId!, { replicas: parsed });
    }
  }

  function handleCacheHitRateChange(event: ChangeEvent<HTMLInputElement>) {
    const percent = Number(event.target.value);
    if (Number.isFinite(percent)) {
      updateNodeConfig(selectedNodeId!, { cacheHitRate: Math.min(100, Math.max(0, percent)) / 100 });
    }
  }

  return (
    <aside className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-200">{COMPONENT_UI[node.data.componentType].label}</h2>

      <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor="replicas-input">
        Réplicas
      </label>
      <input
        id="replicas-input"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={currentReplicas}
        onChange={handleReplicasChange}
        aria-invalid={!replicasIsValid}
        className={`w-full rounded-lg border bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-violet-500 ${
          replicasIsValid ? 'border-zinc-700' : 'border-red-500'
        }`}
      />
      {!replicasIsValid && (
        <p className="mt-1 text-xs text-red-400">Informe um número inteiro maior ou igual a 1.</p>
      )}

      {node.data.componentType === 'cache' && (
        <>
          <label className="mt-4 mb-1 block text-xs font-medium text-zinc-400" htmlFor="cache-hit-rate-input">
            Taxa de acerto esperada (%)
          </label>
          <input
            id="cache-hit-rate-input"
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            value={Math.round((node.data.cacheHitRate ?? 0) * 100)}
            onChange={handleCacheHitRateChange}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-violet-500"
          />
        </>
      )}
    </aside>
  );
}
