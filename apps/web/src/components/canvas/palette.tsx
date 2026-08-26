'use client';

import type { DragEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from '@sdp/engine';
import { COMPONENT_UI, CLIENT_UI } from '@/lib/canvas-ui-catalog';
import { CATEGORY_OF, PALETTE_CATEGORY_ORDER, type PaletteCategory } from '@/lib/component-categories';
import type { ClientVariant, FlowNodeData } from '@/lib/canvas-types';
import { useCanvasStore, type CanvasNode } from '@/stores/canvas-store';

// Prefixo usado pelo onDrop do canvas (T025) pra reconhecer o que foi arrastado da paleta —
// dataTransfer só carrega texto, então codificamos "component:tipo" ou "client:variante".
export const DRAG_MIME = 'text/plain';

function nextPositionNearCenter(existingCount: number): { x: number; y: number } {
  // Espalha nós adicionados por clique (sem drag) em uma grade simples, evitando empilhar tudo
  // exatamente no mesmo ponto — usado só pelo fallback de teclado/clique (FR-015).
  const col = existingCount % 4;
  const row = Math.floor(existingCount / 4);
  return { x: 80 + col * 200, y: 80 + row * 140 };
}

function buildNodeData(kind: 'component', componentType: ComponentType): FlowNodeData;
function buildNodeData(kind: 'client', variant: ClientVariant): FlowNodeData;
function buildNodeData(kind: 'component' | 'client', typeOrVariant: ComponentType | ClientVariant): FlowNodeData {
  return kind === 'component'
    ? { kind: 'component', componentType: typeOrVariant as ComponentType, replicas: 1 }
    : { kind: 'client', variant: typeOrVariant as ClientVariant };
}

type PaletteItemProps = {
  label: string;
  icon: LucideIcon;
  description: string;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onClick: () => void;
};

function PaletteItem({ label, icon: Icon, description, onDragStart, onClick }: PaletteItemProps) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-violet-500 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      title={`${label}\n\n${description}\n\nArraste para o canvas, ou clique para adicionar.`}
    >
      <Icon className="size-4 shrink-0 text-violet-400" />
      <span className="truncate">{label}</span>
    </button>
  );
}

// Todos os ComponentType agrupados por categoria, na ordem de COMPONENT_UI — calculado uma vez
// fora do componente (não depende de estado, mesmo dado a cada render).
const COMPONENT_TYPES_BY_CATEGORY: ReadonlyMap<PaletteCategory, ComponentType[]> = (() => {
  const map = new Map<PaletteCategory, ComponentType[]>();
  for (const type of Object.keys(COMPONENT_UI) as ComponentType[]) {
    const category = CATEGORY_OF[type];
    const list = map.get(category) ?? [];
    list.push(type);
    map.set(category, list);
  }
  return map;
})();

/**
 * Paleta lateral (FR-001/FR-006) — todo componente do engine + Cliente (mobile/web/desktop),
 * agrupados nas 9 categorias de `component-categories.ts` (M1.5, FR-001), na ordem de
 * `PALETTE_CATEGORY_ORDER`. onDragStart marca o payload arrastado (research.md §2 de M1); onClick
 * é o fallback acessível por teclado (FR-015/RNF-8) — adiciona o nó direto, sem precisar de
 * drag-and-drop.
 */
export function Palette() {
  const nodes = useCanvasStore((state) => state.nodes);
  const addNode = useCanvasStore((state) => state.addNode);

  function addViaClick(data: FlowNodeData) {
    const node: CanvasNode = {
      id: crypto.randomUUID(),
      type: data.kind,
      position: nextPositionNearCenter(nodes.length),
      data,
    };
    addNode(node);
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, payload: string) {
    event.dataTransfer.setData(DRAG_MIME, payload);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-3">
      {PALETTE_CATEGORY_ORDER.map((category) => {
        // Categoria "Client" é especial: suas entradas vêm de CLIENT_UI (variantes), não de
        // COMPONENT_UI — todo o resto vem de COMPONENT_TYPES_BY_CATEGORY.
        const isClientCategory = category === 'Client';
        const componentTypes = COMPONENT_TYPES_BY_CATEGORY.get(category) ?? [];
        if (!isClientCategory && componentTypes.length === 0) return null;

        return (
          <div key={category}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{category}</h2>
            <div className="flex flex-col gap-1.5">
              {isClientCategory &&
                (Object.keys(CLIENT_UI) as ClientVariant[]).map((variant) => (
                  <PaletteItem
                    key={variant}
                    label={CLIENT_UI[variant].label}
                    icon={CLIENT_UI[variant].icon}
                    description={CLIENT_UI[variant].description}
                    onDragStart={(e) => handleDragStart(e, `client:${variant}`)}
                    onClick={() => addViaClick(buildNodeData('client', variant))}
                  />
                ))}
              {componentTypes.map((type) => (
                <PaletteItem
                  key={type}
                  label={COMPONENT_UI[type].label}
                  icon={COMPONENT_UI[type].icon}
                  description={COMPONENT_UI[type].description}
                  onDragStart={(e) => handleDragStart(e, `component:${type}`)}
                  onClick={() => addViaClick(buildNodeData('component', type))}
                />
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

export { buildNodeData };
