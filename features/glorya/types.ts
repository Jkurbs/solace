export type GloryaNeedStatus = 'evaluated' | 'standing_down' | 'active' | 'completed';

export type GloryaNeedFocus =
  | 'education'
  | 'health'
  | 'water'
  | 'nutrition'
  | 'shelter'
  | 'protection';

/** Design-time evaluation only — no capital until the revenue gate and first seal. */
export type GloryaEvaluatedNeed = {
  id: string;
  /** City or locality name (real place). */
  city: string;
  /** ISO country name for display. */
  country: string;
  /** WGS84 latitude. */
  lat: number;
  /** WGS84 longitude. */
  lon: number;
  needScore: number;
  status: GloryaNeedStatus;
  focus: GloryaNeedFocus;
  note: string;
  regime: string;
};

export function gloryaPlaceLabel(need: Pick<GloryaEvaluatedNeed, 'city' | 'country'>) {
  return `${need.city}, ${need.country}`;
}
