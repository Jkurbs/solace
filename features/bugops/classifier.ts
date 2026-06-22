import type {
  BugDuplicateCandidate,
  BugReport,
  BugReportInput,
  BugSeverity,
  BugStatus,
  BugTrustImpact,
  BugTriageResult,
} from './types';

const financialDisplayTerms = [
  'available balance',
  'balance',
  'cash balance',
  'deposit',
  'deposited',
  'fake money',
  'money',
  'nav',
  'nav / unit',
  'nav per unit',
  'performance',
  'pnl',
  'pool share',
  'pool unit',
  'pool units',
  'profit',
  'real money',
  'simulated',
  'simulation',
  'since inception',
  "today's change",
  'withdraw',
  'withdrawable',
  'withdrawal',
];

const trustBreakingTerms = [
  'cash value',
  'data leak',
  'incorrect balance',
  'incorrect nav',
  'leak',
  'real-vs-simulated',
  'real money confusion',
  'security',
  'wrong balance',
  'wrong nav',
  'wrong performance',
];

const malfunctionTerms = [
  'blank',
  'broken',
  'crash',
  'does not update',
  "doesn't update",
  'error',
  'failed',
  'frozen',
  'incorrect',
  'missing',
  'not loading',
  'not updating',
  'stale',
  'unchanged',
  'wrong',
];

const copyConfusionTerms = [
  'confusing',
  'unclear',
  'wording',
  'label',
  'do not understand',
  "don't understand",
  'misleading',
];

const cosmeticTerms = ['color', 'spacing', 'typo', 'layout', 'alignment', 'cosmetic'];

const stopWords = new Set([
  'a',
  'after',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'i',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'page',
  'that',
  'the',
  'this',
  'to',
  'with',
]);

