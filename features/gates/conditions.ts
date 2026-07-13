export type GateStatus = 'met' | 'partial' | 'not_met';

export type GateCondition = {
  id: string;
  label: string;
  definition: string;
  status: GateStatus;
  note: string;
};

export type GateDomain = {
  id: 'simulation' | 'autonomy';
  name: string;
  phase: string;
  summary: string;
  conditions: GateCondition[];
};

export type GateRevision = {
  version: string;
  date: string;
  note: string;
};

export const gatesLastUpdated = '2026-07-13';
export const gatesVersion = '0.1';

export const gateRevisions: GateRevision[] = [
  {
    version: '0.1',
    date: 'July 13, 2026',
    note: 'Initial public gate board for Simulation and Autonomy. Statuses mirror the technical brief and live verification surfaces.',
  },
];

export const gateDomains: GateDomain[] = [
  {
    id: 'simulation',
    name: 'Simulation',
    phase: 'Building',
    summary:
      'Synthetic environments where hypotheses fail quietly before deployment. Simulation earns trust through the same loop as every Solace instrument: observe, model, simulate, deploy.',
    conditions: [
      {
        id: 'sim-environment',
        label: 'Environment scaffold',
        definition:
          'Synthetic markets reproduce the structure, timing, and regime axes Hermes reads in live markets — not price replay alone.',
        status: 'not_met',
        note: 'Representative synthetic market environments are not yet standing.',
      },
      {
        id: 'sim-parity',
        label: 'Decision parity',
        definition:
          'The same gated decision engine that runs live runs in simulation without shortcut paths or hand-tuned overrides.',
        status: 'partial',
        note: 'Beta simulation treasury runs through Solace rails; full decision-engine parity is in progress.',
      },
      {
        id: 'sim-harness',
        label: 'Pre-deploy harness',
        definition:
          'Every deploy candidate passes automated simulation checks before capital moves.',
        status: 'not_met',
        note: 'No automated simulation gate on the deploy path yet.',
      },
      {
        id: 'sim-proof',
        label: 'Load-bearing proof',
        definition:
          'At least one documented, published case where simulation caught a failure live testing would have missed.',
        status: 'not_met',
        note: 'No documented catch published yet. This condition also gates Autonomy expansion.',
      },
    ],
  },
  {
    id: 'autonomy',
    name: 'Autonomy',
    phase: 'Gated',
    summary:
      'The same decision discipline extended beyond markets. Domains are earned, not declared — expansion waits until every condition below clears.',
    conditions: [
      {
        id: 'auto-regime',
        label: 'Regime cycles',
        definition:
          'A complete bull-and-bear cycle in the primary markets Hermes trades. By construction, this gate is measured in years, not months.',
        status: 'not_met',
        note: 'Neither of two complete cycles recorded.',
      },
      {
        id: 'auto-capital',
        label: 'Capital threshold',
        definition:
          'A minimum of sustained, verified founder-and-approved-user capital under management, held through at least one full drawdown, before scale is considered. The figure will be published once set.',
        status: 'partial',
        note: 'Founder capital only today. Threshold figure not yet published.',
      },
      {
        id: 'auto-oracle',
        label: 'Oracle calibration proven',
        definition:
          'A Brier score on a resolved-question sample large enough to be statistically meaningful, published in full — not selectively.',
        status: 'partial',
        note: 'Oracle is keeping score; resolved sample is still below the disclosure threshold.',
      },
      {
        id: 'auto-simulation',
        label: 'Simulation load-bearing',
        definition:
          'Synthetic environments are trusted to catch a failure before deployment, demonstrated by at least one documented case where simulation caught something live testing would have missed.',
        status: 'not_met',
        note: 'Depends on Simulation load-bearing proof. Not begun.',
      },
    ],
  },
];

export const gateStatusLabels: Record<GateStatus, string> = {
  met: 'Met',
  partial: 'Partially met',
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

export function getAutonomyGateHeadline() {
  const autonomy = gateDomains.find((domain) => domain.id === 'autonomy');

  if (!autonomy) {
    return 'Gated';
  }

  const { met, total } = summarizeGateDomain(autonomy);

  if (met === 0) {
    return 'Gated · no conditions met yet';
  }

  if (met === total) {
    return 'Gated · all conditions met';
  }

  return `Gated · ${met} of ${total} met`;
}