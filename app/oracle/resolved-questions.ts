// Resolved questions for the Oracle board. Until the Kalshi monitor feeds
// real records through an ingest route, entries here must carry
// `illustrative: true` — the card then wears the house Illustrative chip.
// Never add a fabricated record without the flag: this page is the record.

export type ResolvedQuestion = {
  id: string;
  question: string;
  category: string;
  /** Probability the Oracle recorded before resolution, 0..1. */
  probability: number;
  outcome: 'YES' | 'NO';
  recordedAt: string;
  resolvedAt: string;
  illustrative?: boolean;
};

export const resolvedQuestions: ResolvedQuestion[] = [
  {
    id: 'sample-btc-120k-jun30',
    question: 'Bitcoin above $120,000 at June 30 close?',
    category: 'Crypto · Target',
    probability: 0.78,
    outcome: 'YES',
    recordedAt: '2026-06-12',
    resolvedAt: '2026-06-30',
    illustrative: true,
  },
];

export function getQuestionRead(entry: ResolvedQuestion): 'Sharp call' | 'Humbling' | 'On the line' {
  const confidentYes = entry.probability >= 0.65;
  const confidentNo = entry.probability <= 0.35;

  if ((confidentYes && entry.outcome === 'YES') || (confidentNo && entry.outcome === 'NO')) {
    return 'Sharp call';
  }

  if ((confidentYes && entry.outcome === 'NO') || (confidentNo && entry.outcome === 'YES')) {
    return 'Humbling';
  }

  return 'On the line';
}
