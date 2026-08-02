import type { Metadata } from 'next';
import Link from 'next/link';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { composeObservatorySnapshot } from '@/features/observatory/compose';
import type { ObservatoryActivity, ObservatoryHealth } from '@/features/observatory/types';
import {
  OBSERVATORY_HERMES_LEDGER_PATH,
  OBSERVATORY_PATH,
} from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';

export const metadata: Metadata = {
  title: 'Solace · Observatory · Hermes',
  description:
    'Hermes in the Observatory: live status, current state, recent activity, and the decision ledger.',
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
  if (Number.isNaN(parsed.getTime())) return '-';
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

function ActivityRow({ event }: { event: ObservatoryActivity }) {
  const body = (
    <>
      <span className="obs-activity-time">{formatActivityTime(event.at)}</span>
      <span className="obs-activity-body">
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

export default async function ObservatoryHermesPage() {
  const snapshot = await composeObservatorySnapshot();
  const hermes = snapshot.instruments.find((instrument) => instrument.id === 'hermes');

  if (!hermes) {
    return null;
  }

  return (
    <main className="obs-page pt-16">
      <SiteHeader variant="product" />

      <section className="hx-shell obs-hero">
        <p className="section-kicker">
          <Link href={OBSERVATORY_PATH} className="text-link">
            Observatory
          </Link>
          <span aria-hidden="true"> · </span>
          Hermes
        </p>
        <h1 className="obs-title">Hermes</h1>
        <p className="obs-dek">
          Capital allocation under uncertainty: observed here as status, state, and activity. Decisions
          are one kind of Hermes activity; the sealed ledger is the deep record for that kind.
        </p>
        <p className="obs-meta">
          <span className={`obs-health is-${hermes.health.level}`}>{healthLabel(hermes.health)}</span>
          <span aria-hidden="true"> · </span>
          {hermes.status.label}
          {hermes.health.note ? (
            <>
              <span aria-hidden="true"> · </span>
              {hermes.health.note}
            </>
          ) : null}
        </p>
      </section>

      <section className="hx-shell obs-grid-section">
        <article className={`obs-card is-${hermes.status.phase} is-health-${hermes.health.level} obs-card-focus`}>
          <header className="obs-card-head">
            <p className="obs-card-summary">{hermes.summary}</p>
          </header>

          {hermes.state.length > 0 ? (
            <dl className="obs-state" aria-label="Hermes current state">
              {hermes.state.map((field) => (
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
            {hermes.activity.length > 0 ? (
              <ul className="obs-activity-list">
                {hermes.activity.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </ul>
            ) : (
              <p className="obs-activity-empty">No recent activity to show yet.</p>
            )}
          </div>

          {hermes.disclosure ? <p className="obs-card-disclosure">{hermes.disclosure}</p> : null}
        </article>

        <aside className="obs-card obs-deep-record" aria-label="Deep records">
          <p className="obs-card-kicker">Deep record</p>
          <h2 className="obs-feed-title" style={{ fontSize: '1.45rem' }}>
            Decision ledger
          </h2>
          <p className="obs-card-summary">
            Sealed rows before outcomes are known. Hash-chained, public, and checkable. This is how Hermes
            proves process, not a second Solace product outside the Observatory.
          </p>
          <div className="obs-card-links">
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="obs-card-primary">
              Open decision ledger →
            </Link>
            <a href={DOCS_API_URL} className="obs-card-secondary">
              Market API
            </a>
            <Link href="/hermes" className="obs-card-secondary">
              Product page
            </Link>
          </div>
        </aside>
      </section>

      <SiteFooter variant="product" />
    </main>
  );
}
