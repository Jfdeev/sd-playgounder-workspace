'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, FolderOpen, History, Link2, Pencil, Save, Trash2 } from 'lucide-react';
import { getIncident, getProblem } from '@sdp/problems';
import { toSavedCanvas } from '@/lib/designs/saved-canvas';
import type { DesignContextKind } from '@/lib/designs/shared-view';
import { useCanvasStore } from '@/stores/canvas-store';

/**
 * Menu "Meus designs" (M4.1, US1–US3). Salvar cria uma versão nova do design aberto (ou, sem design
 * aberto, pede um nome e cria um); "Salvar como" sempre cria outro. Histórico restaura uma versão no
 * canvas (só vira versão nova se salvar de novo). Compartilhar gera/revoga o link. Abrir um design de
 * outro contexto é com o workspace (`onOpen`), que troca o canvas antes de carregar.
 */

type DesignSummary = { id: string; name: string; contextKind: DesignContextKind; contextId: string | null; updatedAt: string; versionCount: number; shared: boolean };
type DesignDetail = { versions: { number: number; createdAt: string }[]; shareUrl: string | null };

const ERROR_TEXT: Record<string, string> = {
  LIMIT_REACHED: 'Limite atingido (50 designs por conta, 100 versões por design).',
  INVALID_CONTENT: 'O canvas está vazio ou inválido pra salvar.',
  INVALID_NAME: 'Nome inválido (1 a 80 caracteres).',
};
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

function contextLabel(kind: DesignContextKind, id: string | null): string {
  if (kind === 'challenge') return `Desafio: ${(id && getProblem(id)?.title) ?? id}`;
  if (kind === 'incident') return `Incidente: ${(id && getIncident(id)?.title) ?? id}`;
  return 'Canvas livre';
}

