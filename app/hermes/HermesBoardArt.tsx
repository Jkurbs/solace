'use client';

import Mark from '../Mark';
import { type SiteTheme, useSiteTheme } from './shared';

/**
 * A static, faithful recreation of the live Hermes dashboard, used as the
 * product visual on the Learn More page. Mirrors the real dashboard's structure
 * and styling with the simulation/beta figures shown in the product.
 * Decorative - aria-hidden.
 */

const allocationByTheme: Record<SiteTheme, Array<{ name: string; value: string; color: string }>> = {
  dark: [
    { name: 'SOL Long', value: '87.47%', color: '#f2eadb' },
    { name: 'BEAT Long', value: '10.43%', color: '#5b8def' },
    { name: 'ZEC Long', value: '1.14%', color: '#8a8f98' },
    { name: 'Cash', value: '0.96%', color: '#54524d' },
  ],
  light: [
    { name: 'SOL Long', value: '87.47%', color: '#151515' },
    { name: 'BEAT Long', value: '10.43%', color: '#2f72d6' },
    { name: 'ZEC Long', value: '1.14%', color: '#8a8f98' },
    { name: 'Cash', value: '0.96%', color: '#d9ded7' },
  ],
};

const conicByTheme: Record<SiteTheme, string> = {
  dark: 'conic-gradient(#f2eadb 0 87.47%, #5b8def 87.47% 97.9%, #8a8f98 97.9% 99.04%, #54524d 99.04% 100%)',
  light: 'conic-gradient(#151515 0 87.47%, #2f72d6 87.47% 97.9%, #8a8f98 97.9% 99.04%, #d9ded7 99.04% 100%)',
};

const activity = [
  { date: 'Jun 24', text: 'Hermes allocation updated: SOL long 87.47%, BEAT long 10.43%, ZEC long 1.14%' },
  { date: 'Jun 23', text: 'Capital posted through Stripe' },
  { date: 'Jun 23', text: 'Stripe sandbox simulation treasury allocation completed' },
];

const summary = [
  { label: 'Total Deposited', value: '$100,000' },
  { label: 'Current Value', value: '$50,897' },
  { label: 'Net Profit', value: '-$49,103' },
  { label: 'Withdrawable', value: '$491' },
];

function boardStyles(theme: SiteTheme) {
  const light = theme === 'light';

  return {
    root: light
      ? 'hx-dashboard-plate hxb-board mx-auto w-full max-w-[74rem] bg-[#f7f5ef] text-neutral-950'
      : 'hx-dashboard-plate hxb-board mx-auto w-full max-w-[74rem] text-neutral-50',
    nav: light ? 'border-b border-neutral-200 bg-[#f7f5ef]/90' : 'border-b border-white/10 bg-[#10100e]/90',
    brand: light ? 'inline-flex items-center gap-2 text-sm font-bold text-neutral-950' : 'inline-flex items-center gap-2 text-sm font-bold text-neutral-50',
    navLinks: light ? 'flex items-center gap-5 text-sm font-bold text-neutral-700' : 'flex items-center gap-5 text-sm font-bold text-neutral-300',
    navActive: light ? 'text-neutral-950' : 'text-neutral-50',
    navMuted: light ? 'text-neutral-500' : 'text-neutral-500',
    navRight: light ? 'flex items-center gap-3 text-sm text-neutral-600' : 'flex items-center gap-3 text-sm text-neutral-400',
    pill: light
      ? 'inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 text-neutral-700'
      : 'inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1',
    pillPlain: light
      ? 'rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 text-neutral-700'
      : 'rounded-md border border-white/10 px-2 py-1',
    card: light
      ? 'rounded-lg border border-neutral-200 bg-white p-6 shadow-sm'
      : 'rounded-lg border border-white/10 bg-[#181715] p-6',
    label: light ? 'text-sm font-medium text-neutral-500' : 'text-sm font-medium text-neutral-500',
    title: light ? 'block text-sm font-semibold text-neutral-950' : 'block text-sm font-semibold text-neutral-50',
    heroValue: light
      ? 'mt-2 block text-5xl font-semibold tracking-tight text-neutral-950'
      : 'mt-2 block text-5xl font-semibold tracking-tight text-neutral-50',
    metricValue: light ? 'text-neutral-950' : 'text-neutral-50',
    metricPositive: light ? 'text-emerald-700' : 'text-emerald-400',
    divider: light ? 'border-neutral-200' : 'border-white/10',
    liveBadge: light
      ? 'rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
      : 'rounded-md border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-400',
    simBadge: light
      ? 'rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600'
      : 'rounded-md border border-white/10 px-2 py-0.5 text-xs font-medium text-neutral-400',
    subTile: light
      ? 'rounded-md border border-neutral-200 bg-neutral-50 p-4'
      : 'rounded-md border border-white/10 bg-neutral-900/60 p-4',
    riskTrack: light ? 'mt-5 grid grid-cols-3 gap-2 rounded-lg bg-neutral-100 p-1' : 'mt-5 grid grid-cols-3 gap-2 rounded-lg bg-neutral-900 p-1',
    riskIdle: light
      ? 'rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-600'
      : 'rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500',
    riskActive: light
      ? 'rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-950 shadow-sm'
      : 'rounded-md bg-neutral-700/70 px-3 py-2 text-center text-sm font-semibold text-neutral-50',
    outlookTitle: light ? 'block text-sm font-semibold text-neutral-950' : 'block text-sm font-semibold text-neutral-50',
    outlookBody: light ? 'mt-2 block text-sm leading-6 text-neutral-600' : 'mt-2 block text-sm leading-6 text-neutral-400',
    allocLabel: light ? 'text-neutral-600' : 'text-neutral-300',
    allocValue: light ? 'font-semibold text-neutral-950' : 'font-semibold text-neutral-50',
    donutHole: light ? 'bg-white shadow-inner' : 'bg-[#181715]',
    activityDate: light ? 'text-sm text-neutral-500' : 'text-sm text-neutral-500',
    activityText: light ? 'text-sm leading-6 text-neutral-800' : 'text-sm leading-6 text-neutral-200',
    commentary: light ? 'mt-4 max-w-3xl text-lg leading-8 text-neutral-800' : 'mt-4 max-w-3xl text-lg leading-8 text-neutral-200',
    summaryValue: light ? 'mt-1 block text-2xl font-semibold text-neutral-950' : 'mt-1 block text-2xl font-semibold text-neutral-50',
  };
}

