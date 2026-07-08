import type { Metadata } from 'next';
import Link from 'next/link';

import ReliabilityDiagram from '../ReliabilityDiagram';
import Mark from '../Mark';
import { calibration } from '../calibration';
import QuestionPlate from './QuestionPlate';
import { getQuestionRead, resolvedQuestions } from './resolved-questions';

export const metadata: Metadata = {
  title: 'Solace — Oracle · Calibration Record',
  description:
    'The Oracle weighs the futures and keeps score. Calibration record: every probability scored against what actually happened. No performance claims.',
};

// Re-evaluate the freshness gate hourly instead of freezing it at build time.
export const revalidate = 3600;

const FRESH_RECORD_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function OraclePage() {
  const overconfidence = calibration.averageProbability - calibration.actualWinRate;
  // Freshness contract, same as the homepage telemetry: the pulsing badge
  // only renders while the record is recent — never a fake pulse.
  const recordAge = Date.now() - new Date(calibration.asOf).getTime();
  const isFresh = Number.isFinite(recordAge) && recordAge >= 0 && recordAge <= FRESH_RECORD_MAX_AGE_MS;

  return (
    <main className="hx-page oracle-page relative min-h-screen overflow-x-hidden text-foreground">
      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <Link href="/" className="hx-btn hx-btn-secondary hx-btn-sm">
            Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-5 pb-24 pt-36 md:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <p className="section-kicker">The second instrument</p>
          {isFresh ? (
            <span className="live-badge">
              <span className="live-dot" aria-hidden="true" />
              Live record
            </span>
          ) : (
            <span className="record-badge">Record · as of {calibration.asOf}</span>
          )}
        </div>

        <h1 className="mt-5 max-w-3xl font-serif text-5xl font-medium leading-tight md:text-7xl">
          The Oracle keeps score.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          The Oracle estimates the probability of real events, records each estimate before the
          outcome is known, and scores it against what actually happened. This page is that score —
          shown in full, wins and misses alike.
        </p>
        <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted">
          Source: live Kalshi event markets · Updated {calibration.asOf} · No performance claims
        </p>

        {resolvedQuestions.length > 0
          ? (() => {
              const featured = resolvedQuestions[0];
              const read = getQuestionRead(featured);

              return (
                <article className="oracle-qhero" aria-label="Most recently resolved question">
                  <QuestionPlate seed={featured.id} />
                  <div className="oracle-qhero-scrim" aria-hidden="true" />
                  <div className="oracle-qhero-content">
                    <div className="oracle-qhero-chips">
                      <span className="inst-chip">{featured.category}</span>
                      <span className={`inst-chip ${featured.outcome === 'YES' ? 'is-live' : 'is-idle'}`}>
                        Resolved · {featured.outcome === 'YES' ? 'Yes' : 'No'}
                      </span>
                      <span className={`inst-chip ${read === 'Humbling' ? 'is-cal' : read === 'Sharp call' ? 'is-teal' : ''}`}>
                        {read}
                      </span>
                      {featured.illustrative ? (
                        <span
                          className="inst-chip is-cal"
                          title="Sample card — real resolved questions connect when the Oracle feed ships."
                        >
                          Illustrative
                        </span>
                      ) : null}
                    </div>
                    <h2 className="oracle-qhero-question">{featured.question}</h2>
                    <div className="oracle-qhero-foot">
                      <div className="oracle-qhero-prob">
                        <em>Oracle said</em>
                        <strong>{Math.round(featured.probability * 100)}%</strong>
                      </div>
                      <span className="oracle-qhero-dates">
                        Recorded {featured.recordedAt} · Resolved {featured.resolvedAt}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })()
          : null}

        <div className="oracle-statband">
          <div>
            <span>Resolved</span>
            <strong>{calibration.resolved}</strong>
          </div>
          <div>
            <span>Brier score</span>
            <strong>{calibration.brier.toFixed(2)}</strong>
            <em>lower is better · coin-flip = 0.25</em>
          </div>
          <div>
            <span>Predicted</span>
            <strong>{pct(calibration.averageProbability)}</strong>
            <em>average confidence</em>
          </div>
          <div>
            <span>Actual</span>
            <strong>{pct(calibration.actualWinRate)}</strong>
            <em>observed rate</em>
          </div>
        </div>

        <section className="mt-20 grid gap-12 border-t border-white/10 pt-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <ReliabilityDiagram size="lg" />
          <div>
            <h2 className="font-serif text-3xl font-medium md:text-4xl">How to read it</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-muted">
              <p>
                Each dot is a band of predictions grouped by confidence. Its position is the average
                probability we assigned (across) versus how often those events actually resolved yes
                (up). Dot size is the number of resolved predictions in the band.
              </p>
              <p>
                The dashed line is perfect calibration — where a stated 70% comes true 70% of the
                time. Dots <strong className="text-foreground">below</strong> the line mean we were
                overconfident; <strong className="text-foreground">above</strong> means too cautious.
              </p>
              <p>
                Today the Oracle runs overconfident: it predicts {pct(calibration.averageProbability)} on
                average, and {pct(calibration.actualWinRate)} actually happens — a gap of{' '}
                {Math.round(overconfidence * 100)} points. We show it because a record you can check
                is worth more than a number you have to trust.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-12">
          <h2 className="font-serif text-3xl font-medium md:text-4xl">The record, by confidence band</h2>
          <div className="oracle-table" role="table" aria-label="Calibration by confidence band">
            <div className="oracle-table-head" role="row">
              <span role="columnheader">Confidence band</span>
              <span role="columnheader">Predicted</span>
              <span role="columnheader">Actual</span>
              <span role="columnheader">Resolved</span>
              <span role="columnheader">Read</span>
            </div>
            {calibration.buckets.map((b) => {
              const gap = b.predicted - b.actual;
              const read = Math.abs(gap) < 0.06 ? 'On line' : gap > 0 ? 'Overconfident' : 'Cautious';
              return (
                <div className="oracle-table-row" role="row" key={b.range}>
                  <span role="cell">{b.range}</span>
                  <span role="cell">{pct(b.predicted)}</span>
                  <span role="cell">{pct(b.actual)}</span>
                  <span role="cell">{b.count}</span>
                  <span role="cell" className={`oracle-read read-${read.toLowerCase().replace(' ', '-')}`}>
                    {read}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            Bands with no predictions are omitted · {calibration.resolved} resolved across{' '}
            {calibration.buckets.length} bands
          </p>
        </section>

        <section className="mt-20 grid gap-12 border-t border-white/10 pt-12 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl font-medium md:text-4xl">How the Oracle works</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-muted">
              <p>
                For each open question on a live event market, the Oracle builds an order-book view and
                produces a probability. That estimate is timestamped and stored before the market
                resolves, so the record cannot be edited after the fact.
              </p>
              <p>
                When the world answers, the outcome is scored against the estimate. The running Brier
                score and the calibration curve above are the only résumé the Oracle keeps.
              </p>
            </div>
          </div>
          <div>
            <h2 className="font-serif text-3xl font-medium md:text-4xl">What this is, and is not</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-muted">
              <p>
                This is a young record — {calibration.resolved} resolved predictions is enough to show
                a tendency, not to prove a track record. The sample will grow, and these numbers will
                move; some bands rest on a handful of events.
              </p>
              <p>
                Nothing here is a performance claim, investment advice, or an offer of advisory
                services. It is a measurement of one system&rsquo;s calibration, published as it stands.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-20 flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
            Oracle · Live calibration · {calibration.asOf}
          </p>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </article>
    </main>
  );
}
