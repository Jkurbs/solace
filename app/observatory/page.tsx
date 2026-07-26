import type { Metadata } from 'next';
import Link from 'next/link';

import { composeObservatorySnapshot } from '@/features/observatory/compose';
import type {
  InstrumentObservation,
  ObservatoryActivity,
  ObservatoryHealth,
} from '@/features/observatory/types';
import {
  OBSERVATORY_HERMES_LEDGER_PATH,
  OBSERVATORY_HERMES_PATH,
} from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';

export const metadata: Metadata = {
  title: 'Solace — Observatory',
  description:
    'Watch Solace instruments interact with their domains: status, state, activity, and health — not a trading terminal.',
};

export const revalidate = 60;

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
});

function formatActivityTime(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return timeFormatter.format(parsed);
}

function healthLabel(health: ObservatoryHealth) {
  switch (health.level) {
    case 'ok':
      return 'Live';
    case 'degraded':
      return 'Recent';
    case 'stale':
      return 'Stale';
    case 'static':
      return 'Snapshot';
    default:
      return 'Unknown';
  }
}

function InstrumentCard({ instrument }: { instrument: InstrumentObservation }) {
  return (
    <article
      id={instrument.id}
      className={`obs-card is-${instrument.status.phase} is-health-${instrument.health.level} scroll-mt-28`}
    >
      <header className="obs-card-head">
        <div className="obs-card-titles">
          <p className="obs-card-kicker">
            <span className={`obs-health is-${instrument.health.level}`}>
              {healthLabel(instrument.health)}
            </span>
            <span aria-hidden="true"> · </span>
            {instrument.status.label}
          </p>
          <h2 className="obs-card-name">
            <Link href={instrument.href}>{instrument.name}</Link>
          </h2>
          <p className="obs-card-summary">{instrument.summary}</p>
          {instrument.health.note ? (
            <p className="obs-card-health-note">{instrument.health.note}</p>
          ) : null}
        </div>
      </header>

      {instrument.state.length > 0 ? (
        <dl className="obs-state" aria-label={`${instrument.name} current state`}>
          {instrument.state.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>
                <strong>{field.value}</strong>
                {field.hint ? <span className="obs-state-hint">{field.hint}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="obs-activity-block">
        <p className="obs-activity-label">Recent activity</p>
        {instrument.activity.length > 0 ? (
          <ul className="obs-activity-list">
            {instrument.activity.map((event) => (
              <ActivityRow key={event.id} event={event} showInstrument={false} />
            ))}
          </ul>
        ) : (
          <p className="obs-activity-empty">No recent activity to show yet.</p>
        )}
      </div>

      <div className="obs-card-links">
        <Link href={instrument.href} className="obs-card-primary">
          Open {instrument.name} →
        </Link>
        {instrument.secondaryLinks?.map((link) =>
          link.href.startsWith('http') ? (
            <a key={link.href} href={link.href} className="obs-card-secondary">
              {link.label}
            </a>
          ) : (
            <Link key={link.href} href={link.href} className="obs-card-secondary">
              {link.label}
            </Link>
          ),
        )}
      </div>

      {instrument.disclosure ? (
        <p className="obs-card-disclosure">{instrument.disclosure}</p>
      ) : null}
    </article>
  );
}

function ActivityRow({
  event,
  showInstrument,
}: {
  event: ObservatoryActivity;
  showInstrument: boolean;
}) {
  const body = (
    <>
      <span className="obs-activity-time">{formatActivityTime(event.at)}</span>
      <span className="obs-activity-body">
        {showInstrument ? (
          <span className="obs-activity-instrument">{event.instrumentId}</span>
        ) : null}
        <span className="obs-activity-title">{event.title}</span>
        {event.detail ? <span className="obs-activity-detail">{event.detail}</span> : null}
      </span>
    </>
  );

  if (event.href) {
    if (event.href.startsWith('http')) {
      return (
        <li>
          <a href={event.href} className="obs-activity-row">
            {body}
          </a>
        </li>
      );
    }
    return (
      <li>
        <Link href={event.href} className="obs-activity-row">
          {body}
        </Link>
      </li>
    );
  }

  return <li className="obs-activity-row is-static">{body}</li>;
}

export default async function ObservatoryPage() {
  const snapshot = await composeObservatorySnapshot();

  return (
    <main className="obs-page">
      <header className="obs-header">
        <div className="obs-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <div className="obs-header-actions">
            <Link href={OBSERVATORY_HERMES_PATH} className="hx-btn hx-btn-secondary hx-btn-sm">
              Hermes
            </Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hx-btn hx-btn-secondary hx-btn-sm">
              Ledger
            </Link>
            <Link href="/gates" className="hx-btn hx-btn-primary hx-btn-sm">
              Gates
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="hx-shell obs-hero">
        <p className="section-kicker">Instrument board</p>
        <h1 className="obs-title">Observatory</h1>
        <p className="obs-dek">
          Every instrument continuously interacts with its domain. This board is how you watch those
          interactions — status, state, activity, and health. Not a trading terminal. Not a forced
          decision ledger for everything Solace builds.
        </p>
        <p className="obs-meta">
          Refreshed {formatActivityTime(snapshot.generatedAt)} · Hermes is live · others are
          snapshots or hand-marked by design
        </p>
      </section>

      <section className="hx-shell obs-grid-section" aria-label="Instruments">
        <div className="obs-grid">
          {snapshot.instruments.map((instrument) => (
            <InstrumentCard key={instrument.id} instrument={instrument} />
          ))}
        </div>
      </section>

      <section className="hx-shell obs-feed-section" aria-label="Recent activity across instruments">
        <div className="obs-feed-head">
          <p className="section-kicker">Across instruments</p>
          <h2 className="obs-feed-title">Recent activity</h2>
          <p className="obs-feed-dek">
            A merged feed of what is worth observing right now. Event kinds differ by instrument —
            that is intentional.
          </p>
        </div>
        {snapshot.recentActivity.length > 0 ? (
          <ul className="obs-activity-list obs-activity-list-merged">
            {snapshot.recentActivity.map((event) => (
              <ActivityRow key={event.id} event={event} showInstrument />
            ))}
          </ul>
        ) : (
          <p className="obs-activity-empty">Nothing to merge yet.</p>
        )}
      </section>

      <section className="hx-shell obs-honesty">
        <p className="section-kicker">How to read this</p>
        <ul className="obs-honesty-list">
          <li>
            <strong>Activity, not a single schema.</strong> Hermes may seal decisions; Glorya evaluates
            needs; Simulation clears gates. The container is shared. The events are not.
          </li>
          <li>
            <strong>Hermes decisions</strong> live on the{' '}
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="text-link">
              decision ledger
            </Link>{' '}
            under Observatory → Hermes — sealed, hash-chained, and checkable. A deep record for one
            instrument, not a separate Solace product.
          </li>
          <li>
            <strong>Live vs snapshot.</strong> Only Hermes pulls a live market artery. Oracle, Glorya,
            and Simulation show honest static or hand-marked state until their own feeds exist.
          </li>
          <li>
            <strong>Public-safe by design.</strong> No instruments, sizes, entries, or thresholds. Market
            read details live at{' '}
            <a href={DOCS_API_URL} className="text-link">
              docs.solace.fyi/api
            </a>
            .
          </li>
        </ul>
      </section>

      <section className="hx-shell">
        <div className="hx-foot">
          <p>Observatory · instruments interacting with their domains</p>
          <span className="obs-foot-actions">
            <ThemeToggle />
            <Link href="/#instruments" className="text-link">
              Return home
            </Link>
          </span>
        </div>
      </section>
    </main>
  );
}
