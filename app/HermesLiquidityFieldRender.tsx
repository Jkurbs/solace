'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { getRenderPixelRatio } from '@/lib/webgl-dpr';
import { isWebglPaused, observeWebglMountVisibility, subscribeWebglPause } from '@/lib/webgl-lifecycle';

// Variant D of the telemetry design: real posture drives the art's energy.
// Deployed burns at full brightness; standing down dims to embers. The field
// itself (terrain, haze) persists at every level, the world stays, the
// judgment quiets.
const postureEnergy: Record<HermesPublicPosture, number> = {
  DEPLOYED: 1,
  SELECTIVE: 0.78,
  DEFENSIVE: 0.55,
  STANDING_DOWN: 0.34,
  RISK_OFF: 0.28,
};

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform sampler2D uField;
  uniform sampler2D uPaths;
  uniform float uNumPaths;
  uniform float uSurvivor;
  uniform vec2 uWell;
  uniform vec2 uPointer;
  uniform float uPointerGlow;
  uniform float uPathFade;
  uniform float uEnergy;

  const int MAX_PATHS = 6;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float hash13(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.07 + vec2(11.3, 7.1);
      a *= 0.5;
    }
    return v;
  }

  float fieldAt(vec2 w) {
    float inBounds = step(0.0, w.x) * step(w.x, 1.0) * step(0.0, w.y) * step(w.y, 1.0);
    float f = texture2D(uField, clamp(w, 0.0, 1.0)).r * inBounds;
    float breathe = 0.95 + 0.05 * sin(uTime * 0.2);
    return f * breathe;
  }

  // Moving grains: density stays anchored in screen space (cloud never empties);
  // only the grain pattern slides/rolls through the mass.
  vec3 dustLayer(vec2 w, float scale, float drift, float weight, float seed, float radMul) {
    vec2 flow = vec2(uTime * drift * 1.6, uTime * drift * -0.4);
    float swirl = uTime * (0.12 + seed * 0.015);
    // Pattern advection (visible motion) without moving density away.
    vec2 q = w + flow;
    q += vec2(sin(q.y * 2.8 + swirl), cos(q.x * 2.2 - swirl * 0.7)) * 0.028;
    vec2 g = q * vec2(scale, scale * 0.92);
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    vec3 acc = vec3(0.0);
    for (int n = 0; n < 5; n++) {
      float fn = float(n);
      float rnd = hash(cell * 1.13 + seed + fn * 17.3);
      vec2 pp = vec2(
        hash(cell + vec2(7.1 + fn, 3.7) + seed),
        hash(cell + vec2(2.3, 9.2 + fn * 1.7) + seed)
      ) * 0.92 + 0.04;
      // Density from stable screen position — not from advected coords.
      float fc = fieldAt(w);
      float dens = smoothstep(0.0, 0.22, max(fc, 0.55));
      float spawn = step(rnd, dens * 0.35 + 0.82);

      float radius = mix(0.0025, 0.012, hash(cell + 5.5 + seed + fn)) * radMul;
      float pt = smoothstep(radius, radius * 0.04, length(fr - pp));
      float tw = 0.55 + 0.45 * sin(uTime * (0.9 + rnd * 2.0) + rnd * 23.0 + fn);

      float temp = smoothstep(0.04, 0.5, fc);
      vec3 warm = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.94, 0.78), smoothstep(0.35, 0.95, fc));
      vec3 cold = vec3(0.55, 0.78, 0.98);
      vec3 dcol = mix(cold, warm, temp);
      acc += dcol * spawn * pt * tw * weight * (0.6 + fc * 1.1);
    }
    return acc;
  }

  vec3 bokeh(vec2 w, float scale, float drift, float seed) {
    vec2 flow = vec2(uTime * drift * 1.4, uTime * drift * 0.55);
    vec2 q = w + flow;
    vec2 g = q * scale;
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    vec3 acc = vec3(0.0);
    for (int n = 0; n < 3; n++) {
      float fn = float(n);
      float rnd = hash(cell * 1.31 + seed + fn * 9.1);
      float spawn = step(rnd, 0.82);
      vec2 pp = vec2(
        hash(cell + vec2(3.1 + fn, 8.7) + seed),
        hash(cell + vec2(9.4, 2.2 + fn) + seed)
      ) * 0.85 + 0.08;

      float r = mix(0.03, 0.1, hash(cell + 6.8 + seed + fn));
      float disc = smoothstep(r, r * 0.3, length(fr - pp));
      float tw = 0.5 + 0.5 * sin(uTime * (0.55 + rnd * 1.4) + rnd * 31.0);

      float fc = fieldAt(w);
      vec3 col = mix(vec3(0.5, 0.7, 0.9), vec3(1.0, 0.84, 0.58), smoothstep(0.06, 0.4, fc));
      acc += col * spawn * disc * tw * 0.11;
    }
    return acc;
  }

  // Persistent right-side mass — sways gently, never leaves the frame.
  float stripeBand(vec2 w) {
    float t = uTime * 0.08;
    float right = smoothstep(0.40, 0.54, w.x);
    // Anchored on the right; only small sway (no large travel that empties).
    float coreX = 0.74 + sin(t * 0.45) * 0.028;
    float coreY = 0.50 + cos(t * 0.38) * 0.04;
    vec2 d = (w - vec2(coreX, coreY)) * vec2(1.45, 1.05);
    float ang = -0.42 + sin(t * 0.5) * 0.06;
    float ca = cos(ang);
    float sa = sin(ang);
    vec2 r = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
    float ellipse = length(r * vec2(1.7, 0.95));
    float core = smoothstep(0.58, 0.1, ellipse);
    float ribbon = smoothstep(
      0.42,
      0.1,
      length((w - vec2(0.84 + sin(t * 0.4) * 0.02, 0.60 + cos(t * 0.5) * 0.035)) * vec2(2.2, 1.45))
    );
    // Floor so the band never fully collapses.
    float band = max(core, ribbon * 0.75) * right;
    band = max(band, right * 0.42);
    band *= 0.88 + 0.14 * fbm(w * 3.5 + vec2(t * 0.5, -t * 0.35));
    return clamp(band, 0.0, 1.0);
  }

  // Cloud-only, flowing right-side stream on white — always present.
  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    // Stable layout coords for density (so the cloud doesn't drift away).
    vec2 w = uv;
    w.x = mix(w.x, 0.22 + w.x * 0.78, mobile);

    // Soft breathe only — no large translation of the whole field.
    w += vec2(sin(uTime * 0.045), cos(uTime * 0.038)) * 0.008;
    w = (w - 0.5) * (1.0 + 0.006 * sin(uTime * 0.04)) + 0.5;

    vec2 toWell = w - uWell;
    float wr = length(toWell * vec2(1.3, 1.0));
    vec2 wWarp = w - (toWell / max(wr, 0.001)) * 0.01 * exp(-wr * wr / 0.05);

    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.02) * uPointerGlow;
    wWarp -= (toPtr / max(prd, 0.001)) * 0.01 * probe;
    vec2 ptrPar = (vec2(0.5) - uPointer) * 0.014 * uPointerGlow;

    vec3 paper = vec3(1.0, 1.0, 1.0);
    float band = stripeBand(w);
    // Field density anchored to stable w (not sliding off-screen).
    float f = max(fieldAt(wWarp + ptrPar * 0.1), band * 0.9);
    f = max(f, 0.45 * smoothstep(0.42, 0.62, w.x));

    vec2 clumpDrift = vec2(uTime * 0.035, -uTime * 0.022);
    float clump = fbm(w * 2.2 + clumpDrift);
    clump = smoothstep(0.1, 0.45, clump);
    // Mass never drops to zero on the right.
    float mass = clamp(max(clump, band) * (0.65 + 0.45 * f), 0.35, 1.0);

    float clumpTowardLight = fbm((w + vec2(-0.45, 0.9) * 0.04) * 2.2 + clumpDrift);
    clumpTowardLight = smoothstep(0.2, 0.55, clumpTowardLight);
    float cloudLight = 0.6 + 0.85 * smoothstep(0.25, -0.3, clumpTowardLight - clump);

    vec3 ember = vec3(0.58, 0.34, 0.18);
    vec3 amber = vec3(0.95, 0.62, 0.32);
    vec3 pale = vec3(0.98, 0.9, 0.78);
    vec3 violet = vec3(0.72, 0.55, 0.95);
    vec3 coral = vec3(0.98, 0.48, 0.42);
    float hue = fract(w.x * 0.55 - w.y * 0.35 + uTime * 0.025);
    vec3 bandPigment = mix(amber, coral, smoothstep(0.0, 0.35, hue));
    bandPigment = mix(bandPigment, violet, smoothstep(0.35, 0.7, hue));
    bandPigment = mix(bandPigment, pale, smoothstep(0.7, 1.0, hue));

    vec3 haze = mix(ember, amber, smoothstep(0.1, 0.65, f));
    haze = mix(haze, pale, smoothstep(0.65, 0.98, f));
    haze = mix(haze, bandPigment, band * 0.55);

    float body = pow(max(f, 0.0), 1.05) * mass * cloudLight;
    body = clamp(max(body * 1.45, band * 0.55), 0.0, 1.0);
    vec3 color = mix(paper, haze, body * 0.6);

    // Grain pattern slides through a persistent cloud (never empties).
    float dustBoost = (1.1 + 1.4 * mass) * cloudLight * (0.92 + 0.18 * uEnergy) * (0.5 + 0.7 * band);
    vec3 dust =
      dustLayer(wWarp + ptrPar * 0.15, 140.0, 0.006, 1.15, 0.0, 0.7) * dustBoost +
      dustLayer(wWarp + ptrPar * 0.35, 240.0, 0.01, 1.3, 7.0, 0.85) * dustBoost +
      dustLayer(wWarp + ptrPar * 0.6, 380.0, 0.015, 1.4, 17.0, 1.05) * dustBoost +
      dustLayer(wWarp + ptrPar * 0.9, 560.0, 0.02, 1.45, 31.0, 1.3) * dustBoost +
      dustLayer(wWarp + ptrPar * 1.25, 780.0, 0.026, 1.35, 53.0, 1.65) * dustBoost +
      dustLayer(wWarp + ptrPar * 1.7, 1050.0, 0.034, 1.2, 79.0, 2.1) * dustBoost * mass +
      dustLayer(wWarp + ptrPar * 2.2, 1400.0, 0.044, 1.05, 101.0, 2.6) * mass * 1.25;
    float dustAmt = clamp(dot(dust, vec3(0.33)) * 3.8 * (0.4 + 0.75 * band), 0.0, 0.99);
    color = mix(color, min(dust * 0.92 + color * 0.1, vec3(1.0)), dustAmt);

    vec3 bok =
      bokeh(w + ptrPar * 1.8, 16.0, 0.014, 3.0) * 1.25 +
      bokeh(w + ptrPar * 2.1, 11.0, 0.02, 23.0) * 1.15 +
      bokeh(w + ptrPar * 2.4, 7.5, 0.026, 47.0) * 1.05;
    float bokAmt = clamp(dot(bok, vec3(0.33)) * 2.8 * mass * max(band, 0.5), 0.0, 0.55);
    color = mix(color, min(color + bok * 0.7, vec3(1.0)), bokAmt);

    // Right isolation with a guaranteed floor — cloud always shows on the right.
    float rightGate = smoothstep(0.36, 0.52, uv.x);
    float presence = clamp(max(band, 0.55) * rightGate + body * 0.25 * rightGate, 0.0, 1.0);
    color = mix(paper, color, presence);

    color = mix(color, min(color * 1.04 + vec3(0.06, 0.03, 0.01) * probe, vec3(1.0)), probe * 0.35 * rightGate);

    // Copy zone on the left stays clear; right stays filled.
    float leftFade = smoothstep(0.26, 0.5, uv.x);
    color = mix(paper, color, max(leftFade, rightGate * 0.85));

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 18.0)) - 0.5;
    color += grain * 0.0035;
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIELD_W = 256;
const FIELD_H = 160;
const PATH_STEPS = 512;
const NUM_PATHS = 6;

