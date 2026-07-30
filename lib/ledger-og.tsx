import { ImageResponse } from 'next/og';

import { formatPercent } from '@/features/hermes-ledger/scoreboard';
import type { LedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
import { hermesVersion } from '@/features/hermes-version';

import { OG_SIZE } from './og-plate';

export { OG_SIZE };

const ledgerOgUrl = 'solace.fyi/observatory/hermes/ledger';

/**
 * Social share card for the public decision ledger.
 * Process metrics first — sealed record, not a performance ad.
 */
export function renderLedgerShareImage(scoreboard: LedgerScoreboard) {
  const { process } = scoreboard;
  const openLabel = process.openPaths === null ? '—' : String(process.openPaths);
  const standDown = formatPercent(process.standDownRate);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#fafaf9',
          color: '#1c1917',
          padding: '56px 64px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: '1.5px solid #1c1917',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}
            >
              ✦
            </div>
            Solace
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 18,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#78716c',
            }}
          >
            Hermes · Decision ledger
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 52,
              fontWeight: 500,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            Sealed before the outcome is known.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 36,
          }}
        >
          <Metric label="Sealed decisions" value={String(process.sealedDecisions)} />
          <Metric label="Open · closed" value={`${openLabel} · ${process.closedPaths}`} />
          <Metric label="Standing down" value={standDown} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 40,
            borderTop: '1px solid #e7e5e4',
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 20, color: '#44403c' }}>Founder capital · checkable chain</div>
            <div style={{ fontSize: 18, color: '#a8a29e' }}>{hermesVersion.label} · young sample</div>
          </div>
          <div
            style={{
              fontSize: 20,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: '#57534e',
              letterSpacing: '0.04em',
            }}
          >
            {ledgerOgUrl}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
    },
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
        padding: '22px 24px',
        borderRadius: 12,
        border: '1px solid #e7e5e4',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          fontSize: 14,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#a8a29e',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}
