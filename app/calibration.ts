// Oracle calibration snapshot. Sourced from the live Kalshi oracle monitor
// (.hermes_state/kalshi_oracle_calibration_status.json). Dated snapshot for
// now; can be wired to a live endpoint later. Update the numbers and `asOf`
// when refreshing.
export type CalibrationBucket = {
  range: string; // confidence band label, e.g. "70-80%"
  predicted: number; // mean predicted probability in the bucket
  actual: number; // observed resolution rate
  count: number; // resolved predictions in the bucket
};

export const calibration: {
  asOf: string;
  resolved: number;
  brier: number;
  averageProbability: number;
  actualWinRate: number;
  buckets: CalibrationBucket[];
} = {
  asOf: 'Jun 13, 2026',
  resolved: 44,
  brier: 0.212,
  averageProbability: 0.507,
  actualWinRate: 0.364,
  buckets: [
    { range: '10-20%', predicted: 0.163, actual: 0.1, count: 10 },
    { range: '20-30%', predicted: 0.258, actual: 0.231, count: 13 },
    { range: '50-60%', predicted: 0.575, actual: 0.0, count: 1 },
    { range: '60-70%', predicted: 0.699, actual: 0.5, count: 2 },
    { range: '70-80%', predicted: 0.727, actual: 0.667, count: 3 },
    { range: '80-90%', predicted: 0.843, actual: 0.556, count: 9 },
    { range: '90-100%', predicted: 0.934, actual: 0.667, count: 6 },
  ],
};
