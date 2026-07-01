import type { CommsPolicy, CopySafety, DisclosureClass, SocialDraft, SocialPlatform, SocialSignal } from './types';

const defaultPolicy: CommsPolicy = {
  allowedPlatforms: [],
  classifiedAt: new Date(0).toISOString(),
  classifierVersion: 'unknown',
  disclosure: 'CUSTOMER_ONLY',
  reasons: ['No comms policy found; defaulting to internal-only handling.'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDisclosureClass(value: unknown): value is DisclosureClass {
  return (
    value === 'PUBLIC_SAFE' ||
    value === 'WEBSITE_ONLY' ||
    value === 'X_SAFE' ||
    value === 'CUSTOMER_ONLY' ||
    value === 'PRIVATE_EDGE' ||
    value === 'NEVER_PUBLISH'
  );
}

function socialPlatforms(value: unknown): SocialPlatform[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is SocialPlatform =>
      item === 'x' || item === 'linkedin' || item === 'instagram' || item === 'newsletter' || item === 'homepage',
  );
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function getCommsPolicy(signal?: SocialSignal): CommsPolicy {
  const comms = isRecord(signal?.rawContext.comms) ? signal.rawContext.comms : undefined;
  const policy = isRecord(comms?.policy) ? comms.policy : undefined;

  if (!policy || !isDisclosureClass(policy.disclosure)) {
    return defaultPolicy;
  }

  return {
    allowedPlatforms: socialPlatforms(policy.allowedPlatforms),
    classifiedAt: typeof policy.classifiedAt === 'string' ? policy.classifiedAt : defaultPolicy.classifiedAt,
    classifierVersion: typeof policy.classifierVersion === 'string' ? policy.classifierVersion : defaultPolicy.classifierVersion,
    disclosure: policy.disclosure,
    reasons: stringArray(policy.reasons),
  };
}

function hasRedactionBlock(draft: SocialDraft) {
  const text = [draft.recommendation, ...draft.reviewNotes].join(' ').toLowerCase();
  return text.includes('blocked by redaction guard') || text.includes('blocked public edge-leak') || text.includes('blocked secret');
}

export function getCopySafety(draft: SocialDraft, signal?: SocialSignal): CopySafety {
  const policy = getCommsPolicy(signal);
  const reasons: string[] = [];

  if (draft.format === 'internal_changelog') {
    reasons.push('Internal changelog drafts are never paste-safe.');
  }

  if (signal?.source === 'git_commit' || signal?.source === 'git_worktree_change') {
    reasons.push('Raw git and worktree records are private evidence, not external copy.');
  }

  if (policy.disclosure === 'CUSTOMER_ONLY' || policy.disclosure === 'PRIVATE_EDGE' || policy.disclosure === 'NEVER_PUBLISH') {
    reasons.push(`Disclosure class is ${policy.disclosure}.`);
  }

  if (!policy.allowedPlatforms.includes(draft.platform) && draft.format !== 'internal_changelog') {
    reasons.push(`${draft.platform} is not allowed by the disclosure policy.`);
  }

  if (hasRedactionBlock(draft)) {
    reasons.push('The redaction guard blocked this draft.');
  }

  if (draft.status === 'NEEDS_REVISION' || draft.status === 'REJECTED' || draft.status === 'FAILED') {
    reasons.push(`Draft status is ${draft.status}.`);
  }

  if (reasons.length) {
    const requiresRewrite = reasons.some((reason) => reason.includes('redaction guard') || reason.includes('NEEDS_REVISION'));

    return {
      label: requiresRewrite ? 'Needs human rewrite' : 'Do not paste',
      level: requiresRewrite ? 'NEEDS_HUMAN_REWRITE' : 'DO_NOT_PASTE',
      reasons,
    };
  }

  return {
    label: 'Safe to paste',
    level: 'SAFE_TO_PASTE',
    reasons: ['Generated public draft passed disclosure and redaction checks.'],
  };
}

export function buildGptCopyPack(draft: SocialDraft, signal?: SocialSignal) {
  const sourceLine = signal ? `${signal.title}: ${signal.summary}` : draft.body;
  const task =
    draft.platform === 'x'
      ? 'Write 5 X post options under 240 characters.'
      : draft.platform === 'homepage'
        ? 'Write 3 concise website update options.'
        : 'Write 3 concise public update options.';

  return [
    'Public-safe update:',
    draft.body,
    '',
    'Source context:',
    sourceLine,
    '',
    'Task:',
    task,
    'Do not mention entries, targets, thresholds, indicators, probabilities, model logic, route mechanics, private system behavior, customer data, or performance claims.',
  ].join('\n');
}
