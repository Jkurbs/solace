import 'server-only';

import { calibration } from '@/app/calibration';
import { resolvedQuestions } from '@/app/oracle/resolved-questions';
import type { TrustLedgerDisplayRow } from '@/app/trust/TrustLedgerTable';
import { formatRelativeTime } from '@/features/anchor/format';
import { getLatestAnchorFast } from '@/features/anchor/store';
import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { closeReturnByRecordId, correctSealedClosePnls } from '@/features/hermes-ledger/close-pnl';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { computeLedgerScoreboard, formatPercent } from '@/features/hermes-ledger/scoreboard';
import {
  getHermesLedgerPulse,
  getHermesPublicRecord,
  getRecentHermesLedgerRows,
  listHermesLedgerProcessRows,
} from '@/features/hermes-ledger/store';
import { hermesVersion } from '@/features/hermes-version';
import { gloryaEvaluatedNeeds, gloryaProcessScoreboard } from '@/features/glorya/evaluated-needs';
import { getRecentHermesRealizedTradeEvents } from '@/features/ledger/hermes-realized-trades';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

import type { GloryaChainData, HermesChainData, HermesRecordChrome, OracleChainData } from './ObservatoryExperience';

const sealedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: 'short',
  second: '2-digit',
  timeZone: 'UTC',
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

const DISPLAY_WINDOW = 80;

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

export async function loadHermesChrome(): Promise<HermesRecordChrome> {
  const [publicRecord, pulse, brief] = await Promise.all([
    getHermesPublicRecord().catch(() => null),
    getHermesLedgerPulse().catch(() => null),
    getStoredHermesBriefSnapshot().catch(() => null),
  ]);

  const livePosture =
    brief && brief.brief_id !== 'fallback' ? formatConstant(brief.posture) : '--';

  return {
    hermesLabel: hermesVersion.label,
    hermesVersion: { id: hermesVersion.id, label: hermesVersion.label },
    hitRate: publicRecord?.hitRate ?? null,
    lastSealLabel: pulse?.latestSealedAt
      ? sealedAtFormatter.format(new Date(pulse.latestSealedAt))
      : null,
    livePosture,
    sealedDecisions: publicRecord?.decisions ?? pulse?.decisionCount ?? 0,
    sidedCloses: publicRecord?.sidedCloses ?? 0,
  };
}

export async function loadHermesTableRows(sealedDecisions: number): Promise<TrustLedgerDisplayRow[]> {
  const storedRows = await getRecentHermesLedgerRows(80).catch(() => []);
  const newestFirst = [...storedRows].reverse();
  const total = Math.max(sealedDecisions, newestFirst.length);
  const rows: TrustLedgerDisplayRow[] = newestFirst.length
    ? newestFirst.map((row, index) => ({
        row: String(total - index),
        recordId: row.recordId,
        sealedAt: sealedAtFormatter.format(new Date(row.sealedAt)),
        decision: row.decision,
        posture: formatConstant(row.posture),
        outcome:
          row.rowClass === 'system' ? '--' : row.eventType === 'open' ? 'Open' : row.outcome ?? '--',
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
    : [placeholderRow];

  return rows;
}

export async function loadHermesChainData(): Promise<HermesChainData> {
  const poolId = process.env.HERMES_POOL_ID ?? 'pool_balanced_v1';
  const [storedRows, openExposure, briefSnapshot, realizedTrades, latestAnchor, pulse] = await Promise.all([
    listHermesLedgerProcessRows(400).catch(() => []),
    getHermesOpenExposure().catch(() => null),
    getStoredHermesBriefSnapshot().catch(() => null),
    getRecentHermesRealizedTradeEvents({ limit: 200, poolId }).catch(() => []),
    getLatestAnchorFast().catch(() => null),
    getHermesLedgerPulse().catch(() => null),
  ]);

  const anchor = latestAnchor
    ? {
        cadence: 'every few minutes' as const,
        lastAnchoredLabel: formatRelativeTime(latestAnchor.sealedAt),
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
    closeReturnByRecordId: closeReturnByRecordId(realizedTrades),
    liveOpenPaths: openExposure ? openExposure.positions.length : null,
  });

  const livePosture =
    briefSnapshot && briefSnapshot.brief_id !== 'fallback'
      ? formatConstant(briefSnapshot.posture)
      : '--';

  const tableSource = displayRows.slice(-DISPLAY_WINDOW);
  const rowNumberOffset = displayRows.length - tableSource.length;
  const rows: TrustLedgerDisplayRow[] = tableSource.length
    ? tableSource
        .map((row, index) => ({
          row: String(rowNumberOffset + index + 1),
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
    sealedDecisions:
      pulse && pulse.decisionCount > scoreboard.process.sealedDecisions
        ? pulse.decisionCount
        : scoreboard.process.sealedDecisions,
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
