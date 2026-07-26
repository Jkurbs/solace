import 'server-only';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getStoredHermesPublicReading } from '@/features/hermes-public-reading/store';

import { composeHermesPublicMarketRead, type HermesPublicMarketRead } from './types';

export async function getHermesPublicMarketRead(now = new Date()): Promise<HermesPublicMarketRead> {
  const [brief, reading] = await Promise.all([
    getStoredHermesBriefSnapshot().catch(() => null),
    getStoredHermesPublicReading(now).catch(() => null),
  ]);

  return composeHermesPublicMarketRead({ brief, reading, now });
}

export type { HermesPublicMarketRead };
