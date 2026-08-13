import { Database, Server, Shuffle, Users, Zap, type LucideIcon } from 'lucide-react';

interface DiagramNode {
  id: string;
  x: number;
  y: number;
  icon: LucideIcon;
  label: string;
  color: string;
  status: 'ok' | 'warn';
}

interface DiagramEdge {
  from: string;
  to: string;
}

// Diagrama de exemplo do hero — visual deliberadamente diferente de "caixa arredondada + tarja de
// acento + barra de utilização" (linguagem de um site de referência que o autor mostrou): aqui os
// nós são círculos com ícone real (lucide-react) e um badge de status, as conexões são
// ortogonais (cotovelo, não bezier suave) com seta, e o "tráfego" é uma animação de traço
// tracejado se deslocando (marching ants via CSS), não uma partícula viajando pela curva.
const NODES: DiagramNode[] = [
  { id: 'client', x: 60, y: 110, icon: Users, label: 'Client', color: '#38bdf8', status: 'ok' },
  { id: 'lb', x: 210, y: 110, icon: Shuffle, label: 'Load Balancer', color: '#34d399', status: 'ok' },
  { id: 'app1', x: 380, y: 55, icon: Server, label: 'App 1', color: '#f472b6', status: 'ok' },
  { id: 'app2', x: 380, y: 165, icon: Server, label: 'App 2', color: '#f472b6', status: 'ok' },
  { id: 'cache', x: 540, y: 110, icon: Zap, label: 'Cache', color: '#fbbf24', status: 'ok' },
  { id: 'db', x: 690, y: 110, icon: Database, label: 'SQL Primary', color: '#a78bfa', status: 'warn' },
];

const EDGES: DiagramEdge[] = [
  { from: 'client', to: 'lb' },
  { from: 'lb', to: 'app1' },
  { from: 'lb', to: 'app2' },
  { from: 'app1', to: 'cache' },
  { from: 'app2', to: 'cache' },
  { from: 'cache', to: 'db' },
];

const NODE_RADIUS = 24;

function elbowPath(from: DiagramNode, to: DiagramNode): string {
  if (from.y === to.y) {
    return `M${from.x + NODE_RADIUS},${from.y} H${to.x - NODE_RADIUS}`;
  }
  const midX = (from.x + to.x) / 2;
  return `M${from.x + NODE_RADIUS},${from.y} H${midX} V${to.y} H${to.x - NODE_RADIUS}`;
}

export function ArchitectureDiagram() {
  const nodesById = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-6">
      <svg
        viewBox="0 0 760 220"
        className="w-full"
        role="img"
        aria-label="Diagrama de exemplo: cliente passando por load balancer, dois app servers,
          cache e banco SQL primário — o banco está com o indicador em amarelo, sinalizando que
          está perto do limite de capacidade."
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#52525b" />
          </marker>
        </defs>

        {EDGES.map((edge) => {
          const from = nodesById[edge.from]!;
          const to = nodesById[edge.to]!;
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={elbowPath(from, to)}
              fill="none"
              stroke="#52525b"
              strokeWidth={1.5}
              strokeDasharray="6 6"
              markerEnd="url(#arrow)"
              style={{ animation: 'flow-dash 1.2s linear infinite' }}
            />
          );
        })}

        {NODES.map((node) => {
          const Icon = node.icon;
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill="#18181b"
                stroke={node.color}
                strokeWidth={1.5}
              />
              <Icon
                x={node.x - 11}
                y={node.y - 11}
                width={22}
                height={22}
                color={node.color}
                strokeWidth={1.75}
              />
              <circle
                cx={node.x + 17}
                cy={node.y - 17}
                r={4}
                fill={node.status === 'warn' ? '#f87171' : '#34d399'}
                stroke="#09090b"
                strokeWidth={1.5}
              />
              <text
                x={node.x}
                y={node.y + NODE_RADIUS + 16}
                textAnchor="middle"
                fontSize={9.5}
                fontFamily="var(--font-mono)"
                fill="#a1a1aa"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-4 text-center text-xs text-zinc-600">
        Exemplo ilustrativo — o SQL Primary está perto do limite: é aí que a latência começa a
        explodir.
      </p>
    </div>
  );
}
