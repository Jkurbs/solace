export const waitlistCapitalRangeValues = [
  '$1k-$10k',
  '$10k-$25k',
  '$25k-$100k',
  '$100k-$250k',
  '$250k+',
] as const;

export type WaitlistCapitalRange = (typeof waitlistCapitalRangeValues)[number];

export const waitlistCapitalRanges = waitlistCapitalRangeValues.map((value) => ({
  label: value.replace('-', '–'),
  value,
}));

export function isWaitlistCapitalRange(value: string): value is WaitlistCapitalRange {
  return (waitlistCapitalRangeValues as readonly string[]).includes(value);
}
