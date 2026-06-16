import type { Metadata } from 'next';
import Link from 'next/link';

import { hermesDashboardSnapshot } from '@/features/hermes-dashboard/mock-data';

import Mark from '../Mark';

export const metadata: Metadata = {
  title: 'Solace — Hermes · Capital Allocation',
  description:
    'Hermes evaluates opportunity, posture, and conviction before allocating capital. Direct deposits through Solace. No performance claims.',
};

const postures = [
  {
    name: 'Preservation',
    text: 'Capital first. Hermes acts rarely, sizes conservatively, and treats drawdown as the enemy.',
  },
  {
    name: 'Balanced',
    text: 'The house posture. Selective deployment, measured size, and discipline that bends without breaking.',
  },
  {
    name: 'Velocity',
    text: 'The full read of the field. When liquidity runs deep Hermes presses; when it thins it stands down.',
  },
];

const allocationDemands = [
  'continuous evaluation',
  'risk calibration',
  'allocation decisions',
  'emotional discipline',
];

const dashboardPreview = hermesDashboardSnapshot;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const activityDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/New_York',
});

const previewAllocationColors: Record<string, string> = {
  BTC: '#f2eadb',
  Cash: '#697067',
  Other: '#d8a85b',
  SUI: '#6ea8ff',
};

const previewRiskDescriptions: Record<string, string> = {
  Preservation: 'Preservation prioritizes drawdown control, lower activity, and larger cash reserves.',
  Balanced: 'Balanced keeps Hermes selective while allowing measured deployment when conditions are favorable.',
  Velocity: 'Velocity allows more active deployment when Hermes finds strong opportunity and sufficient liquidity.',
};

function formatPreviewCurrency(value: number, signed = false) {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${currencyFormatter.format(Math.abs(value))}`;
}

function formatPreviewPercent(value: number, signed = false) {
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${numberFormatter.format(Math.abs(value))}%`;
}

function formatConstantLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatActivityDate(value: Date) {
  const parts = activityDateFormatter.formatToParts(value);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${month} ${day}`;
}

function buildPreviewAllocationGradient() {
  let cursor = 0;

  return `conic-gradient(${dashboardPreview.allocation
    .map((item) => {
      const start = cursor;
      cursor += item.percentage;

      return `${previewAllocationColors[item.asset] ?? '#87dbc0'} ${start}% ${cursor}%`;
    })
    .join(', ')})`;
}

const previewStatusMetrics = [
  { label: 'Status', value: dashboardPreview.status.status, positive: true },
  { label: 'Risk Profile', value: dashboardPreview.status.riskProfile },
  { label: 'Capital Deployed', value: formatPreviewPercent(dashboardPreview.status.deployedCapital) },
  { label: 'Conviction', value: formatConstantLabel(dashboardPreview.status.conviction) },
];

const previewCashReserve =
  dashboardPreview.allocation.find((item) => item.asset.toLowerCase() === 'cash')?.percentage ??
  100 - dashboardPreview.status.deployedCapital;

const previewAllocationGradient = buildPreviewAllocationGradient();

const impactItems = [
  'Users can understand what Hermes is doing without parsing technical systems or raw operational detail.',
  'Portfolio value, capital deployed, cash reserve, activity, and commentary are visible in one read.',
  'Risk profile is explicit and adjustable, so allocation follows the selected posture.',
  'Commentary turns system state into a current read instead of another stream of noise.',
];

const fees = [
  {
    label: 'Deposits',
    value: 'Direct',
    note: 'Users deposit capital directly into Solace before Hermes allocates according to the selected profile.',
  },
  {
    label: 'Money movement',
    value: 'Visible',
    note: 'Deposits, withdrawals, current value, and available balance remain visible in the Solace dashboard.',
  },
  {
    label: 'Hermes access',
    value: 'Disclosed before approval',
    note: 'Access terms are provided before onboarding. No hidden spreads or interface upsells.',
  },
];

export default function HermesPage() {
  return (
    <main className="oracle-page relative min-h-screen overflow-x-hidden text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(4,4,3,0.58)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground">
            <Mark size={20} />
            Solace
          </Link>
          <Link href="/" className="font-mono text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      <article className="hermes-impact-article">
        <section className="hermes-impact-hero">
          <div className="hermes-impact-hero-copy">
            <p className="section-kicker">Hermes + Solace</p>
            <h1>Capital oversight without constant intervention.</h1>
            <p>
              Hermes is an allocation interface for users who want visibility into how capital is being
              deployed without managing daily decisions or constantly adjusting account posture.
            </p>
          </div>
        </section>

        <section className="hermes-impact-section hermes-exists-section">
          <div className="hermes-impact-section-copy">
            <p className="section-kicker">Why Hermes exists</p>
            <h2>Capital requires decisions.</h2>
          </div>
          <div className="hermes-exists-body">
            <p>
              Most people do not have the time, interest, or expertise to continuously evaluate changing
              conditions and adjust allocation accordingly.
            </p>
            <ul className="hermes-exists-list">
              {allocationDemands.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              Hermes maintains that operating posture on behalf of the account while keeping the user
              informed through a simple oversight interface.
            </p>
          </div>
        </section>

        <section className="hermes-impact-section hermes-custody-section hermes-impact-section-right">
          <div className="hermes-impact-section-copy">
            <p className="section-kicker">Capital architecture</p>
            <h2>Trust is enforced through how capital moves.</h2>
          </div>
          <div className="hermes-custody-points">
            <p>
              <span>01</span>
              <strong>Users deposit capital directly into Solace.</strong>
            </p>
            <p>
              <span>02</span>
              <strong>Hermes allocates from the Solace account.</strong>
            </p>
            <p>
              <span>03</span>
              <strong>Deposits, value, and withdrawals stay visible in the dashboard.</strong>
            </p>
          </div>
        </section>

        <section className="hermes-impact-dashboard">
          <div className="hermes-dashboard-frame hermes-dashboard-frame-focus hermes-impact-media" aria-label="Hermes interface preview">
            <div className="hermes-dashboard-preview hermes-dashboard-preview-real">
              <div className="hermes-preview-nav">
                <span className="hermes-preview-brand">
                  <Mark size={18} />
                  Solace
                </span>
                <span className="hermes-preview-nav-links">
                  <span>Hermes</span>
                  <span>{dashboardPreview.account.label}</span>
                  <span>Light</span>
                  <span>Logout</span>
                </span>
              </div>

              <div className="hermes-preview-shell">
                <div className="hermes-preview-panel hermes-preview-portfolio">
                  <div>
                    <span>Portfolio Value</span>
                    <strong>{formatPreviewCurrency(dashboardPreview.portfolio.value)}</strong>
                  </div>
                  <div className="hermes-preview-portfolio-metrics">
                    <p>
                      <span>Today's Change</span>
                      <strong>
                        {formatPreviewCurrency(dashboardPreview.portfolio.todaysChange.amount, true)} (
                        {formatPreviewPercent(dashboardPreview.portfolio.todaysChange.percentage, true)})
                      </strong>
                    </p>
                    <p>
                      <span>Since Inception</span>
                      <strong>{formatPreviewPercent(dashboardPreview.portfolio.sinceInception, true)}</strong>
                    </p>
                  </div>
                </div>

                <div className="hermes-preview-panel hermes-preview-status">
                  <span>Hermes Status</span>
                  <h3>Operating posture</h3>
                  <div className="hermes-preview-status-grid">
                    {previewStatusMetrics.map((item) => (
                      <p key={item.label}>
                        <span>{item.label}</span>
                        <strong className={item.positive ? 'is-positive' : undefined}>{item.value}</strong>
                      </p>
                    ))}
                  </div>
                  <div className="hermes-preview-risk">
                    {postures.map((posture) => (
                      <span
                        key={posture.name}
                        className={posture.name === dashboardPreview.status.riskProfile ? 'is-selected' : undefined}
                      >
                        {posture.name}
                      </span>
                    ))}
                  </div>
                  <p className="hermes-preview-risk-note">
                    {previewRiskDescriptions[dashboardPreview.status.riskProfile]}
                  </p>
                </div>

                <div className="hermes-preview-panel hermes-preview-outlook">
                  <span>Hermes Outlook</span>
                  <h3>Opportunity environment</h3>
                  <div>
                    <p>
                      <span>Current Outlook</span>
                      <strong>{dashboardPreview.outlook.environment}</strong>
                    </p>
                    <p>
                      <em>{dashboardPreview.outlook.stance}</em>
                      <span>{dashboardPreview.outlook.note}</span>
                    </p>
                  </div>
                </div>

                <div className="hermes-preview-lower-grid">
                  <div className="hermes-preview-panel hermes-preview-allocation">
                    <span>Current Allocation</span>
                    <h3>Capital mix</h3>
                    <div className="hermes-preview-capital-row">
                      <p>
                        <span>Capital Deployed</span>
                        <strong>{formatPreviewPercent(dashboardPreview.status.deployedCapital)}</strong>
                      </p>
                      <p>
                        <span>Cash Reserve</span>
                        <strong>{formatPreviewPercent(previewCashReserve)}</strong>
                      </p>
                    </div>
                    <div className="hermes-preview-allocation-body">
                      <div
                        className="hermes-preview-donut"
                        style={{ background: previewAllocationGradient }}
                        aria-hidden="true"
                      >
                        <span>Allocated</span>
                        <strong>{formatPreviewPercent(dashboardPreview.status.deployedCapital)}</strong>
                      </div>
                      <div className="hermes-preview-legend">
                        {dashboardPreview.allocation.map((item) => (
                          <p key={item.asset}>
                            <i style={{ backgroundColor: previewAllocationColors[item.asset] ?? '#87dbc0' }} aria-hidden="true" />
                            <span>{item.asset}</span>
                            <strong>{formatPreviewPercent(item.percentage)}</strong>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="hermes-preview-panel hermes-preview-activity">
                    <span>Recent Activity</span>
                    <h3>Latest decisions</h3>
                    <ol>
                      {dashboardPreview.activity.map((activity) => (
                        <li key={`${activity.timestamp.toISOString()}-${activity.summary}`}>
                          <time dateTime={activity.timestamp.toISOString()}>{formatActivityDate(activity.timestamp)}</time>
                          <strong>{activity.summary}</strong>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="hermes-impact-quote">
          <blockquote>
            The product should feel like checking on a professional allocator, not managing the account
            yourself.
          </blockquote>
        </section>

        <section className="hermes-impact-section hermes-impact-impact">
          <div className="hermes-impact-section-copy">
            <p className="section-kicker">Impact</p>
            <h2>A dashboard for oversight, not intervention.</h2>
          </div>
          <ul>
            {impactItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="hermes-impact-section hermes-impact-section-right">
          <div className="hermes-impact-section-copy">
            <p className="section-kicker">Access model</p>
            <h2>Simple terms before capital moves.</h2>
            <p>
              Hermes is not designed around spreads, gimmicks, or hidden complexity. Access terms are disclosed
              before onboarding, users deposit directly into Solace, and account movement remains visible in the
              dashboard.
            </p>
          </div>
          <div className="fees-static hermes-impact-fees">
            {fees.map((fee) => (
              <div key={fee.label}>
                <span>{fee.label}</span>
                <strong>{fee.value}</strong>
                <p>{fee.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hermes-access-form-section">
          <div className="hermes-access-form-head">
            <p className="section-kicker">Request access</p>
            <Link href="/brief" className="text-link">
              Read the technical brief
            </Link>
          </div>

          <form action="/api/hermes/request-access" method="post" className="hermes-access-form">
            <h2>Interested in allocating capital with Hermes?</h2>

            <div className="hermes-form-grid">
              <div className="hermes-form-field">
                <label htmlFor="hermes-first-name">First name <i>*</i></label>
                <input id="hermes-first-name" name="firstName" type="text" autoComplete="given-name" required />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-last-name">Last name <i>*</i></label>
                <input id="hermes-last-name" name="lastName" type="text" autoComplete="family-name" required />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-email">Email address <i>*</i></label>
                <input id="hermes-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-phone">Phone number</label>
                <input id="hermes-phone" name="phone" type="tel" autoComplete="tel" />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-role">Role / title</label>
                <input id="hermes-role" name="role" type="text" autoComplete="organization-title" />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-organization">Company / institution</label>
                <input id="hermes-organization" name="organization" type="text" autoComplete="organization" />
              </div>
              <div className="hermes-form-field hermes-form-full">
                <label htmlFor="hermes-country">Country <i>*</i></label>
                <select id="hermes-country" name="country" required defaultValue="">
                  <option value="" disabled>
                    Select...
                  </option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="European Union">European Union</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="hermes-form-field hermes-form-full">
                <label htmlFor="hermes-context">Capital context</label>
                <textarea
                  id="hermes-context"
                  name="context"
                  rows={4}
                  placeholder="Tell us what you want Hermes to help allocate, preserve, or monitor."
                />
              </div>
            </div>

            <div className="hermes-form-actions">
              <button type="submit">Submit</button>
              <p>Submitting opens the private Hermes dashboard preview. Access remains code-gated.</p>
            </div>
          </form>
        </section>

        <div className="hermes-impact-footer">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
            Hermes · The first instrument · Live
          </p>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </article>
    </main>
  );
}
