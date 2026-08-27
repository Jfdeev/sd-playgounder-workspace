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

import { useState } from 'react';
import { getProblem } from '@sdp/problems';
import { canvasStorageKey, CanvasStoreProvider, useCanvasStore } from '@/stores/canvas-store';
import { instantiateTemplate, type ArchitectureTemplate } from '@/lib/canvas-templates';
import { Canvas } from './canvas';
import { ChallengeTopBar } from './challenge-topbar';
import { ChallengeCard } from './challenge-card';

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
      <div className="relative flex min-h-0 flex-1">
        <Canvas problem={activeProblem} />
        {activeProblem && <ChallengeCard problem={activeProblem} onLeave={onLeaveChallenge} />}
      </div>
    </>
  );
}

export function CanvasWorkspace({ initialProblemId }: { initialProblemId: string | null }) {
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(initialProblemId);
  const storageKey = canvasStorageKey(activeChallengeId);

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