export type HermesBoardFocus = 'overview' | 'posture' | 'outlook' | 'execution';

export function HermesBoardMobileArt({ focus }: { focus?: HermesBoardFocus }) {
  const theme = useSiteTheme();
  const allocation = allocationByTheme[theme];

  return (
    <div className="hxm-board" data-focus={focus} data-board-theme={theme} aria-hidden="true">
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
          <span className="hxm-donut" style={{ background: conicByTheme[theme] }} />
        </div>
        <div className="hxm-allocation-list">
          {allocation.map((item) => (
            <span key={item.name}>
              <i style={{ background: item.color }} />
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
  const theme = useSiteTheme();
  const s = boardStyles(theme);
  const allocation = allocationByTheme[theme];

  return (
    <div className={s.root} data-focus={focus} data-board-theme={theme} aria-hidden="true">
      <div className={s.nav}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className={s.brand}>
            <Mark size={18} />
            Solace
          </span>
          <span className={s.navLinks}>
            <span className={s.navActive}>Hermes</span>
            <span>Contract</span>
            <span>Capital</span>
            <span className={s.navMuted}>Account ending 98D5</span>
          </span>
          <span className={s.navRight}>
            <span className={s.pill}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live 5s
            </span>
            <span className={s.pillPlain}>Simulation</span>
            <span>Logout</span>
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-7">
        <div className={`${s.card} hxb-region is-overview`}>
          <div className="grid grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <span className="inline-flex items-center gap-2">
                <span className={s.label}>Portfolio Value</span>
                <span className={s.liveBadge}>Live simulation</span>
                <span className={s.simBadge}>Simulation capital</span>
              </span>
              <span className={s.heroValue}>$50,897.01</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              <div>
                <span className="block text-sm text-neutral-500">Today&apos;s Change</span>
                <span className={`mt-1 block text-lg font-semibold ${s.metricValue}`}>$0.00 (0%)</span>
              </div>
              <div>
                <span className="block text-sm text-neutral-500">Since Inception</span>
                <span className={`mt-1 block text-lg font-semibold ${s.metricValue}`}>-49.1%</span>
              </div>
            </div>
          </div>
          <div className={`mt-6 grid grid-cols-4 gap-4 border-t ${s.divider} pt-5`}>
            {[
              ['Available Balance', '$490.64', s.metricValue],
              ['In Strategy', '$50,406.37', s.metricValue],
              ['Open PnL', '+$19,692.98', s.metricPositive],
              ['Withdrawable', '$490.64', s.metricValue],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="block text-sm text-neutral-500">{k}</span>
                <span className={`mt-1 block text-lg font-semibold ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${s.card} hxb-region is-posture`}>
          <span className={s.label}>Hermes Status</span>
          <span className={s.title}>Operating posture</span>
          <div className={`mt-5 grid grid-cols-4 gap-4 border-t ${s.divider} pt-5`}>
            {[
              ['Status', 'ACTIVE', s.metricPositive],
              ['Risk Profile', 'Balanced', s.metricValue],
              ['Capital Deployed', '99.04%', s.metricValue],
              ['Conviction', 'High', s.metricValue],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="block text-sm text-neutral-500">{k}</span>
                <span className={`mt-1 block text-base font-semibold ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className={s.riskTrack}>
            <span className={s.riskIdle}>Preservation</span>
            <span className={s.riskActive}>Balanced</span>
            <span className={s.riskIdle}>Velocity</span>
          </div>
        </div>

        <div className={`${s.card} hxb-region is-outlook`}>
          <span className={s.label}>Hermes Outlook</span>
          <span className={s.title}>Opportunity environment</span>
          <div className={`mt-5 grid grid-cols-[13rem_1fr] items-center gap-7 border-t ${s.divider} pt-5`}>
            <div>
              <span className="block text-sm text-neutral-500">Current Outlook</span>
              <span className={`mt-1 block text-4xl font-semibold ${s.metricValue}`}>Moderate</span>
            </div>
            <div className={`border-l ${s.divider} pl-6`}>
              <span className={s.outlookTitle}>Selective deployment</span>
              <span className={s.outlookBody}>
                Opportunity is present, but Hermes is preserving cash for clearer deployment.
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
          <div className={`${s.card} hxb-region is-execution`}>
            <span className={s.label}>Current Allocation</span>
            <span className={s.title}>Capital mix</span>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className={s.subTile}>
                <span className="block text-sm text-neutral-500">Capital Deployed</span>
                <span className={`mt-1 block text-2xl font-semibold ${s.metricValue}`}>99.04%</span>
              </div>
              <div className={s.subTile}>
                <span className="block text-sm text-neutral-500">Cash Reserve</span>
                <span className={`mt-1 block text-2xl font-semibold ${s.metricValue}`}>0.96%</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6">
              <div
                className="grid aspect-square w-40 place-items-center rounded-full"
                style={{ background: conicByTheme[theme] }}
              >
                <div className={`grid h-[64%] w-[64%] place-items-center rounded-full text-center ${s.donutHole}`}>
                  <span>
                    <span className="block text-xs text-neutral-500">Allocated</span>
                    <span className={`block text-xl font-semibold ${s.metricValue}`}>99.04%</span>
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                {allocation.map((item) => (
                  <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                    <span className={s.allocLabel}>{item.name}</span>
                    <span className={s.allocValue}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${s.card} hxb-region is-execution`}>
            <span className={s.label}>Recent Activity</span>
            <span className={s.title}>Latest decisions</span>
            <div className="mt-4 grid gap-0">
              {activity.map((item) => (
                <div
                  key={item.text}
                  className={`grid grid-cols-[4.5rem_1fr] gap-4 border-t ${s.divider} py-4 first:border-t-0 first:pt-0`}
                >
                  <span className={s.activityDate}>{item.date}</span>
                  <span className={s.activityText}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${s.card} hxb-region is-execution`}>
          <span className={s.label}>Hermes Commentary</span>
          <span className={s.title}>Current read</span>
          <p className={s.commentary}>
            Hermes remains selectively deployed while preserving liquidity for emerging opportunities.
            Current conditions favor continuation over aggressive expansion.
          </p>
        </div>

        <div className={`${s.card} hxb-region is-execution`}>
          <span className={s.label}>Account</span>
          <span className={s.title}>Summary</span>
          <div className={`mt-6 grid grid-cols-4 gap-4 border-t ${s.divider} pt-5`}>
            {summary.map((item) => (
              <div key={item.label}>
                <span className="block text-sm text-neutral-500">{item.label}</span>
                <span className={s.summaryValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}