const WELLS = [
  { x: 0.66, y: 0.5, sx: 0.16, sy: 0.085, a: 1.25 },
  { x: 0.33, y: 0.6, sx: 0.09, sy: 0.06, a: 0.62 },
  { x: 0.47, y: 0.4, sx: 0.1, sy: 0.05, a: 0.55 },
  { x: 0.8, y: 0.4, sx: 0.07, sy: 0.05, a: 0.78 },
  { x: 0.9, y: 0.58, sx: 0.08, sy: 0.05, a: 0.5 },
  { x: 0.17, y: 0.46, sx: 0.07, sy: 0.05, a: 0.4 },
  { x: 0.57, y: 0.68, sx: 0.09, sy: 0.045, a: 0.45 },
];

function buildField(rand: () => number) {
  // Coarse value-noise lattice for organic variation on top of the wells.
  const LX = 33;
  const LY = 21;
  const lattice = new Float32Array(LX * LY);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();

  const latticeAt = (u: number, v: number) => {
    const x = u * (LX - 1);
    const y = v * (LY - 1);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const x1 = Math.min(x0 + 1, LX - 1);
    const y1 = Math.min(y0 + 1, LY - 1);
    const a = lattice[y0 * LX + x0];
    const b = lattice[y0 * LX + x1];
    const c = lattice[y1 * LX + x0];
    const d = lattice[y1 * LX + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };

  const data = new Float32Array(FIELD_W * FIELD_H);
  let max = 0;

  for (let j = 0; j < FIELD_H; j++) {
    for (let i = 0; i < FIELD_W; i++) {
      const u = i / (FIELD_W - 1);
      const v = j / (FIELD_H - 1);

      // Floor + wells: denser continuous medium so particle spawn stays high
      // across the frame (Foundation-style swarm, not sparse peaks).
      let value = 0.22;
      for (const well of WELLS) {
        const dx = (u - well.x) / (well.sx * 1.15);
        const dy = (v - well.y) / (well.sy * 1.15);
        value += well.a * 1.2 * Math.exp(-0.5 * (dx * dx + dy * dy));
      }

      value += latticeAt(u, v) * 0.38 + latticeAt((u * 2.7) % 1, (v * 2.3) % 1) * 0.22;

      data[j * FIELD_W + i] = value;
      if (value > max) max = value;
    }
  }

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.pow(data[i] / max, 1.25);
  }

  return data;
}

