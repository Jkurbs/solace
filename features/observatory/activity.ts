import type { HermesLedgerRow } from '@/features/hermes-ledger/store';
import type { GloryaEvaluatedNeed } from '@/features/glorya/types';
import { gloryaPlaceLabel } from '@/features/glorya/types';
import type { GateRevision } from '@/features/gates/conditions';
import type { HermesPublicMarketRead } from '@/features/hermes-market/types';
import { DOCS_API_URL } from '@/lib/docs';

import { OBSERVATORY_HERMES_LEDGER_PATH } from './paths';
import type { ObservatoryActivity } from './types';

const ACTIVITY_CAP = 6;

/**
 * Map Hermes process ledger rows into public-safe activity lines.
 * Prefer template titles from event metadata — never dump raw notes
 * (they may carry mechanism detail).
 */
export function hermesActivityFromLedgerRows(
  rows: HermesLedgerRow[],
  market: HermesPublicMarketRead | null,
  limit = ACTIVITY_CAP,
): ObservatoryActivity[] {
  const events: ObservatoryActivity[] = [];

  if (market?.as_of) {
    events.push({
      id: `hermes-market-${market.as_of}`,
      instrumentId: 'hermes',
      at: market.as_of,
      kind: 'market_read',
      title: 'Market read updated',
      detail: `${market.posture} · ${market.environment}`,
      href: DOCS_API_URL,
    });
  }

  // Newest first — process rows typically arrive chronological ascending.
  const ordered = [...rows].sort(
    (a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime(),
  );

  for (const row of ordered) {
    if (events.length >= limit) break;

    const mapped = mapLedgerRowToActivity(row);
    if (!mapped) continue;

    // Skip duplicate timestamps next to market read noise
    if (events.some((e) => e.id === mapped.id)) continue;
    events.push(mapped);
  }

  return events.slice(0, limit);
}

function mapLedgerRowToActivity(row: HermesLedgerRow): ObservatoryActivity | null {
  const at = row.sealedAt;
  if (!at) return null;

  if (row.rowClass === 'system') {
    return {
      id: `hermes-${row.recordId}`,
      instrumentId: 'hermes',
      at,
      kind: 'system',
      title: 'System record sealed',
      detail: row.hermesVersion ? `Hermes v${row.hermesVersion}` : undefined,
      href: OBSERVATORY_HERMES_LEDGER_PATH,
    };
  }

  if (row.eventType === 'open') {
    return {
      id: `hermes-${row.recordId}`,
      instrumentId: 'hermes',
      at,
      kind: 'path_open',
      title: 'Path opened',
      detail: 'Instrument private until close',
      href: OBSERVATORY_HERMES_LEDGER_PATH,
    };
  }

  if (row.eventType === 'close') {
    return {
      id: `hermes-${row.recordId}`,
      instrumentId: 'hermes',
      at,
      kind: 'path_close',
      title: 'Path closed',
      href: OBSERVATORY_HERMES_LEDGER_PATH,
    };
  }

  if (row.eventType === 'void') {
    return {
      id: `hermes-${row.recordId}`,
      instrumentId: 'hermes',
      at,
      kind: 'path_void',
      title: 'Open voided',
      href: OBSERVATORY_HERMES_LEDGER_PATH,
    };
  }

  // Decision-style rows without path event type — posture-aware templates only.
  const posture = (row.posture || '').toUpperCase().replace(/\s+/g, '_');
  const decision = (row.decision || '').toLowerCase();

  if (
    posture.includes('STANDING_DOWN') ||
    posture.includes('STANDING DOWN') ||
    decision.includes('stand') ||
    decision.includes('no trade') ||
    decision.includes('wait')
  ) {
    return {
      id: `hermes-${row.recordId}`,
      instrumentId: 'hermes',
      at,
      kind: 'stand_down',
      title: decision.includes('wait') ? 'Wait sealed' : 'Standing down sealed',
      href: OBSERVATORY_HERMES_LEDGER_PATH,
    };
  }

  return {
    id: `hermes-${row.recordId}`,
    instrumentId: 'hermes',
    at,
    kind: 'decision',
    title: 'Decision sealed',
    detail: row.posture ? `Posture ${formatPosture(row.posture)}` : undefined,
    href: OBSERVATORY_HERMES_LEDGER_PATH,
  };
}

function formatPosture(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Illustrative Glorya need layer → careful activity lines. */
export function gloryaActivityFromNeeds(
  needs: GloryaEvaluatedNeed[],
  limit = ACTIVITY_CAP,
): ObservatoryActivity[] {
  const priority = (status: GloryaEvaluatedNeed['status']) => {
    if (status === 'evaluated') return 0;
    if (status === 'standing_down') return 1;
    if (status === 'active') return 2;
    return 3;
  };

  return [...needs]
    .sort((a, b) => priority(a.status) - priority(b.status) || b.needScore - a.needScore)
    .slice(0, limit)
    .map((need) => {
      const place = gloryaPlaceLabel(need);
      if (need.status === 'standing_down') {
        return {
          id: `glorya-${need.id}`,
          instrumentId: 'glorya' as const,
          at: fixedDesignTimestamp(need.id),
          kind: 'need_stand_down',
          title: `${place} — standing down`,
          detail: need.focus,
          href: '/glorya',
        };
      }
      if (need.status === 'evaluated') {
        return {
          id: `glorya-${need.id}`,
          instrumentId: 'glorya' as const,
          at: fixedDesignTimestamp(need.id),
          kind: 'need_evaluated',
          title: `${place} — under evaluation`,
          detail: need.focus,
          href: '/glorya',
        };
      }
      return {
        id: `glorya-${need.id}`,
        instrumentId: 'glorya' as const,
        at: fixedDesignTimestamp(need.id),
        kind: `need_${need.status}`,
        title: `${place} — ${need.status.replace('_', ' ')}`,
        href: '/glorya',
      };
    });
}

/** Stable synthetic timestamps so illustrative rows sort deterministically. */
function fixedDesignTimestamp(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  // Cluster around a fixed design day; offset by hash minutes.
  const base = Date.UTC(2026, 6, 1, 12, 0, 0);
  return new Date(base + (hash % 10_000) * 60_000).toISOString();
}

export function simulationActivityFromGates(
  revisions: GateRevision[],
  nextConditionLabel: string | null,
  nextConditionNote: string | null,
  limit = ACTIVITY_CAP,
): ObservatoryActivity[] {
  const events: ObservatoryActivity[] = [];

  if (nextConditionLabel) {
    events.push({
      id: 'simulation-next-condition',
      instrumentId: 'simulation',
      at: new Date().toISOString(),
      kind: 'gate_focus',
      title: `Current work: ${nextConditionLabel}`,
      detail: nextConditionNote ?? undefined,
      href: '/gates#simulation',
    });
  }

  for (const revision of revisions.slice(0, limit - events.length)) {
    events.push({
      id: `simulation-rev-${revision.version}`,
      instrumentId: 'simulation',
      at: parseRevisionDate(revision.date),
      kind: 'gate_revision',
      title: `Gate board v${revision.version}`,
      detail: revision.note,
      href: '/gates',
    });
  }

  return events.slice(0, limit);
}

function parseRevisionDate(value: string): string {
  // "July 23, 2026" → ISO midday
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

export function oracleActivityFromCalibration(input: {
  asOf: string;
  resolved: number;
  brier: number;
  latestQuestion?: { id: string; question: string; resolvedAt: string } | null;
}): ObservatoryActivity[] {
  const events: ObservatoryActivity[] = [];
  const asOfIso = parseLooseDate(input.asOf);

  events.push({
    id: 'oracle-calibration',
    instrumentId: 'oracle',
    at: asOfIso,
    kind: 'calibration',
    title: 'Calibration snapshot refreshed',
    detail: `${input.resolved} resolved · Brier ${input.brier.toFixed(3)}`,
    href: '/oracle',
  });

  if (input.latestQuestion) {
    events.push({
      id: `oracle-q-${input.latestQuestion.id}`,
      instrumentId: 'oracle',
      at: parseLooseDate(input.latestQuestion.resolvedAt),
      kind: 'question_resolved',
      title: 'Question resolved',
      detail: truncate(input.latestQuestion.question, 72),
      href: '/oracle',
    });
  }

  return events;
}

function parseLooseDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  // "Jun 13, 2026"
  const retry = Date.parse(value.replace(/,/g, ''));
  if (Number.isFinite(retry)) return new Date(retry).toISOString();
  return new Date().toISOString();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function mergeActivity(
  streams: ObservatoryActivity[][],
  limit = 10,
): ObservatoryActivity[] {
  return streams
    .flat()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
