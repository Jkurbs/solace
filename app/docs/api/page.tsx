import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '@/app/Mark';
import ThemeToggle from '@/app/ThemeToggle';
import { getHermesPublicMarketRead } from '@/features/hermes-market/read';
import { hermesVersion } from '@/features/hermes-version';
import { DOCS_API_URL, HERMES_MARKET_API_PATH, HERMES_MARKET_API_URL } from '@/lib/docs';

import MarketReadingAge from './MarketReadingAge';
import { CopyButton } from './CopyButton';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Solace Docs · Hermes Market API',
  description:
    'Public market read from Hermes: posture, outlook, and environment: how Hermes sees the market, not what it trades.',
  alternates: { canonical: DOCS_API_URL },
  openGraph: {
    title: 'Hermes Market API',
    description: 'Public-safe market read. Posture, outlook, environment. No signals. No trades.',
    url: DOCS_API_URL,
  },
};

export const dynamic = 'force-dynamic';

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.88048 6.89231C9.69226 4.08054 14.251 4.08054 17.0628 6.89231L16.2364 7.71871C15.7324 8.22268 16.0894 9.0844 16.8021 9.0844H19.7276C20.1694 9.0844 20.5276 8.72623 20.5276 8.2844V5.35891C20.5276 4.64619 19.6659 4.28926 19.1619 4.79323L18.3356 5.61952C14.8209 2.1048 9.12241 2.1048 5.60769 5.61952C2.09297 9.13424 2.09297 14.8327 5.60769 18.3474C9.12241 21.8622 14.8209 21.8622 18.3356 18.3474C19.4929 17.1902 20.2703 15.7937 20.6655 14.3163C20.7939 13.8361 20.5087 13.3428 20.0285 13.2143C19.5483 13.0859 19.055 13.3711 18.9266 13.8513C18.611 15.0314 17.9906 16.1469 17.0628 17.0746C14.251 19.8864 9.69226 19.8864 6.88048 17.0746C4.06871 14.2629 4.06871 9.70409 6.88048 6.89231Z" fill="currentColor"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.1001C17.4676 2.10031 21.8994 6.53286 21.8994 12.0005C21.8992 17.4679 17.4674 21.8997 12 21.8999C6.53237 21.8999 2.09982 17.4681 2.09961 12.0005C2.09961 6.53273 6.53224 2.1001 12 2.1001ZM12 3.8999C7.52636 3.8999 3.89941 7.52684 3.89941 12.0005C3.89963 16.474 7.52649 20.1001 12 20.1001C16.4733 20.0999 20.0994 16.4738 20.0996 12.0005C20.0996 7.52697 16.4735 3.90011 12 3.8999ZM12 9.50049C12.4969 9.50068 12.8994 9.87055 12.8994 10.3267V16.6743C12.8992 17.1303 12.4968 17.5003 12 17.5005C11.503 17.5005 11.0998 17.1304 11.0996 16.6743V10.3267C11.0996 9.87043 11.5029 9.50049 12 9.50049ZM12 6.49951C12.4968 6.49951 12.8994 6.90313 12.8994 7.3999C12.8992 7.8965 12.4966 8.30029 12 8.30029C11.5025 8.30028 11.0998 7.8965 11.0996 7.3999C11.0996 6.90313 11.5024 6.49952 12 6.49951Z" fill="currentColor"/>
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.5293 15.0596C16.9496 15.1021 17.2772 15.4572 17.2773 15.8887C17.2773 16.3202 16.9497 16.6753 16.5293 16.7178L16.4443 16.7217H12C11.5399 16.7216 11.167 16.3488 11.167 15.8887C11.1671 15.4286 11.54 15.0558 12 15.0557H16.4443L16.5293 15.0596Z" fill="currentColor"/>
      <path d="M6.96582 7.52246C7.27077 7.21751 7.75375 7.1983 8.08105 7.46484L8.14453 7.52246L10.8232 10.2002C11.5102 10.8872 11.5102 12.0014 10.8232 12.6885L8.14453 15.3672L8.08105 15.4248C7.75377 15.6913 7.27075 15.6721 6.96582 15.3672C6.66114 15.0621 6.64234 14.5791 6.90918 14.252L6.96582 14.1885L9.64453 11.5098C9.68057 11.4736 9.68062 11.415 9.64453 11.3789L6.96582 8.7002C6.64116 8.37488 6.6411 7.84774 6.96582 7.52246Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M17 3.09961C19.1539 3.09966 20.9004 4.84612 20.9004 7V17C20.9004 19.1539 19.1539 20.9003 17 20.9004H7C4.84609 20.9004 3.09961 19.1539 3.09961 17V7C3.09961 4.84609 4.84609 3.09961 7 3.09961H17ZM7 4.90039C5.8402 4.90039 4.90039 5.8402 4.90039 7V17C4.90039 18.1598 5.8402 19.0996 7 19.0996H17C18.1598 19.0996 19.0996 18.1598 19.0996 17V7C19.0996 5.84024 18.1598 4.90044 17 4.90039H7Z" fill="currentColor"/>
    </svg>
  );
}

