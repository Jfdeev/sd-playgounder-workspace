'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, Siren, X } from 'lucide-react';
import { simulate } from '@sdp/engine';
import {
  FAULT_TYPES,
  buildIncidentSnapshot,
  type DiagnosisVerdict,
  type FaultType,
  type FixCheck,
  type IncidentPublic,
  type IncidentSnapshot,
} from '@sdp/problems';
import { COMPONENT_UI } from '@/lib/canvas-ui-catalog';
import { canvasDesignOf } from '@/lib/canvas-to-design';
import { designToCanvas } from '@/lib/design-to-canvas';
import type { ProgressJson } from '@/lib/gamification/progress';
import { FAULT_TYPE_LABELS, FIX_CHECK_LABELS, violationLabel } from '@/lib/incidents/labels';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProgressionStore } from '@/stores/progression-store';

/**
 * Painel do Modo Incidente (M3, US1–US3). "Antes" é o engine sobre o design público, calculado aqui;
 * "agora" vem do servidor (`GET /api/incidents/[id]`), que é o único lugar onde a falha plantada
 * existe. Diagnóstico e fix são conferidos lá; este componente só envia e mostra o veredito.
 */

type IncidentState = { snapshot: IncidentSnapshot; status: { diagnosed: boolean; resolved: boolean }; whatHappened?: string };

const VERDICT_TEXT: Record<Exclude<DiagnosisVerdict, 'correct'>, string> = {
  'right-component': 'O componente está certo, mas o tipo de falha não é esse.',
  wrong: 'Não é isso.',
};

const ERROR_TEXT: Record<string, string> = {
  RATE_LIMITED: 'Muitas tentativas seguidas — espere um minuto.',
  DIAGNOSIS_REQUIRED: 'Acerte o diagnóstico antes de submeter o fix.',
  INVALID_DESIGN: 'O design no canvas não é válido pra submeter.',
};

const formatMs = (value: number | null) => (value === null ? '∞' : `${value} ms`);

