import type { Metadata } from 'next';
import Link from 'next/link';

import { calibration } from '@/app/calibration';
import {
  gateDomains,
  gateRevisions,
  gatesLastUpdated,
  gatesVersion,
  gateStatusLabels,
  summarizeAllGates,
} from '@/features/gates/conditions';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';

export const metadata: Metadata = {
  title: 'Solace — Gate Conditions',
  description:
    'Public, checkable gate conditions for Simulation and Autonomy. Domains are earned, not declared.',
};

const updatedFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const verificationLinks = [
  {
    label: 'Decision Ledger',
    href: '/trust',
    note: 'Sealed Hermes decisions before outcomes are known. Process discipline in public.',
  },
  {
    label: 'Oracle calibration',
    href: '/oracle',
    note: `Resolved questions scored in full. Current sample: ${calibration.resolved} questions, Brier ${calibration.brier.toFixed(2)}.`,
  },
  {
    label: 'Technical brief §07',
    href: '/brief#section-07',
    note: 'Horizon definitions and gate philosophy in the versioned brief.',
  },
];

function formatUpdatedAt(value: string) {
  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? value : updatedFormatter.format(parsed);
}

export default function GatesPage() {
  const domainSummaries = summarizeAllGates();

  return (
    <main className="hx-page gates-page">
      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <div className="gates-header-actions">
            <Link href="/brief" className="hx-btn hx-btn-secondary hx-btn-sm">
              Brief
            </Link>
            <Link href="/hermes" className="hx-btn hx-btn-primary hx-btn-sm">
              Hermes
            </Link>
          </div>
        </div>
      </header>

      <section className="hx-shell gates-hero">
        <p className="section-kicker">Earned, not declared</p>
        <h1 className="gates-title">Gate conditions</h1>
        <p className="gates-dek">
          Simulation and Autonomy stay gated until explicit, checkable conditions clear. This board is the public
          record of where each gate stands — not a roadmap promise.
        </p>
        <p className="gates-meta">
          Board version {gatesVersion} · Last updated {formatUpdatedAt(gatesLastUpdated)}
        </p>
      </section>

      <section className="hx-shell gates-summary-section">
        <div className="gates-summary-grid">
          {domainSummaries.map(({ domain, summary }) => (
            <div key={domain.id} className="gates-summary-card">
              <span className="gates-summary-phase">{domain.phase}</span>
              <h2>{domain.name}</h2>
              <p>
                {summary.met} met · {summary.partial} partial · {summary.not_met} not met
              </p>
            </div>
          ))}
        </div>
      </section>

      {gateDomains.map((domain) => {
        const summary = domainSummaries.find((entry) => entry.domain.id === domain.id)?.summary;

        return (
          <section key={domain.id} id={domain.id} className="hx-shell gates-domain-section scroll-mt-28">
            <div className="gates-domain-head">
              <div>
                <p className="section-kicker">{domain.phase}</p>
                <h2 className="gates-domain-title">{domain.name}</h2>
              </div>
              {summary ? (
                <p className="gates-domain-count">
                  {summary.met}/{summary.total} met
                </p>
              ) : null}
            </div>
            <p className="gates-domain-summary">{domain.summary}</p>

            <ol className="gates-condition-list">
              {domain.conditions.map((condition, index) => (
                <li key={condition.id} className="gates-condition-row">
                  <div className="gates-condition-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="gates-condition-body">
                    <div className="gates-condition-top">
                      <h3>{condition.label}</h3>
                      <span className={`gates-status is-${condition.status.replace('_', '-')}`}>
                        {gateStatusLabels[condition.status]}
                      </span>
                    </div>
                    <p className="gates-condition-definition">{condition.definition}</p>
                    <p className="gates-condition-note">{condition.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <section className="hx-shell gates-verify-section">
        <p className="section-kicker">How progress is checked</p>
        <h2 className="gates-domain-title">Verification surfaces</h2>
        <p className="gates-domain-summary">
          Gate status is updated when a condition materially changes. Where possible, progress ties back to public
          records you can inspect yourself — not status labels alone.
        </p>
        <ul className="gates-verify-list">
          {verificationLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="gates-verify-link">
                {link.label} →
              </Link>
              <p>{link.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="hx-shell gates-history-section">
        <p className="section-kicker">Version history</p>
        <h2 className="gates-domain-title">Board revisions</h2>
        <ol className="gates-history-list">
          {gateRevisions.map((revision) => (
            <li key={revision.version}>
              <span className="gates-history-version">v{revision.version}</span>
              <span className="gates-history-date">{revision.date}</span>
              <p>{revision.note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="hx-shell">
        <div className="hx-foot">
          <p>Gate conditions</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
            <ThemeToggle />
            <Link href="/" className="text-link">
              Return home
            </Link>
          </span>
        </div>
      </section>
    </main>
  );
}