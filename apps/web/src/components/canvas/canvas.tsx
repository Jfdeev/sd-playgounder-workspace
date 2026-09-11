'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, Play, Redo2, Trash2, Undo2 } from 'lucide-react';
import { simulate, type ComponentType, type Design, type Workload } from '@sdp/engine';
import { isProblemSolved, type Problem } from '@sdp/problems';
import { toDesign, toManualWorkload, toWorkload } from '@/lib/canvas-to-design';
import { toFlowEdge, toFlowNode, type ClientVariant } from '@/lib/canvas-types';
import { connectableKindOf, isValidCanvasConnection } from '@/lib/connection-rules';
import { RPS_SLIDER_RESOLUTION, clampRps, rpsToSliderPosition, sliderPositionToRps } from '@/lib/rps-slider';
import { useCanvasStore, useCanvasStoreApi, type CanvasEdge, type CanvasNode } from '@/stores/canvas-store';
import { useProgressionStore } from '@/stores/progression-store';
import { ClientNode } from './nodes/client-node';
import { ComponentNode } from './nodes/component-node';
import { TypedEdge } from './edges/typed-edge';
import { Palette, buildNodeData, DRAG_MIME } from './palette';
import { ConfigPanel } from './config-panel';
import { ResultPanel } from './result-panel';
import { ChallengeCard } from './challenge-card';

const nodeTypes = { component: ComponentNode, client: ClientNode };
const edgeTypes = { typed: TypedEdge };

/**
 * `problem` é opcional (canvas livre/sandbox — pedido direto do autor: "o usuário pode entrar no
 * canvas sem necessariamente fazer um desafio"). Duas ações rodam o engine, cada uma com um
 * Workload diferente:
 *
 * - **Submeter**: só disponível dentro de um desafio, sempre na escala fixa do `Problem`
 *   (`toWorkload`) — a única que conta pra rubrica/progressão (`isProblemSolved` +
 *   `markChallengeCompleted`). Inventar uma escala aqui seria inventar escopo de produto; por
 *   isso continua desabilitado no sandbox.
 * - **Simular**: disponível em qualquer contexto, roda com o rps que o usuário escolher no
 *   slider/input (`toManualWorkload`) — pedido direto do autor, reabre deliberadamente a régua de
 *   carga ao vivo que tinha sido adiada (`specs/canvas-sandbox-desafios-templates/decisions.md`,
 *   decisão 3), mas só como ferramenta exploratória: nunca chama `isProblemSolved`/
 *   `markChallengeCompleted`, então não reabre o risco original da FR-007 de M1 (o usuário baixar
 *   a carga só pra "passar" num desafio) — resolver um desafio continua exigindo Submeter na
 *   escala real dele.
 */
