import type { HermesLedgerEventType, HermesLedgerRow } from '@/features/hermes-ledger/store';

export type DecisionKind = 'in' | 'out' | 'wait' | 'void' | 'note';

export type CloseOutcome = {
  label: string;
  tone: 'pos' | 'neg' | null;
};

export function isStandingDownPosture(posture: string | null | undefined) {
  const normalized = (posture ?? '').toUpperCase().replace(/[\s-]+/g, '_');

  return normalized.includes('STANDING_DOWN') || normalized === 'RISK_OFF';
}

export function closeOutcomeLabel(pnl?: number | null, outcome?: string | null): CloseOutcome {
  const resolved = (outcome ?? '').toLowerCase();

  if (resolved.includes('advanced') || resolved.includes('gained')) {
    return { label: 'Gained', tone: 'pos' };
  }

  if (resolved.includes('gave back')) {
    return { label: 'Gave back', tone: 'neg' };
  }

  if (resolved.includes('flat')) {
    return { label: 'Flat', tone: null };
  }

  if (pnl != null) {
    if (pnl > 0) {
      return { label: 'Gained', tone: 'pos' };
    }

    if (pnl < 0) {
      return { label: 'Gave back', tone: 'neg' };
    }

    return { label: 'Flat', tone: null };
  }

  return { label: '', tone: null };
}

export function decisionTitle(kind: DecisionKind) {
  switch (kind) {
    case 'in':
      return 'Putting money to work';
    case 'out':
      return 'All in cash';
    case 'wait':
      return 'Waited';
    case 'void':
      return 'Called off';
    default:
      return 'A decision was written down';
  }
}

export function formatCloseDecisionSummary(pnl?: number | null, outcome?: string | null) {
  const { label } = closeOutcomeLabel(pnl, outcome);

  return label ? `All in cash · ${label}` : 'All in cash';
}

export function ledgerDecisionKind(row: {
  decision: string;
  eventType: HermesLedgerEventType | null;
  note?: string;
  outcome?: string | null;
  posture: string;
}): DecisionKind {
  if (row.eventType === 'open' || row.decision.startsWith('Opened a path')) {
    return 'in';
  }

  if (row.eventType === 'close' || /^Closed\s/i.test(row.decision)) {
    return 'out';
  }

  if (row.eventType === 'void') {
    return 'void';
  }

  const posture = row.posture.trim().toUpperCase();
  const text = `${row.decision} ${row.note ?? ''} ${row.outcome ?? ''}`.toLowerCase();

  if (
    posture === 'STANDING_DOWN' ||
    posture === 'RISK_OFF' ||
    /\b(stand(?:ing)?\s*down|wait(?:ing)?|no[-\s]?trade)\b/.test(text)
  ) {
    return 'wait';
  }

  return 'note';
}

export function translateDashboardActivity(summary: string) {
  const text = summary.trim();

  if (/^Closed\s/i.test(text)) {
    const match = text.match(/([+\-−]?\$[\d,]+(?:\.\d+)?)/);
    const pnl = match ? Number(match[1].replace(/[$,]/g, '').replace('−', '-')) : null;

    return formatCloseDecisionSummary(Number.isFinite(pnl) ? pnl : null);
  }

  if (/^Took money out/i.test(text) || /^Brought it back to cash/i.test(text) || /^All in cash/i.test(text)) {
    if (/Gained/i.test(text)) {
      return formatCloseDecisionSummary(1);
    }

    if (/Gave back/i.test(text)) {
      return formatCloseDecisionSummary(-1);
    }

    if (/Flat/i.test(text)) {
      return formatCloseDecisionSummary(0);
    }

    return formatCloseDecisionSummary(null);
  }

  if (/Opened a path/i.test(text) || /open(?:s|ed)? the next path/i.test(text) || /opens a path/i.test(text)) {
    return 'Putting money to work';
  }

  if (/moved allocation to cash/i.test(text)) {
    return 'All in cash';
  }

  if (/allocation updated/i.test(text)) {
    return 'Putting money to work';
  }

  if (/^Waiting for next path$/i.test(text)) {
    return 'Waiting';
  }

  return text;
}

export function waitingCopy() {
  return {
    emptyDecisions: 'No decisions on your book yet. Hermes will put money to work when conditions clear.',
    cashUntil: 'Cash sits until Hermes puts money to work.',
    nextWhenClear: 'Hermes will put money to work when conditions clear. That is expected. Capital stays yours.',
    liveWaiting: 'Waiting',
    stance: 'Waiting',
  };
}
