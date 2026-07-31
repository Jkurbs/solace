import { ImageResponse } from 'next/og';

import type { ActivePrediction } from '@/app/oracle/active-predictions';

import { OG_SIZE } from './og-plate';

export { OG_SIZE };

/**
 * Social share platter for one Oracle belief.
 * Mirrors the on-site belief card: probability-forward, paper light, Solace mark.
 * Satori: every multi-child node needs display:flex; avoid special unicode fonts.
 */
export function renderOracleBeliefShareImage(belief: ActivePrediction) {
  const pct = Math.round(belief.probability * 100);
  const conf = Math.round(belief.confidence * 100);
  const asset = belief.asset ? belief.asset.toUpperCase() : 'MARKET';
  const question =
    belief.question.length > 140 ? `${belief.question.slice(0, 137)}...` : belief.question;

  let deltaLine: string | null = null;
  if (belief.delta != null && Math.abs(belief.delta) >= 0.005) {
    const sign = belief.delta > 0 ? '+' : '';
    const points = `${sign}${Math.round(belief.delta * 100)}%`;
    deltaLine = belief.deltaWindow ? `${points} ${belief.deltaWindow}` : points;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafaf9',
          color: '#1c1917',
          padding: '48px 56px',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                width: 28,
                height: 28,
                marginRight: 12,
                borderRadius: 999,
                border: '1.5px solid #1c1917',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              S
            </div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Solace
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 16,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#a8a29e',
            }}
          >
            Oracle
          </div>
        </div>

        {/* Platter card */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            marginTop: 32,
            padding: '40px 44px',
            borderRadius: 24,
            border: '1px solid #e7e5e4',
            background: '#ffffff',
            boxShadow: '0 12px 40px rgba(28, 25, 23, 0.06)',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 16,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#a8a29e',
              }}
            >
              <div style={{ display: 'flex', marginRight: 10 }}>oracle believes</div>
              <div
                style={{
                  display: 'flex',
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid #e7e5e4',
                  background: '#fafaf9',
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  color: '#78716c',
                }}
              >
                {asset}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 18,
                fontSize: 40,
                fontWeight: 500,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                maxWidth: 720,
              }}
            >
              {question}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: 36,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid #e7e5e4',
                  background: '#fafaf9',
                  fontSize: 18,
                  color: '#57534e',
                }}
              >
                Confidence {conf}%
              </div>
              {deltaLine ? (
                <div
                  style={{
                    display: 'flex',
                    marginTop: 10,
                    fontSize: 18,
                    color: (belief.delta ?? 0) >= 0 ? '#3d6b4f' : '#9f3a3a',
                  }}
                >
                  {deltaLine}
                </div>
              ) : (
                <div style={{ display: 'flex', marginTop: 10, fontSize: 18, color: '#a8a29e' }}>
                  Sealed before the outcome is known
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 96,
                  fontWeight: 500,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {pct}%
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 6,
                  fontSize: 18,
                  color: '#a8a29e',
                  letterSpacing: '0.04em',
                }}
              >
                probability
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 28,
          }}
        >
          <div style={{ display: 'flex', fontSize: 18, color: '#78716c' }}>
            Cite a source, not an opinion
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: '#a8a29e',
              letterSpacing: '0.03em',
            }}
          >
            solace.fyi/oracle
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}

/** Fallback when a ticker cannot be loaded. */
export function renderOracleBeliefFallbackImage(ticker: string) {
  return renderOracleBeliefShareImage({
    id: ticker,
    question: 'Oracle belief',
    probability: 0.5,
    confidence: 0.6,
    updatedAt: new Date().toISOString(),
    resolvesAt: new Date().toISOString(),
    delta: null,
    deltaWindow: null,
    source: 'kalshi',
    ticker,
  });
}
