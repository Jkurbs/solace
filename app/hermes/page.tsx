import type { Metadata } from 'next';
import Link from 'next/link';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import type {
  HermesBriefCapitalState,
  HermesBriefPosture,
  HermesBriefPulse,
  HermesBriefSnapshot,
} from '@/features/hermes-brief-snapshot/types';

import Mark from '../Mark';
import RequestAccessForm from './RequestAccessForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Solace — Hermes · Capital Allocation',
  description:
    'Hermes evaluates opportunity, posture, and conviction before allocating capital. Direct deposits through Solace. No performance claims.',
};

const allocationDemands = [
  'continuous evaluation',
  'risk calibration',
  'allocation decisions',
  'emotional discipline',
];

const productProofItems = [
  {
    label: 'Reads',
    value: 'Structure',
    text: 'Liquidity, timing, and regime become a single operating read.',
  },
  {
    label: 'Decides',
    value: 'Posture',
    text: 'Hermes compresses noisy market state into preserve, wait, reduce, or deploy.',
  },
  {
    label: 'Shows',
    value: 'Reason',
    text: 'Every public read includes current action and the condition Hermes is waiting for.',
  },
];

const productSections = [
  {
    kicker: 'Built for uncertainty',
    title: 'The product is the instrument.',
    text:
      'Hermes is designed around oversight instead of manual control. The user sees what the system is reading, what posture it has chosen, and why capital is moving or staying preserved.',
    items: allocationDemands,
  },
  {
    kicker: 'Public-safe by design',
    title: 'Signals stay inside the engine.',
    text:
      'The Learn More page previews the Hermes experience without becoming a trade-signal surface. It exposes posture, paths, freshness, capital state, and reasoning while keeping raw execution data private.',
    items: ['no entries', 'no targets', 'no balances', 'no pnl'],
  },
];

const activityDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
});

const postureDescriptions: Record<HermesBriefPosture, string> = {
  SELECTIVE: 'Hermes sees candidates but is waiting for cleaner confirmation before capital moves.',
  DEPLOYED: 'Hermes has earned active exposure and is monitoring the position of the field.',
  DEFENSIVE: 'Risk is elevated, so Hermes is protecting the account and reducing room for error.',
  STANDING_DOWN: 'Conditions are not clean enough for deployment, so Hermes is staying out.',
  RISK_OFF: 'Market conditions are hostile or unreliable, so preservation is the active posture.',
};

const capitalStateVisuals: Record<HermesBriefCapitalState, { gradient: string; label: string }> = {
  PRESERVED: {
    gradient: 'conic-gradient(#f2eadb 0% 100%)',
    label: 'Preserved',
  },
  PARTIALLY_DEPLOYED: {
    gradient: 'conic-gradient(#d8a85b 0% 46%, #697067 46% 100%)',
    label: 'Partial',
  },
  DEPLOYED: {
    gradient: 'conic-gradient(#87dbc0 0% 100%)',
    label: 'Deployed',
  },
  REDUCED: {
    gradient: 'conic-gradient(#b8bec7 0% 28%, #697067 28% 100%)',
    label: 'Reduced',
  },
};

function buildHermesProductPreviewSnapshot(snapshot: HermesBriefSnapshot): HermesBriefSnapshot {
  if (snapshot.brief_id !== 'fallback') {
    return snapshot;
  }

  const now = new Date().toISOString();

  return {
    brief_id: 'product-preview',
    generated_at: now,
    data_as_of: now,
    pulse: 'LIVE',
    posture: 'SELECTIVE',
    posture_reason: 'Hermes sees candidate paths, but is waiting for cleaner confirmation before capital moves.',
    market_regime: {
      label: 'Mixed liquidity',
      summary: 'Liquidity is active enough to observe, but not clean enough to force deployment.',
      liquidity: 'MIXED',
      volatility: 'NORMAL',
    },
    paths: {
      under_review: 6,
      deployed: 0,
      invalidated_since_last: 1,
      themes: ['confirmation pending', 'capital preserved', 'liquidity active'],
    },
    risk: {
      capital_state: 'PRESERVED',
      risk_level: 'MODERATE',
      reason: 'Capital remains preserved until the signal earns action.',
    },
    actions: {
      current_action: 'WAITING',
      next_condition: 'Cleaner confirmation across liquidity and timing.',
    },
    summary: 'Hermes is tracking 6 possible market paths. No path has earned deployment.',
    bullets: [
      'Capital is preserved while candidates remain under review.',
      'Hermes is monitoring timing, liquidity quality, and regime confirmation.',
      'No public brief exposes symbols, entries, targets, leverage, or PnL.',
    ],
    disclosure: snapshot.disclosure,
  };
}

function formatConstantLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 2024) {
    return 'Awaiting update';
  }

  const parts = activityDateFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value ?? '';

  return `${month} ${day}, ${hour}:${minute} ${dayPeriod}`;
}

function formatAgeLabel(value: string, now = new Date()) {
  const updatedAt = new Date(value);

  if (!Number.isFinite(updatedAt.getTime()) || updatedAt.getUTCFullYear() < 2024) {
    return 'awaiting update';
  }

  const ageMinutes = Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 60_000));

  if (ageMinutes < 1) {
    return 'updated just now';
  }

  if (ageMinutes < 60) {
    return `updated ${ageMinutes}m ago`;
  }

  if (ageMinutes >= 1_440) {
    return `updated ${formatActivityDate(value)}`;
  }

  const ageHours = Math.floor(ageMinutes / 60);
  return `updated ${ageHours}h ago`;
}

function getPulseTone(pulse: HermesBriefPulse) {
  if (pulse === 'LIVE') {
    return 'is-positive';
  }

  if (pulse === 'RECENT') {
    return 'is-watch';
  }

  return undefined;
}

function getPreviewDecisionRows(snapshot: HermesBriefSnapshot) {
  const rows = [
    { label: 'Read', summary: snapshot.summary },
    ...snapshot.bullets.map((summary, index) => ({ label: `Note ${index + 1}`, summary })),
    { label: 'Risk', summary: snapshot.risk.reason },
    { label: 'Next', summary: snapshot.actions.next_condition },
  ];

  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = row.summary.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }).slice(0, 4);
}

