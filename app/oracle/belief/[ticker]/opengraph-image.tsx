import { fetchKalshiBeliefByTicker } from '@/features/oracle/kalshi';
import {
  OG_SIZE,
  renderOracleBeliefFallbackImage,
  renderOracleBeliefShareImage,
} from '@/lib/oracle-belief-og';

export const alt = 'Solace · Oracle believes · share card';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 60;

type Props = {
  params: Promise<{ ticker: string }>;
};

export default async function OracleBeliefOgImage({ params }: Props) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw);
  const belief = await fetchKalshiBeliefByTicker(ticker).catch(() => null);

  if (!belief) {
    return renderOracleBeliefFallbackImage(ticker);
  }

  return renderOracleBeliefShareImage(belief);
}