export function DesignsMenu({
  open,
  onToggle,
  context,
  onOpen,
}: {
  open: boolean;
  onToggle: () => void;
  context: { kind: DesignContextKind; id: string | null };
  onOpen: (designId: string, version?: number) => void;
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const loadedPresetId = useCanvasStore((s) => s.loadedPresetId);
  const openDesign = useCanvasStore((s) => s.openDesign);
  const setOpenDesign = useCanvasStore((s) => s.setOpenDesign);

  const [designs, setDesigns] = useState<DesignSummary[] | null>(null);
  const [detail, setDetail] = useState<DesignDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshList = useCallback(async () => {
    const response = await fetch('/api/designs', { cache: 'no-store' }).catch(() => null);
    setDesigns(response?.ok ? ((await response.json()) as DesignSummary[]) : []);
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!openDesign) return setDetail(null);
    const response = await fetch(`/api/designs/${openDesign.id}`, { cache: 'no-store' }).catch(() => null);
    setDetail(response?.ok ? ((await response.json()) as DesignDetail) : null);
  }, [openDesign]);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    void refreshList();
    void refreshDetail();
  }, [open, refreshList, refreshDetail]);

  async function call(path: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
    const init: RequestInit =
      body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    const response = await fetch(path, init).catch(() => null);
    if (!response) return { ok: false, status: 0, data: null };
    const data = response.status === 204 ? null : ((await response.json().catch(() => null)) as Record<string, unknown> | null);
    return { ok: response.ok, status: response.status, data };
  }

  const fail = (data: Record<string, unknown> | null) =>
    setMessage(ERROR_TEXT[String(data?.error ?? '')] ?? (typeof data?.reason === 'string' ? data.reason : 'Não deu pra salvar agora — o rascunho continua neste navegador.'));

  async function saveAs() {
    const name = window.prompt('Nome do design:', openDesign ? `${openDesign.name} (cópia)` : '');
    if (name === null) return;
    setBusy(true);
    const content = toSavedCanvas(nodes, edges, loadedPresetId);
    const { ok, data } = await call('/api/designs', 'POST', { name, contextKind: context.kind, contextId: context.id, content });
    setBusy(false);
    if (!ok) return fail(data);
    setOpenDesign({ id: String(data!.id), name: name.trim() });
    setMessage('Design salvo (versão 1).');
    void refreshList();
  }

  async function save() {
    if (!openDesign) return saveAs();
    setBusy(true);
    const { ok, data } = await call(`/api/designs/${openDesign.id}/versions`, 'POST', { content: toSavedCanvas(nodes, edges, loadedPresetId) });
    setBusy(false);
    if (!ok) return fail(data);
    setMessage(data?.unchanged ? 'Nada mudou desde a última versão.' : `Versão ${String(data?.version)} salva.`);
    void refreshList();
    void refreshDetail();
  }

  async function rename(design: DesignSummary) {
    const name = window.prompt('Novo nome:', design.name);
    if (name === null) return;
    const { ok, data } = await call(`/api/designs/${design.id}`, 'PATCH', { name });
    if (!ok) return fail(data);
    if (openDesign?.id === design.id) setOpenDesign({ id: design.id, name: String(data?.name) });
    void refreshList();
  }

  async function remove(design: DesignSummary) {
    if (!window.confirm(`Apagar "${design.name}" e todas as versões? Isso não dá pra desfazer.`)) return;
    const { ok, data } = await call(`/api/designs/${design.id}`, 'DELETE');
    if (!ok) return fail(data);
    if (openDesign?.id === design.id) setOpenDesign(null);
    void refreshList();
  }

  async function share() {
    if (!openDesign) return;
    const { ok, data } = await call(`/api/designs/${openDesign.id}/share`, 'POST');
    if (!ok) return fail(data);
    const url = String(data?.shareUrl);
    setDetail((d) => d && { ...d, shareUrl: url });
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setMessage('Link copiado. Só quem tem conta consegue abrir.');
  }

  async function unshare() {
    if (!openDesign) return;
    const { ok, data } = await call(`/api/designs/${openDesign.id}/share`, 'DELETE');
    if (!ok) return fail(data);
    setDetail((d) => d && { ...d, shareUrl: null });
    setMessage('Link revogado — quem tinha o link não abre mais.');
  }

  const button = 'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800 disabled:text-zinc-600';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-violet-500"
      >
        <FolderOpen className="size-4 text-violet-400" aria-hidden />
        Meus designs
        <ChevronDown className="size-3.5 text-zinc-500" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-[70vh] w-96 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm shadow-xl">
          <p className="text-xs text-zinc-500">Aberto agora</p>
          <p className="mb-2 font-medium text-zinc-100">{openDesign?.name ?? 'Design não salvo'}</p>
          <div className="mb-2 flex flex-wrap gap-1">
            <button type="button" disabled={busy || nodes.length === 0} onClick={() => void save()} className={button}>
              <Save className="size-3.5" aria-hidden /> Salvar
            </button>
            <button type="button" disabled={busy || nodes.length === 0} onClick={() => void saveAs()} className={button}>
              <Save className="size-3.5" aria-hidden /> Salvar como…
            </button>
            {openDesign && (
              <button type="button" onClick={() => void (detail?.shareUrl ? unshare() : share())} className={button}>
                <Link2 className="size-3.5" aria-hidden /> {detail?.shareUrl ? 'Parar de compartilhar' : 'Compartilhar'}
              </button>
            )}
          </div>
          {detail?.shareUrl && <p className="mb-2 break-all rounded-md bg-zinc-950 p-2 text-xs text-violet-300">{detail.shareUrl}</p>}
          {message && <p className="mb-2 text-xs text-amber-300">{message}</p>}

          {openDesign && detail && detail.versions.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <History className="size-3.5" aria-hidden /> Histórico
              </p>
              <ul className="space-y-0.5">
                {[...detail.versions].reverse().map((v) => (
                  <li key={v.number} className="flex items-center justify-between text-xs text-zinc-300">
                    <span>
                      Versão {v.number} · {dateFormatter.format(new Date(v.createdAt))}
                    </span>
                    <button type="button" onClick={() => onOpen(openDesign.id, v.number)} className="text-violet-300 hover:text-violet-200">
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Meus designs</p>
          {designs === null ? (
            <p className="text-xs text-zinc-500">Carregando…</p>
          ) : designs.length === 0 ? (
            <p className="text-xs text-zinc-500">Nenhum design salvo ainda.</p>
          ) : (
            <ul className="space-y-1">
              {designs.map((design) => (
                <li key={design.id} className="flex items-center gap-1 rounded-md px-1 hover:bg-zinc-800">
                  <button type="button" onClick={() => onOpen(design.id)} className="flex-1 py-1.5 text-left">
                    <span className="block text-sm text-zinc-100">
                      {design.name}
                      {design.shared ? ' · compartilhado' : ''}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {contextLabel(design.contextKind, design.contextId)} · {design.versionCount} versões · {dateFormatter.format(new Date(design.updatedAt))}
                    </span>
                  </button>
                  <button type="button" onClick={() => void rename(design)} aria-label={`Renomear ${design.name}`} className="rounded p-1 text-zinc-500 hover:text-zinc-200">
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => void remove(design)} aria-label={`Apagar ${design.name}`} className="rounded p-1 text-zinc-500 hover:text-red-400">
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
