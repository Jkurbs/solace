'use client';

import Mark from '../Mark';

/**
 * Static recreation of the live Hermes dashboard for the marketing page.
 * Dark styles are the default; light mode is applied via html[data-theme='light']
 * in globals.css so backgrounds track the site theme without hydration lag.
 */

const activity = [
  { date: 'Jun 24', text: 'Hermes allocation updated: SOL long 87.47%, BEAT long 10.43%, ZEC long 1.14%' },
  { date: 'Jun 23', text: 'Capital posted through Stripe' },
  { date: 'Jun 23', text: 'Stripe sandbox simulation treasury allocation completed' },
];

const allocation = [
  { name: 'SOL Long', value: '87.47%', tone: 'sol' },
  { name: 'BEAT Long', value: '10.43%', tone: 'beat' },
  { name: 'ZEC Long', value: '1.14%', tone: 'zec' },
  { name: 'Cash', value: '0.96%', tone: 'cash' },
];

const summary = [
  { label: 'Total Deposited', value: '$100,000' },
  { label: 'Current Value', value: '$50,897' },
  { label: 'Net Profit', value: '-$49,103' },
  { label: 'Withdrawable', value: '$491' },
];

export type HermesBoardFocus = 'overview' | 'posture' | 'outlook' | 'execution';

