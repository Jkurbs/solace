import Mark from '../Mark';

/**
 * A static, faithful recreation of the live Hermes dashboard, used as the
 * product visual on the Learn More page. Mirrors the real dashboard's structure
 * and styling (dark cards, neutral palette, conic allocation donut) with the
 * simulation/beta figures shown in the product. Decorative - aria-hidden.
 */

const card = 'rounded-lg border border-white/10 bg-[#181715] p-6';
const label = 'text-sm font-medium text-neutral-500';
const title = 'block text-sm font-semibold text-neutral-50';

const allocation = [
  { name: 'SOL Long', value: '87.47%', color: '#f2eadb' },
  { name: 'BEAT Long', value: '10.43%', color: '#5b8def' },
  { name: 'ZEC Long', value: '1.14%', color: '#8a8f98' },
  { name: 'Cash', value: '0.96%', color: '#54524d' },
];

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

export type HermesBoardFocus = 'overview' | 'posture' | 'outlook' | 'execution';

export function HermesBoardMobileArt({ focus }: { focus?: HermesBoardFocus }) {
  return (
    <div className="hxm-board" data-focus={focus} aria-hidden="true">
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
          <span className="hxm-donut" />
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
  return (
    <div className="hx-dashboard-plate hxb-board mx-auto w-full max-w-[74rem] text-neutral-50" data-focus={focus} aria-hidden="true">
      {/* Top nav */}
      <div className="border-b border-white/10 bg-[#10100e]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-neutral-50">
            <Mark size={18} />
            Solace
          </span>
          <span className="flex items-center gap-5 text-sm font-bold text-neutral-300">
            <span className="text-neutral-50">Hermes</span>
            <span>Contract</span>
            <span>Capital</span>
            <span className="text-neutral-500">Account ending 98D5</span>
          </span>
          <span className="flex items-center gap-3 text-sm text-neutral-400">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live 5s
            </span>
            <span className="rounded-md border border-white/10 px-2 py-1">Simulation</span>
            <span>Logout</span>
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-7">
        {/* Portfolio Value */}
        <div className={`${card} hxb-region is-overview`}>
          <div className="grid grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <span className="inline-flex items-center gap-2">
                <span className={label}>Portfolio Value</span>
                <span className="rounded-md border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Live simulation
                </span>
                <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs font-medium text-neutral-400">
                  Simulation capital
                </span>
              </span>
              <span className="mt-2 block text-5xl font-semibold tracking-tight text-neutral-50">$50,897.01</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              <div>
                <span className="block text-sm text-neutral-500">Today&apos;s Change</span>
                <span className="mt-1 block text-lg font-semibold text-neutral-50">$0.00 (0%)</span>
              </div>
              <div>
                <span className="block text-sm text-neutral-500">Since Inception</span>
                <span className="mt-1 block text-lg font-semibold text-neutral-50">-49.1%</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4 border-t border-white/10 pt-5">
            {[
              ['Available Balance', '$490.64', 'text-neutral-50'],
              ['In Strategy', '$50,406.37', 'text-neutral-50'],
              ['Open PnL', '+$19,692.98', 'text-emerald-400'],
              ['Withdrawable', '$490.64', 'text-neutral-50'],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="block text-sm text-neutral-500">{k}</span>
                <span className={`mt-1 block text-lg font-semibold ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hermes Status */}
        <div className={`${card} hxb-region is-posture`}>
          <span className={label}>Hermes Status</span>
          <span className={title}>Operating posture</span>
          <div className="mt-5 grid grid-cols-4 gap-4 border-t border-white/10 pt-5">
            {[
              ['Status', 'ACTIVE', 'text-emerald-400'],
              ['Risk Profile', 'Balanced', 'text-neutral-50'],
              ['Capital Deployed', '99.04%', 'text-neutral-50'],
              ['Conviction', 'High', 'text-neutral-50'],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="block text-sm text-neutral-500">{k}</span>
                <span className={`mt-1 block text-base font-semibold ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-neutral-900 p-1">
            <span className="rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500">Preservation</span>
            <span className="rounded-md bg-neutral-700/70 px-3 py-2 text-center text-sm font-semibold text-neutral-50">
              Balanced
            </span>
            <span className="rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500">Velocity</span>
          </div>
        </div>

        {/* Hermes Outlook */}
        <div className={`${card} hxb-region is-outlook`}>
          <span className={label}>Hermes Outlook</span>
          <span className={title}>Opportunity environment</span>
          <div className="mt-5 grid grid-cols-[13rem_1fr] items-center gap-7 border-t border-white/10 pt-5">
            <div>
              <span className="block text-sm text-neutral-500">Current Outlook</span>
              <span className="mt-1 block text-4xl font-semibold text-neutral-50">Moderate</span>
            </div>
            <div className="border-l border-white/10 pl-6">
              <span className="block text-sm font-semibold text-neutral-50">Selective deployment</span>
              <span className="mt-2 block text-sm leading-6 text-neutral-400">
                Opportunity is present, but Hermes is preserving cash for clearer deployment.
              </span>
            </div>
          </div>
        </div>

        {/* Allocation + Activity */}
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
          <div className={`${card} hxb-region is-execution`}>
            <span className={label}>Current Allocation</span>
            <span className={title}>Capital mix</span>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/10 bg-neutral-900/60 p-4">
                <span className="block text-sm text-neutral-500">Capital Deployed</span>
                <span className="mt-1 block text-2xl font-semibold text-neutral-50">99.04%</span>
              </div>
              <div className="rounded-md border border-white/10 bg-neutral-900/60 p-4">
                <span className="block text-sm text-neutral-500">Cash Reserve</span>
                <span className="mt-1 block text-2xl font-semibold text-neutral-50">0.96%</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6">
              <div
                className="grid aspect-square w-40 place-items-center rounded-full"
                style={{
                  background:
                    'conic-gradient(#f2eadb 0 87.47%, #5b8def 87.47% 97.9%, #8a8f98 97.9% 99.04%, #54524d 99.04% 100%)',
                }}
              >
                <div className="grid h-[64%] w-[64%] place-items-center rounded-full bg-[#181715] text-center">
                  <span>
                    <span className="block text-xs text-neutral-500">Allocated</span>
                    <span className="block text-xl font-semibold text-neutral-50">99.04%</span>
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                {allocation.map((item) => (
                  <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-neutral-300">{item.name}</span>
                    <span className="font-semibold text-neutral-50">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${card} hxb-region is-execution`}>
            <span className={label}>Recent Activity</span>
            <span className={title}>Latest decisions</span>
            <div className="mt-4 grid gap-0">
              {activity.map((item) => (
                <div
                  key={item.text}
                  className="grid grid-cols-[4.5rem_1fr] gap-4 border-t border-white/10 py-4 first:border-t-0 first:pt-0"
                >
                  <span className="text-sm text-neutral-500">{item.date}</span>
                  <span className="text-sm leading-6 text-neutral-200">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commentary */}
        <div className={`${card} hxb-region is-execution`}>
          <span className={label}>Hermes Commentary</span>
          <span className={title}>Current read</span>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-200">
            Hermes remains selectively deployed while preserving liquidity for emerging opportunities.
            Current conditions favor continuation over aggressive expansion.
          </p>
        </div>

        {/* Account Summary */}
        <div className={`${card} hxb-region is-execution`}>
          <span className={label}>Account</span>
          <span className={title}>Summary</span>
          <div className="mt-6 grid grid-cols-4 gap-4 border-t border-white/10 pt-5">
            {summary.map((item) => (
              <div key={item.label}>
                <span className="block text-sm text-neutral-500">{item.label}</span>
                <span className="mt-1 block text-2xl font-semibold text-neutral-50">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
