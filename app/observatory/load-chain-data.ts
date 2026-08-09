import 'server-only';

import { calibration } from '@/app/calibration';
import { resolvedQuestions } from '@/app/oracle/resolved-questions';
import type { TrustLedgerDisplayRow } from '@/app/trust/TrustLedgerTable';
import { formatRelativeTime } from '@/features/anchor/format';
import { getAnchorChain } from '@/features/anchor/store';
import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { correctSealedClosePnls } from '@/features/hermes-ledger/close-pnl';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { computeLedgerScoreboard, formatPercent } from '@/features/hermes-ledger/scoreboard';
import { listHermesLedgerRows } from '@/features/hermes-ledger/store';
import { hermesVersion } from '@/features/hermes-version';
import { gloryaEvaluatedNeeds, gloryaProcessScoreboard } from '@/features/glorya/evaluated-needs';
import { getRecentHermesRealizedTradeEvents } from '@/features/ledger/hermes-realized-trades';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

import type { GloryaChainData, HermesChainData, OracleChainData } from './ObservatoryExperience';

const sealedAtFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
  year: 'numeric',
});

const pnlFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  signDisplay: 'always',
  style: 'currency',
});

function formatConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

const placeholderRow: TrustLedgerDisplayRow = {
  row: '1',
  recordId: 'HMS-000',
  sealedAt: 'Pending',
  decision: 'First decision pending',
  posture: '--',
  outcome: '--',
  pnl: '--',
  pnlTone: null,
  note: 'First row will be added after a decision is recorded.',
  rowHash: null,
  prevHash: null,
  resolutionHash: null,
  rowClass: null,
  eventType: null,
  ref: null,
  hermesVersion: null,
};

export async function loadHermesChainData(): Promise<HermesChainData> {
  const poolId = process.env.HERMES_POOL_ID ?? 'pool_balanced_v1';
  const [storedRows, openExposure, briefSnapshot, realizedTrades, chain] = await Promise.all([
    listHermesLedgerRows(1000).catch(() => []),
    getHermesOpenExposure().catch(() => null),
    getStoredHermesBriefSnapshot().catch(() => null),
    getRecentHermesRealizedTradeEvents({ limit: 500, poolId }).catch(() => []),
    getAnchorChain().catch(() => ({ anchors: [], head: null, count: 0, verified: false, breaks: [] })),
  ]);

  const anchor =
    chain.head && chain.verified
      ? {
          cadence: 'every few minutes' as const,
          lastAnchoredLabel: formatRelativeTime(chain.head.sealedAt),
          href: '/anchor',
          label: 'cryptographically anchored' as const,
        }
      : null;

  const displayRows = correctSealedClosePnls(
    storedRows,
    realizedTrades.map((trade) => ({
      fees: trade.fees,
      funding: trade.funding,
      netPnl: trade.netPnl,
      realizedPnl: trade.realizedPnl,
      sourceTradeId: trade.sourceTradeId,
    })),
  );

  const scoreboard = computeLedgerScoreboard(displayRows, {
    liveOpenPaths: openExposure ? openExposure.positions.length : null,
  });

  const livePosture =
    briefSnapshot && briefSnapshot.brief_id !== 'fallback'
      ? formatConstant(briefSnapshot.posture)
      : '--';

  const rows: TrustLedgerDisplayRow[] = displayRows.length
    ? displayRows
        .map((row, index) => ({
          row: String(index + 1),
          recordId: row.recordId,
          sealedAt: sealedAtFormatter.format(new Date(row.sealedAt)),
          decision: row.decision,
          posture: formatConstant(row.posture),
          outcome:
            row.rowClass === 'system'
              ? '--'
              : row.eventType === 'open'
                ? 'Open'
                : row.outcome ?? '--',
          pnl:
            row.eventType === 'open' || row.outcome === null
              ? '--'
              : row.pnl === null
                ? '--'
                : pnlFormatter.format(row.pnl),
          pnlTone:
            row.outcome === null || row.pnl === null || row.pnl === 0
              ? null
              : row.pnl > 0
                ? ('pos' as const)
                : ('neg' as const),
          note: row.note || '--',
          rowHash: row.rowHash,
          prevHash: row.prevHash,
          resolutionHash: row.resolutionHash,
          rowClass: row.rowClass,
          eventType: row.eventType,
          ref: row.ref,
          hermesVersion: row.hermesVersion,
        }))
        .reverse()
    : [placeholderRow];

  return {
    rows,
    scoreboard,
    openLabel:
      scoreboard.process.openPaths === null ? '-' : String(scoreboard.process.openPaths),
    sealedDecisions: scoreboard.process.sealedDecisions,
    standDownRate: formatPercent(scoreboard.process.standDownRate),
    livePosture,
    hermesLabel: hermesVersion.label,
    openExposure,
    hermesVersion: { id: hermesVersion.id, label: hermesVersion.label },
    anchor,
  };
}

export async function loadOracleChainData(): Promise<OracleChainData> {
  const feed = await fetchKalshiBtcEthPredictions(20).catch((error: unknown) => ({
    active: [],
    activeCount: 0,
    asOf: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Kalshi feed failed',
  }));

  return {
    active: feed.active,
    activeCount: feed.activeCount || feed.active.length,
    resolved: calibration.resolved,
    brier: calibration.brier,
    asOf: feed.asOf,
    resolvedQuestions,
    feedError: feed.error,
  };
}

export function loadGloryaChainData(): GloryaChainData {
  const scoreboard = gloryaProcessScoreboard();
  return {
    evaluated: scoreboard.evaluated,
    standingDown: scoreboard.standingDown,
    standDownRate: scoreboard.standDownRate,
    active: scoreboard.active,
    completed: scoreboard.completed,
    needs: gloryaEvaluatedNeeds,
  };
}
