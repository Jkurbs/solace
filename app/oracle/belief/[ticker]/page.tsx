import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchKalshiBeliefByTicker } from '@/features/oracle/kalshi';
import { OBSERVATORY_ORACLE_LEDGER_PATH } from '@/features/observatory/paths';

import Mark from '../../../Mark';
import ThemeToggle from '../../../ThemeToggle';
import ShareBelief from '../../ShareBelief';

export const revalidate = 60;

type Props = {
  params: Promise<{ ticker: string }>;
};

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

  const path = `/oracle/belief/${encodeURIComponent(ticker)}`;

  return {
    title: `Solace · ${title}`.slice(0, 110),
    description: description.slice(0, 200),
    alternates: { canonical: `https://solace.fyi${path}` },
    openGraph: {
      title: title.slice(0, 90),
      description: description.slice(0, 180),
      url: `https://solace.fyi${path}`,
      type: 'website',
      siteName: 'Solace',
    },
    twitter: {
      card: 'summary_large_image',
      title: title.slice(0, 70),
      description: description.slice(0, 160),
    },
  };
}

export default async function OracleBeliefPage({ params }: Props) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw);
  const belief = await fetchKalshiBeliefByTicker(ticker).catch(() => null);
  if (!belief) notFound();

  const pct = Math.round(belief.probability * 100);
  const conf = Math.round(belief.confidence * 100);

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

        <div className="oracle-belief-card oracle-belief-card-featured">
          <div className="oracle-belief-main">
            <p className="oracle-belief-kicker">
              oracle believes
              {belief.asset ? (
                <span className={`oracle-belief-asset is-${belief.asset}`}>
                  {belief.asset.toUpperCase()}
                </span>
              ) : null}
            </p>
            <h1 className="oracle-belief-question">{belief.question}</h1>
            <div className="oracle-belief-meta">
              <span className="oracle-belief-confidence">
                <span aria-hidden="true">✓</span>
                Confidence {conf}%
              </span>
            </div>
          </div>
          <div className="oracle-belief-prob">
            <strong>{pct}%</strong>
            <span>probability</span>
          </div>
          <div className="oracle-belief-actions">
            <ShareBelief id={belief.id} question={belief.question} probability={belief.probability} />
          </div>
        </div>

        <p className="oracle-board-footnote">
          Cite a source, not an opinion. Every belief is recorded before the outcome is known.
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
