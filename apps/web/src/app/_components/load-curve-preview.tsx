interface Callout {
  x: number;
  y: number;
  load: string;
  latency: string;
  color: string;
  anchor: 'start' | 'middle' | 'end';
}

// Curva de latência em função da utilização (M/M/1: W = 1/(μ−λ), research.md do M0 §3) — o
// "momento aha" do produto (product-context.md §2): carga sobe, latência fica praticamente plana
// até um ponto, depois dispara. Visual próprio (curva + callouts), deliberadamente diferente da
// linguagem de "canvas com caixas conectadas" — aqui o gancho é o gráfico, não um mockup de nós.
function buildCurvePath(): string {
  const points: Array<[number, number]> = [];
  const width = 620;
  const height = 160;
  const baseline = 150;
  for (let i = 0; i <= 60; i++) {
    const u = i / 60; // utilização de 0 a ~0.985
    const x = 40 + u * width;
    const latency = 1 / (1 - u * 0.985); // explode perto de u=1
    const y = baseline - Math.min(latency * 10, height);
    points.push([x, y]);
  }
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

const CURVE_PATH = buildCurvePath();

const CALLOUTS: Callout[] = [
  { x: 140, y: 128, load: '40% carga', latency: '12ms', color: '#34d399', anchor: 'middle' },
  { x: 380, y: 108, load: '75% carga', latency: '45ms', color: '#fbbf24', anchor: 'middle' },
  { x: 590, y: 40, load: '95% carga', latency: '280ms', color: '#f87171', anchor: 'end' },
];

export function LoadCurvePreview() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-6">
      <svg
        viewBox="0 0 700 190"
        className="w-full"
        role="img"
        aria-label="Gráfico mostrando latência praticamente plana enquanto a carga sobe até 75% de
          utilização, depois disparando exponencialmente perto de 95% de utilização — o mesmo
          comportamento de fila M/M/1 que o engine calcula."
      >
        {/* eixos */}
        <line x1={40} y1={150} x2={660} y2={150} stroke="#3f3f46" strokeWidth={1} />
        <line x1={40} y1={10} x2={40} y2={150} stroke="#3f3f46" strokeWidth={1} />
        <text x={660} y={168} textAnchor="end" fontSize={10} fill="#71717a">
          carga →
        </text>
        <text x={30} y={14} textAnchor="end" fontSize={10} fill="#71717a">
          latência ↑
        </text>

        <path d={CURVE_PATH} fill="none" stroke="#8b5cf6" strokeWidth={2} />
        <circle r={4} fill="#c4b5fd">
          <animateMotion dur="4s" repeatCount="indefinite" path={CURVE_PATH} />
        </circle>

        {CALLOUTS.map((c) => (
          <g key={c.load}>
            <circle cx={c.x} cy={c.y} r={3.5} fill={c.color} />
            <text
              x={c.x}
              y={c.y - 10}
              textAnchor={c.anchor}
              fontSize={10.5}
              fontFamily="var(--font-mono)"
              fill={c.color}
            >
              {c.load} · {c.latency}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-4 text-center text-xs text-zinc-600">
        Exemplo ilustrativo — o mesmo componente aguenta 40% de carga tranquilo e desmorona perto
        de 95%. É esse ponto de virada que o engine calcula pra cada peça do seu design.
      </p>
    </div>
  );
}