export function HermesBoardMobileArt({ focus }: { focus?: HermesBoardFocus }) {
  return (
    <div className="hxm-board hx-board-art" data-focus={focus} aria-hidden="true">
      <div className="hxm-topbar">
        <span className="hxm-brand">
          <Mark size={16} />
          Solace
        </span>
        <span className="hxm-live">
          <i />
          Live 5s
        </span>
      </div>

      <section className="hxm-card hxm-portfolio hxm-region is-overview">
        <div className="hxm-card-head hxm-portfolio-head">
          <span className="hxm-label">Portfolio Value</span>
          <span className="hxm-pill">Simulation</span>
        </div>
        <strong className="hxm-value">$50,897.01</strong>
        <div className="hxm-metrics hxm-metrics-two">
          <span>
            <span className="hxm-label">Today&apos;s Change</span>
            <strong>$0.00 (0%)</strong>
          </span>
          <span>
            <span className="hxm-label">Since Inception</span>
            <strong>-49.1%</strong>
          </span>
        </div>
        <div className="hxm-metrics hxm-metrics-four">
          {[
            ['Available', '$490.64'],
            ['In Strategy', '$50,406.37'],
            ['Open PnL', '+$19,692.98'],
            ['Withdrawable', '$490.64'],
          ].map(([key, value]) => (
            <span key={key}>
              <span className="hxm-label">{key}</span>
              <strong>{value}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="hxm-card hxm-region is-posture">
        <span className="hxm-label">Hermes Status</span>
        <strong className="hxm-title">Operating posture</strong>
        <div className="hxm-status-grid">
          {[
            ['Status', 'ACTIVE'],
            ['Risk Profile', 'Balanced'],
            ['Capital Deployed', '99.04%'],
            ['Conviction', 'High'],
          ].map(([key, value]) => (
            <span key={key}>
              <span className="hxm-label">{key}</span>
              <strong className={key === 'Status' ? 'hxm-positive' : undefined}>{value}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="hxm-card hxm-region is-outlook">
        <span className="hxm-label">Hermes Outlook</span>
        <strong className="hxm-title">Moderate</strong>
        <p>Selective deployment while Hermes preserves cash for clearer deployment.</p>
      </section>

      <section className="hxm-card hxm-region is-execution">
        <div className="hxm-allocation-head">
          <span>
            <span className="hxm-label">Current Allocation</span>
            <strong className="hxm-title">Capital mix</strong>
          </span>
          <span className="hxm-donut hx-board-art-conic" />
        </div>
        <div className="hxm-allocation-list">
          {allocation.map((item) => (
            <span key={item.name}>
              <i className={`hx-board-alloc-dot is-${item.tone}`} />
              <span>{item.name}</span>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="hxm-card hxm-region is-execution">
        <span className="hxm-label">Recent Activity</span>
        <strong className="hxm-title">Latest decisions</strong>
        <div className="hxm-activity">
          {activity.slice(0, 2).map((item) => (
            <span key={item.text}>
              <small>{item.date}</small>
              <strong>{item.text}</strong>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HermesBoardArt({ focus }: { focus?: HermesBoardFocus }) {
  return (
    <div
      className="hx-board-art hx-dashboard-plate hxb-board mx-auto w-full max-w-[74rem]"
      data-focus={focus}
      aria-hidden="true"
    >
      <div className="hx-board-art-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="hx-board-art-brand">
            <Mark size={18} />
            Solace
          </span>
          <span className="hx-board-art-nav-links">
            <span className="is-active">Hermes</span>
            <span>Contract</span>
            <span>Capital</span>
            <span className="is-muted">Account ending 98D5</span>
          </span>
          <span className="hx-board-art-nav-right">
            <span className="hx-board-art-pill">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live 5s
            </span>
            <span className="hx-board-art-pill">Simulation</span>
            <span>Logout</span>
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-7">
        <div className="hx-board-art-card hxb-region is-overview">
          <div className="grid grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <span className="inline-flex items-center gap-2">
                <span className="hx-board-art-label">Portfolio Value</span>
                <span className="hx-board-art-badge-live">Live simulation</span>
                <span className="hx-board-art-badge-sim">Simulation capital</span>
              </span>
              <span className="hx-board-art-hero-value">$50,897.01</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              <div>
                <span className="hx-board-art-metric-label">Today&apos;s Change</span>
                <span className="hx-board-art-metric-value">$0.00 (0%)</span>
              </div>
              <div>
                <span className="hx-board-art-metric-label">Since Inception</span>
                <span className="hx-board-art-metric-value">-49.1%</span>
              </div>
            </div>
          </div>
          <div className="hx-board-art-divider mt-6 grid grid-cols-4 gap-4 pt-5">
            {[
              ['Available Balance', '$490.64', ''],
              ['In Strategy', '$50,406.37', ''],
              ['Open PnL', '+$19,692.98', 'is-positive'],
              ['Withdrawable', '$490.64', ''],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="hx-board-art-metric-label">{k}</span>
                <span className={`hx-board-art-metric-value ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hx-board-art-card hxb-region is-posture">
          <span className="hx-board-art-label">Hermes Status</span>
          <span className="hx-board-art-title">Operating posture</span>
          <div className="hx-board-art-divider mt-5 grid grid-cols-4 gap-4 pt-5">
            {[
              ['Status', 'ACTIVE', 'is-positive'],
              ['Risk Profile', 'Balanced', ''],
              ['Capital Deployed', '99.04%', ''],
              ['Conviction', 'High', ''],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="hx-board-art-metric-label">{k}</span>
                <span className={`hx-board-art-metric-value ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="hx-board-art-risk-track">
            <span className="hx-board-art-risk-idle">Preservation</span>
            <span className="hx-board-art-risk-active">Balanced</span>
            <span className="hx-board-art-risk-idle">Velocity</span>
          </div>
        </div>

        <div className="hx-board-art-card hxb-region is-outlook">
          <span className="hx-board-art-label">Hermes Outlook</span>
          <span className="hx-board-art-title">Opportunity environment</span>
          <div className="hx-board-art-divider mt-5 grid grid-cols-[13rem_1fr] items-center gap-7 pt-5">
            <div>
              <span className="hx-board-art-metric-label">Current Outlook</span>
              <span className="hx-board-art-outlook-value">Moderate</span>
            </div>
            <div className="hx-board-art-split">
              <span className="hx-board-art-outlook-title">Selective deployment</span>
              <span className="hx-board-art-body">
                Opportunity is present, but Hermes is preserving cash for clearer deployment.
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="hx-board-art-card hxb-region is-execution">
            <span className="hx-board-art-label">Current Allocation</span>
            <span className="hx-board-art-title">Capital mix</span>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="hx-board-art-subcard">
                <span className="hx-board-art-metric-label">Capital Deployed</span>
                <span className="hx-board-art-subcard-value">99.04%</span>
              </div>
              <div className="hx-board-art-subcard">
                <span className="hx-board-art-metric-label">Cash Reserve</span>
                <span className="hx-board-art-subcard-value">0.96%</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6">
              <div className="hx-board-art-conic grid aspect-square w-40 place-items-center rounded-full">
                <div className="hx-board-art-donut-hole grid h-[64%] w-[64%] place-items-center rounded-full text-center">
                  <span>
                    <span className="hx-board-art-metric-label">Allocated</span>
                    <span className="hx-board-art-subcard-value">99.04%</span>
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                {allocation.map((item) => (
                  <div key={item.name} className="hx-board-art-alloc-row">
                    <span className={`hx-board-alloc-dot is-${item.tone}`} />
                    <span>{item.name}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hx-board-art-card hxb-region is-execution">
            <span className="hx-board-art-label">Recent Activity</span>
            <span className="hx-board-art-title">Latest decisions</span>
            <div className="mt-4 grid gap-0">
              {activity.map((item) => (
                <div key={item.text} className="hx-board-art-activity-row">
                  <span>{item.date}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hx-board-art-card hxb-region is-execution">
          <span className="hx-board-art-label">Hermes Commentary</span>
          <span className="hx-board-art-title">Current read</span>
          <p className="hx-board-art-commentary">
            Hermes remains selectively deployed while preserving liquidity for emerging opportunities.
            Current conditions favor continuation over aggressive expansion.
          </p>
        </div>

        <div className="hx-board-art-card hxb-region is-execution">
          <span className="hx-board-art-label">Account</span>
          <span className="hx-board-art-title">Summary</span>
          <div className="hx-board-art-divider mt-6 grid grid-cols-4 gap-4 pt-5">
            {summary.map((item) => (
              <div key={item.label}>
                <span className="hx-board-art-metric-label">{item.label}</span>
                <span className="hx-board-art-summary-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}