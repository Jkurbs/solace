import type { Metadata } from 'next';
import Link from 'next/link';

import {
  gateDomains,
  gateLadder,
  gateRevisions,
  gatesLastUpdated,
  gatesVersion,
  gateStatusLabels,
  summarizeAllGates,
  summarizeGateDomain,
  type GateCondition,
  type GateDomain,
  type GateStatus,
} from '@/features/gates/conditions';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';

export const metadata: Metadata = {
  title: 'Solace — Gate Board',
  description: 'Where Glorya, Simulation, and Autonomy stand. Public conditions, hand-marked status.',
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

function boardCounts() {
  return gateDomains.reduce(
    (totals, domain) => {
      const summary = summarizeGateDomain(domain);
      return {
        met: totals.met + summary.met,
        partial: totals.partial + summary.partial,
        open: totals.open + summary.not_met,
        total: totals.total + summary.total,
      };
    },
    { met: 0, partial: 0, open: 0, total: 0 },
  );
}

function currentDomain(): GateDomain | undefined {
  return gateDomains.find((domain) => domain.phase.toLowerCase() !== 'gated') ?? gateDomains[0];
}

function nextCondition(domain: GateDomain | undefined): GateCondition | undefined {
  if (!domain) return undefined;
  return (
    domain.conditions.find((c) => c.status === 'not_met') ??
    domain.conditions.find((c) => c.status === 'partial')
  );
}

function statusClass(status: GateStatus) {
  return status.replace('_', '-');
}

function ConditionCard({
  condition,
  index,
}: {
  condition: GateCondition;
  index: number;
}) {
  return (
    <article id={condition.id} className={`gates-condition is-${statusClass(condition.status)} scroll-mt-28`}>
      <header className="gates-condition-head">
        <span className="gates-condition-index">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="gates-condition-label">{condition.label}</h3>
        <span className={`gates-status is-${statusClass(condition.status)}`}>
          {gateStatusLabels[condition.status]}
        </span>
      </header>

      <p className="gates-condition-definition">{condition.definition}</p>

      <div className="gates-condition-foot">
        <p className="gates-condition-note">
          <span className="gates-condition-note-label">Latest mark</span>
          {condition.note}
        </p>
        {condition.evidence ? (
          <Link href={condition.evidence.href} className="gates-check-link">
            Check · {condition.evidence.label}
          </Link>
        ) : (
          <span className="gates-check-empty">No public check yet</span>
        )}
      </div>

      {condition.dependsOn ? (
        <p className="gates-condition-depends">
          Depends on{' '}
          <Link href={`#${condition.dependsOn}`} className="text-link">
            {condition.dependsOn === 'sim-proof'
              ? 'Simulation · Load-bearing proof'
              : condition.dependsOn === 'glorya-revenue'
                ? 'Glorya · Revenue gate'
                : condition.dependsOn}
          </Link>
        </p>
      ) : null}
    </article>
  );
}

export default function GatesPage() {
  const domainSummaries = summarizeAllGates();
  const counts = boardCounts();
  const working = currentDomain();
  const next = nextCondition(working);

  return (
    <main className="hx-page gates-page">
      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <div className="gates-header-actions">
            <Link href="/brief#section-08" className="hx-btn hx-btn-secondary hx-btn-sm">
              Brief §08
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
          Glorya evaluates under a revenue gate. Simulation and Autonomy stay closed until their conditions clear.
          Status is hand-marked — not auto-scored.
        </p>

        <dl className="gates-scoreline" aria-label="Board progress">
          <div>
            <dt>Met</dt>
            <dd>{counts.met}</dd>
          </div>
          <div>
            <dt>Partial</dt>
            <dd>{counts.partial}</dd>
          </div>
          <div>
            <dt>Not met</dt>
            <dd>{counts.open}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{counts.total}</dd>
          </div>
        </dl>

        {working && next ? (
          <div className="gates-focus">
            <p className="gates-focus-kicker">Working gate</p>
            <p className="gates-focus-line">
              <strong>{working.name}</strong>
              <span aria-hidden="true"> · </span>
              <span>
                next up is <Link href={`#${next.id}`}>{next.label}</Link>
              </span>
            </p>
            <p className="gates-focus-note">{next.note}</p>
          </div>
        ) : null}

        <p className="gates-meta">
          v{gatesVersion} · Updated {formatUpdatedAt(gatesLastUpdated)} · Hand-marked public board
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
        <p className="gates-ladder-caption">
          Markets live · Glorya evaluating · Simulation building · Autonomy locked until Simulation is
          load-bearing.
        </p>
      </section>

      <section className="hx-shell gates-sheet-section" aria-label="Gate conditions">
        {domainSummaries.map(({ domain, summary }) => (
          <section key={domain.id} id={domain.id} className="gates-domain scroll-mt-28">
            <header className="gates-domain-head">
              <div className="gates-domain-titles">
                <p className="gates-domain-kicker">
                  {domain.phase}
                  <span aria-hidden="true"> · </span>
                  {summary.met}/{summary.total} met
                  {summary.partial > 0 ? ` · ${summary.partial} partial` : ''}
                </p>
                <h2 className="gates-domain-name">{domain.name}</h2>
                <p className="gates-domain-summary">{domain.summary}</p>
              </div>
            </header>

            <div className="gates-condition-list">
              {domain.conditions.map((condition, index) => (
                <ConditionCard key={condition.id} condition={condition} index={index} />
              ))}
            </div>
          </section>
        ))}

        <p className="gates-sheet-note">
          We update a row when something actually changes. Glorya definitions live in{' '}
          <Link href="/brief#section-05" className="text-link">
            brief §05
          </Link>
          ; horizon gates in{' '}
          <Link href="/brief#section-08" className="text-link">
            brief §08
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
          <ul className="gates-changelog-list">
            {gateRevisions.map((revision) => (
              <li key={revision.version}>
                <span className="gates-changelog-version">v{revision.version}</span>
                <span className="gates-changelog-date">{revision.date}</span>
                <span className="gates-changelog-note">{revision.note}</span>
              </li>
            ))}
          </ul>
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
