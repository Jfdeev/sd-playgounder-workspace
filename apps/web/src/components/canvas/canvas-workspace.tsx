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

import { useEffect, useRef, useState } from 'react';
import { ALL_PROBLEM_IDS, getProblem } from '@sdp/problems';
import { canvasStorageKey, CanvasStoreProvider, useCanvasStore } from '@/stores/canvas-store';
import { instantiateTemplate, type ArchitectureTemplate } from '@/lib/canvas-templates';
import { isChallengeUnlocked } from '@/lib/challenge-progression';
import { useProgressionStore } from '@/stores/progression-store';
import { Canvas } from './canvas';
import { ChallengeTopBar } from './challenge-topbar';

function CanvasWorkspaceInner({
  activeChallengeId,
  onSelectChallenge,
  onLeaveChallenge,
}: {
  activeChallengeId: string | null;
  onSelectChallenge: (problemId: string) => void;
  onLeaveChallenge: () => void;
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const loadDesign = useCanvasStore((s) => s.loadDesign);
  const activeProblem = activeChallengeId ? (getProblem(activeChallengeId) ?? null) : null;

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

  return (
    <>
      <ChallengeTopBar
        activeChallengeId={activeChallengeId}
        onSelectChallenge={onSelectChallenge}
        onApplyTemplate={handleApplyTemplate}
      />
      <div className="flex min-h-0 flex-1">
        <Canvas problem={activeProblem} onLeaveChallenge={onLeaveChallenge} />
      </div>
    </>
  );
}

export function CanvasWorkspace({ initialProblemId }: { initialProblemId: string | null }) {
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(initialProblemId);
  const storageKey = canvasStorageKey(activeChallengeId);
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
    if (activeChallengeId && !isChallengeUnlocked(activeChallengeId, ALL_PROBLEM_IDS, completedIds)) {
      setActiveChallengeId(null);
    }
  }, [progressStatus, activeChallengeId, completedIds]);

  return (
    <CanvasStoreProvider key={storageKey} storageKey={storageKey}>
      <CanvasWorkspaceInner
        activeChallengeId={activeChallengeId}
        onSelectChallenge={setActiveChallengeId}
        onLeaveChallenge={() => setActiveChallengeId(null)}
      />
    </CanvasStoreProvider>
  );
}
