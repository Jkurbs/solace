import type { Metadata } from 'next';
import Link from 'next/link';

import {
  gateDomains,
  gateLadder,
  gateRevisions,
  gatesLastUpdated,
  gatesVersion,
  gateStatusLabels,
  getTotalGateProgress,
  summarizeAllGates,
} from '@/features/gates/conditions';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';

export const metadata: Metadata = {
  title: 'Solace — Gate Board',
  description:
    'Public, checkable gate conditions for Simulation and Autonomy. Domains are earned, not declared.',
};

const updatedFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatUpdatedAt(value: string) {
  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? value : updatedFormatter.format(parsed);
}

export default function GatesPage() {
  const domainSummaries = summarizeAllGates();
  const boardProgress = getTotalGateProgress();

  return (
    <main className="hx-page gates-page">
      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <div className="gates-header-actions">
            <Link href="/brief#section-07" className="hx-btn hx-btn-secondary hx-btn-sm">
              Brief §07
            </Link>
            <Link href="/trust" className="hx-btn hx-btn-primary hx-btn-sm">
              Ledger
            </Link>
          </div>
        </div>
      </header>

      <section className="hx-shell gates-hero">
        <p className="section-kicker">Earned, not declared</p>
        <h1 className="gates-title">Gate board</h1>
        <p className="gates-dek">
          Simulation and Autonomy stay gated until explicit, checkable conditions clear. This sheet is the public
          record — not a roadmap promise.
        </p>
        <p className="gates-meta">
          Board v{gatesVersion} · Last updated {formatUpdatedAt(gatesLastUpdated)} · {boardProgress.met} of{' '}
          {boardProgress.total} met
        </p>
      </section>

      <section className="hx-shell gates-ladder-section" aria-label="Domain progression">
        <ol className="gates-ladder">
          {gateLadder.map((stage, index) => (
            <li key={stage.id} className={`gates-ladder-stage is-${stage.state}`}>
              <Link href={stage.href} className="gates-ladder-node">
                <span className="gates-ladder-dot" aria-hidden="true" />
                <span className="gates-ladder-name">{stage.name}</span>
                <span className="gates-ladder-phase">{stage.phase}</span>
              </Link>
              {index < gateLadder.length - 1 ? <span className="gates-ladder-rail" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="hx-shell gates-sheet-section">
        <div className="gates-sheet">
          <div className="gates-sheet-toolbar">
            <div>
              <p>Board</p>
              <h2>Gate conditions</h2>
            </div>
            <span>Public view</span>
          </div>

          <div className="gates-sheet-meta">
            <div className="gates-sheet-meta-cell">
              <span>Markets</span>
              <strong>Live</strong>
            </div>
            {domainSummaries.map(({ domain, summary }) => (
              <div key={domain.id} className="gates-sheet-meta-cell">
                <span>{domain.name}</span>
                <strong>
                  {domain.phase} · {summary.met}/{summary.total} met
                </strong>
              </div>
            ))}
            <div className="gates-sheet-meta-cell">
              <span>Board</span>
              <strong>
                {boardProgress.met}/{boardProgress.total} met
              </strong>
            </div>
          </div>

          <div className="gates-table-wrap">
            <table className="gates-table">
              <thead>
                <tr>
                  <th className="gates-col-num">#</th>
                  <th className="gates-col-condition">Condition</th>
                  <th className="gates-col-status">Status</th>
                  <th className="gates-col-check">Check</th>
                </tr>
              </thead>
              <tbody>
                {gateDomains.map((domain) => {
                  const summary = domainSummaries.find((entry) => entry.domain.id === domain.id)?.summary;

                  return [
                    <tr key={`${domain.id}-section`} id={domain.id} className="gates-section-row scroll-mt-28">
                      <td colSpan={4}>
                        <span>{domain.name}</span>
                        <span className="gates-section-phase">{domain.phase}</span>
                        <span className="gates-section-count">
                          {summary ? `${summary.met}/${summary.total} met` : null}
                        </span>
                        <span className="gates-section-summary">{domain.summary}</span>
                      </td>
                    </tr>,
                    ...domain.conditions.map((condition, index) => (
                      <tr key={condition.id} id={condition.id} className="scroll-mt-28">
                        <td className="gates-row-num">{String(index + 1).padStart(2, '0')}</td>
                        <td>
                          <strong className="gates-condition-label">{condition.label}</strong>
                          <p className="gates-condition-definition">{condition.definition}</p>
                          <p className="gates-condition-note">{condition.note}</p>
                        </td>
                        <td>
                          <span className={`gates-status is-${condition.status.replace('_', '-')}`}>
                            {gateStatusLabels[condition.status]}
                          </span>
                        </td>
                        <td>
                          {condition.evidence ? (
                            <Link href={condition.evidence.href} className="gates-check-link">
                              {condition.evidence.label} →
                            </Link>
                          ) : (
                            <span className="gates-check-empty">—</span>
                          )}
                        </td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="gates-sheet-note">
          Status updates when a condition materially changes. Where evidence exists, progress is inspectable — not
          taken on faith. Definitions live in the{' '}
          <Link href="/brief#section-07" className="text-link">
            technical brief §07
          </Link>
          .
        </p>
      </section>

      <section className="hx-shell gates-history-section">
        <div className="gates-changelog">
          <div className="gates-changelog-head">
            <p>History</p>
            <h2>Board revisions</h2>
          </div>
          <table className="gates-changelog-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {gateRevisions.map((revision) => (
                <tr key={revision.version}>
                  <td>v{revision.version}</td>
                  <td>{revision.date}</td>
                  <td>{revision.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hx-shell">
        <div className="hx-foot">
          <p>Gate board</p>
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