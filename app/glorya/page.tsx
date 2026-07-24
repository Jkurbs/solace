import type { Metadata } from 'next';
import Link from 'next/link';

import { gloryaEvaluatedNeeds, gloryaProcessScoreboard } from '@/features/glorya/evaluated-needs';
import { gloryaPlaceLabel } from '@/features/glorya/types';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';
import GloryaNeedField from '../GloryaNeedField';
import GloryaScrollNudge from './GloryaScrollNudge';

export const metadata: Metadata = {
  title: 'Solace — Glorya',
  description:
    'Glorya is Solace’s humanitarian instrument: capital only when need is verified and a real delivery path exists. Evaluating; dormant until the revenue gate. No live allocations.',
};

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  style: 'percent',
});

export default function GloryaPage() {
  const scoreboard = gloryaProcessScoreboard();
  const needs = gloryaEvaluatedNeeds;

  return (
    <main className="glorya-page">
      <GloryaScrollNudge />
      <header className="glorya-header">
        <div className="glorya-header-inner">
          <Link href="/" className="glorya-brand">
            <Mark size={20} />
            Solace
          </Link>
          <div className="glorya-header-actions">
            <Link href="/hermes" className="glorya-link">
              Hermes
            </Link>
            <Link href="/trust" className="glorya-link">
              Ledger
            </Link>
            <Link href="/#instruments" className="glorya-link">
              Instruments
            </Link>
          </div>
        </div>
      </header>

      <section className="glorya-stage" aria-label="Evaluated needs field">
        <div className="glorya-stage-copy">
          <p className="section-kicker">Instrument · designed</p>
          <h1 className="glorya-title">Glorya</h1>
          <p className="glorya-status">
            <span className="glorya-status-pill">Evaluating</span>
          </p>
          <p className="glorya-dek">
            Glorya is Solace’s humanitarian instrument. It does not fund a place because it appears on a map.
            It funds only when need is verified and money can actually become help: a partner who can deliver,
            access to the people in need, a workable environment, and the right window. Like Hermes in markets,
            stand down is the default. This field shows evaluations only. No live capital until the $1M
            revenue gate.
          </p>
          <div className="glorya-globe-legend">
            <span>
              <i className="glorya-legend-dot is-evaluated" /> Evaluated
            </span>
            <span>
              <i className="glorya-legend-dot is-standdown" /> Standing down
            </span>
          </div>
          <p className="glorya-globe-hint is-desktop">Drag to rotate · hover a city</p>
          <p className="glorya-globe-hint is-mobile">Drag to rotate · tap a city</p>
        </div>
        <div className="glorya-stage-globe">
          <GloryaNeedField needs={needs} />
          <a href="#glorya-body" className="glorya-scroll-cue">
            <span className="glorya-scroll-cue-label">Tap to scroll</span>
            <span className="glorya-scroll-cue-chevrons" aria-hidden="true">
              <i />
              <i />
            </span>
          </a>
        </div>
      </section>

      <section id="glorya-body" className="glorya-scoreboard" aria-label="Process scoreboard">
        <div className="glorya-scoreboard-head">
          <p className="section-kicker">Process</p>
          <h2>Evaluation scoreboard</h2>
          <p>
            Integrity and restraint first. Most evaluations stand down. Performance metrics wait for sealed outcomes
            after the first disbursement.
          </p>
        </div>
        <div className="glorya-score-grid">
          <div className="glorya-score-cell">
            <span>Evaluated needs</span>
            <strong>{scoreboard.evaluated}</strong>
            <em>On the map · design layer</em>
          </div>
          <div className="glorya-score-cell">
            <span>Active allocations</span>
            <strong>{scoreboard.active}</strong>
            <em>Live capital · none until gate</em>
          </div>
          <div className="glorya-score-cell">
            <span>Completed outcomes</span>
            <strong>{scoreboard.completed}</strong>
            <em>No sealed completions yet</em>
          </div>
          <div className="glorya-score-cell">
            <span>Standing-down rate</span>
            <strong>{percentFormatter.format(scoreboard.standDownRate)}</strong>
            <em>
              {scoreboard.standingDown} of {scoreboard.evaluated} not funded
            </em>
          </div>
          <div className="glorya-score-cell">
            <span>Calibration</span>
            <strong>—</strong>
            <em>Predicted vs actual after first outcomes</em>
          </div>
        </div>
      </section>

      <section className="glorya-ledger-section" aria-label="Glorya decision ledger">
        <div className="glorya-ledger-head">
          <p className="section-kicker">Public ledger</p>
          <h2>Glorya decision ledger</h2>
          <p>
            First disbursement seals the first row. Until then the sheet is empty by design — not a hidden history.
          </p>
        </div>
        <div className="glorya-ledger-table-wrap">
          <table className="glorya-ledger-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Place</th>
                <th>Amount</th>
                <th>Need</th>
                <th>Partner</th>
                <th>Predicted</th>
                <th>Actual</th>
                <th>Status</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              <tr className="glorya-ledger-empty">
                <td colSpan={10}>
                  No sealed Glorya rows. Instrument is evaluating only. The live ledger begins with the first
                  disbursement after the revenue gate.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="glorya-framework" aria-label="How Glorya decides">
        <div className="glorya-framework-grid">
          <div>
            <p className="section-kicker">How it decides</p>
            <h2>Need is not enough. The path has to hold.</h2>
            <p>
              Hermes asks whether markets can carry a trade. Glorya asks whether capital can become real
              help on the ground. The method is the same: gates before money moves, evidence over story,
              stand down when the chain is broken. The domain is different: humanitarian need, not liquidity.
            </p>
            <p className="glorya-framework-note">
              Deploy only when need and path both pass. Most evaluations result in no allocation.
            </p>
          </div>
          <div>
            <h3>What “path” means</h3>
            <ul>
              <li>
                <strong>Partners</strong> — who delivers on the ground with capacity and integrity, not a
                place name alone
              </li>
              <li>
                <strong>Access</strong> — whether that partner can reach the people in need (logistics,
                permissions, last mile)
              </li>
              <li>
                <strong>Regime</strong> — whether the environment is stable enough for aid to land and stick —
                not diverted, frozen, or made unsafe
              </li>
              <li>
                <strong>Timing</strong> — whether this is the right window: crisis open, partners ready,
                capital ready — not already past
              </li>
            </ul>
          </div>
          <div>
            <h3>Three gates before capital</h3>
            <ul>
              <li>
                <strong>Need</strong> — is the need severe enough and verifiable, not rumor or headline
                alone?
              </li>
              <li>
                <strong>Path</strong> — do partners and access exist so money can become delivery?
              </li>
              <li>
                <strong>Regime &amp; timing</strong> — can the environment and the window support a successful
                intervention now?
              </li>
            </ul>
            <h3 className="glorya-framework-subhead">Then the lifecycle</h3>
            <ul>
              <li>
                <strong>Selection</strong> — where attention is warranted
              </li>
              <li>
                <strong>Commitment</strong> — whether evidence is strong enough to allocate
              </li>
              <li>
                <strong>Monitoring</strong> — whether evidence still holds after money moves
              </li>
              <li>
                <strong>Exit / recycle</strong> — stay, reduce, or redirect when conditions change
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="glorya-evaluations" aria-label="Current evaluations">
        <div className="glorya-evaluations-head">
          <p className="section-kicker">Design layer</p>
          <h2>Evaluated places</h2>
          <p>
            Real cities and countries with WGS84 coordinates. Illustrative evaluations only — not offers, transfers,
            or impact claims.
          </p>
        </div>
        <ul className="glorya-eval-list">
          {needs.map((need) => (
            <li key={need.id} className={`is-${need.status}`}>
              <div>
                <strong>{gloryaPlaceLabel(need)}</strong>
                <span>{need.id}</span>
              </div>
              <p>{need.note}</p>
              <div className="glorya-eval-meta">
                <span>
                  {need.lat.toFixed(2)}°, {need.lon.toFixed(2)}°
                </span>
                <span>{need.focus}</span>
                <span>Need {need.needScore.toFixed(2)}</span>
                <span>{need.regime}</span>
                <span>{need.status === 'standing_down' ? 'Standing down' : 'Evaluated'}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="glorya-foot">
        <p>Glorya · Solace instrument · evaluating</p>
        <span className="glorya-foot-actions">
          <ThemeToggle />
          <Link href="/" className="glorya-link">
            Return home
          </Link>
        </span>
      </footer>
    </main>
  );
}