function sampleField(data: Float32Array, u: number, v: number) {
  const x = Math.min(Math.max(u, 0), 1) * (FIELD_W - 1);
  const y = Math.min(Math.max(v, 0), 1) * (FIELD_H - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, FIELD_W - 1);
  const y1 = Math.min(y0 + 1, FIELD_H - 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = data[y0 * FIELD_W + x0];
  const b = data[y0 * FIELD_W + x1];
  const c = data[y1 * FIELD_W + x0];
  const d = data[y1 * FIELD_W + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function buildPaths(field: Float32Array, rand: () => number) {
  const texture = new Float32Array(PATH_STEPS * NUM_PATHS * 4);
  const costs: number[] = [];
  const ys: Float32Array[] = [];

  for (let p = 0; p < NUM_PATHS; p++) {
    const yRow = new Float32Array(PATH_STEPS);
    let y = 0.2 + (p / (NUM_PATHS - 1)) * 0.58 + (rand() - 0.5) * 0.06;
    let vy = (rand() - 0.5) * 0.003;
    const attract = 0.0011 + rand() * 0.0014;
    const wanderSeed = rand() * 100;
    let cost = 0;

    for (let s = 0; s < PATH_STEPS; s++) {
      const x = s / (PATH_STEPS - 1);
      const grad =
        (sampleField(field, x, y + 0.014) - sampleField(field, x, y - 0.014)) / 0.028;

      const wander =
        (Math.sin(s * 0.045 + wanderSeed) + Math.sin(s * 0.017 + wanderSeed * 1.7) + Math.sin(s * 0.0073 + wanderSeed * 2.9)) *
        0.0011;
      vy += grad * attract + wander;
      vy *= 0.93;
      vy = Math.min(Math.max(vy, -0.0035), 0.0035);
      y = Math.min(Math.max(y + vy, 0.08), 0.92);

      const liquidity = sampleField(field, x, y);
      cost += (1 - liquidity) * (1 - liquidity);
      yRow[s] = y;
    }

    // Smooth the macro arc, then restore a fraction of the fine structure so
    // the line reads as a market path rather than a seismograph.
    const smoothed = Float32Array.from(yRow);
    for (let pass = 0; pass < 3; pass++) {
      const src = Float32Array.from(smoothed);
      const radius = 9;
      for (let s = 0; s < PATH_STEPS; s++) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const idx = s + k;
          if (idx >= 0 && idx < PATH_STEPS) {
            sum += src[idx];
            count++;
          }
        }
        smoothed[s] = sum / count;
      }
    }
    for (let s = 0; s < PATH_STEPS; s++) {
      yRow[s] = smoothed[s] + (yRow[s] - smoothed[s]) * 0.07;
    }

    ys.push(yRow);
    costs.push(cost);
  }

  const survivor = costs.indexOf(Math.min(...costs));

  // The worse a path performed, the earlier it dies into dust.
  const others = costs
    .map((cost, index) => ({ cost, index }))
    .filter((entry) => entry.index !== survivor)
    .sort((a, b) => b.cost - a.cost);
  const deathSlots = [0.42, 0.54, 0.65, 0.76, 0.87];
  const deathX = new Array(NUM_PATHS).fill(1.2);
  others.forEach((entry, rank) => {
    deathX[entry.index] = deathSlots[Math.min(rank, deathSlots.length - 1)] + (rand() - 0.5) * 0.05;
  });

  for (let p = 0; p < NUM_PATHS; p++) {
    const brightness = p === survivor ? 1 : 0.4 + rand() * 0.5;
    for (let s = 0; s < PATH_STEPS; s++) {
      const x = s / (PATH_STEPS - 1);
      const fadeStart = deathX[p] - 0.06;
      let alive = 1;
      if (x > fadeStart) {
        alive = Math.max(0, 1 - (x - fadeStart) / 0.06);
      }
      // Fray ramps in ahead of death: the bundle unravels, then its light fades.
      let fray = 0;
      if (deathX[p] < 1.1) {
        fray = Math.min(Math.max((x - (deathX[p] - 0.2)) / 0.2, 0), 1);
      }
      const base = (p * PATH_STEPS + s) * 4;
      texture[base] = ys[p][s];
      texture[base + 1] = alive;
      texture[base + 2] = brightness;
      texture[base + 3] = fray;
    }
  }

  return { texture, survivor };
}

export default function HermesLiquidityFieldRender({ posture }: { posture?: HermesPublicPosture } = {}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    while (mount.firstChild) {
      mount.removeChild(mount.firstChild);
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: new URLSearchParams(window.location.search).has('verify-webgl'),
      });
    } catch {
      return undefined;
    }

    const rand = mulberry32(20260611);
    const fieldData = buildField(rand);
    const { texture: pathData, survivor } = buildPaths(fieldData, rand);
    // Separate stream for re-evaluation epochs so the opening composition
    // stays identical to the original seed.
    const epochRand = mulberry32(477001);

    const fieldTexture = new THREE.DataTexture(
      fieldData,
      FIELD_W,
      FIELD_H,
      THREE.RedFormat,
      THREE.FloatType
    );
    fieldTexture.minFilter = THREE.LinearFilter;
    fieldTexture.magFilter = THREE.LinearFilter;
    fieldTexture.wrapS = THREE.ClampToEdgeWrapping;
    fieldTexture.wrapT = THREE.ClampToEdgeWrapping;
    fieldTexture.needsUpdate = true;

    const pathTexture = new THREE.DataTexture(
      pathData,
      PATH_STEPS,
      NUM_PATHS,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    pathTexture.minFilter = THREE.LinearFilter;
    pathTexture.magFilter = THREE.LinearFilter;
    pathTexture.wrapS = THREE.ClampToEdgeWrapping;
    pathTexture.wrapT = THREE.ClampToEdgeWrapping;
    pathTexture.needsUpdate = true;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
      uField: { value: fieldTexture },
      uPaths: { value: pathTexture },
      uNumPaths: { value: NUM_PATHS },
      uSurvivor: { value: survivor },
      uWell: { value: new THREE.Vector2(WELLS[0].x, WELLS[0].y) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerGlow: { value: 0 },
      uPathFade: { value: 1 },
      uEnergy: { value: posture ? postureEnergy[posture] : 1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId: number | null = null;
    let startedAt = performance.now();
    let inView = true;
    let pageVisible = typeof document !== 'undefined' ? !document.hidden : true;
    const canRun = () => inView && pageVisible && !isWebglPaused() && !reducedMotion;

    scene.add(mesh);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xffffff, 1);
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.hermesRender = 'liquidity-field';
    mount.appendChild(renderer.domElement);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = getRenderPixelRatio(3);
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));

      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      // gl_FragCoord is in physical pixels, so the shader needs the drawing
      // buffer size, not CSS pixels, or Retina displays render the whole
      // composition into the bottom-left quadrant.
      uniforms.uResolution.value.set(w * dpr, h * dpr);
      uniforms.uPixelRatio.value = dpr;
    };

    // Pointer probe: eased toward the cursor while over the host surface
    // (instrument card, homepage hero stage, or the mount itself).
    const pointerState = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, glow: 0, glowTarget: 0 };
    const pointerHost =
      mount.closest('.inst-card') ??
      mount.closest('.hero-particle-section') ??
      mount.closest('.hero-particle-stage') ??
      mount;

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      pointerState.tx = (event.clientX - rect.left) / rect.width;
      pointerState.ty = 1 - (event.clientY - rect.top) / rect.height;
      pointerState.glowTarget = 1;
    };
    const onPointerLeave = () => {
      pointerState.glowTarget = 0;
    };

    if (pointerHost && !reducedMotion) {
      pointerHost.addEventListener('pointermove', onPointerMove as EventListener);
      pointerHost.addEventListener('pointerleave', onPointerLeave);
    }

    // Cloud-only hero: no path re-evaluation epochs (paths are not drawn).
    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.09;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.09;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.055;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;
      uniforms.uPathFade.value = 0;

      renderer.render(scene, camera);
    };

    const stopLoop = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const tryStartLoop = () => {
      if (!canRun() || frameId !== null) return;
      frameId = window.requestAnimationFrame(animate);
    };

    const animate = () => {
      if (!canRun()) {
        frameId = null;
        return;
      }
      render();
      frameId = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render();
    });

    // Pause the loop while the section is offscreen, tab hidden, or nav pending.
    // Out-of-view is debounced, scroll thrashing was killing in-view rAF loops.
    const visibilityWatch = observeWebglMountVisibility(mount, (visible) => {
      inView = visible;
      if (visible) tryStartLoop();
      else stopLoop();
    });

    const onDocVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) tryStartLoop();
      else stopLoop();
    };

    const unsubPause = subscribeWebglPause((paused) => {
      if (paused) stopLoop();
      else tryStartLoop();
    });

    document.addEventListener('visibilitychange', onDocVisibility);

    resize();
    resizeObserver.observe(mount);

    if (reducedMotion) {
      startedAt -= 8400;
      render();
    } else {
      tryStartLoop();
    }

    // First frame is painted at opacity 0; the class swap runs the CSS fade-in.
    window.requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
    });

    return () => {
      stopLoop();
      unsubPause();
      document.removeEventListener('visibilitychange', onDocVisibility);

      if (pointerHost) {
        pointerHost.removeEventListener('pointermove', onPointerMove as EventListener);
        pointerHost.removeEventListener('pointerleave', onPointerLeave);
      }

      resizeObserver.disconnect();
      visibilityWatch.disconnect();

      try {
        geometry.dispose();
        material.dispose();
        fieldTexture.dispose();
        pathTexture.dispose();
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        while (mount.firstChild) {
          mount.removeChild(mount.firstChild);
        }
      } catch {
        // swallow disposal errors during rapid HMR
      }
    };
  }, [posture]);

  return <div ref={mountRef} className="hermes-render-host" />;
}
