'use client';

import { useState, type ChangeEvent } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import type { EdgeKind } from '@sdp/engine';
import { useCanvasStore, type CanvasEdge } from '@/stores/canvas-store';
import { COMPONENT_UI, CLIENT_UI, EDGE_KIND_UI } from '@/lib/canvas-ui-catalog';
import { getAllowedTargets } from '@/lib/connection-rules';

const ALL_EDGE_KINDS = Object.keys(EDGE_KIND_UI) as EdgeKind[];

/**
 * Painel de configuração do nó OU aresta selecionada (FR-005/FR-003) — limitado aos campos que o
 * engine efetivamente lê: réplicas e taxa de acerto de cache por nó (nada pro nó Cliente, FR-006,
 * não é configurável); tipo e peso por aresta.
 *
 * FR-014: impede confirmar um valor de réplicas inválido (< 1 ou não-numérico) diretamente no
 * campo — o valor só é aplicado à store quando é um inteiro válido ≥ 1.
 */
export function ConfigPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId));
  const edge = useCanvasStore((s) => s.edges.find((e) => e.id === s.selectedEdgeId));
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);

  const [replicasInput, setReplicasInput] = useState<string | null>(null);

  if (selectedEdgeId && edge) {
    return <EdgeConfigPanel edgeId={selectedEdgeId} edge={edge} />;
  }

  if (!selectedNodeId || !node) {
    return (
      <aside className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
        Selecione um nó ou uma aresta no canvas para configurá-lo(a).
      </aside>
    );
  }

  if (node.data.kind === 'client') {
    const clientUi = CLIENT_UI[node.data.variant];
    return (
      <aside className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-1 text-sm font-semibold text-zinc-200">{clientUi.label}</h2>
        <p className="mb-3 text-xs text-zinc-500">{clientUi.description}</p>
        <ConnectivityHint kind="client" />
        <DeleteNodeButton nodeId={selectedNodeId} />
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

  const componentUi = COMPONENT_UI[node.data.componentType];

  return (
    <aside className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-1 text-sm font-semibold text-zinc-200">{componentUi.label}</h2>
      <p className="mb-3 text-xs text-zinc-500">{componentUi.description}</p>

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

      <ConnectivityHint kind={node.data.componentType} />
      <DeleteNodeButton nodeId={selectedNodeId} />
    </aside>
  );
}

/**
 * Mostra pra que tipos de componente o nó selecionado pode se conectar (connection-rules.ts) —
 * ajuda a entender por que uma tentativa de ligação foi recusada no canvas (`isValidConnection`),
 * sem precisar adivinhar a regra.
 */
function ConnectivityHint({ kind }: { kind: Parameters<typeof getAllowedTargets>[0] }) {
  const allowedTargets = getAllowedTargets(kind);

  return (
    <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
      {allowedTargets.length === 0 ? (
        'Não inicia conexões — só recebe.'
      ) : (
        <>Conecta a: {allowedTargets.map((type) => COMPONENT_UI[type].label).join(', ')}.</>
      )}
    </p>
  );
}

/**
 * Exclui o nó selecionado — afordância explícita no painel, complementar (não substitui) o
 * atalho de teclado já suportado nativamente pelo React Flow (Backspace/Delete com o nó
 * focado, FR-015/RNF-8). Usa `deleteElements`, a mesma API que o atalho de teclado usa por
 * baixo dos panos — remove o nó E qualquer aresta conectada a ele, sem duplicar essa lógica de
 * conectividade aqui.
 */
function DeleteNodeButton({ nodeId }: { nodeId: string }) {
  const { deleteElements } = useReactFlow();
  const selectNode = useCanvasStore((s) => s.selectNode);

  async function handleDelete() {
    await deleteElements({ nodes: [{ id: nodeId }] });
    selectNode(null);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-sm font-medium text-red-400 transition hover:border-red-700 hover:bg-red-950/60"
    >
      <Trash2 className="size-4" aria-hidden />
      Excluir componente
    </button>
  );
}

/**
 * Painel de configuração da aresta selecionada — fecha o gap de FR-003/FR-004: até aqui não havia
 * NENHUM jeito de trocar o tipo de uma aresta depois de criada (toda conexão nascia — e ficava
 * pra sempre — `kind: 'read'`, DEFAULT_NEW_EDGE_DATA em canvas-store.ts) nem de definir/limpar um
 * peso explícito.
 */
function EdgeConfigPanel({ edgeId, edge }: { edgeId: string; edge: CanvasEdge }) {
  const updateEdgeConfig = useCanvasStore((s) => s.updateEdgeConfig);
  const clearEdgeWeight = useCanvasStore((s) => s.clearEdgeWeight);

  const kind = edge.data?.kind ?? 'read';
  const weight = edge.data?.weight;

  function handleWeightChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(event.target.value);
    if (event.target.value !== '' && Number.isFinite(parsed) && parsed >= 0) {
      updateEdgeConfig(edgeId, { weight: parsed });
    }
  }

  return (
    <aside className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-200">Aresta</h2>

      <label className="mb-1 block text-xs font-medium text-zinc-400">Tipo</label>
      <div className="mb-4 grid grid-cols-2 gap-1.5">
        {ALL_EDGE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => updateEdgeConfig(edgeId, { kind: k })}
            aria-pressed={kind === k}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
              kind === k
                ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {EDGE_KIND_UI[k].label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor="edge-weight-input">
        Peso (opcional)
      </label>
      <div className="flex gap-1.5">
        <input
          id="edge-weight-input"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder="Igual entre irmãs"
          value={weight ?? ''}
          onChange={handleWeightChange}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-violet-500"
        />
        {weight !== undefined && (
          <button
            type="button"
            onClick={() => clearEdgeWeight(edgeId)}
            title="Voltar ao peso implícito"
            className="shrink-0 rounded-lg border border-zinc-700 px-2 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          >
            Limpar
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Sem peso definido, a carga se divide igualmente entre as arestas que saem do mesmo nó (FR-004).
        Pesos que não somam 100% são normalizados automaticamente pelo engine.
      </p>
    </aside>
  );
}
