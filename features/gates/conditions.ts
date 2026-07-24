export type GateStatus = 'met' | 'partial' | 'not_met';

export type GateEvidence = {
  href: string;
  label: string;
};

export type GateCondition = {
  id: string;
  label: string;
  definition: string;
  status: GateStatus;
  note: string;
  evidence?: GateEvidence | null;
  dependsOn?: string;
};

export type GateDomain = {
  id: 'glorya' | 'simulation' | 'autonomy';
  name: string;
  phase: string;
  summary: string;
  conditions: GateCondition[];
};

export type GateLadderStage = {
  id: string;
  name: string;
  phase: string;
  href: string;
  state: 'cleared' | 'current' | 'locked';
};

export type GateRevision = {
  version: string;
  date: string;
  note: string;
};

export const gatesLastUpdated = '2026-07-23';
export const gatesVersion = '0.3';

export const gateLadder: GateLadderStage[] = [
  {
    id: 'markets',
    name: 'Markets',
    phase: 'Live',
    href: '/hermes',
    state: 'cleared',
  },
  {
    id: 'glorya',
    name: 'Glorya',
    phase: 'Evaluating',
    href: '#glorya',
    state: 'current',
  },
  {
    id: 'simulation',
    name: 'Simulation',
    phase: 'Building',
    href: '#simulation',
    state: 'current',
  },
  {
    id: 'autonomy',
    name: 'Autonomy',
    phase: 'Gated',
    href: '#autonomy',
    state: 'locked',
  },
];

export const gateRevisions: GateRevision[] = [
  {
    version: '0.3',
    date: 'July 23, 2026',
    note: 'Glorya domain and ladder stage. Revenue gate public.',
  },
  {
    version: '0.2',
    date: 'July 13, 2026',
    note: 'Ladder and single sheet layout.',
  },
  {
    version: '0.1',
    date: 'July 13, 2026',
    note: 'First public board.',
  },
];

