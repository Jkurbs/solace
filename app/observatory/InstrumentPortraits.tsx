'use client';

import type { ObservatoryInstrumentId } from '@/features/observatory/paths';

import type { GloryaChainData, HermesChainData, OracleChainData } from './ObservatoryExperience';

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'always',
  style: 'currency',
});

type Props = {
  instrument: ObservatoryInstrumentId;
  pending?: boolean;
  hermes: HermesChainData;
  oracle: OracleChainData;
  glorya: GloryaChainData;
  onSelect: (id: ObservatoryInstrumentId) => void;
};

/**
 * Instrument identity portraits for the Observatory selector.
 * Hermes uses the product phone card language; Oracle and Glorya share the
 * same device family with domain-true metrics (process, not performance theater).
 */
export default function InstrumentPortraits({
  instrument,
  pending = false,
  hermes,
  oracle,
  glorya,
  onSelect,
}: Props) {
  const openPaths = hermes.scoreboard.process.openPaths;
  const openLabel =
    openPaths === null ? '—' : openPaths === 1 ? '1 open' : `${openPaths} open`;
  const livePnl = hermes.openExposure?.unrealizedPnl ?? null;
  const liveHasExposure =
    livePnl !== null && Boolean(hermes.openExposure && hermes.openExposure.positions.length > 0);

  return (
    <div className="obs-portraits" role="tablist" aria-label="Choose an instrument">
      <button
        type="button"
        role="tab"
        id="obs-tab-hermes"
        aria-controls="obs-panel-hermes"
        aria-selected={instrument === 'hermes'}
        disabled={pending}
        className={`obs-portrait${instrument === 'hermes' ? ' is-selected' : ''}`}
        onClick={() => onSelect('hermes')}
      >
        <div className="obs-portrait-device is-hermes">
          <div className="obs-portrait-bezel">
            <div className="obs-portrait-screen">
              <div className="obs-portrait-bar">
                <span>Solace</span>
                <em>Live</em>
              </div>
              <div className="obs-portrait-body">
                <span className="obs-portrait-label">
                  {liveHasExposure ? 'Live open exposure' : 'Hermes · founder capital'}
                </span>
                <strong className="obs-portrait-value">
                  {liveHasExposure && livePnl !== null
                    ? pnlFormatter.format(livePnl)
                    : hermes.sealedDecisions.toLocaleString('en-US')}
                </strong>
                <span
                  className={`obs-portrait-delta${
                    liveHasExposure && livePnl !== null
                      ? livePnl > 0
                        ? ' is-pos'
                        : livePnl < 0
                          ? ' is-neg'
                          : ''
                      : ''
                  }`}
                >
                  {liveHasExposure && livePnl !== null
                    ? 'Unrealized · not a sealed row'
                    : 'Sealed decisions on chain'}
                </span>
                <div className="obs-portrait-rows">
                  <div>
                    <span>Posture</span>
                    <strong>{hermes.livePosture === '--' ? '—' : hermes.livePosture}</strong>
                  </div>
                  <div>
                    <span>Positions</span>
                    <strong>{openLabel}</strong>
                  </div>
                  <div>
                    <span>Standing down</span>
                    <strong>{hermes.standDownRate}</strong>
                  </div>
                </div>
                <div className="obs-portrait-cta">Inspect the chain</div>
              </div>
            </div>
          </div>
        </div>
        <span className="obs-portrait-caption">
          <strong>Hermes</strong>
          <em>Capital allocation · Live</em>
        </span>
      </button>

      <button
        type="button"
        role="tab"
        id="obs-tab-oracle"
        aria-controls="obs-panel-oracle"
        aria-selected={instrument === 'oracle'}
        disabled={pending}
        className={`obs-portrait${instrument === 'oracle' ? ' is-selected' : ''}`}
        onClick={() => onSelect('oracle')}
      >
        <div className="obs-portrait-device is-oracle">
          <div className="obs-portrait-bezel">
            <div className="obs-portrait-screen">
              <div className="obs-portrait-bar">
                <span>Solace</span>
                <em>Live</em>
              </div>
              <div className="obs-portrait-body">
                <span className="obs-portrait-label">Oracle · calibration</span>
                <strong className="obs-portrait-value">{oracle.brier.toFixed(2)}</strong>
                <span className="obs-portrait-delta">Brier score · lower is better</span>
                <div className="obs-portrait-rows">
                  <div>
                    <span>Resolved</span>
                    <strong>{oracle.resolved}</strong>
                  </div>
                  <div>
                    <span>Active</span>
                    <strong>{oracle.activeCount}</strong>
                  </div>
                  <div>
                    <span>Domain</span>
                    <strong>BTC / ETH</strong>
                  </div>
                </div>
                <div className="obs-portrait-cta">Inspect beliefs</div>
              </div>
            </div>
          </div>
        </div>
        <span className="obs-portrait-caption">
          <strong>Oracle</strong>
          <em>Belief under uncertainty · Live</em>
        </span>
      </button>

      <button
        type="button"
        role="tab"
        id="obs-tab-glorya"
        aria-controls="obs-panel-glorya"
        aria-selected={instrument === 'glorya'}
        disabled={pending}
        className={`obs-portrait${instrument === 'glorya' ? ' is-selected' : ''}`}
        onClick={() => onSelect('glorya')}
      >
        <div className="obs-portrait-device is-glorya">
          <div className="obs-portrait-bezel">
            <div className="obs-portrait-screen">
              <div className="obs-portrait-bar">
                <span>Solace</span>
                <em>Evaluating</em>
              </div>
              <div className="obs-portrait-body">
                <span className="obs-portrait-label">Glorya · need evaluation</span>
                <strong className="obs-portrait-value">
                  {Math.round(glorya.standDownRate * 100)}%
                </strong>
                <span className="obs-portrait-delta">Standing down · restraint first</span>
                <div className="obs-portrait-rows">
                  <div>
                    <span>Evaluated</span>
                    <strong>{glorya.evaluated}</strong>
                  </div>
                  <div>
                    <span>Standing down</span>
                    <strong>{glorya.standingDown}</strong>
                  </div>
                  <div>
                    <span>Sealed</span>
                    <strong>0</strong>
                  </div>
                </div>
                <div className="obs-portrait-cta">Inspect the chain</div>
              </div>
            </div>
          </div>
        </div>
        <span className="obs-portrait-caption">
          <strong>Glorya</strong>
          <em>Humanitarian capital · Evaluating</em>
        </span>
      </button>
    </div>
  );
}
