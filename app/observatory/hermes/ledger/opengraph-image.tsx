import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { computeLedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
import { listHermesLedgerProcessRows } from '@/features/hermes-ledger/store';
import { OG_SIZE, renderLedgerShareImage } from '@/lib/ledger-og';

export const alt = 'Solace — Hermes Decision Ledger · sealed public record';
export const size = OG_SIZE;
export const contentType = 'image/png';

// Social previews should stay roughly as fresh as the ledger page shell.
export const revalidate = 60;

export default async function LedgerOgImage() {
  const [rows, openExposure] = await Promise.all([
    listHermesLedgerProcessRows(1500).catch(() => []),
    getHermesOpenExposure().catch(() => null),
  ]);

  const scoreboard = computeLedgerScoreboard(rows, {
    liveOpenPaths: openExposure ? openExposure.positions.length : null,
  });

  return renderLedgerShareImage(scoreboard);
}
