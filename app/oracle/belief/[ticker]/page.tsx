import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchKalshiBeliefByTicker } from '@/features/oracle/kalshi';
import { OBSERVATORY_ORACLE_LEDGER_PATH } from '@/features/observatory/paths';
import { OG_SIZE } from '@/lib/og-plate';

import Mark from '../../../Mark';
import ThemeToggle from '../../../ThemeToggle';
import ShareBelief from '../../ShareBelief';

export const revalidate = 60;

type Props = {
  params: Promise<{ ticker: string }>;
};

function beliefPath(ticker: string) {
  return `/oracle/belief/${encodeURIComponent(ticker)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw);
  const belief = await fetchKalshiBeliefByTicker(ticker).catch(() => null);
  const pct = belief ? Math.round(belief.probability * 100) : null;
  const title = belief
    ? `Oracle believes ${pct}% · ${belief.question}`
    : `Oracle belief · ${ticker}`;
  const description = belief
    ? `Oracle believes ${pct}%: ${belief.question}. Sealed before the outcome is known. Solace.`
    : 'An Oracle belief from Solace. Sealed before the outcome is known.';

  const path = beliefPath(ticker);
  // Absolute image URL so crawlers unfurl the platter the same way as Hermes ledger.
  const ogImage = {
    url: `${path}/opengraph-image`,
    width: OG_SIZE.width,
    height: OG_SIZE.height,
    alt: belief
      ? `Oracle believes ${pct}%: ${belief.question}`
      : 'Solace Oracle belief card',
  };

  return {
    title: `Solace · ${title}`.slice(0, 110),
    description: description.slice(0, 200),
    alternates: { canonical: path },
    openGraph: {
      title: title.slice(0, 90),
      description: description.slice(0, 180),
      url: path,
      type: 'website',
      siteName: 'Solace',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: title.slice(0, 70),
      description: description.slice(0, 160),
      images: [ogImage.url],
    },
  };
}

function daysUntilResolution(resolvesAt: string): string | null {
  const end = new Date(resolvesAt).getTime();
  if (!Number.isFinite(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return 'Resolving soon';
  const days = Math.max(1, Math.ceil(ms / 86_400_000));
  return days === 1 ? '1 day until resolution' : `${days} days until resolution`;
}

export default async function OracleBeliefPage({ params }: Props) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw);
  const belief = await fetchKalshiBeliefByTicker(ticker).catch(() => null);
  if (!belief) notFound();

  const pct = Math.round(belief.probability * 100);
  const conf = Math.round(belief.confidence * 100);
  const resolutionLabel = daysUntilResolution(belief.resolvesAt);

  return (
    <main className="oracle-shell hermes-paper min-h-screen text-foreground">
      <header className="oracle-shell-header">
        <div className="oracle-shell-header-inner">
          <Link href="/" className="oracle-shell-brand" aria-label="Solace home">
            <Mark size={18} className="site-mark" />
            <span>Solace</span>
          </Link>
          <div className="oracle-shell-actions">
            <ThemeToggle />
            <Link href="/oracle" className="oracle-shell-link">
              Oracle
            </Link>
            <Link href={OBSERVATORY_ORACLE_LEDGER_PATH} className="oracle-shell-link">
              Ledger
            </Link>
          </div>
        </div>
      </header>

      <article className="oracle-board oracle-belief-page">
        <p className="oracle-board-kicker">
          <span className="oracle-live-pill">
            <i aria-hidden="true" />
            Oracle believes
          </span>
        </p>

        {/* Centered social-landing card: what Oracle believes at a glance */}
        <div className="oracle-belief-platter">
          <p className="oracle-belief-platter-kicker">
            oracle believes
            {belief.asset ? (
              <span className={`oracle-belief-asset is-${belief.asset}`}>
                {belief.asset.toUpperCase()}
              </span>
            ) : null}
          </p>
          <h1 className="oracle-belief-platter-question">{belief.question}</h1>
          <p className="oracle-belief-platter-prob">
            <strong>{pct}%</strong>
            <span>probability</span>
          </p>
          <div className="oracle-belief-platter-meta">
            <span className="oracle-belief-confidence">
              <span aria-hidden="true">✓</span>
              Confidence {conf}%
            </span>
            {resolutionLabel ? (
              <span className="oracle-belief-platter-resolve">{resolutionLabel}</span>
            ) : null}
          </div>
          <div className="oracle-belief-platter-share">
            <ShareBelief id={belief.id} question={belief.question} probability={belief.probability} />
          </div>
          <p className="oracle-belief-platter-url">solace.fyi/oracle</p>
        </div>

        <p className="oracle-board-footnote">
          Cite a source, not an opinion. Every belief is recorded before the outcome is known. Paste the
          link anywhere, platforms load the platter card from the page.
        </p>

        <div className="oracle-belief-page-actions">
          <Link href="/oracle" className="oracle-board-ledger-btn">
            All Oracle beliefs
            <span aria-hidden="true">→</span>
          </Link>
          <Link href={OBSERVATORY_ORACLE_LEDGER_PATH} className="oracle-shell-link">
            Check the ledger
          </Link>
        </div>
      </article>
    </main>
  );
}
