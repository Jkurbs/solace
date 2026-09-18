import { cache } from 'react';
import Link from 'next/link';

import { ShimmerLink } from '@/components/shimmer-link';
import { gloryaEvaluatedNeeds } from '@/features/glorya/evaluated-needs';
import { isStandingDownPosture } from '@/features/hermes-dashboard/decision-language';
import { formatPercent } from '@/features/hermes-ledger/scoreboard';
import { getRecentHermesLedgerRows, type HermesPublicRecord } from '@/features/hermes-ledger/store';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

import GloryaNeedField from './GloryaNeedField';
export type HermesTelemetry = {
  posture: string;
  reason?: string;
  condition?: string;
  deployedCount?: number;
  pathsCount: number;
  pathsLabel: string;
  updatedAt: string;
};
import { HomeProofSection } from './HomeProofSection';
import HermesDashboardPreview from './HermesDashboardPreview';
import OracleOrbSection from './OracleOrbSection';
import { withIllustrativeOracleFallback, type ActivePrediction } from './oracle/active-predictions';

const homeLedgerRows = cache(() => getRecentHermesLedgerRows(80));

export function HomeRecordBand({ record }: { record: HermesPublicRecord }) {
  return (
    <section className="home-record-band" aria-label="Hermes public record">
      <Link
        href={OBSERVATORY_HERMES_LEDGER_PATH}
        className={`hero-spine${record.hitRate === null ? ' is-single' : ''}`}
        aria-label={
          record.hitRate !== null
            ? `${record.decisions.toLocaleString('en-US')} decisions written. Right ${formatPercent(record.hitRate, 1)} of the time it chose a side, from ${record.sidedCloses.toLocaleString('en-US')} sided closes. Young sample. Open the public record.`
            : `${record.decisions.toLocaleString('en-US')} decisions written. Open the public record.`
        }
      >
        <span className="hero-spine-row">
          <span className="hero-spine-measure">
            <strong>{record.decisions.toLocaleString('en-US')}</strong>
            <span>Decisions made</span>
          </span>
          {record.hitRate !== null ? (
            <>
              <span className="hero-spine-rule" aria-hidden="true" />
              <span className="hero-spine-measure">
                <strong>{formatPercent(record.hitRate, 1)}</strong>
                <span>Overall Precision</span>
              </span>
            </>
          ) : null}
        </span>
      </Link>
    </section>
  );
}

export async function HomeProofLoader({ sealedDecisions }: { sealedDecisions: number | null }) {
  const rows = await homeLedgerRows().catch(() => []);
  return <HomeProofSection rows={rows} sealedDecisions={sealedDecisions} />;
}

export async function HomeHermesChapter({ telemetry }: { telemetry: HermesTelemetry | null }) {
  const rows = await homeLedgerRows().catch(() => []);

  return (
    <section className="home-chapter is-ink border-t border-border" aria-label="Hermes">
      <div className="home-chapter-inner is-split">
        <div className="home-instrument-copy">
          <h2 className="home-instrument-name">Hermes</h2>
          <p className="home-instrument-dek">It decides when your money goes to work, and when it waits.</p>
          {telemetry ? (
            <p className={`home-live-mark${isStandingDownPosture(telemetry.posture) ? '' : ' is-working'}`}>
              <i aria-hidden="true" />
              {isStandingDownPosture(telemetry.posture) ? 'Waiting' : 'At work'}
            </p>
          ) : null}
          <ShimmerLink href="/hermes" tone="ink" className="home-instrument-link text-sm font-medium text-white/70 hover:text-white">
            Explore Hermes <span> →</span>
          </ShimmerLink>
        </div>
        <div className="home-instrument-stream">
          <HermesDashboardPreview decisions={rows} posture={telemetry?.posture} />
        </div>
      </div>
    </section>
  );
}

export async function HomeOracleLoader() {
  const feed = await fetchKalshiBtcEthPredictions(24).catch(() => ({
    active: [] as ActivePrediction[],
    activeCount: 0,
    asOf: new Date().toISOString(),
  }));
  const oraclePredictions = withIllustrativeOracleFallback(
    feed.active.filter(
      (prediction): prediction is ActivePrediction & { question: string; probability: number } =>
        Boolean(prediction.question) && typeof prediction.probability === 'number',
    ),
  );

  return (
    <section className="home-chapter is-ink border-t border-border" aria-label="Oracle">
      <div className="home-chapter-inner is-split">
        <div className="home-instrument-copy">
          <h2 className="home-instrument-name">Oracle</h2>
          <p className="home-instrument-dek">You see the odds before something happens. Then you see how often it was right.</p>
          <ShimmerLink href="/oracle" tone="ink" className="home-instrument-link text-sm font-medium text-white/70 hover:text-white">
            Explore Oracle <span> →</span>
          </ShimmerLink>
        </div>
        <div className="home-instrument-stream">
          <OracleOrbSection predictions={oraclePredictions} />
        </div>
      </div>
    </section>
  );
}

export function HomeGloryaAndFooter() {
  return (
    <>
      <section className="home-glorya" aria-label="Glorya">
        <div className="home-glorya-head">
          <p className="home-horizon-dek">We start with money, because that&apos;s where you can check decisions quality fast.</p>
          <p className="home-horizon-dek">The same kind of decision, later, in other places.</p>
        </div>
        <div className="home-glorya-stage">
          <div className="home-glorya-globe" aria-hidden="true">
            <GloryaNeedField compact cycle className="home-glorya-field" needs={gloryaEvaluatedNeeds} />
          </div>
        </div>
      </section>

      <section className="border-t border-border px-5 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Solace is built by <span className="text-foreground">Kerby Jean</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/brief"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Read the brief
            </Link>
            <Link
              href="/research"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              Notes
            </Link>
            <a
              href="mailto:hello@solace.fyi"
              className="text-muted underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/30"
            >
              hello@solace.fyi
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export function HomeHermesChapterFallback({ telemetry }: { telemetry: HermesTelemetry | null }) {
  return (
    <section className="home-chapter is-ink border-t border-border" aria-label="Hermes">
      <div className="home-chapter-inner is-split">
        <div className="home-instrument-copy">
          <h2 className="home-instrument-name">Hermes</h2>
          <p className="home-instrument-dek">It decides when your money goes to work, and when it waits.</p>
          {telemetry ? (
            <p className={`home-live-mark${isStandingDownPosture(telemetry.posture) ? '' : ' is-working'}`}>
              <i aria-hidden="true" />
              {isStandingDownPosture(telemetry.posture) ? 'Waiting' : 'At work'}
            </p>
          ) : null}
        </div>
        <div className="home-instrument-stream" />
      </div>
    </section>
  );
}

export function HomeOracleFallback() {
  return (
    <section className="home-chapter is-ink border-t border-border" aria-label="Oracle">
      <div className="home-chapter-inner is-split">
        <div className="home-instrument-copy">
          <h2 className="home-instrument-name">Oracle</h2>
          <p className="home-instrument-dek">You see the odds before something happens. Then you see how often it was right.</p>
        </div>
        <div className="home-instrument-stream" />
      </div>
    </section>
  );
}
