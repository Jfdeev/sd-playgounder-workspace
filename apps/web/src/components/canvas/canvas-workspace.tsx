'use client';

/**
 * Orquestrador do canvas — apps/web/src/components/canvas/canvas-workspace.tsx
 *
 * Pedido direto do autor: "o usuário pode entrar no canvas sem necessariamente fazer um desafio".
 * Uma única página de canvas (mesmo padrão do site de inspiração, uma rota `/playground` só) com
 * um desafio ativo opcional (`activeChallengeId`), guardado como estado local — nunca uma rota
 * separada por desafio. `/app` monta este componente com `initialProblemId={null}` (sandbox);
 * `/app/[problemId]` monta com o id do desafio (deep link).
 *
 * `CanvasStoreProvider` precisa envolver tudo que lê a store do canvas (`Canvas`, `ChallengeCard`,
 * o botão de Templates) — por isso a lógica que de fato usa `useCanvasStore` mora em
 * `CanvasWorkspaceInner`, um componente FILHO do Provider, nunca no componente que cria o Provider.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_PROBLEMS, getIncident, getProblem } from '@sdp/problems';
import { getReferenceArchitecture, toDesign } from '@sdp/knowledge';
import { canvasStorageKey, CanvasStoreProvider, incidentStorageKey, useCanvasStore } from '@/stores/canvas-store';
import { instantiateTemplate, type ArchitectureTemplate } from '@/lib/canvas-templates';
import { designToCanvas } from '@/lib/design-to-canvas';
import { fromSavedCanvas, type SavedCanvas } from '@/lib/designs/saved-canvas';
import { takePendingOpen, type PendingOpen } from '@/lib/designs/pending-open';
import { isChallengeUnlocked } from '@/lib/challenge-progression';
import { useProgressionStore } from '@/stores/progression-store';
import { Canvas } from './canvas';
import { ChallengeTopBar } from './challenge-topbar';

function CanvasWorkspaceInner({
  activeChallengeId,
  activeIncidentId,
  onSelectChallenge,
  onLeaveChallenge,
  onSelectIncident,
  onLeaveIncident,
  pendingOpen,
  onPendingConsumed,
  onOpenDesign,
}: {
  activeChallengeId: string | null;
  activeIncidentId: string | null;
  onSelectChallenge: (problemId: string) => void;
  onLeaveChallenge: () => void;
  onSelectIncident: (incidentId: string) => void;
  onLeaveIncident: () => void;
  pendingOpen: PendingOpen | null;
  onPendingConsumed: () => void;
  onOpenDesign: (designId: string, version?: number) => void;
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const loadDesign = useCanvasStore((s) => s.loadDesign);
  const activeProblem = activeChallengeId ? (getProblem(activeChallengeId) ?? null) : null;
  const activeIncident = activeIncidentId ? (getIncident(activeIncidentId) ?? null) : null;

  // M3: ao abrir um incidente pela primeira vez (canvas dele vazio), carrega a arquitetura pronta.
  const incidentLoaded = useRef(false);
  useEffect(() => {
    if (!activeIncident || incidentLoaded.current || pendingOpen) return;
    incidentLoaded.current = true;
    if (nodes.length === 0) loadDesign(designToCanvas(activeIncident.design));
  }, [activeIncident, nodes.length, loadDesign, pendingOpen]);

  // M4.1: um design pedido pra abrir (pela lista ou por "abrir cópia" de um link) carrega assim que o
  // canvas do contexto certo estiver montado. Substituir um canvas com algo pede confirmação.
  useEffect(() => {
    if (!pendingOpen) return;
    const here =
      pendingOpen.contextKind === 'incident'
        ? activeIncidentId === pendingOpen.contextId
        : pendingOpen.contextKind === 'challenge'
          ? activeChallengeId === pendingOpen.contextId && activeIncidentId === null
          : activeChallengeId === null && activeIncidentId === null;
    if (!here) return;
    onPendingConsumed();
    if (nodes.length > 0 && !window.confirm('Abrir este design? Isso substitui o que está no canvas agora (dá pra desfazer com Ctrl/Cmd+Z).')) return;
    loadDesign(fromSavedCanvas(pendingOpen.canvas), {
      presetId: pendingOpen.canvas.loadedPresetId,
      ...(pendingOpen.openDesign ? { openDesign: pendingOpen.openDesign } : {}),
    });
  }, [pendingOpen, activeChallengeId, activeIncidentId, nodes.length, loadDesign, onPendingConsumed]);

  // Aplicar um template substitui o design inteiro (mesmo tratamento destrutivo da lixeira) —
  // pede confirmação se já existe algo no canvas; a ação em si ainda é desfazível (Ctrl/Cmd+Z).
  function handleApplyTemplate(template: ArchitectureTemplate) {
    if (nodes.length > 0 || edges.length > 0) {
      const confirmed = window.confirm(
        `Aplicar o template "${template.label}"? Isso substitui todo o design atual do canvas (dá pra desfazer com Ctrl/Cmd+Z).`,
      );
      if (!confirmed) return;
    }
    loadDesign(instantiateTemplate(template));
  }

  // M2.5: carregar uma arquitetura de referência — mesma confirmação destrutiva do template. Os ids
  // dos nós do preset são preservados por `designToCanvas`, o que liga cada nó à sua explicação.
  function handleLoadPreset(presetId: string) {
    const preset = getReferenceArchitecture(presetId);
    if (!preset) return;
    if (nodes.length > 0 || edges.length > 0) {
      const confirmed = window.confirm(
        `Carregar a arquitetura de referência do ${preset.company}? Isso substitui todo o design atual do canvas (dá pra desfazer com Ctrl/Cmd+Z).`,
      );
      if (!confirmed) return;
    }
    loadDesign(designToCanvas(toDesign(preset)), { presetId });
  }

  return (
    <>
      <ChallengeTopBar
        activeChallengeId={activeChallengeId}
        activeIncidentId={activeIncidentId}
        onSelectChallenge={onSelectChallenge}
        onSelectIncident={onSelectIncident}
        onApplyTemplate={handleApplyTemplate}
        onLoadPreset={handleLoadPreset}
        onOpenDesign={onOpenDesign}
      />
      <div className="flex min-h-0 flex-1">
        <Canvas
          problem={activeProblem}
          onLeaveChallenge={onLeaveChallenge}
          incident={activeIncident}
          onLeaveIncident={onLeaveIncident}
        />
      </div>
    </>
  );
}

export function CanvasWorkspace({ initialProblemId }: { initialProblemId: string | null }) {
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(initialProblemId);
  // M3: desafio e incidente são modos exclusivos; cada um com seu próprio canvas.
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null);
  const consumePending = useCallback(() => setPendingOpen(null), []);

  // Vai pro contexto do design (desafio travado → canvas livre, com aviso) e deixa o conteúdo pendente
  // até o canvas desse contexto montar.
  function openInContext(pending: PendingOpen) {
    let target = pending;
    if (pending.contextKind === 'challenge' && !isChallengeUnlocked(pending.contextId!, ALL_PROBLEMS, completedIds)) {
      window.alert('Esse desafio ainda está travado pra você — o design abre no canvas livre.');
      target = { ...pending, contextKind: 'sandbox', contextId: null };
    }
    setActiveChallengeId(target.contextKind === 'challenge' ? target.contextId : null);
    setActiveIncidentId(target.contextKind === 'incident' ? target.contextId : null);
    setPendingOpen(target);
  }

  async function openSavedDesign(designId: string, version?: number) {
    const response = await fetch(`/api/designs/${designId}${version === undefined ? '' : `?version=${version}`}`, { cache: 'no-store' }).catch(() => null);
    if (!response?.ok) {
      window.alert('Não deu pra abrir esse design agora.');
      return;
    }
    const design = (await response.json()) as {
      id: string;
      name: string;
      contextKind: PendingOpen['contextKind'];
      contextId: string | null;
      selected: { content: SavedCanvas };
    };
    openInContext({ canvas: design.selected.content, contextKind: design.contextKind, contextId: design.contextId, openDesign: { id: design.id, name: design.name } });
  }

  // "Abrir uma cópia" vinda de um link compartilhado (outra página) — vai pro canvas livre, solta.
  useEffect(() => {
    let pending: PendingOpen | null = null;
    try {
      pending = takePendingOpen(sessionStorage);
    } catch {
      pending = null;
    }
    if (pending) openInContext(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const storageKey = activeIncidentId ? incidentStorageKey(activeIncidentId) : canvasStorageKey(activeChallengeId);
  const completedIds = useProgressionStore((s) => s.completedIds);
  const progressStatus = useProgressionStore((s) => s.status);
  const refreshProgress = useProgressionStore((s) => s.refresh);
  const deepLinkChecked = useRef(false);

  // M2.8: desafios resolvidos vêm do servidor — busca ao entrar no canvas.
  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  // Fecha o bypass de deep link: `/app/[problemId]` (page.tsx) só checa se o Problem *existe* no
  // catálogo, não se ele está *destravado* — a trava por progressão (isChallengeUnlocked) só era
  // aplicada no dropdown de Desafios da topbar, um segundo ponto de entrada que não passava por
  // ela. Roda uma única vez, assim que o progresso do servidor chega (ou falha — aí vale o estado
  // conservador, só o 1º desafio): se o deep link inicial aponta pra um desafio ainda bloqueado,
  // cai pro sandbox. Depois disso, progressão só destrava, nunca re-trava o que já está ativo.
  useEffect(() => {
    if (deepLinkChecked.current || (progressStatus !== 'ready' && progressStatus !== 'error')) return;
    deepLinkChecked.current = true;
    if (activeChallengeId && !isChallengeUnlocked(activeChallengeId, ALL_PROBLEMS, completedIds)) {
      setActiveChallengeId(null);
    }
  }, [progressStatus, activeChallengeId, completedIds]);

  return (
    <CanvasStoreProvider key={storageKey} storageKey={storageKey}>
      <CanvasWorkspaceInner
        activeChallengeId={activeChallengeId}
        activeIncidentId={activeIncidentId}
        onSelectChallenge={(problemId) => {
          setActiveIncidentId(null);
          setActiveChallengeId(problemId);
        }}
        onLeaveChallenge={() => setActiveChallengeId(null)}
        onSelectIncident={(incidentId) => {
          setActiveChallengeId(null);
          setActiveIncidentId(incidentId);
        }}
        onLeaveIncident={() => setActiveIncidentId(null)}
        pendingOpen={pendingOpen}
        onPendingConsumed={consumePending}
        onOpenDesign={(designId, version) => void openSavedDesign(designId, version)}
      />
    </CanvasStoreProvider>
  );
}
