import type { HermesLedgerRow } from './store';

// Process-first scoreboard for /trust. Integrity metrics lead; performance
// metrics are optional and only computed on sealed (non-backfill) decisions.

export type LedgerScoreboard = {
  process: {
    /** Decision-bearing rows (excludes system meta). */
    sealedDecisions: number;
    pending: number;
    resolved: number;
    /** Share of decision rows that are stand-down / wait / no-trade. 0..1 */
    standDownRate: number;
    standDownCount: number;
    backfilled: number;
    system: number;
  };
  performance: {
    /** Only sealed (not backfill) resolved rows with a PnL. */
    sampleSize: number;
    positive: number;
    neutral: number;
    negative: number;
    /** positive / (positive + negative); null when no directional outcomes. */
    hitRate: number | null;
    /** Mean PnL on the sealed resolved sample; null when empty. */
    expectancy: number | null;
    /** Mean seal→resolve duration in hours; null when unmeasurable. */
    avgResolveHours: number | null;
  };
};

function isSystem(row: HermesLedgerRow) {
  return row.rowClass === 'system';
}

function isBackfill(row: HermesLedgerRow) {
  return row.rowClass === 'backfill';
}

function isDecisionRow(row: HermesLedgerRow) {
  return !isSystem(row);
}

function isStandDownOrWait(row: HermesLedgerRow) {
  const posture = row.posture.trim().toUpperCase();

  if (posture === 'STANDING_DOWN' || posture === 'RISK_OFF') {
    return true;
  }

  const text = `${row.decision} ${row.note} ${row.outcome ?? ''}`.toLowerCase();

  return /\b(stand(?:ing)?\s*down|wait(?:ing)?|no[-\s]?trade|flat\s*·\s*no open)\b/.test(text);
}

function resolveDurationMs(row: HermesLedgerRow, openById: Map<string, HermesLedgerRow>) {
  if (row.eventType === 'close' && row.ref) {
    const open = openById.get(row.ref);

    if (open) {
      const start = new Date(open.sealedAt).getTime();
      const end = new Date(row.resolvedAt ?? row.sealedAt).getTime();

      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        return end - start;
      }
    }
  }

  if (row.resolvedAt) {
    const start = new Date(row.sealedAt).getTime();
    const end = new Date(row.resolvedAt).getTime();

    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return end - start;
    }
  }

  return null;
}

export function computeLedgerScoreboard(rows: HermesLedgerRow[]): LedgerScoreboard {
  const decisionRows = rows.filter(isDecisionRow);
  const pending = decisionRows.filter((row) => row.outcome === null && row.eventType !== 'void').length;
  const resolved = decisionRows.filter((row) => row.outcome !== null).length;
  const standDownCount = decisionRows.filter(isStandDownOrWait).length;
  const backfilled = rows.filter(isBackfill).length;
  const system = rows.filter(isSystem).length;

  const openById = new Map(
    rows.filter((row) => row.eventType === 'open').map((row) => [row.recordId, row] as const),
  );

  // Performance sample: sealed-first guarantees only — exclude backfill and system.
  const sealedResolved = decisionRows.filter(
    (row) => !isBackfill(row) && row.outcome !== null && row.eventType !== 'open',
  );

  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let pnlSum = 0;
  let pnlCount = 0;
  const durations: number[] = [];

  for (const row of sealedResolved) {
    if (row.pnl === null) {
      continue;
    }

    pnlSum += row.pnl;
    pnlCount += 1;

    if (row.pnl > 0) {
      positive += 1;
    } else if (row.pnl < 0) {
      negative += 1;
    } else {
      neutral += 1;
    }

    const durationMs = resolveDurationMs(row, openById);

    if (durationMs !== null) {
      durations.push(durationMs);
    }
  }

  const directional = positive + negative;
  const hitRate = directional > 0 ? positive / directional : null;
  const expectancy = pnlCount > 0 ? Math.round((pnlSum / pnlCount) * 100) / 100 : null;
  const avgResolveHours =
    durations.length > 0
      ? Math.round((durations.reduce((total, ms) => total + ms, 0) / durations.length / 3_600_000) * 10) / 10
      : null;

  return {
    performance: {
      avgResolveHours,
      expectancy,
      hitRate,
      negative,
      neutral,
      positive,
      sampleSize: pnlCount,
    },
    process: {
      backfilled,
      pending,
      resolved,
      sealedDecisions: decisionRows.length,
      standDownCount,
      standDownRate: decisionRows.length > 0 ? standDownCount / decisionRows.length : 0,
      system,
    },
  };
}

export function formatPercent(rate: number | null, digits = 0) {
  if (rate === null) {
    return '—';
  }

  return `${(rate * 100).toFixed(digits)}%`;
}

export function formatHours(hours: number | null) {
  if (hours === null) {
    return '—';
  }

  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }

  if (hours < 48) {
    return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  }

  return `${(hours / 24).toFixed(1)}d`;
}
