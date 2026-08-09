'use client';

import Link from 'next/link';
import { useCallback, useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { TrustLedgerDisplayRow } from '@/app/trust/TrustLedgerTable';
import TrustLedgerTable from '@/app/trust/TrustLedgerTable';
import TrustLivePanel from '@/app/trust/TrustLivePanel';
import { TrustLivePulseProvider } from '@/app/trust/TrustLivePulse';
import LedgerVerifyStrip from '@/app/trust/LedgerVerifyStrip';
import PostureRibbon from '@/app/trust/PostureRibbon';
import ShareLedger from '@/app/trust/ShareLedger';
import TrustScoreboard from '@/app/trust/TrustScoreboard';
import type { ActivePrediction } from '@/app/oracle/active-predictions';
import type { ResolvedQuestion } from '@/app/oracle/resolved-questions';
import type { LedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
import type { GloryaEvaluatedNeed } from '@/features/glorya/types';
import { gloryaPlaceLabel } from '@/features/glorya/types';
import {
  OBSERVATORY_INSTRUMENTS,
  type ObservatoryInstrumentId,
  parseObservatoryInstrument,
} from '@/features/observatory/paths';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

export type HermesChainData = {
  rows: TrustLedgerDisplayRow[];
  scoreboard: LedgerScoreboard;
  openLabel: string;
  sealedDecisions: number;
  standDownRate: string;
  livePosture: string;
  hermesLabel: string;
  openExposure: {
    asOf: string;
    unrealizedPnl: number;
    positions: Array<{ symbol: string; side: string }>;
  } | null;
  hermesVersion: { id: string; label: string };
  anchor: {
    cadence: string;
    lastAnchoredLabel: string;
    href: string;
    label: string;
  } | null;
};

export type OracleChainData = {
  active: ActivePrediction[];
  activeCount: number;
  resolved: number;
  brier: number;
  asOf: string;
  resolvedQuestions: ResolvedQuestion[];
  feedError: string | null;
};

export type GloryaChainData = {
  evaluated: number;
  standingDown: number;
  standDownRate: number;
  active: number;
  completed: number;
  needs: GloryaEvaluatedNeed[];
};

type Props = {
  initialInstrument: ObservatoryInstrumentId;
  hermes: HermesChainData;
  oracle: OracleChainData;
  glorya: GloryaChainData;
};

const instrumentCopy: Record<
  ObservatoryInstrumentId,
  { kicker: string; title: string; dek: string; productHref: string; productLabel: string }
> = {
  hermes: {
    kicker: 'Capital allocation',
    title: 'Hermes decision chain',
    dek: 'Every path is sealed before the outcome is known. Wins, losses, and waits leave a public row.',
    productHref: '/hermes',
    productLabel: 'Meet Hermes',
  },
  oracle: {
    kicker: 'Belief under uncertainty',
    title: 'Oracle decision chain',
    dek: 'Every belief is recorded before the world resolves. Probability first. Score later.',
    productHref: '/oracle',
    productLabel: 'Open Oracle',
  },
  glorya: {
    kicker: 'Humanitarian capital',
    title: 'Glorya decision chain',
    dek: 'Observations, stand-downs, and sealed disbursements when need and path both clear.',
    productHref: '/glorya',
    productLabel: 'Open Glorya',
  },
};

export default function ObservatoryExperience({
  initialInstrument,
  hermes,
  oracle,
  glorya,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const instrument = useMemo(() => {
    const fromUrl = parseObservatoryInstrument(searchParams.get('instrument'));
    return fromUrl || initialInstrument;
  }, [initialInstrument, searchParams]);

  const setInstrument = useCallback(
    (next: ObservatoryInstrumentId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'hermes') {
        params.delete('instrument');
      } else {
        params.set('instrument', next);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const copy = instrumentCopy[instrument];
  const { process } = hermes.scoreboard;

  return (
    <main className="hermes-paper ledger-doc obs-chain min-h-screen bg-background pt-16 text-foreground antialiased [color-scheme:inherit]">
      <SiteHeader />

      <section className="hermes-paper-shell ledger-doc-intro obs-chain-intro">
        <p className="hermes-paper-kicker">Solace primitive</p>
        <h1 className="ledger-doc-title">Observatory</h1>
        <p className="hermes-paper-lede">
          Inspect the decision chain. Every instrument records its observations, reasoning, and actions, so
          capital, belief, and humanitarian work leave an auditable path.
        </p>

        <div className="obs-chain-selector-block">
          <label className="obs-chain-selector-label" htmlFor="obs-instrument">
            Showing
          </label>
          <div className="obs-chain-selector-row">
            <select
              id="obs-instrument"
              className="obs-chain-select"
              value={instrument}
              disabled={pending}
              onChange={(event) => setInstrument(event.target.value as ObservatoryInstrumentId)}
            >
              {OBSERVATORY_INSTRUMENTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.status ? ` · ${item.status}` : ''}
                </option>
              ))}
            </select>
            <Link href={copy.productHref} className="obs-chain-product-link">
              {copy.productLabel}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="obs-chain-selector-hint">
            Change the instrument to swap the chain. Same Observatory. Same discipline.
          </p>
        </div>
      </section>

      <section className="hermes-paper-shell ledger-doc-sheet-section" aria-label={`${copy.title}`}>
        <div className={`ledger-doc-sheet obs-chain-sheet${pending ? ' is-pending' : ''}`}>
          <div className="ledger-doc-head">
            <div className="ledger-doc-head-main">
              {instrument === 'hermes' ? <ShareLedger /> : null}
              <span className="ledger-doc-head-kicker">{copy.kicker}</span>
              <strong className="ledger-doc-head-title">{copy.title}</strong>
            </div>
            {instrument === 'hermes' ? (
              <div className="ledger-doc-stats" aria-label="Hermes process summary">
                <span>
                  <em>Sealed</em>
                  <strong>{hermes.sealedDecisions.toLocaleString('en-US')}</strong>
                </span>
                <span>
                  <em>Standing down</em>
                  <strong>{hermes.standDownRate}</strong>
                </span>
                <span>
                  <em>Capital</em>
                  <strong>Founder</strong>
                </span>
              </div>
            ) : null}
            {instrument === 'oracle' ? (
              <div className="ledger-doc-stats" aria-label="Oracle process summary">
                <span>
                  <em>Resolved</em>
                  <strong>{oracle.resolved}</strong>
                </span>
                <span>
                  <em>Brier</em>
                  <strong>{oracle.brier.toFixed(2)}</strong>
                </span>
                <span>
                  <em>Active</em>
                  <strong>{oracle.activeCount}</strong>
                </span>
              </div>
            ) : null}
            {instrument === 'glorya' ? (
              <div className="ledger-doc-stats" aria-label="Glorya process summary">
                <span>
                  <em>Evaluated</em>
                  <strong>{glorya.evaluated}</strong>
                </span>
                <span>
                  <em>Standing down</em>
                  <strong>{Math.round(glorya.standDownRate * 100)}%</strong>
                </span>
                <span>
                  <em>Sealed</em>
                  <strong>0</strong>
                </span>
              </div>
            ) : null}
          </div>

          <div className="ledger-doc-note">{copy.dek}</div>

          {instrument === 'hermes' ? <HermesChain hermes={hermes} /> : null}
          {instrument === 'oracle' ? <OracleChain oracle={oracle} /> : null}
          {instrument === 'glorya' ? <GloryaChain glorya={glorya} /> : null}
        </div>
      </section>

      <section className="hermes-paper-shell ledger-doc-below obs-chain-about">
        <div className="ledger-doc-panel">
          <h2>One primitive. Many instruments.</h2>
          <table>
            <tbody>
              <tr>
                <th>Why one page</th>
                <td>
                  The ledger is not a Hermes feature. It is how Solace shows its work, for capital, belief, and
                  humanitarian allocation alike.
                </td>
              </tr>
              <tr>
                <th>Same discipline</th>
                <td>
                  Record before outcome. Stand down when the path is not earned. Leave a chain others can check.
                </td>
              </tr>
              <tr>
                <th>Different domains</th>
                <td>
                  Hermes seals capital paths. Oracle seals beliefs. Glorya will seal disbursements when need and
                  path both clear. Columns differ. The commitment does not.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function HermesChain({ hermes }: { hermes: HermesChainData }) {
  const { process } = hermes.scoreboard;
  const openLabel = hermes.openLabel;

  return (
    <TrustLivePulseProvider
      initialExposure={hermes.openExposure}
      initialHermesVersion={hermes.hermesVersion}
      livePosture={hermes.livePosture}
    >
      {/*
        Emotional job: a careful stranger can check the chain, see patience as character,
        and keep live exposure separate from sealed history.
      */}
      <LedgerVerifyStrip />

      {hermes.anchor && (
        <div className="mx-5 mb-6 rounded-lg border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/20 md:mx-0">
          <p className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-medium text-emerald-900 dark:text-emerald-300">
              {hermes.anchor.label}
            </span>
            <span className="text-emerald-800/70 dark:text-emerald-300/70">
              · last anchor {hermes.anchor.lastAnchoredLabel}
            </span>
            <Link
              href={hermes.anchor.href}
              className="ml-auto underline underline-offset-4 transition-colors hover:text-foreground"
            >
              verify →
            </Link>
          </p>
        </div>
      )}

      <div className="ledger-doc-strip" aria-label="Process summary">
        <span>
          <em>Open · closed</em>
          <strong>
            {openLabel} · {process.closedPaths}
          </strong>
        </span>
        <span>
          <em>Backfilled</em>
          <strong>{process.backfilled}</strong>
        </span>
        <span>
          <em>Standing down</em>
          <strong>{hermes.standDownRate}</strong>
        </span>
        <span>
          <em>Hermes</em>
          <strong>{hermes.hermesLabel}</strong>
        </span>
      </div>

      <PostureRibbon rows={hermes.rows} />

      <TrustLivePanel />

      <div className="ledger-history-label">
        <p className="ledger-history-kicker">Sealed history</p>
        <p className="ledger-history-dek">Write-once chain · newest first · live exposure stays above</p>
      </div>

      <TrustLedgerTable rows={hermes.rows} />

      <p className="ledger-doc-disclosure">
        Founder capital only · PnL net of fees and funding · Young sample: a record, not a claim · Not an offer,
        not investment advice
      </p>

      <div className="ledger-doc-scoreboard">
        <TrustScoreboard scoreboard={hermes.scoreboard} />
      </div>
    </TrustLivePulseProvider>
  );
}

function OracleChain({ oracle }: { oracle: OracleChainData }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <>
      <div className="obs-chain-table-wrap">
        <table className="obs-chain-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Belief</th>
              <th>Probability</th>
              <th>Status</th>
              <th>Asset</th>
            </tr>
          </thead>
          <tbody>
            {oracle.active.length === 0 ? (
              <tr>
                <td colSpan={5} className="obs-chain-empty">
                  {oracle.feedError
                    ? `Live feed unavailable. ${oracle.feedError}`
                    : 'No open BTC/ETH beliefs right now. 15-minute markets are excluded.'}
                </td>
              </tr>
            ) : (
              oracle.active.map((row) => (
                <tr key={row.id}>
                  <td>{formatShortTime(row.updatedAt)}</td>
                  <td>
                    <Link href={`/oracle/belief/${encodeURIComponent(row.id)}`} className="obs-chain-belief-link">
                      {row.question}
                    </Link>
                  </td>
                  <td className="obs-chain-num">{pct(row.probability)}</td>
                  <td>Active</td>
                  <td>{row.asset?.toUpperCase() ?? '—'}</td>
                </tr>
              ))
            )}
            {oracle.resolvedQuestions.map((row) => (
              <tr key={row.id} className="is-resolved">
                <td>{row.resolvedAt}</td>
                <td>{row.question}</td>
                <td className="obs-chain-num">{pct(row.probability)}</td>
                <td>Resolved · {row.outcome}</td>
                <td>{row.illustrative ? 'Illustrative' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ledger-doc-disclosure">
        Live Kalshi BTC / ETH · Brier {oracle.brier.toFixed(2)} on {oracle.resolved} resolved · No performance
        claims · Updated {formatShortTime(oracle.asOf)}
      </p>
    </>
  );
}

function GloryaChain({ glorya }: { glorya: GloryaChainData }) {
  return (
    <>
      <div className="obs-chain-table-wrap">
        <table className="obs-chain-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Event</th>
              <th>Place</th>
              <th>Need</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {glorya.needs.length === 0 ? (
              <tr>
                <td colSpan={5} className="obs-chain-empty">
                  No evaluation rows yet.
                </td>
              </tr>
            ) : (
              glorya.needs.map((need) => (
                <tr key={need.id}>
                  <td className="obs-chain-mono">{need.id}</td>
                  <td>{need.note}</td>
                  <td>{gloryaPlaceLabel(need)}</td>
                  <td className="obs-chain-num">{need.needScore.toFixed(2)}</td>
                  <td>{need.status === 'standing_down' ? 'Standing down' : 'Observation recorded'}</td>
                </tr>
              ))
            )}
            <tr className="is-system">
              <td className="obs-chain-mono">—</td>
              <td>Revenue gate: live capital waits on $1M cumulative Solace revenue</td>
              <td>—</td>
              <td>—</td>
              <td>Logged</td>
            </tr>
            <tr className="is-system">
              <td className="obs-chain-mono">—</td>
              <td>Sealed disbursement rows begin with the first funded path</td>
              <td>—</td>
              <td>—</td>
              <td>Pending</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="ledger-doc-disclosure">
        Design layer · {glorya.standingDown} of {glorya.evaluated} standing down · 0 sealed disbursements · Not a
        solicitation
      </p>
    </>
  );
}

function formatShortTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(t);
}
