interface NodeSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string | [string, string];
  accent: string;
  fillPct: number;
  barColor: string;
}

// Cada nó: caixa escura arredondada + tarja de acento colorida por tipo de componente + barra de
// utilização abaixo do rótulo — mesma linguagem visual de um canvas de arquitetura real (fiel ao
// que o produto de fato entrega no M1: nós, conexões, carga fluindo). Estático e leve — só SVG +
// <animateMotion>, sem JS/bibliotecas de animação.
const NODES: NodeSpec[] = [
  { x: 20, y: 90, w: 70, h: 40, label: 'Client', accent: '#38bdf8', fillPct: 0.4, barColor: '#34d399' },
  {
    x: 150,
    y: 90,
    w: 90,
    h: 40,
    label: ['Load', 'Balancer'],
    accent: '#34d399',
    fillPct: 0.45,
    barColor: '#34d399',
  },
  { x: 330, y: 30, w: 80, h: 40, label: 'App 1', accent: '#f472b6', fillPct: 0.5, barColor: '#34d399' },
  { x: 330, y: 150, w: 80, h: 40, label: 'App 2', accent: '#f472b6', fillPct: 0.35, barColor: '#34d399' },
  { x: 500, y: 90, w: 80, h: 40, label: 'Cache', accent: '#fbbf24', fillPct: 0.55, barColor: '#34d399' },
  {
    x: 650,
    y: 90,
    w: 90,
    h: 40,
    label: ['SQL', 'Primary'],
    accent: '#a78bfa',
    fillPct: 0.92,
    barColor: '#f87171',
  },
];

const EDGES = [
  'M90,110 C120,110 120,110 150,110',
  'M240,110 C285,110 285,50 330,50',
  'M240,110 C285,110 285,170 330,170',
  'M410,50 C455,50 455,110 500,110',
  'M410,170 C455,170 455,110 500,110',
  'M580,110 C615,110 615,110 650,110',
];

export function ArchitecturePreview() {
  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-6">
      <svg
        viewBox="0 0 760 220"
        className="w-full"
        role="img"
        aria-label="Diagrama de exemplo: cliente passando por load balancer, dois app servers, cache e banco SQL, com tráfego animado fluindo entre os nós e uma barra de utilização quase saturada no banco de dados."
      >
        {EDGES.map((d) => (
          <path key={d} d={d} fill="none" stroke="#27272a" strokeWidth={1.5} />
        ))}
        {EDGES.map((d, i) => (
          <circle key={d} r={3} fill="#34d399">
            <animateMotion
              dur={`${2 + i * 0.35}s`}
              begin={`${i * 0.25}s`}
              repeatCount="indefinite"
              path={d}
            />
          </circle>
        ))}

        {NODES.map((node) => {
          const barWidth = node.w - 16;
          const key = Array.isArray(node.label) ? node.label.join('-') : node.label;
          return (
            <g key={key}>
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx={8}
                fill="#09090b"
                stroke="#3f3f46"
                strokeWidth={1.5}
              />
              <rect
                x={node.x}
                y={node.y + 3}
                width={3}
                height={node.h - 6}
                rx={1.5}
                fill={node.accent}
              />
              {Array.isArray(node.label) ? (
                <text
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2 - 3}
                  textAnchor="middle"
                  fontSize={8.5}
                  fill="#a1a1aa"
                  fontFamily="var(--font-mono)"
                >
                  <tspan x={node.x + node.w / 2} dy={0}>
                    {node.label[0]}
                  </tspan>
                  <tspan x={node.x + node.w / 2} dy={10}>
                    {node.label[1]}
                  </tspan>
                </text>
              ) : (
                <text
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2 + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#a1a1aa"
                  fontFamily="var(--font-mono)"
                >
                  {node.label}
                </text>
              )}
              <rect
                x={node.x + 8}
                y={node.y + node.h - 8}
                width={barWidth}
                height={2.5}
                rx={1.25}
                fill="#27272a"
              />
              <rect
                x={node.x + 8}
                y={node.y + node.h - 8}
                width={barWidth * node.fillPct}
                height={2.5}
                rx={1.25}
                fill={node.barColor}
              />
            </g>
          );
        })}
      </svg>
      <p className="mt-4 text-center text-xs text-zinc-600">
        Exemplo ilustrativo — o SQL Primary está em 92% de utilização: é aí que a latência começa
        a explodir.
      </p>
    </div>
  );
}
