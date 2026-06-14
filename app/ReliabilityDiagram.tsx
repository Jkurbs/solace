import { calibration } from './calibration';

// Static reliability diagram: predicted probability (x) vs. observed rate (y),
// against the diagonal of perfect calibration. Dots below the line run
// overconfident; dot area scales with sample count. Pure SVG, no client JS.
const W = 340;
const H = 322;
const L = 44;
const R = 322;
const T = 16;
const B = 268;
const pw = R - L;
const ph = B - T;

const px = (p: number) => L + p * pw;
const py = (a: number) => B - a * ph;

const maxCount = Math.max(...calibration.buckets.map((b) => b.count));
const radius = (c: number) => 4 + Math.sqrt(c / maxCount) * 9;

const ticks = [0, 0.25, 0.5, 0.75, 1];
const labelTicks = [0, 0.5, 1];

export default function ReliabilityDiagram({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <figure className={`reliability${size === 'lg' ? ' reliability-lg' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Oracle calibration reliability diagram">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={px(t)} y1={T} x2={px(t)} y2={B} className="rel-grid" />
            <line x1={L} y1={py(t)} x2={R} y2={py(t)} className="rel-grid" />
          </g>
        ))}

        <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} className="rel-diagonal" />

        {calibration.buckets.map((b, i) => (
          <circle key={i} cx={px(b.predicted)} cy={py(b.actual)} r={radius(b.count)} className="rel-dot" />
        ))}

        {labelTicks.map((t) => (
          <text key={`x-${t}`} x={px(t)} y={B + 16} className="rel-axis" textAnchor="middle">
            {Math.round(t * 100)}
          </text>
        ))}
        {labelTicks.map((t) => (
          <text key={`y-${t}`} x={L - 8} y={py(t) + 3} className="rel-axis" textAnchor="end">
            {Math.round(t * 100)}
          </text>
        ))}

        <text x={(L + R) / 2} y={H - 2} className="rel-axis-title" textAnchor="middle">
          PREDICTED %
        </text>
        <text
          x={11}
          y={(T + B) / 2}
          className="rel-axis-title"
          textAnchor="middle"
          transform={`rotate(-90 11 ${(T + B) / 2})`}
        >
          ACTUAL %
        </text>
      </svg>
      <figcaption className="rel-legend">
        <span><span className="rel-key-line" aria-hidden="true" /> perfect calibration</span>
        <span><span className="rel-key-dot" aria-hidden="true" /> our record · size = sample count</span>
      </figcaption>
    </figure>
  );
}
