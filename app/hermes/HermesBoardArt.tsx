import Mark from '../Mark';

/**
 * A static, faithful recreation of the live Hermes dashboard, used as the
 * product visual on the Learn More page. Mirrors the real dashboard's structure
 * and styling (dark cards, neutral palette, conic allocation donut) with the
 * simulation/beta figures shown in the product. Decorative and aria-hidden.
 */

const card = 'rounded-lg border border-white/10 bg-[#181715] p-6 sm:p-7';
const label = 'text-sm font-medium text-neutral-500';
const title = 'block text-sm font-semibold text-neutral-50';

const allocation = [
  { name: 'Active Strategy', value: '64%', color: '#f2eadb' },
  { name: 'Review Reserve', value: '20%', color: '#5b8def' },
  { name: 'Risk Buffer', value: '12%', color: '#8a8f98' },
  { name: 'Cash', value: '4%', color: '#54524d' },
];

const activity = [
  { date: 'Jun 24', text: 'Hermes allocation posture updated after liquidity review' },
  { date: 'Jun 23', text: 'Capital event recorded in beta simulation mode' },
  { date: 'Jun 23', text: 'Treasury simulation completed and reconciled' },
];

const summary = [
  { label: 'Customer Funds', value: '$0' },
  { label: 'Portfolio Values', value: 'Private' },
  { label: 'Performance', value: 'Private' },
  { label: 'Withdrawable', value: 'Private' },
];

export default function HermesBoardArt() {
  return (
    <div className="mx-auto w-[74rem] text-neutral-50" aria-hidden="true">
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
            <span className="text-neutral-500">Demo account</span>
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
        <div className={card}>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
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
              <span className="mt-2 block text-5xl font-semibold tracking-tight text-neutral-50">Beta Preview</span>
            </div>
            <div className="grid gap-3 text-right sm:grid-cols-2">
              <div>
                <span className="block text-sm text-neutral-500">Today&apos;s Change</span>
                <span className="mt-1 block text-lg font-semibold text-neutral-50">Private</span>
              </div>
              <div>
                <span className="block text-sm text-neutral-500">Since Inception</span>
                <span className="mt-1 block text-lg font-semibold text-neutral-50">Private</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Available Balance', 'Private', 'text-neutral-50'],
              ['In Strategy', 'Private', 'text-neutral-50'],
              ['Performance', 'Private', 'text-neutral-50'],
              ['Withdrawable', 'Private', 'text-neutral-50'],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="block text-sm text-neutral-500">{k}</span>
                <span className={`mt-1 block text-lg font-semibold ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hermes Status */}
        <div className={card}>
          <span className={label}>Hermes Status</span>
          <span className={title}>Operating posture</span>
          <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Status', 'ACTIVE', 'text-emerald-400'],
              ['Risk Profile', 'Balanced', 'text-neutral-50'],
              ['Capital Deployed', 'Simulated', 'text-neutral-50'],
              ['Conviction', 'High', 'text-neutral-50'],
            ].map(([k, v, tone]) => (
              <div key={k}>
                <span className="block text-sm text-neutral-500">{k}</span>
                <span className={`mt-1 block text-base font-semibold ${tone}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 rounded-lg bg-neutral-900 p-1 sm:grid-cols-3">
            <span className="rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500">Preservation</span>
            <span className="rounded-md bg-neutral-700/70 px-3 py-2 text-center text-sm font-semibold text-neutral-50">
              Balanced
            </span>
            <span className="rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500">Velocity</span>
          </div>
        </div>

        {/* Hermes Outlook */}
        <div className={card}>
          <span className={label}>Hermes Outlook</span>
          <span className={title}>Opportunity environment</span>
          <div className="mt-5 grid gap-7 border-t border-white/10 pt-5 sm:grid-cols-[13rem_1fr] sm:items-center">
            <div>
              <span className="block text-sm text-neutral-500">Current Outlook</span>
              <span className="mt-1 block text-4xl font-semibold text-neutral-50">Moderate</span>
            </div>
            <div className="border-white/10 sm:border-l sm:pl-6">
              <span className="block text-sm font-semibold text-neutral-50">Selective deployment</span>
              <span className="mt-2 block text-sm leading-6 text-neutral-400">
                Opportunity is present, but Hermes is preserving room for clearer deployment.
              </span>
            </div>
          </div>
        </div>

        {/* Allocation + Activity */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className={card}>
            <span className={label}>Current Allocation</span>
            <span className={title}>Capital mix</span>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-neutral-900/60 p-4">
                <span className="block text-sm text-neutral-500">Capital Deployed</span>
                <span className="mt-1 block text-2xl font-semibold text-neutral-50">64%</span>
              </div>
              <div className="rounded-md border border-white/10 bg-neutral-900/60 p-4">
                <span className="block text-sm text-neutral-500">Cash Reserve</span>
                <span className="mt-1 block text-2xl font-semibold text-neutral-50">36%</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6">
              <div
                className="grid aspect-square w-40 place-items-center rounded-full"
                style={{
                  background:
                    'conic-gradient(#f2eadb 0 64%, #5b8def 64% 84%, #8a8f98 84% 96%, #54524d 96% 100%)',
                }}
              >
                <div className="grid h-[64%] w-[64%] place-items-center rounded-full bg-[#181715] text-center">
                  <span>
                    <span className="block text-xs text-neutral-500">Allocated</span>
                    <span className="block text-xl font-semibold text-neutral-50">64%</span>
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

          <div className={card}>
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
        <div className={card}>
          <span className={label}>Hermes Commentary</span>
          <span className={title}>Current read</span>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-200">
            Hermes remains selectively deployed while preserving liquidity for emerging opportunities.
            Current conditions favor continuation over aggressive expansion.
          </p>
        </div>

        {/* Account Summary */}
        <div className={card}>
          <span className={label}>Account</span>
          <span className={title}>Summary</span>
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
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
