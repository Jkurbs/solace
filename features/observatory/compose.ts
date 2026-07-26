import 'server-only';

import { calibration } from '@/app/calibration';
import { resolvedQuestions } from '@/app/oracle/resolved-questions';
import {
  gateDomains,
  gateRevisions,
  summarizeGateDomain,
} from '@/features/gates/conditions';
import { gloryaEvaluatedNeeds, gloryaProcessScoreboard } from '@/features/glorya/evaluated-needs';
import { listHermesLedgerProcessRows } from '@/features/hermes-ledger/store';
import { getHermesPublicMarketRead } from '@/features/hermes-market/read';
import { DOCS_API_URL } from '@/lib/docs';

import {
  gloryaActivityFromNeeds,
  hermesActivityFromLedgerRows,
  mergeActivity,
  oracleActivityFromCalibration,
  simulationActivityFromGates,
} from './activity';
import {
  OBSERVATORY_HERMES_LEDGER_PATH,
  OBSERVATORY_HERMES_PATH,
  OBSERVATORY_PATH,
} from './paths';
import type {
  InstrumentObservation,
  ObservatoryHealth,
  ObservatorySnapshot,
  ObservatoryStatus,
} from './types';

const HERMES_STALE_MS = 24 * 60 * 60 * 1000;
const ORACLE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export async function composeObservatorySnapshot(now = new Date()): Promise<ObservatorySnapshot> {
  const [market, ledgerRows] = await Promise.all([
    getHermesPublicMarketRead(now).catch(() => null),
    listHermesLedgerProcessRows(80).catch(() => []),
  ]);

  const hermes = composeHermes(market, ledgerRows, now);
  const oracle = composeOracle(now);
  const simulation = composeSimulation();
  const glorya = composeGlorya();

  const instruments = [hermes, oracle, simulation, glorya];
  const recentActivity = mergeActivity(
    instruments.map((instrument) => instrument.activity),
    10,
  );

  return {
    generatedAt: now.toISOString(),
    instruments,
    recentActivity,
    links: {
      trust: OBSERVATORY_HERMES_LEDGER_PATH,
      hermes: OBSERVATORY_HERMES_PATH,
      gates: '/gates',
      marketApi: DOCS_API_URL,
      homeInstruments: '/#instruments',
      observatory: OBSERVATORY_PATH,
    },
  };
}

function composeHermes(
  market: Awaited<ReturnType<typeof getHermesPublicMarketRead>> | null,
  ledgerRows: Awaited<ReturnType<typeof listHermesLedgerProcessRows>>,
  now: Date,
): InstrumentObservation {
  const activity = hermesActivityFromLedgerRows(ledgerRows, market, 6);
  const posture = market?.posture ?? 'Standing Down';
  const status = hermesStatusFromPosture(posture);
  const health = hermesHealth(market, now);

  const capitalHint =
    market && market.capital.paths_under_review > 0
      ? `${market.capital.deployed_paths} active · ${market.capital.paths_under_review} under review`
      : undefined;

  return {
    id: 'hermes',
    name: 'Hermes',
    status,
    health,
    summary:
      market?.summary ??
      'Hermes public market read is awaiting its next update.',
    state: market
      ? [
          { label: 'Posture', value: market.posture, hint: 'Capital stance' },
          { label: 'Outlook', value: market.outlook },
          { label: 'Environment', value: market.environment },
          {
            label: 'Capital',
            value: market.capital.active,
            hint: capitalHint,
          },
        ]
      : [{ label: 'Posture', value: 'Awaiting data' }],
    activity,
    href: OBSERVATORY_HERMES_PATH,
    secondaryLinks: [
      { label: 'Decision ledger', href: OBSERVATORY_HERMES_LEDGER_PATH },
      { label: 'Market API', href: DOCS_API_URL },
      { label: 'Product', href: '/hermes' },
    ],
    disclosure:
      market?.disclosure ??
      'Founder capital only · Market read only — not advice · Mechanism stays private',
  };
}

function hermesStatusFromPosture(posture: string): ObservatoryStatus {
  const key = posture.toLowerCase();
  if (key.includes('standing')) {
    return { label: 'Standing down', phase: 'live' };
  }
  if (key.includes('selective')) {
    return { label: 'Monitoring', phase: 'live' };
  }
  if (key.includes('deployed')) {
    return { label: 'Deployed', phase: 'live' };
  }
  if (key.includes('defensive')) {
    return { label: 'Defensive', phase: 'live' };
  }
  if (key.includes('risk')) {
    return { label: 'Risk off', phase: 'live' };
  }
  return { label: posture || 'Live', phase: 'live' };
}

