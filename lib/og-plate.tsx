import { ImageResponse } from 'next/og';

import {
  PLATE_TINTS,
  type PlateTint,
  buildReading,
  filamentPathD,
} from './note-plate';

export const OG_SIZE = { width: 1200, height: 630 };

// The note's signature plate as a social card, drawn by the same seeded
// system as the on-site covers. No text: og:title carries the words.
export function renderPlateImage(seed: string, tintName: PlateTint) {
  const tint = PLATE_TINTS[tintName];
  const W = OG_SIZE.width;
  const H = OG_SIZE.height;
  const reading = buildReading(seed);

  const leadFilament = reading.filaments.find((f) => f.lead) ?? reading.filaments[0];
  const nx = reading.node.x * W;
  const ny = reading.node.y * H;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0a0a09',
        }}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {reading.dust.map((speck, index) => (
            <circle
              key={`dust-${index}`}
              cx={speck.x * W}
              cy={speck.y * H}
              r={speck.r * 2}
              fill={`rgba(${speck.cold ? '184,190,199' : tint.dust},${speck.a})`}
            />
          ))}

          <path
            d={filamentPathD(reading, leadFilament, W, H)}
            fill="none"
            stroke={`rgba(${tint.glow},0.1)`}
            strokeWidth={30}
            strokeLinecap="round"
          />
          <path
            d={filamentPathD(reading, leadFilament, W, H)}
            fill="none"
            stroke={`rgba(${tint.glow},0.22)`}
            strokeWidth={10}
            strokeLinecap="round"
          />

          {reading.filaments.map((filament, index) => (
            <path
              key={`fil-${index}`}
              d={filamentPathD(reading, filament, W, H)}
              fill="none"
              stroke={`rgba(${tint.core},${filament.alpha})`}
              strokeWidth={filament.lead ? 2.6 : 1.6}
            />
          ))}

          <circle cx={nx} cy={ny} r={130} fill={`rgba(${tint.glow},0.07)`} />
          <circle cx={nx} cy={ny} r={64} fill={`rgba(${tint.glow},0.16)`} />
          <circle cx={nx} cy={ny} r={26} fill={`rgba(${tint.glow},0.4)`} />
          <circle cx={nx} cy={ny} r={10} fill={`rgba(${tint.core},0.9)`} />

          {(
            [
              [34, 34, 1, 1],
              [W - 34, 34, -1, 1],
              [34, H - 34, 1, -1],
              [W - 34, H - 34, -1, -1],
            ] as Array<[number, number, number, number]>
          ).map(([x, y, sx, sy], index) => (
            <path
              key={`ret-${index}`}
              d={`M${x + sx * 26},${y} L${x},${y} L${x},${y + sy * 26}`}
              fill="none"
              stroke="rgba(236,238,240,0.35)"
              strokeWidth={3}
            />
          ))}
        </svg>
      </div>
    ),
    OG_SIZE,
  );
}
