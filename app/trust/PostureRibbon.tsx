'use client';

import type { TrustLedgerDisplayRow } from './TrustLedgerTable';

type Segment = {
  key: string;
  posture: string;
  count: number;
  tone: 'deployed' | 'selective' | 'defensive' | 'standing' | 'risk' | 'other';
  version: string | null;
};

function postureTone(posture: string): Segment['tone'] {
  const p = posture.toLowerCase().replace(/[_\s-]+/g, ' ');
  if (p.includes('standing') || p.includes('wait')) return 'standing';
  if (p.includes('defensive')) return 'defensive';
  if (p.includes('risk')) return 'risk';
  if (p.includes('selective')) return 'selective';
  if (p.includes('deployed') || p.includes('deploy')) return 'deployed';
  return 'other';
}

function buildSegments(rows: TrustLedgerDisplayRow[]): Segment[] {
  // Display order is newest-first; ribbon reads left = older → right = now.
  const chronological = [...rows]
    .filter((row) => row.recordId !== 'HMS-000' && row.posture && row.posture !== '--')
    .reverse();

  if (!chronological.length) return [];

  const segments: Segment[] = [];

  for (const row of chronological) {
    const posture = row.posture;
    const version = row.hermesVersion;
    const last = segments[segments.length - 1];

    if (last && last.posture === posture && last.version === version) {
      last.count += 1;
      continue;
    }

    segments.push({
      count: 1,
      key: `${row.recordId}-${posture}`,
      posture,
      tone: postureTone(posture),
      version,
    });
  }

  return segments;
}

/**
 * Glanceable patience history from sealed posture — not PnL color.
 * Emotional job: Hermes trades less than you think; waiting is visible.
 */
export default function PostureRibbon({ rows }: { rows: TrustLedgerDisplayRow[] }) {
  const segments = buildSegments(rows);
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  if (!total) {
    return null;
  }

  const standingShare = segments
    .filter((segment) => segment.tone === 'standing' || segment.tone === 'defensive' || segment.tone === 'risk')
    .reduce((sum, segment) => sum + segment.count, 0);

  const patiencePct = Math.round((standingShare / total) * 100);

  return (
    <div className="ledger-posture-ribbon" aria-label="Posture history across sealed rows">
      <div className="ledger-posture-ribbon-head">
        <p className="ledger-posture-ribbon-kicker">Posture over time</p>
        <p className="ledger-posture-ribbon-dek">
          Left is older · right is now · {patiencePct}% of sealed rows in defensive, standing down, or risk-off
        </p>
      </div>
      <div className="ledger-posture-ribbon-bar" role="img" aria-label="Posture timeline">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`ledger-posture-seg is-${segment.tone}`}
            style={{ flexGrow: segment.count, flexBasis: 0 }}
            title={`${segment.posture}${segment.version ? ` · v${segment.version}` : ''} · ${segment.count} row${
              segment.count === 1 ? '' : 's'
            }`}
          />
        ))}
      </div>
      <ul className="ledger-posture-ribbon-legend">
        <li>
          <span className="ledger-posture-dot is-deployed" aria-hidden="true" /> Deployed
        </li>
        <li>
          <span className="ledger-posture-dot is-selective" aria-hidden="true" /> Selective
        </li>
        <li>
          <span className="ledger-posture-dot is-defensive" aria-hidden="true" /> Defensive
        </li>
        <li>
          <span className="ledger-posture-dot is-standing" aria-hidden="true" /> Standing down
        </li>
        <li>
          <span className="ledger-posture-dot is-risk" aria-hidden="true" /> Risk off
        </li>
      </ul>
    </div>
  );
}