export function IncidentPanel({ incident, onLeave }: { incident: IncidentPublic; onLeave: () => void }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const loadDesign = useCanvasStore((s) => s.loadDesign);
  const applyProgress = useProgressionStore((s) => s.applyProgress);

  const [state, setState] = useState<IncidentState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [nodeChoice, setNodeChoice] = useState(incident.design.nodes[0]!.id);
  const [faultChoice, setFaultChoice] = useState<FaultType>(FAULT_TYPES[0]);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [failing, setFailing] = useState<FixCheck[]>([]);
  const [busy, setBusy] = useState(false);
  // Minimizável como o card de desafio — o painel não pode esconder os componentes que se investiga.
  const [collapsed, setCollapsed] = useState(false);

  const before = useMemo(
    () => buildIncidentSnapshot(incident.design, simulate(incident.design, incident.workload)),
    [incident],
  );

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setLoadError(false);
    fetch(`/api/incidents/${incident.id}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as IncidentState;
        if (!cancelled) setState(body);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [incident.id]);

  // Clicar num componente do canvas já preenche o diagnóstico com ele.
  useEffect(() => {
    if (selectedNodeId && incident.design.nodes.some((n) => n.id === selectedNodeId)) setNodeChoice(selectedNodeId);
  }, [selectedNodeId, incident.design.nodes]);

  const labelOf = (nodeId: string) => {
    const node = incident.design.nodes.find((n) => n.id === nodeId);
    return node ? COMPONENT_UI[node.type].label : nodeId;
  };

  async function post<T>(path: string, body: unknown): Promise<{ status: number; body: T | null }> {
    const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: (await response.json().catch(() => null)) as T | null };
  }

  async function submitDiagnosis() {
    setBusy(true);
    setMessage(null);
    try {
      const { status, body } = await post<{ verdict?: DiagnosisVerdict; whatHappened?: string; error?: string }>(
        `/api/incidents/${incident.id}/diagnosis`,
        { nodeId: nodeChoice, faultType: faultChoice },
      );
      if (status === 200 && body?.verdict === 'correct') {
        const whatHappened = body.whatHappened;
        setState((s) => s && { ...s, status: { ...s.status, diagnosed: true }, ...(whatHappened ? { whatHappened } : {}) });
        setMessage({ tone: 'ok', text: 'Diagnóstico certo!' });
      } else if (status === 200 && body?.verdict) {
        setMessage({ tone: 'warn', text: VERDICT_TEXT[body.verdict as Exclude<DiagnosisVerdict, 'correct'>] });
      } else {
        setMessage({ tone: 'warn', text: ERROR_TEXT[body?.error ?? ''] ?? 'Não deu pra conferir agora — tente de novo.' });
      }
    } catch {
      setMessage({ tone: 'warn', text: 'Não deu pra conferir agora — tente de novo.' });
    } finally {
      setBusy(false);
    }
  }

  async function submitFix() {
    setBusy(true);
    setMessage(null);
    setFailing([]);
    try {
      const { status, body } = await post<{
        resolved?: boolean;
        failing?: FixCheck[];
        snapshot?: IncidentSnapshot;
        credited?: { xp: number };
        progress?: ProgressJson;
        error?: string;
      }>(`/api/incidents/${incident.id}/fix`, { design: canvasDesignOf(nodes, edges) });
      if (status === 200 && body) {
        if (body.progress) applyProgress(body.progress);
        if (body.snapshot) setState((s) => s && { ...s, snapshot: body.snapshot!, status: { ...s.status, resolved: s.status.resolved || !!body.resolved } });
        if (body.resolved) {
          setMessage({ tone: 'ok', text: body.credited?.xp ? `Incidente resolvido! +${body.credited.xp} XP` : 'Incidente resolvido de novo — sem XP novo.' });
        } else {
          setFailing(body.failing ?? []);
          setMessage({ tone: 'warn', text: 'Com a falha ainda ativa, o sistema não voltou ao normal.' });
        }
      } else {
        setMessage({ tone: 'warn', text: ERROR_TEXT[body?.error ?? ''] ?? 'Não deu pra conferir agora — tente de novo.' });
      }
    } catch {
      setMessage({ tone: 'warn', text: 'Não deu pra conferir agora — tente de novo.' });
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    if (window.confirm('Voltar a arquitetura do incidente ao estado original? Suas mudanças no canvas somem (dá pra desfazer com Ctrl/Cmd+Z).')) {
      loadDesign(designToCanvas(incident.design));
    }
  }

  const now = state?.snapshot;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute bottom-4 left-4 z-10 rounded-lg border border-red-500/40 bg-zinc-950/95 px-4 py-2 text-sm font-medium text-zinc-200 shadow-xl hover:border-red-400"
      >
        <Siren className="mr-1.5 inline size-3.5 text-red-400" aria-hidden />
        {incident.title}
        <ChevronUp className="ml-2 inline size-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex max-h-[calc(100%-2rem)] w-[26rem] flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/95 p-4 text-sm shadow-2xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-400">
            <Siren className="size-3.5" aria-hidden /> Incidente
          </p>
          <h2 className="mt-0.5 font-semibold text-zinc-100">{incident.title}</h2>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setCollapsed(true)} title="Minimizar" aria-label="Minimizar" className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            <ChevronDown className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={restart} title="Voltar ao estado original" aria-label="Voltar ao estado original" className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            <RotateCcw className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={onLeave} title="Sair do incidente" aria-label="Sair do incidente" className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-200">
        <AlertTriangle className="mr-1 inline size-3.5" aria-hidden />
        {incident.alert}
      </p>

      {loadError && <p className="mb-3 text-xs text-amber-300">Não deu pra carregar as métricas do incidente agora.</p>}

      {now && (
        <div className="mb-3">
          <table className="w-full text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-1 text-left font-medium">Componente</th>
                <th className="py-1 text-right font-medium">Antes</th>
                <th className="py-1 text-right font-medium">Agora</th>
              </tr>
            </thead>
            <tbody>
              {incident.design.nodes.map((node) => {
                const b = before.nodes[node.id]!;
                const n = now.nodes[node.id];
                return (
                  <tr key={node.id} className="border-t border-zinc-800 text-zinc-300">
                    <td className="py-1">{labelOf(node.id)}</td>
                    <td className="py-1 text-right">
                      {b.offeredLoad} rps · ρ {b.utilization}
                    </td>
                    <td className={`py-1 text-right ${n?.status === 'saturated' ? 'text-red-400' : n?.status === 'no-traffic' ? 'text-zinc-500' : n?.status === 'warning' ? 'text-amber-300' : ''}`}>
                      {n ? (n.status === 'no-traffic' ? 'sem tráfego' : `${n.offeredLoad} rps · ρ ${n.utilization}`) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-zinc-800 text-zinc-300">
                <td className="py-1">Latência p99</td>
                <td className="py-1 text-right">{formatMs(before.path.latency.p99)}</td>
                <td className="py-1 text-right">{formatMs(now.path.latency.p99)}</td>
              </tr>
              <tr className="border-t border-zinc-800 text-zinc-300">
                <td className="py-1">Throughput</td>
                <td className="py-1 text-right">{before.path.throughputRps} rps</td>
                <td className="py-1 text-right">{now.path.throughputRps} rps</td>
              </tr>
            </tbody>
          </table>
          {now.violations.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-amber-300">
              {now.violations.map((v) => (
                <li key={`${v.type}-${v.nodeIds.join()}`}>
                  {violationLabel(v.type)}: {v.nodeIds.map(labelOf).join(', ')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state && !state.status.diagnosed && (
        <div className="space-y-2 rounded-lg border border-zinc-800 p-3">
          <p className="text-xs font-semibold text-zinc-300">Seu diagnóstico</p>
          <select value={nodeChoice} onChange={(e) => setNodeChoice(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100">
            {incident.design.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {labelOf(node.id)}
              </option>
            ))}
          </select>
          <select value={faultChoice} onChange={(e) => setFaultChoice(e.target.value as FaultType)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100">
            {FAULT_TYPES.map((type) => (
              <option key={type} value={type}>
                {FAULT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <button type="button" disabled={busy} onClick={() => void submitDiagnosis()} className="w-full rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-500">
            Enviar diagnóstico
          </button>
        </div>
      )}

      {state?.status.diagnosed && (
        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="size-3.5" aria-hidden /> {state.status.resolved ? 'Incidente resolvido' : 'Diagnóstico certo'}
          </p>
          {state.whatHappened && <p className="text-xs text-zinc-300">{state.whatHappened}</p>}
          <p className="text-xs text-zinc-400">
            Corrija a arquitetura no canvas pra ela resistir a essa falha — o engine confere com a falha ainda ativa. Dá pra acrescentar e reforçar componentes, não remover.
          </p>
          <button type="button" disabled={busy} onClick={() => void submitFix()} className="w-full rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-500">
            Submeter fix
          </button>
        </div>
      )}

      {message && (
        <p role="status" className={`mt-2 text-xs ${message.tone === 'ok' ? 'text-emerald-300' : 'text-amber-300'}`}>
          {message.text}
        </p>
      )}
      {failing.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-300/90">
          {failing.map((check) => (
            <li key={check}>{FIX_CHECK_LABELS[check]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