export const gateDomains: GateDomain[] = [
  {
    id: 'glorya',
    name: 'Glorya',
    phase: 'Evaluating',
    summary:
      'Humanitarian capital. Designed and evaluating; no live allocations until the revenue gate and path integrity clear.',
    conditions: [
      {
        id: 'glorya-revenue',
        label: 'Revenue gate',
        definition:
          'Solace reaches $1M cumulative revenue before Glorya can move live capital. Presence and evaluation are allowed; disbursements are not.',
        status: 'not_met',
        note: 'Not met. Instrument dormant for live capital.',
        evidence: { href: '/glorya', label: 'Glorya' },
      },
      {
        id: 'glorya-need-layer',
        label: 'Need evaluation layer',
        definition:
          'A public, checkable process for selecting places where need is severe enough and verifiable — not rumor or headline alone.',
        status: 'partial',
        note: 'Design layer of evaluated places is public. Sources and thresholds still illustrative.',
        evidence: { href: '/glorya', label: 'Glorya field' },
      },
      {
        id: 'glorya-path',
        label: 'Path integrity',
        definition:
          'Before commitment, partners, access, regime, and timing must all hold so capital can become delivery — not theater.',
        status: 'not_met',
        note: 'Framework designed. No live path reviews or allocations yet.',
        evidence: { href: '/brief#section-05', label: 'Brief §05' },
      },
      {
        id: 'glorya-ledger',
        label: 'Sealed ledger ready',
        definition:
          'Each disbursement seals a public row (place, amount, need, partner, predicted vs actual, hash chain). The sheet stays empty until the first real move.',
        status: 'not_met',
        note: 'Empty by design. First seal is first disbursement after the revenue gate.',
        evidence: { href: '/glorya', label: 'Glorya ledger' },
      },
    ],
  },
  {
    id: 'simulation',
    name: 'Simulation',
    phase: 'Building',
    summary: 'Hypotheses fail here before they fail in deployment.',
    conditions: [
      {
        id: 'sim-environment',
        label: 'Environment scaffold',
        definition:
          'Synthetic markets cover structure, timing, and regime — the axes Hermes reads live — not just price replay.',
        status: 'not_met',
        note: 'Not standing yet.',
      },
      {
        id: 'sim-parity',
        label: 'Decision parity',
        definition: 'Simulation runs the same gated decision engine as live. No shortcuts.',
        status: 'partial',
        note: 'Simulation treasury is live on Solace rails. Engine parity still incomplete.',
        evidence: { href: '/hermes', label: 'Hermes' },
      },
      {
        id: 'sim-harness',
        label: 'Pre-deploy harness',
        definition: 'Nothing deploys without passing automated simulation checks first.',
        status: 'not_met',
        note: 'Not on the deploy path yet.',
      },
      {
        id: 'sim-proof',
        label: 'Load-bearing proof',
        definition:
          'One published case where simulation caught something live testing would have missed.',
        status: 'not_met',
        note: 'None published. Autonomy waits on this.',
      },
    ],
  },
  {
    id: 'autonomy',
    name: 'Autonomy',
    phase: 'Gated',
    summary: 'Same discipline, wider domains. Every row below has to clear first.',
    conditions: [
      {
        id: 'auto-regime',
        label: 'Regime cycles',
        definition:
          'One full bull-and-bear cycle in the markets Hermes trades. Years, not months.',
        status: 'not_met',
        note: 'Neither of two complete.',
        evidence: { href: '/trust', label: 'Ledger' },
      },
      {
        id: 'auto-capital',
        label: 'Capital threshold',
        definition:
          'Enough verified capital under management, held through a full drawdown, before scale. The number gets published when it is set.',
        status: 'partial',
        note: 'Founder capital only. Threshold not published yet.',
        evidence: { href: '/trust', label: 'Ledger' },
      },
      {
        id: 'auto-oracle',
        label: 'Oracle calibration proven',
        definition:
          'Brier score on a resolved sample large enough to mean something — published in full.',
        status: 'partial',
        note: 'Keeping score. Sample still too small to claim.',
        evidence: { href: '/oracle', label: 'Oracle' },
      },
      {
        id: 'auto-simulation',
        label: 'Simulation load-bearing',
        definition:
          'Simulation catches failures before deployment — with at least one documented case on the record.',
        status: 'not_met',
        note: 'Waiting on Simulation #04.',
        dependsOn: 'sim-proof',
        evidence: { href: '#sim-proof', label: 'Sim #04' },
      },
    ],
  },
];

export const gateStatusLabels: Record<GateStatus, string> = {
  met: 'Met',
  partial: 'Partial',
  // "Open" was easy to misread as unlocked/available; status means the condition is not met yet.
  not_met: 'Not met',
};

export function summarizeGateDomain(domain: GateDomain) {
  const counts = domain.conditions.reduce(
    (totals, condition) => {
      totals[condition.status] += 1;
      return totals;
    },
    { met: 0, partial: 0, not_met: 0 },
  );

  return {
    ...counts,
    total: domain.conditions.length,
    cleared: counts.met === domain.conditions.length,
  };
}

export function summarizeAllGates() {
  return gateDomains.map((domain) => ({
    domain,
    summary: summarizeGateDomain(domain),
  }));
}

export function getTotalGateProgress() {
  return gateDomains.reduce(
    (totals, domain) => {
      const summary = summarizeGateDomain(domain);

      return {
        met: totals.met + summary.met,
        total: totals.total + summary.total,
      };
    },
    { met: 0, total: 0 },
  );
}

export function getAutonomyGateHeadline() {
  const autonomy = gateDomains.find((domain) => domain.id === 'autonomy');

  if (!autonomy) {
    return 'Gated';
  }

  const { met, total } = summarizeGateDomain(autonomy);

  if (met === 0) {
    return 'Gated · none cleared';
  }

  if (met === total) {
    return 'Gated · all cleared';
  }

  return `Gated · ${met} of ${total} cleared`;
}

export function getGateBoardHeadline() {
  const { met, total } = getTotalGateProgress();

  return `${met} of ${total} cleared`;
}