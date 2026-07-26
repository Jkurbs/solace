import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '@/app/Mark';
import ThemeToggle from '@/app/ThemeToggle';
import { getHermesPublicMarketRead } from '@/features/hermes-market/read';
import { hermesVersion } from '@/features/hermes-version';
import { DOCS_API_URL, HERMES_MARKET_API_PATH, HERMES_MARKET_API_URL } from '@/lib/docs';

import MarketCopyButton from './MarketCopyButton';
import MarketReadingAge from './MarketReadingAge';

export const metadata: Metadata = {
  title: 'Solace Docs — Hermes Market API',
  description:
    'Public market read from Hermes: posture, outlook, and environment — how Hermes sees the market, not what it trades.',
  alternates: {
    canonical: DOCS_API_URL,
  },
  openGraph: {
    title: 'Hermes Market API',
    description: 'Public-safe market read. Posture, outlook, environment. No signals. No trades.',
    url: DOCS_API_URL,
  },
};

export const dynamic = 'force-dynamic';

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="hm-field">
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        {hint ? <span className="hm-field-hint">{hint}</span> : null}
      </dd>
    </div>
  );
}

export default async function DocsApiPage() {
  const market = await getHermesPublicMarketRead();
  const prettyJson = JSON.stringify(market, null, 2);
  const curlCommand = `curl -sS ${HERMES_MARKET_API_URL} | jq .`;

  return (
    <main className="hm-page">
      <header className="hm-header">
        <div className="hm-header-inner">
          <Link href={DOCS_API_URL} className="hm-brand">
            <Mark size={20} />
            Solace Docs
          </Link>
          <div className="hm-header-actions">
            <a href="https://solace.fyi/hermes" className="hm-link">
              Hermes
            </a>
            <a href="https://solace.fyi/trust" className="hm-link">
              Ledger
            </a>
            <a href="https://solace.fyi" className="hm-link">
              solace.fyi
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="hm-hero">
        <p className="section-kicker">
          docs.solace.fyi/api · {hermesVersion.label}
        </p>
        <h1>How Hermes sees the market.</h1>
        <p className="hm-dek">
          A public-safe market read — posture, outlook, and environment. Not trades. Not signals. Not the
          mechanism. The same grade of language that appears on the homepage, available as JSON.
        </p>
      </section>

      <section className="hm-live" aria-label="Current market read">
        <div className="hm-live-head">
          <div>
            <p className="section-kicker">Live read</p>
            <h2>
              {market.posture}
              <span className={`hm-pulse is-${market.pulse.toLowerCase()}`}>{market.pulse}</span>
            </h2>
          </div>
          <p className="hm-live-age">
            <MarketReadingAge asOf={market.as_of} />
          </p>
        </div>

        <p className="hm-summary">{market.summary}</p>

        <dl className="hm-grid">
          <Field label="Posture" value={market.posture} hint="Capital stance right now" />
          <Field label="Outlook" value={market.outlook} hint="Risk / opportunity tone" />
          <Field label="Environment" value={market.environment} hint="Regime character" />
          <Field
            label="Capital"
            value={market.capital.active}
            hint={
              market.capital.paths_under_review > 0
                ? `${market.capital.deployed_paths} active · ${market.capital.paths_under_review} under review`
                : 'No paths under review'
            }
          />
        </dl>

        <p className="hm-disclosure">{market.disclosure}</p>
      </section>

      <section className="hm-api" aria-label="API">
        <div className="hm-api-copy">
          <p className="section-kicker">Endpoint</p>
          <h2>GET {HERMES_MARKET_API_PATH}</h2>
          <p>
            No auth. CORS open for browser clients. Soft rate limit: 60 requests / minute / IP. Response is
            public-safe by design — fields will not grow into signal dumps. Docs live at{' '}
            <code className="hm-inline-code">docs.solace.fyi/api</code>.
          </p>

          <ul className="hm-rules">
            <li>
              <strong>Includes</strong> posture, outlook, environment, capital activity, freshness, version
            </li>
            <li>
              <strong>Excludes</strong> instruments, sizes, entries, exits, thresholds, themes, next-condition
              mechanics
            </li>
            <li>
              <strong>Honesty</strong> standing down is a valid read; stale pulse means the feed is old
            </li>
          </ul>
        </div>

        <div className="hm-api-panels">
          <div className="hm-panel">
            <div className="hm-panel-head">
              <span>curl</span>
              <MarketCopyButton text={curlCommand} label="Copy" />
            </div>
            <pre className="hm-code">
              <code>{curlCommand}</code>
            </pre>
          </div>

          <div className="hm-panel">
            <div className="hm-panel-head">
              <span>Response</span>
              <MarketCopyButton text={prettyJson} label="Copy JSON" />
            </div>
            <pre className="hm-code hm-code-json">
              <code>{prettyJson}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="hm-fields" aria-label="Field reference">
        <p className="section-kicker">Contract</p>
        <h2>Fields that stay.</h2>
        <div className="hm-fields-table-wrap">
          <table className="hm-fields-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>posture</code>
                </td>
                <td>How capital is standing: Deployed, Selective, Defensive, Standing Down, Risk Off</td>
              </tr>
              <tr>
                <td>
                  <code>outlook</code>
                </td>
                <td>Coarse risk tone — Moderate, Cautious, Constructive — not a forecast score</td>
              </tr>
              <tr>
                <td>
                  <code>environment</code>
                </td>
                <td>Regime character in plain language (e.g. Mixed but workable)</td>
              </tr>
              <tr>
                <td>
                  <code>capital.active</code>
                </td>
                <td>None, Limited, Active, or Reduced — activity level, not allocation recipe</td>
              </tr>
              <tr>
                <td>
                  <code>capital.deployed_paths</code> / <code>paths_under_review</code>
                </td>
                <td>Counts only — homepage-grade transparency, not which markets</td>
              </tr>
              <tr>
                <td>
                  <code>pulse</code> / <code>as_of</code>
                </td>
                <td>Freshness of the read — LIVE, RECENT, or STALE</td>
              </tr>
              <tr>
                <td>
                  <code>version</code>
                </td>
                <td>Hermes product version publishing this read</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="hm-foot">
        <p>
          Hermes · Market API · {market.version} · docs.solace.fyi/api ·{' '}
          <a href="https://solace.fyi/trust" className="hm-link">
            Decision ledger
          </a>
        </p>
        <a href="https://solace.fyi/hermes" className="hm-link">
          Back to Hermes
        </a>
      </footer>
    </main>
  );
}