function CanvasInner({ problem, onLeaveChallenge }: { problem: Problem | null; onLeaveChallenge: () => void }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const selectEdge = useCanvasStore((s) => s.selectEdge);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const applySimulationResult = useCanvasStore((s) => s.applySimulationResult);
  const lastResult = useCanvasStore((s) => s.lastResult);
  const storeApi = useCanvasStoreApi();
  const markChallengeCompleted = useProgressionStore((s) => s.markCompleted);

  const { screenToFlowPosition } = useReactFlow();
  const [actionError, setActionError] = useState<string | null>(null);

  // Botão "Simular" — pedido direto do autor: rodar a arquitetura com uma quantidade de
  // requisições ajustável, pra ver qual componente satura, sem depender de um desafio. Puramente
  // exploratório (confirmado com o autor): nunca chama `isProblemSolved`/`markChallengeCompleted`
  // — só "Submeter" conta oficialmente pra rubrica/progressão, sempre na escala fixa do problema.
  const [simulatePanelOpen, setSimulatePanelOpen] = useState(false);
  const [simulateRps, setSimulateRps] = useState(1000);

  // Reabrir com o rps do desafio ativo como ponto de partida (explorar "a partir de onde o
  // problema já está"); volta a um padrão neutro no sandbox ou ao trocar de desafio.
  useEffect(() => {
    setSimulateRps(problem ? clampRps(toWorkload(problem).rps) : 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id]);

  // FR-010: desfazer/refazer — Ctrl/Cmd+Z e Ctrl/Cmd+Shift+Z, além dos botões abaixo (RNF-8).
  // Chamar undo()/redo() sem histórico é um no-op seguro (comportamento do próprio zundo), então
  // não é preciso rastrear pastStates/futureStates só pra desabilitar o botão.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (!isModifierPressed || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) {
        storeApi.temporal.getState().redo();
      } else {
        storeApi.temporal.getState().undo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [storeApi]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Impede no canvas as ligações que o engine roda sem erro mas não fazem sentido arquitetural
  // (ex.: Load Balancer → SQL Primary) — regra pedagógica pura, vive em connection-rules.ts,
  // nunca em packages/engine (que não tem noção de topologia "certa"). React Flow chama isto a
  // cada tentativa de arrastar uma conexão; retornar false recusa antes de onConnect disparar.
  const isValidConnection = useCallback<IsValidConnection<CanvasEdge>>(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;
      return isValidCanvasConnection(connectableKindOf(sourceNode.data), connectableKindOf(targetNode.data));
    },
    [nodes],
  );

  // Drag-and-drop da paleta pro canvas (research.md §2 de M1) — o payload arrastado é
  // "component:tipo" ou "client:variante" (palette.tsx); screenToFlowPosition cuida de zoom/pan
  // automaticamente.
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData(DRAG_MIME);
      const [kind, typeOrVariant] = payload.split(':');
      if (!typeOrVariant) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const data =
        kind === 'component'
          ? buildNodeData('component', typeOrVariant as ComponentType)
          : buildNodeData('client', typeOrVariant as ClientVariant);
      const node: CanvasNode = { id: crypto.randomUUID(), type: data.kind, position, data };
      addNode(node);
    },
    [screenToFlowPosition, addNode],
  );

  // FR-008/FR-009/FR-029: roda o design atual contra o engine e propaga status/gargalo de volta
  // pros nós (destaque em ComponentNode). Canvas vazio (edge case do spec) mostra uma mensagem
  // clara em vez de chamar o engine sem feedback. Compartilhada entre "Submeter" (única ação que
  // conta oficialmente — `countsForProgression: true`) e "Simular" (sempre exploratório, roda em
  // qualquer rps escolhido, nunca em `countsForProgression: true`) — as duas só diferem no
  // Workload usado e em se avaliam a rubrica no final.
  const runSimulation = useCallback(
    (workload: Workload, { actionLabel, countsForProgression }: { actionLabel: string; countsForProgression: boolean }) => {
      if (nodes.length === 0) {
        setActionError(`Adicione componentes antes de ${actionLabel}.`);
        applySimulationResult(null, null);
        return;
      }
      setActionError(null);

      const flowNodes = nodes.map((n) => toFlowNode(n.id, n.position, n.data));
      const flowEdges = edges.map((e) => toFlowEdge(e.id, e.source, e.target, e.data ?? { kind: 'read' }));
      const design: Design = toDesign(flowNodes, flowEdges);
      const result = simulate(design, workload);

      applySimulationResult(result, design);
      for (const [nodeId, nodeResult] of Object.entries(result.nodes)) {
        updateNodeConfig(nodeId, {
          result: { status: nodeResult.status, isBottleneck: nodeId === result.path.bottleneckId },
        });
      }

      // Rubrica à mostra (Clarifications desta sessão) — progressão travada avança quando TODOS
      // os critérios passam. `isProblemSolved` só compara o que o engine já calculou contra o
      // limiar autorado em cada critério — nunca recalcula uma métrica (Constitution I/VII).
      if (countsForProgression && problem && isProblemSolved(problem, result, design)) {
        markChallengeCompleted(problem.id);
      }
    },
    [nodes, edges, problem, applySimulationResult, updateNodeConfig, markChallengeCompleted],
  );

  // Sem desafio ativo, o botão de Submeter já vem desabilitado (ver JSX) — handleSubmit nunca
  // roda sem `problem`; a escala vem sempre do problema, nunca do slider de Simular. É a única
  // chamada com `countsForProgression: true` — a única ação que conta oficialmente.
  function handleSubmit() {
    if (!problem) return;
    runSimulation(toWorkload(problem), { actionLabel: 'submeter', countsForProgression: true });
  }

  // Botão "Simular" — mesmo runSimulation, workload manual (só o rps do slider/input), nunca
  // conta pra progressão. Disponível em qualquer contexto (sandbox ou dentro de um desafio).
  function handleSimulate(rps: number) {
    runSimulation(toManualWorkload(rps), { actionLabel: 'simular', countsForProgression: false });
  }

  // Ref sempre com a versão mais recente de handleSimulate (fecha sobre nodes/edges/problem
  // atuais) — o efeito abaixo só reage a simulatePanelOpen/simulateRps, então sem isso um
  // timeout já agendado dispararia com um nodes/edges DEFASADO se o usuário editar o canvas
  // durante os 250ms de debounce (o closure capturado na última vez que o efeito rodou, não o
  // da renderização mais recente).
  const handleSimulateRef = useRef(handleSimulate);
  handleSimulateRef.current = handleSimulate;

  // Roda a simulação exploratória ao abrir o painel e a cada mudança de rps (slider ou input),
  // com um pequeno debounce pra não recalcular a cada pixel arrastado no slider — mesma técnica
  // já usada no debounce do zundo em canvas-store.tsx, aqui como efeito local por ser um detalhe
  // só desta tela, não do estado persistido do canvas.
  useEffect(() => {
    if (!simulatePanelOpen) return;
    const timeoutId = setTimeout(() => handleSimulateRef.current(simulateRps), 250);
    return () => clearTimeout(timeoutId);
  }, [simulatePanelOpen, simulateRps]);

  // Lixeira do canvas (pedido direto do autor) — destrutivo, então pede confirmação antes; a
  // ação em si ainda é desfazível por Ctrl/Cmd+Z (clearCanvas entra no histórico do zundo).
  function handleClearCanvas() {
    if (nodes.length === 0 && edges.length === 0) return;
    const confirmed = window.confirm('Apagar todo o canvas? Remove todos os componentes e conexões (dá pra desfazer com Ctrl/Cmd+Z).');
    if (!confirmed) return;
    clearCanvas();
    setActionError(null);
  }

  return (
    <div className="flex min-h-0 flex-1">
      <Palette />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_, node) => selectNode(node.id)}
            onEdgeClick={(_, edge) => selectEdge(edge.id)}
            onPaneClick={() => selectNode(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'typed' }}
            fitView
          >
            <Background />
            <MiniMap pannable zoomable className="!bg-zinc-900" />
          </ReactFlow>
          {/* Pedido direto do autor: o card ficava "na frente" do rodapé (toolbar de
              Simular/Submeter + ResultPanel) porque antes era posicionado `absolute` relativo ao
              container do Canvas INTEIRO (que empilha o mapa E o rodapé) — `bottom-4` acabava
              caindo na mesma altura do rodapé, sobrepondo os dois. Agora o container relativo é só
              a área do mapa (este div, que envolve só o `<ReactFlow>`), então o card flutua dentro
              da área do mapa como o MiniMap, nunca mais baixo que isso. */}
          {problem && <ChallengeCard problem={problem} onLeave={onLeaveChallenge} />}
        </div>
        {simulatePanelOpen && (
          <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-2">
            <span className="shrink-0 text-xs text-zinc-500">Requisições/s</span>
            <input
              type="range"
              min={0}
              max={RPS_SLIDER_RESOLUTION}
              value={rpsToSliderPosition(simulateRps)}
              onChange={(e) => setSimulateRps(sliderPositionToRps(Number(e.target.value)))}
              aria-label="Requisições por segundo"
              className="h-1.5 flex-1 cursor-pointer accent-violet-500"
            />
            <input
              type="number"
              min={1}
              value={simulateRps}
              onChange={(e) => setSimulateRps(clampRps(Number(e.target.value)))}
              aria-label="Requisições por segundo (valor exato)"
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-right text-xs text-zinc-200"
            />
            <span className="shrink-0 text-xs text-zinc-500">rps</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-500">{nodes.length} nó(s) · {edges.length} conexão(ões)</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => storeApi.temporal.getState().undo()}
                aria-label="Desfazer"
                title="Desfazer (Ctrl/Cmd+Z)"
                className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              >
                <Undo2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => storeApi.temporal.getState().redo()}
                aria-label="Refazer"
                title="Refazer (Ctrl/Cmd+Shift+Z)"
                className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              >
                <Redo2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleClearCanvas}
                aria-label="Apagar todo o canvas"
                title="Apagar todo o canvas"
                className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-red-500 hover:text-red-400"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimulatePanelOpen((v) => !v)}
              aria-pressed={simulatePanelOpen}
              title="Simular a arquitetura com uma carga ajustável, sem contar pra rubrica do desafio"
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                simulatePanelOpen
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-zinc-800 text-zinc-200 hover:border-violet-500'
              }`}
            >
              <Activity className="size-4" aria-hidden />
              Simular
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!problem}
              title={problem ? undefined : 'Entre em um desafio pra submeter e ver o resultado do engine'}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              <Play className="size-4" aria-hidden />
              Submeter
            </button>
          </div>
        </div>
        <ResultPanel result={lastResult} actionError={actionError} />
      </div>
      <ConfigPanel />
    </div>
  );
}

export function Canvas({ problem, onLeaveChallenge }: { problem: Problem | null; onLeaveChallenge: () => void }) {
  return (
    <ReactFlowProvider>
      <CanvasInner problem={problem} onLeaveChallenge={onLeaveChallenge} />
    </ReactFlowProvider>
  );
}