function PulseDot({ pulse }: { pulse: string }) {
  const isLive = pulse.toLowerCase() === 'live';
  return <div className={`${styles.pulseDot} ${isLive ? styles.pulseDotLive : ''}`} />;
}

function FieldCard({ label, value, hint, children }: { label: string; value: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className={styles.fieldCard}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value}</div>
      {hint ? <div className={styles.fieldHint}>{hint}</div> : null}
      {children}
    </div>
  );
}

function CapitalDots({ active, total }: { active: number; total: number }) {
  return (
    <div className={styles.capitalDots}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i < active ? styles.capitalDotActive : styles.capitalDot} />
      ))}
    </div>
  );
}

function highlightJson(json: string): string {
  const keyColor = 'var(--kimi-color-text-secondary)';
  const strColor = 'var(--kimi-chart-1)';
  const numColor = 'var(--kimi-color-text-primary)';
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(?:\\.|[^"\\])*")(\s*:)/g, `<span style="color:${keyColor}">$1</span>$2`)
    .replace(/:\s*("(?:\\.|[^"\\])*")/g, `: <span style="color:${strColor}">$1</span>`)
    .replace(/:\s*(\d+)/g, `: <span style="color:${numColor}">$1</span>`);
}

export default async function DocsApiPage() {
  const market = await getHermesPublicMarketRead();
  const prettyJson = JSON.stringify(market, null, 2);
  const curlCommand = `curl -sS ${HERMES_MARKET_API_URL} | jq .`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href={DOCS_API_URL} className={styles.brand}>
            <Mark size={20} />
            Solace
          </Link>
          <nav className={styles.nav}>
            <a href="https://solace.fyi/hermes" className={styles.navLink}>Hermes</a>
            <a href="https://solace.fyi/observatory/hermes/ledger" className={styles.navLink}>Ledger</a>
            <a href="https://solace.fyi" className={styles.navLink}>solace.fyi</a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>docs.solace.fyi/api · {hermesVersion.label}</p>
        <h1 className={styles.heroTitle}>How Hermes sees the market</h1>
        <p className={styles.heroBody}>
          A public-safe market read: posture, outlook, and environment. Not trades. Not signals. The same language that appears on the homepage, available as JSON.
        </p>
      </section>

      <section className={styles.liveCard} aria-label="Current market read">
        <div className={styles.liveHeader}>
          <div className={styles.pulseGroup}>
            <PulseDot pulse={market.pulse} />
            <div>
              <div className={styles.pulseLabel}>{market.posture}</div>
              <div className={styles.pulseSublabel}>Capital stance right now</div>
            </div>
          </div>
          <div className={styles.liveMeta}>
            <RefreshIcon />
            <MarketReadingAge asOf={market.as_of} />
          </div>
        </div>

        <p className={styles.summary}>{market.summary}</p>

        <div className={styles.fieldGrid}>
          <FieldCard label="posture" value={market.posture} hint="Capital stance right now" />
          <FieldCard label="outlook" value={market.outlook} hint="Risk / opportunity tone" />
          <FieldCard label="environment" value={market.environment} hint="Regime character" />
          <FieldCard
            label="capital"
            value={market.capital.active}
            hint={`${market.capital.deployed_paths} paths deployed · ${market.capital.paths_under_review} under review`}
          >
            <CapitalDots active={market.capital.deployed_paths} total={market.capital.deployed_paths + market.capital.paths_under_review} />
          </FieldCard>
        </div>

        <div className={styles.disclosure}>
          <InfoIcon />
          {market.disclosure}
        </div>
      </section>

      <section className={styles.apiSection} aria-label="API">
        <div className={styles.apiHeader}>
          <p className={styles.kicker}>Endpoint</p>
          <h2 className={styles.apiTitle}>GET {HERMES_MARKET_API_PATH}</h2>
          <p className={styles.apiBody}>
            No auth. CORS open for browser clients. Soft rate limit: 60 requests / minute / IP. Response is public-safe by design.
          </p>
        </div>

        <div className={styles.panels}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div className={styles.panelLabel}>
                <CodeIcon />
                curl
              </div>
              <CopyButton text={curlCommand} label="Copy" />
            </div>
            <div className={styles.codeWrap}>
              <pre className={styles.codePre}><code>{curlCommand}</code></pre>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div className={styles.panelLabel}>
                <CodeIcon />
                response
              </div>
              <CopyButton text={prettyJson} label="Copy JSON" />
            </div>
            <div className={styles.codeWrap}>
              <pre className={styles.codePre}>
                <code dangerouslySetInnerHTML={{ __html: highlightJson(prettyJson) }} />
              </pre>
            </div>
          </div>
        </div>

        <ul className={styles.rules}>
          <li>Includes posture, outlook, environment, capital activity, freshness, version</li>
          <li>Excludes instruments, sizes, entries, exits, thresholds, themes, next-condition mechanics</li>
          <li>Honesty: standing down is a valid read; stale pulse means the feed is old</li>
        </ul>
      </section>

      <section className={styles.fieldsSection} aria-label="Field reference">
        <p className={styles.kicker}>Contract</p>
        <h2 className={styles.fieldsTitle}>Fields that stay</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Field</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>posture</code></td>
                <td>How capital is standing: deployed, selective, defensive, standing down, risk off</td>
              </tr>
              <tr>
                <td><code>outlook</code></td>
                <td>Coarse risk tone (moderate, cautious, constructive), not a forecast score</td>
              </tr>
              <tr>
                <td><code>environment</code></td>
                <td>Regime character in plain language</td>
              </tr>
              <tr>
                <td><code>capital.active</code></td>
                <td>None, limited, active, or reduced: activity level, not allocation recipe</td>
              </tr>
              <tr>
                <td><code>capital.deployed_paths</code> / <code>paths_under_review</code></td>
                <td>Counts only: homepage-grade transparency, not which markets</td>
              </tr>
              <tr>
                <td><code>pulse</code> / <code>as_of</code></td>
                <td>Freshness of the read: live, recent, or stale</td>
              </tr>
              <tr>
                <td><code>version</code></td>
                <td>Hermes product version publishing this read</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Hermes market API · {market.version} · docs.solace.fyi/api ·{' '}
          <a href="https://solace.fyi/observatory/hermes/ledger" className={styles.footerLink}>
            Decision ledger
          </a>
        </p>
        <a href="https://solace.fyi/hermes" className={styles.footerLink}>
          Back to Hermes
        </a>
      </footer>
    </main>
  );
}