function lower(value: string | undefined) {
  return value?.toLowerCase() ?? '';
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getReportText(input: BugReportInput) {
  return [
    input.summary,
    input.whatHappened,
    input.actualBehavior,
    input.expectedBehavior,
    input.pageUrl,
    input.consoleErrors,
    input.seriousness,
    ...(input.stepsToReproduce ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function sentenceCase(value: string) {
  const trimmed = value.trim();

  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function createTitle(input: BugReportInput, area: string) {
  if (input.summary?.trim()) {
    return sentenceCase(compactWhitespace(input.summary).slice(0, 96));
  }

  const description = compactWhitespace(input.whatHappened);

  if (description.length <= 84) {
    return sentenceCase(description);
  }

  return `${area}: ${sentenceCase(description.slice(0, 76).trim())}`;
}

function classifyArea(text: string, input: BugReportInput) {
  const page = lower(input.pageUrl);

  if (text.includes('nav') || text.includes('pool unit') || text.includes('pool share')) {
    return 'Dashboard / NAV / Pool Units';
  }

  if (text.includes('balance') || text.includes('withdraw') || text.includes('deposit') || text.includes('money')) {
    return 'Dashboard / Money Movement';
  }

  if (text.includes('performance') || text.includes('profit') || text.includes('pnl') || text.includes("today's change")) {
    return 'Dashboard / Performance';
  }

  if (text.includes('login') || text.includes('sign in') || text.includes('auth')) {
    return 'Authentication';
  }

  if (text.includes('onboarding') || text.includes('identity') || text.includes('verification')) {
    return 'Onboarding';
  }

  if (text.includes('mobile') || text.includes('iphone') || text.includes('safari')) {
    return 'Mobile Dashboard';
  }

  if (page.includes('/console')) {
    return 'Console';
  }

  if (page.includes('/dashboard')) {
    return 'Dashboard';
  }

  return 'General';
}

function classifySeverity(text: string): { severity: BugSeverity; trustImpact: BugTrustImpact } {
  const hasFinancialDisplay = includesAny(text, financialDisplayTerms);
  const hasTrustBreaking = includesAny(text, trustBreakingTerms);
  const hasMalfunction = includesAny(text, malfunctionTerms);
  const hasCopyConfusion = includesAny(text, copyConfusionTerms);
  const hasCosmetic = includesAny(text, cosmeticTerms);

  if (hasTrustBreaking || (hasFinancialDisplay && hasMalfunction && text.includes('wrong'))) {
    return { severity: 'P0', trustImpact: 'trust_breaking' };
  }

  if (hasFinancialDisplay || text.includes('dashboard not loading') || text.includes('login broken')) {
    return { severity: 'P1', trustImpact: 'core_product' };
  }

  if (hasCopyConfusion || text.includes('simulation mode') || text.includes('fake-money')) {
    return { severity: 'P2', trustImpact: 'confusing' };
  }

  if (hasCosmetic) {
    return { severity: 'P3', trustImpact: 'cosmetic' };
  }

  if (hasMalfunction) {
    return { severity: 'P1', trustImpact: 'core_product' };
  }

  return { severity: 'P2', trustImpact: 'confusing' };
}

function classifyMissingInfo(input: BugReportInput, severity: BugSeverity) {
  const missingInfo: string[] = [];
  const steps = input.stepsToReproduce?.filter(Boolean) ?? [];

  if (!input.whatHappened || input.whatHappened.trim().length < 12) {
    missingInfo.push('A fuller description of what happened');
  }

  if (!input.expectedBehavior?.trim()) {
    missingInfo.push('Expected result');
  }

  if (steps.length === 0) {
    missingInfo.push('Steps to reproduce');
  }

  if (!input.pageUrl?.trim()) {
    missingInfo.push('Page or screen where it happened');
  }

  if (!input.browser?.trim() && !input.device?.trim()) {
    missingInfo.push('Browser or device');
  }

  if ((severity === 'P0' || severity === 'P1') && !input.screenshotUrl?.trim()) {
    missingInfo.push('Screenshot or short screen recording');
  }

  return missingInfo;
}

function createLabels(area: string, severity: BugSeverity, trustImpact: BugTrustImpact) {
  return [
    'bugops',
    severity.toLowerCase(),
    trustImpact.replace('_', '-'),
    area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  ];
}

function createUserImpact(severity: BugSeverity, area: string) {
  if (severity === 'P0') {
    return 'May damage user trust in financial display accuracy or simulated-vs-real-money clarity.';
  }

  if (severity === 'P1') {
    return `May block a core beta workflow in ${area}.`;
  }

  if (severity === 'P2') {
    return 'May confuse beta users or increase support load.';
  }

  return 'Minor visual or polish issue with low product risk.';
}

function createLikelyCause(text: string, area: string) {
  if (text.includes('nav') && (text.includes('stale') || text.includes('not updating') || text.includes('unchanged'))) {
    return 'Likely refresh or cache invalidation issue between the pool NAV source and dashboard read model.';
  }

  if (text.includes('balance') || text.includes('withdrawable') || text.includes('deposit')) {
    return 'Likely ledger read-model, treasury state, or simulation/live-money labeling mismatch.';
  }

  if (text.includes('blank') || text.includes('not loading')) {
    return 'Likely client render, data-fetching, or access-gate failure on the affected route.';
  }

  if (text.includes('mobile') || text.includes('iphone') || text.includes('safari')) {
    return 'Likely responsive layout or browser compatibility issue.';
  }

  return `Needs reproduction in ${area} before assigning a code owner.`;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function scoreDuplicate(input: BugReportInput, existing: BugReport) {
  const inputTokens = new Set(tokenize(getReportText(input)));
  const existingTokens = new Set(tokenize(getReportText(existing)));

  if (inputTokens.size === 0 || existingTokens.size === 0) {
    return 0;
  }

  let overlap = 0;

  inputTokens.forEach((token) => {
    if (existingTokens.has(token)) {
      overlap += 1;
    }
  });

  const tokenScore = overlap / Math.max(inputTokens.size, existingTokens.size);
  const areaBonus = existing.area === classifyArea(getReportText(input), input) ? 0.18 : 0;
  const highSignalBonus =
    (inputTokens.has('nav') && existingTokens.has('nav')) ||
    (inputTokens.has('balance') && existingTokens.has('balance')) ||
    (inputTokens.has('withdrawable') && existingTokens.has('withdrawable'))
      ? 0.18
      : 0;

  return Math.min(1, tokenScore + areaBonus + highSignalBonus);
}

export function triageBugReport(input: BugReportInput, existingReports: BugReport[] = []): Omit<BugTriageResult, 'reporterReply'> & { reporterReplyTemplate: string } {
  const text = getReportText(input);
  const area = classifyArea(text, input);
  const { severity, trustImpact } = classifySeverity(text);
  const missingInfo = classifyMissingInfo(input, severity);
  const title = createTitle(input, area);
  const reproductionSteps = input.stepsToReproduce?.filter(Boolean).map((step) => compactWhitespace(step)) ?? [];
  const duplicateCandidates: BugDuplicateCandidate[] = existingReports
    .filter((report) => report.status !== 'CLOSED')
    .map((report) => ({
      displayId: report.displayId,
      id: report.id,
      score: Number(scoreDuplicate(input, report).toFixed(2)),
      status: report.status,
      title: report.title,
    }))
    .filter((candidate) => candidate.score >= 0.42)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const duplicateOfId = duplicateCandidates[0]?.score >= 0.78 ? duplicateCandidates[0].id : undefined;
  const status: BugStatus = missingInfo.length > 0 ? 'NEEDS_INFO' : 'NEW';

  return {
    area,
    duplicateCandidates,
    duplicateOfId,
    labels: createLabels(area, severity, trustImpact),
    likelyCause: createLikelyCause(text, area),
    missingInfo,
    reporterReplyTemplate:
      duplicateOfId && duplicateCandidates[0]
        ? `Got it - I linked this to ${duplicateCandidates[0].displayId}. I will track it with the existing report and update you when it changes.`
        : `Got it - I logged this as {displayId}. I will track it and update you once it is fixed.`,
    reproductionSteps,
    severity,
    status,
    title,
    trustImpact,
    userImpact: createUserImpact(severity, area),
  };
}

export function finalizeReporterReply(template: string, displayId: string) {
  return template.replace('{displayId}', displayId);
}
