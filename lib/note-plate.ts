// Signature cover system for research notes: "The Reading" — one braided
// stroke of light per note, seeded by the note's slug so every surface
// (card, index, OG image) draws the identical plate. Pure math, no DOM.

export type PlateTint = 'gold' | 'teal' | 'cream';

export const PLATE_TINTS: Record<PlateTint, { glow: string; core: string; dust: string }> = {
  gold: { glow: '255,158,71', core: '255,228,185', dust: '255,206,150' },
  teal: { glow: '88,201,172', core: '218,247,238', dust: '160,220,205' },
  cream: { glow: '214,208,196', core: '250,248,240', dust: '224,219,208' },
};

export function plateTint(coverDirection?: string | null): PlateTint {
  if (coverDirection === 'gold' || coverDirection === 'teal' || coverDirection === 'cream') {
    return coverDirection;
  }
  return 'cream';
}

export function hashStr(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PlateDust = { x: number; y: number; r: number; a: number; cold: boolean };
export type PlateFilament = { amp: number; f1: number; f2: number; ph: number; lead: boolean; alpha: number };

export type Reading = {
  dust: PlateDust[];
  /** Spine points in normalized 0..1 plate coordinates (x can overshoot edges). */
  spine: { x: number; y: number }[];
  filaments: PlateFilament[];
  /** Hot node where the reading lands, normalized. */
  node: { x: number; y: number };
};

const SPINE_STEPS = 150;

function catmull(points: number[], t: number) {
  const n = points.length - 1;
  const f = t * n;
  const i = Math.min(Math.floor(f), n - 1);
  const u = f - i;
  const p0 = points[Math.max(i - 1, 0)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(i + 2, n)];
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
  );
}

export function buildReading(seed: string): Reading {
  const rnd = mulberry32(hashStr(`${seed}::reading`));

  const dust: PlateDust[] = [];
  for (let i = 0; i < 42; i++) {
    dust.push({
      x: rnd(),
      y: rnd(),
      r: 0.4 + rnd() * 1.1,
      a: 0.06 + rnd() * 0.2,
      cold: rnd() >= 0.6,
    });
  }

  const controls: number[] = [];
  let y = 0.34 + rnd() * 0.32;
  for (let i = 0; i < 6; i++) {
    controls.push(y);
    y += (rnd() - 0.5) * 0.34;
    y = Math.min(Math.max(y, 0.18), 0.82);
  }

  const spine: { x: number; y: number }[] = [];
  for (let s = 0; s <= SPINE_STEPS; s++) {
    const t = s / SPINE_STEPS;
    spine.push({ x: -0.04 + t * 1.08, y: catmull(controls, t) });
  }

  const filaments: PlateFilament[] = [];
  for (let k = 0; k < 5; k++) {
    filaments.push({
      // Amplitude as a fraction of plate height (matches the proposal's H/210 scaling).
      amp: (1.6 + k * 2.1) / 210,
      f1: 5 + k * 2.4 + rnd() * 1.5,
      f2: 11 + k * 4.1,
      ph: rnd() * Math.PI * 2,
      lead: k === 0,
      alpha: k === 0 ? 0.95 : 0.36 + rnd() * 0.2,
    });
  }

  const node = spine[Math.floor(SPINE_STEPS * (0.8 + rnd() * 0.14))];

  return { dust, spine, filaments, node };
}

export function filamentOffset(filament: PlateFilament, t: number) {
  return (
    Math.sin(t * filament.f1 * 3.1 + filament.ph) * filament.amp +
    Math.sin(t * filament.f2 * 3.1 - filament.ph * 1.7) * filament.amp * 0.35
  );
}

/** SVG path for one filament, in a W×H viewport — used by the OG renderer. */
export function filamentPathD(reading: Reading, filament: PlateFilament, width: number, height: number) {
  const parts: string[] = [];
  reading.spine.forEach((point, index) => {
    const t = index / SPINE_STEPS;
    const x = (point.x * width).toFixed(1);
    const yy = ((point.y + filamentOffset(filament, t)) * height).toFixed(1);
    parts.push(`${index === 0 ? 'M' : 'L'}${x},${yy}`);
  });
  return parts.join(' ');
}
