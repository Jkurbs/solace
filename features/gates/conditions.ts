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
  id: 'simulation' | 'autonomy';
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

export const gatesLastUpdated = '2026-07-13';
export const gatesVersion = '0.2';

export const gateLadder: GateLadderStage[] = [
  {
    id: 'markets',
    name: 'Markets',
    phase: 'Live',
    href: '/hermes',
    state: 'cleared',
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
  not_met: 'Open',
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