const impactItems = [
  'Users can understand what Hermes is doing without parsing technical systems or raw operational detail.',
  'Posture, capital state, risk level, current action, and decision rationale are visible in one read.',
  'The public preview uses the same sanitized brief contract that powers public Hermes updates.',
  'Sensitive signals, exact trades, prices, balances, PnL, and user-specific data stay out of the public surface.',
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

type HermesDashboardPreviewProps = {
  capitalVisual: { gradient: string; label: string };
  dashboardPreview: HermesBriefSnapshot;
  decisionRows: ReturnType<typeof getPreviewDecisionRows>;
  pathMetrics: Array<{ label: string; positive?: boolean; value: string }>;
  postureOptions: HermesBriefPosture[];
  pulseTone?: string;
  statusMetrics: Array<{ label: string; positive?: boolean; value: string }>;
  updatedLabel: string;
};

function HermesDashboardPreview({
  capitalVisual,
  dashboardPreview,
  decisionRows,
  pathMetrics,
  postureOptions,
  pulseTone,
  statusMetrics,
  updatedLabel,
}: HermesDashboardPreviewProps) {
  return (
    <div className="hermes-dashboard-frame hermes-dashboard-frame-focus hermes-impact-media" aria-label="Hermes interface preview">
      <div className="hermes-dashboard-preview hermes-dashboard-preview-real">
        <div className="hermes-preview-nav">
          <span className="hermes-preview-brand">
            <Mark size={18} />
            Solace
          </span>
          <span className="hermes-preview-nav-links">
            <span>Hermes</span>
            <span>Public Preview</span>
            <span>Brief</span>
            <span>Access</span>
          </span>
        </div>

        <div className="hermes-preview-shell">
          <div className="hermes-preview-panel hermes-preview-portfolio">
            <div>
              <span>Hermes Readout</span>
              <strong className="hermes-preview-main-value">{formatConstantLabel(dashboardPreview.posture)}</strong>
            </div>
            <div className="hermes-preview-portfolio-metrics">
              <p>
                <span>Pulse</span>
                <strong className={pulseTone}>{dashboardPreview.pulse}</strong>
              </p>
              <p>
                <span>Updated</span>
                <strong>{updatedLabel}</strong>
              </p>
            </div>
          </div>

          <div className="hermes-preview-panel hermes-preview-status">
            <span>Hermes Status</span>
            <h3>Operating posture</h3>
            <div className="hermes-preview-status-grid">
              {statusMetrics.map((item) => (
                <p key={item.label}>
                  <span>{item.label}</span>
                  <strong className={item.positive ? 'is-positive' : undefined}>{item.value}</strong>
                </p>
              ))}
            </div>
            <div className="hermes-preview-risk">
              {postureOptions.map((posture) => (
                <span
                  key={posture}
                  className={posture === dashboardPreview.posture ? 'is-selected' : undefined}
                >
                  {formatConstantLabel(posture)}
                </span>
              ))}
            </div>
            <p className="hermes-preview-risk-note">
              {dashboardPreview.posture_reason || postureDescriptions[dashboardPreview.posture]}
            </p>
          </div>

          <div className="hermes-preview-panel hermes-preview-outlook">
            <span>Market Regime</span>
            <h3>Liquidity environment</h3>
            <div>
              <p>
                <span>Current Read</span>
                <strong>{dashboardPreview.market_regime.label}</strong>
              </p>
              <p>
                <em>
                  {formatConstantLabel(dashboardPreview.market_regime.liquidity)} liquidity ·{' '}
                  {formatConstantLabel(dashboardPreview.market_regime.volatility)} volatility
                </em>
                <span>{dashboardPreview.market_regime.summary}</span>
              </p>
            </div>
          </div>

          <div className="hermes-preview-lower-grid">
            <div className="hermes-preview-panel hermes-preview-allocation">
              <span>Capital Oversight</span>
              <h3>Preserve or deploy</h3>
              <div className="hermes-preview-capital-row">
                <p>
                  <span>Capital State</span>
                  <strong>{formatConstantLabel(dashboardPreview.risk.capital_state)}</strong>
                </p>
                <p>
                  <span>Next Condition</span>
                  <strong>{dashboardPreview.actions.next_condition}</strong>
                </p>
              </div>
              <div className="hermes-preview-allocation-body">
                <div
                  className="hermes-preview-donut"
                  style={{ background: capitalVisual.gradient }}
                  aria-hidden="true"
                >
                  <span>Capital</span>
                  <strong>{capitalVisual.label}</strong>
                </div>
                <div className="hermes-preview-legend">
                  {pathMetrics.map((item) => (
                    <p key={item.label}>
                      <i aria-hidden="true" />
                      <span>{item.label}</span>
                      <strong className={item.positive ? 'is-positive' : undefined}>{item.value}</strong>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="hermes-preview-panel hermes-preview-activity">
              <span>Recent Decisions</span>
              <h3>Reasoning</h3>
              <ol>
                {decisionRows.map((activity) => (
                  <li key={`${activity.label}-${activity.summary}`}>
                    <span className="hermes-preview-decision-label">{activity.label}</span>
                    <strong>{activity.summary}</strong>
                  </li>
                ))}
              </ol>
              <p className="hermes-preview-activity-foot">
                Data as of {formatActivityDate(dashboardPreview.data_as_of)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HermesPage() {
  const dashboardPreview = buildHermesProductPreviewSnapshot(await getStoredHermesBriefSnapshot());
  const statusMetrics = [
    { label: 'Posture', value: formatConstantLabel(dashboardPreview.posture), positive: dashboardPreview.posture === 'DEPLOYED' },
    { label: 'Capital State', value: formatConstantLabel(dashboardPreview.risk.capital_state) },
    { label: 'Risk Level', value: formatConstantLabel(dashboardPreview.risk.risk_level) },
    { label: 'Current Action', value: formatConstantLabel(dashboardPreview.actions.current_action) },
  ];
  const pathMetrics = [
    { label: 'Under Review', value: dashboardPreview.paths.under_review.toString() },
    { label: 'Deployed', value: dashboardPreview.paths.deployed.toString(), positive: dashboardPreview.paths.deployed > 0 },
    { label: 'Invalidated Since Last', value: dashboardPreview.paths.invalidated_since_last.toString() },
  ];
  const decisionRows = getPreviewDecisionRows(dashboardPreview);
  const capitalVisual = capitalStateVisuals[dashboardPreview.risk.capital_state];
  const postureOptions = Object.keys(postureDescriptions) as HermesBriefPosture[];
  const pulseTone = getPulseTone(dashboardPreview.pulse);
  const updatedLabel = formatAgeLabel(dashboardPreview.data_as_of);

  return (
    <main className="oracle-page relative min-h-screen overflow-x-hidden text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(4,4,3,0.58)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground">
            <Mark size={20} />
            Solace
          </Link>
          <a href="#request-access" className="header-request-button">
            Request Hermes
          </a>
        </div>
      </header>

      <article className="hermes-impact-article hermes-product-article">
        <section className="hermes-product-hero">
          <div className="hermes-product-hero-copy">
            <p className="section-kicker">Hermes by Solace</p>
            <h1>Hermes</h1>
            <p>
              A live capital allocation instrument for markets under uncertainty. Hermes reads liquidity,
              timing, and regime to decide when capital should move, wait, or be preserved.
            </p>
            <div className="hermes-product-hero-actions">
              <a href="#request-access" className="hermes-product-primary">
                Request Access
              </a>
              <Link href="/brief" className="hermes-product-secondary">
                Read brief
              </Link>
            </div>
          </div>

          <div className="hermes-product-hero-preview">
            <HermesDashboardPreview
              capitalVisual={capitalVisual}
              dashboardPreview={dashboardPreview}
              decisionRows={decisionRows}
              pathMetrics={pathMetrics}
              postureOptions={postureOptions}
              pulseTone={pulseTone}
              statusMetrics={statusMetrics}
              updatedLabel={updatedLabel}
            />
          </div>
        </section>

        <section className="hermes-product-proof" aria-label="Hermes product proof">
          {productProofItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </section>

        {productSections.map((section, index) => (
          <section
            key={section.kicker}
            className={`hermes-product-section ${index % 2 === 1 ? 'hermes-product-section-right' : ''}`}
          >
            <div className="hermes-impact-section-copy">
              <p className="section-kicker">{section.kicker}</p>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </div>
            <ul className="hermes-product-grid-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="hermes-product-deep-dive">
          <div className="hermes-dashboard-preview-head">
            <p className="section-kicker">Oversight preview</p>
            <h2>What a user would see.</h2>
            <p>
              The public page uses the same sanitized brief contract as live Hermes updates, so the preview
              stays accurate without publishing sensitive trade intelligence.
            </p>
          </div>

          <div className="hermes-product-deep-dive-copy">
            <p>
              The homepage compresses Hermes into Paths, Posture, and Pulse. This page expands that same
              read into a guided product surface: current action, risk state, regime, and rationale.
            </p>
            <p>
              The full dashboard remains private. The public preview exists to show how Hermes thinks,
              not to expose a live playbook.
            </p>
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

        <section id="request-access" className="hermes-access-form-section scroll-mt-28">
          <div className="hermes-access-form-head">
            <p className="section-kicker">Request access</p>
            <Link href="/brief" className="text-link">
              Read the technical brief
            </Link>
          </div>

          <RequestAccessForm />
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