function hermesHealth(
  market: Awaited<ReturnType<typeof getHermesPublicMarketRead>> | null,
  now: Date,
): ObservatoryHealth {
  if (!market) {
    return { level: 'unknown', note: 'Market feed unavailable' };
  }

  const ageMs = now.getTime() - new Date(market.as_of).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > HERMES_STALE_MS || market.pulse === 'STALE') {
    return { level: 'stale', note: 'Market feed is stale — not shown as live' };
  }
  if (market.pulse === 'RECENT') {
    return { level: 'degraded', note: 'Recent, not live-second' };
  }
  return { level: 'ok', note: 'Live market read' };
}

function composeOracle(now: Date): InstrumentObservation {
  const asOfIso = Date.parse(calibration.asOf);
  const ageMs = Number.isFinite(asOfIso) ? now.getTime() - asOfIso : Number.POSITIVE_INFINITY;
  const health: ObservatoryHealth =
    ageMs > ORACLE_STALE_MS
      ? { level: 'static', note: 'Calibration snapshot older than a week' }
      : { level: 'static', note: 'Dated calibration snapshot' };

  const latest = [...resolvedQuestions].sort((a, b) =>
    b.resolvedAt.localeCompare(a.resolvedAt),
  )[0];

  const activity = oracleActivityFromCalibration({
    asOf: calibration.asOf,
    resolved: calibration.resolved,
    brier: calibration.brier,
    latestQuestion: latest
      ? { id: latest.id, question: latest.question, resolvedAt: latest.resolvedAt }
      : null,
  });

  return {
    id: 'oracle',
    name: 'Oracle',
    status: { label: 'Keeping score', phase: 'keeping_score' },
    health,
    summary: `Calibration record — ${calibration.resolved} resolved questions, Brier ${calibration.brier.toFixed(3)}.`,
    state: [
      { label: 'Resolved', value: String(calibration.resolved) },
      { label: 'Brier', value: calibration.brier.toFixed(3) },
      { label: 'As of', value: calibration.asOf },
    ],
    activity,
    href: '/oracle',
    disclosure: 'Scorekeeping and calibration — not a live trading feed.',
  };
}

function composeSimulation(): InstrumentObservation {
  const domain = gateDomains.find((d) => d.id === 'simulation');
  const summary = domain ? summarizeGateDomain(domain) : null;
  const next =
    domain?.conditions.find((c) => c.status === 'not_met') ??
    domain?.conditions.find((c) => c.status === 'partial') ??
    null;

  const activity = simulationActivityFromGates(
    gateRevisions,
    next?.label ?? null,
    next?.note ?? null,
    5,
  );

  return {
    id: 'simulation',
    name: 'Simulation',
    status: { label: 'Building', phase: 'building' },
    health: { level: 'static', note: 'Hand-marked gate board' },
    summary: domain?.summary
      ?? 'Synthetic worlds. Same decision engine. Failures stay off the wire.',
    state: [
      {
        label: 'Conditions',
        value: summary ? `${summary.met}/${summary.total} met` : '—',
        hint: summary && summary.partial > 0 ? `${summary.partial} partial` : undefined,
      },
      {
        label: 'Next',
        value: next?.label ?? 'See gate board',
      },
      {
        label: 'Phase',
        value: domain?.phase ?? 'Building',
      },
    ],
    activity,
    href: '/gates#simulation',
    secondaryLinks: [{ label: 'Gate board', href: '/gates' }],
    disclosure: 'Progress is hand-marked when something actually changes.',
  };
}

function composeGlorya(): InstrumentObservation {
  const board = gloryaProcessScoreboard(gloryaEvaluatedNeeds);
  // Honesty: never surface fake active/completed from design data.
  const active = 0;
  const completed = 0;
  const activity = gloryaActivityFromNeeds(gloryaEvaluatedNeeds, 5);

  return {
    id: 'glorya',
    name: 'Glorya',
    status: { label: 'Evaluating', phase: 'evaluating' },
    health: {
      level: 'static',
      note: 'Design layer until revenue gate and first seal',
    },
    summary:
      'Humanitarian capital — evaluating needs and standing down where intervention cannot change the outcome.',
    state: [
      { label: 'Evaluated', value: String(board.evaluated) },
      { label: 'Standing down', value: String(board.standingDown) },
      { label: 'Active', value: String(active), hint: 'None until first sealed disbursement' },
      { label: 'Completed', value: String(completed) },
    ],
    activity,
    href: '/glorya',
    secondaryLinks: [{ label: 'Gate board', href: '/gates#glorya' }],
    disclosure:
      'Illustrative evaluated-need layer. No live allocations. Inactive until the $1M revenue gate clears.',
  };
}
