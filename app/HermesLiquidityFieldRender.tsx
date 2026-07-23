'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { getRenderPixelRatio } from '@/lib/webgl-dpr';
import { isWebglPaused, subscribeWebglPause } from '@/lib/webgl-lifecycle';

// Variant D of the telemetry design: real posture drives the art's energy.
// Deployed burns at full brightness; standing down dims to embers. The field
// itself (terrain, haze) persists at every level — the world stays, the
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

  // One layer of liquidity dust: hashed point lattice whose spawn probability
  // follows the field density, so the terrain literally is the data.
  vec3 dustLayer(vec2 w, float scale, float drift, float weight, float seed, float radMul) {
    vec2 q = w + vec2(uTime * drift, 0.0);
    vec2 g = q * vec2(scale, scale * 0.86);
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float rnd = hash(cell * 1.13 + seed);
    vec2 pp = vec2(hash(cell + vec2(7.1, 3.7) + seed), hash(cell + vec2(2.3, 9.2) + seed)) * 0.8 + 0.1;
    vec2 sampleW = (cell + pp) / vec2(scale, scale * 0.86) - vec2(uTime * drift, 0.0);

    float fc = fieldAt(sampleW);
    float dens = smoothstep(0.02, 0.7, fc);
    float spawn = step(rnd, dens * 0.48 + 0.045);

    float radius = mix(0.014, 0.055, hash(cell + 5.5 + seed)) * radMul;
    float pt = smoothstep(radius, radius * 0.1, length(fr - pp));
    float tw = 0.55 + 0.45 * sin(uTime * (0.5 + rnd * 1.7) + rnd * 23.0);

    // Deep liquidity glitters warm gold; thin liquidity scatters cold blue.
    float temp = smoothstep(0.05, 0.42, fc);
    vec3 warm = mix(vec3(1.0, 0.74, 0.46), vec3(1.0, 0.93, 0.76), smoothstep(0.4, 0.95, fc));
    vec3 cold = vec3(0.5, 0.76, 0.95);
    vec3 dcol = mix(cold, warm, temp);
    return dcol * spawn * pt * tw * weight * (0.3 + fc * 1.1 + (1.0 - temp) * 0.25);
  }

  // Soft out-of-focus foreground particles — prestige-cinema depth of field.
  vec3 bokeh(vec2 w, float scale, float drift, float seed) {
    vec2 q = w + vec2(uTime * drift, uTime * drift * 0.35);
    vec2 g = q * scale;
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float rnd = hash(cell * 1.31 + seed);
    float spawn = step(rnd, 0.13);
    vec2 pp = vec2(hash(cell + vec2(3.1, 8.7) + seed), hash(cell + vec2(9.4, 2.2) + seed)) * 0.7 + 0.15;

    float r = mix(0.14, 0.3, hash(cell + 6.8 + seed));
    float disc = smoothstep(r, r * 0.4, length(fr - pp));
    float tw = 0.55 + 0.45 * sin(uTime * (0.25 + rnd) + rnd * 31.0);

    float fc = fieldAt((cell + pp) / scale - vec2(uTime * drift, uTime * drift * 0.35));
    vec3 col = mix(vec3(0.45, 0.66, 0.85), vec3(1.0, 0.82, 0.55), smoothstep(0.06, 0.4, fc));
    return col * spawn * disc * tw * 0.055;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    // World coordinates: crop into the right portion of the field on narrow screens.
    vec2 w = uv;
    w.x = mix(w.x, 0.30 + w.x * 0.70, mobile);

    // Slow camera drift + breathe: minutes-long, so the framing is never
    // quite the same twice. Film, not wallpaper.
    w += vec2(sin(uTime * 0.011), cos(uTime * 0.0083)) * 0.012;
    w = (w - 0.5) * (1.0 + 0.008 * sin(uTime * 0.007)) + 0.5;

    // Gentle lensing pull toward the dominant liquidity well — mass bends the view.
    vec2 toWell = w - uWell;
    float wr = length(toWell * vec2(1.3, 1.0));
    vec2 wWarp = w - (toWell / max(wr, 0.001)) * 0.014 * exp(-wr * wr / 0.045);

    // Pointer probe: attention gently bends and lights the field under it.
    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.02) * uPointerGlow;
    wWarp -= (toPtr / max(prd, 0.001)) * 0.008 * probe;

    // Holographic parallax: depth layers slide against the pointer, so the
    // scene reads as a projection you can lean around, not a flat image.
    vec2 ptrPar = (vec2(0.5) - uPointer) * 0.016 * uPointerGlow;

    vec3 color = vec3(0.003, 0.0045, 0.0075);

    // Cold nebula floor — the void leans deep teal-blue, never dead black.
    float neb = noise(w * 2.4 + vec2(uTime * 0.012, 0.0)) * 0.6 + noise(w * 5.1) * 0.4;
    color += vec3(0.008, 0.016, 0.026) * neb * 0.7;

    // Billowing cloud structure: low-frequency fbm clumps the dust into
    // weather instead of uniform texture.
    vec2 clumpDrift = vec2(uTime * 0.009, -uTime * 0.004);
    float clump = fbm(w * 3.1 + clumpDrift);
    clump = smoothstep(0.4, 0.76, clump);

    // Pseudo self-shadowing: sample the cloud density toward the light source;
    // less material toward the light means this part of the cloud is lit.
    float clumpTowardLight = fbm((w + vec2(-0.5, 0.86) * 0.05) * 3.1 + clumpDrift);
    clumpTowardLight = smoothstep(0.36, 0.72, clumpTowardLight);
    float cloudLight = 0.45 + 1.0 * smoothstep(0.3, -0.35, clumpTowardLight - clump);

    // God-ray: a soft volumetric shaft raking down toward the dominant well.
    vec2 rayOrigin = vec2(0.3, 1.3);
    vec2 rayDir = normalize(vec2(0.5, -0.86));
    vec2 rel = w - rayOrigin;
    float along = max(dot(rel, rayDir), 0.0);
    float across = abs(rel.x * rayDir.y - rel.y * rayDir.x);
    float shaft = exp(-across * across / (0.014 + along * 0.07)) * exp(-along * 1.05);
    shaft *= 0.7 + 0.3 * fbm(vec2(along * 3.0 - uTime * 0.018, across * 9.0));
    color += vec3(1.0, 0.92, 0.72) * shaft * 0.11 * (0.5 + 0.5 * uEnergy);

    // === LIQUIDITY HAZE (the field itself as glowing terrain) ===
    float f = fieldAt(wWarp + ptrPar * 0.2);
    vec3 ember = vec3(0.45, 0.20, 0.08);
    vec3 amber = vec3(1.0, 0.62, 0.28);
    vec3 pale = vec3(1.0, 0.87, 0.64);
    vec3 haze = mix(ember, amber, smoothstep(0.15, 0.7, f));
    haze = mix(haze, pale, smoothstep(0.72, 0.98, f));

    // Order-book ladder striations: thin horizontal price levels in the glow.
    float ladder = 0.95 + 0.05 * sin(w.y * 190.0 + noise(w * 4.0) * 4.0);
    color += haze * pow(f, 2.6) * 0.36 * ladder * (0.4 + 0.9 * clump) * cloudLight;

    // Cold counter-haze where the field thins: teal breath in the void.
    color += vec3(0.05, 0.13, 0.19) * (1.0 - smoothstep(0.05, 0.4, f)) * (0.3 + 0.7 * clump) * 0.5;

    // === LIQUIDITY DUST (three depths, clumped into clouds, lit by the shaft) ===
    float dustBoost = (0.2 + 1.3 * clump) * (1.0 + shaft * 2.0) * cloudLight * (0.6 + 0.4 * uEnergy);
    color += dustLayer(wWarp + ptrPar * 0.5, 30.0, 0.0028, 0.4, 0.0, 1.0) * dustBoost;
    color += dustLayer(wWarp + ptrPar * 1.0, 58.0, 0.0046, 0.62, 17.0, 1.4) * dustBoost;
    color += dustLayer(wWarp + ptrPar * 1.7, 104.0, 0.0072, 0.9, 41.0, 2.2) * dustBoost;

    // Micro-glitter that gives the cloud masses their billowing body.
    color += dustLayer(wWarp + ptrPar * 2.2, 175.0, 0.0095, 0.75, 71.0, 3.6) * clump * clump * (1.5 + shaft * 2.0);

    // === CANDIDATE PRICE PATHS ===
    // Accumulated separately so re-evaluation epochs can fade the whole
    // reading down to the bare field and redraw it.
    vec3 pathCol = vec3(0.0);
    float survivorGlow = 0.0;
    for (int i = 0; i < MAX_PATHS; i++) {
      if (float(i) >= uNumPaths) break;
      float row = (float(i) + 0.5) / uNumPaths;

      vec4 pd = texture2D(uPaths, vec2(w.x, row));
      float py = pd.r;
      float alive = pd.g;
      float bright = pd.b;
      float fray = pd.a;

      float dxs = 4.0 / 512.0;
      float py2 = texture2D(uPaths, vec2(min(w.x + dxs, 1.0), row)).r;
      float slope = (py2 - py) / dxs;
      float corr = inversesqrt(1.0 + slope * slope * (uResolution.y * uResolution.y) / (uResolution.x * uResolution.x));
      // Signed CSS-pixel distance from the path spine, so filaments can wind
      // around it; weights stay constant across display densities.
      float sPix = (uv.y - py) * uResolution.y * corr / uPixelRatio;
      float dPix = abs(sPix);

      bool isSurvivor = abs(float(i) - uSurvivor) < 0.5;

      if (isSurvivor) {
        float halo = exp(-dPix * dPix / (14.0 * 14.0));
        float wide = exp(-dPix * dPix / (52.0 * 52.0));

        // Prime-Radiant stroke: hairline filaments braided tight around the
        // spine. Crossings glitter where strands overlap.
        float fil = 0.0;
        for (int k = 0; k < 4; k++) {
          float fk = float(k);
          float fph = hash(vec2(fk * 2.3 + 1.0, float(i))) * 6.2831;
          float amp = 1.1 + fk * 0.85;
          float off = sin(w.x * (7.0 + fk * 3.1) + fph + uTime * (0.22 + fk * 0.07)) * amp
                    + sin(w.x * (17.0 + fk * 5.3) - fph * 1.7 + uTime * 0.13) * amp * 0.35;
          float d = sPix - off;
          float shimmer = 0.75 + 0.25 * sin(w.x * 40.0 + fph * 3.0 + uTime * 0.6);
          fil += exp(-d * d / (0.85 * 0.85)) * shimmer;
        }

        // Energy pulse traveling along the surviving path.
        float ph = fract(uTime * 0.042);
        float pdist = w.x - ph;
        float pulse = exp(-pdist * pdist / 0.0032);
        float headY = texture2D(uPaths, vec2(ph, row)).r;
        float headD = length(vec2((w.x - ph) * uResolution.x, (uv.y - headY) * uResolution.y)) / uPixelRatio;
        float head = exp(-headD * headD / (26.0 * 26.0));

        float energize = 1.0 + 1.4 * pulse;
        pathCol += vec3(1.0, 0.89, 0.64) * fil * 0.44 * energize;
        pathCol += vec3(1.0, 0.68, 0.32) * halo * 0.2 * energize;
        pathCol += vec3(1.0, 0.64, 0.3) * wide * 0.08;
        pathCol += vec3(1.0, 0.88, 0.68) * head * 0.55;
        survivorGlow = max(survivorGlow, halo);
      } else {
        float halo = exp(-dPix * dPix / (10.0 * 10.0));

        // Candidates are looser bundles; as one nears rejection its strands
        // splay apart — the reading unravels before its light goes out.
        float splay = 1.0 + fray * fray * 6.5;
        float fil = 0.0;
        for (int k = 0; k < 4; k++) {
          float fk = float(k);
          float fph = hash(vec2(float(i) * 3.1 + fk, fk * 1.7 + 2.0)) * 6.2831;
          float amp = (1.5 + fk * 1.0) * splay;
          float off = sin(w.x * (8.0 + fk * 3.3) + fph + uTime * (0.2 + fk * 0.06)) * amp
                    + sin(w.x * (19.0 + fk * 4.7) - fph * 1.7 + uTime * 0.12) * amp * 0.35;
          float d = sPix - off;
          fil += exp(-d * d / (0.8 * 0.8));
        }

        vec3 cCol = mix(vec3(0.9, 0.42, 0.16), vec3(1.0, 0.68, 0.34), bright);
        pathCol += cCol * (fil * 0.36 + halo * 0.15) * (0.5 + 0.4 * bright) * alive * (1.0 - fray * 0.25);
      }
    }
    color += pathCol * uPathFade * uEnergy;

    // === FOREGROUND BOKEH (out-of-focus dust drifting past the lens) ===
    color += bokeh(w + ptrPar * 2.8, 5.5, 0.006, 3.0);
    color += bokeh(w + ptrPar * 2.8, 3.2, 0.0095, 23.0);

    // Bid/ask thermal split: warm below the survivor's altitude, cool above.
    float side = smoothstep(-0.16, 0.16, w.y - 0.52);
    color *= mix(vec3(1.03, 0.995, 0.95), vec3(0.965, 1.0, 1.05), side);

    // The field brightens where it is being read.
    color *= 1.0 + probe * 0.32;
    color += vec3(1.0, 0.88, 0.62) * probe * pow(f, 1.5) * 0.18;

    // === GRADE (prestige filmic: teal shadows, cream highlights) ===
    float leftFade = smoothstep(0.0, 0.30, uv.x);
    color *= mix(mix(0.34, 0.62, mobile), 1.0, leftFade);

    float vert = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.78, uv.y);
    color *= 0.72 + 0.28 * vert;

    color = pow(max(color, 0.0), vec3(0.88));

    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color * vec3(0.82, 0.97, 1.22), color, smoothstep(0.0, 0.3, lum));
    color = mix(color, color * vec3(1.06, 1.0, 0.9), smoothstep(0.45, 0.95, lum) * 0.5);

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 18.0)) - 0.5;
    color += grain * 0.009;

    color = min(color * 1.06 + 0.003, vec3(1.0));

    // Luminance-keyed alpha: bright content is opaque, empty void is a thin
    // veil — so the continuous sky's stars shine through the section's air.
    float alphaLum = dot(color, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(0.18 + alphaLum * 5.5, 0.0, 1.0);

    gl_FragColor = vec4(color / max(alpha, 0.02), alpha);
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

      let value = 0;
      for (const well of WELLS) {
        const dx = (u - well.x) / well.sx;
        const dy = (v - well.y) / well.sy;
        value += well.a * Math.exp(-0.5 * (dx * dx + dy * dy));
      }

      value += latticeAt(u, v) * 0.3 + latticeAt((u * 2.7) % 1, (v * 2.3) % 1) * 0.16;

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
    renderer.setClearColor(0x000000, 0);
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
      // buffer size — not CSS pixels — or Retina displays render the whole
      // composition into the bottom-left quadrant.
      uniforms.uResolution.value.set(w * dpr, h * dpr);
      uniforms.uPixelRatio.value = dpr;
    };

    // Pointer probe: eased toward the cursor while it is over the card.
    const pointerState = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, glow: 0, glowTarget: 0 };
    const card = mount.closest('.inst-card');

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

    if (card && !reducedMotion) {
      card.addEventListener('pointermove', onPointerMove as EventListener);
      card.addEventListener('pointerleave', onPointerLeave);
    }

    // Re-evaluation epochs: the candidate paths fade down to the bare field,
    // the engine redraws them (new candidates, new survivor), and the new
    // reading fades back in. The world persists; the judgment refreshes.
    const EPOCH = 36;
    const EPOCH_FADE = 1.15;
    let swappedEpoch = -1;

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.09;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.09;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.055;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

      if (!reducedMotion) {
        const phase = elapsed % EPOCH;
        const epochIndex = Math.floor(elapsed / EPOCH);
        let fade = 1;
        if (phase > EPOCH - EPOCH_FADE * 2) {
          fade =
            phase < EPOCH - EPOCH_FADE
              ? 1 - (phase - (EPOCH - EPOCH_FADE * 2)) / EPOCH_FADE
              : (phase - (EPOCH - EPOCH_FADE)) / EPOCH_FADE;
        }
        if (phase >= EPOCH - EPOCH_FADE && swappedEpoch !== epochIndex) {
          swappedEpoch = epochIndex;
          const next = buildPaths(fieldData, epochRand);
          pathData.set(next.texture);
          pathTexture.needsUpdate = true;
          uniforms.uSurvivor.value = next.survivor;
        }
        uniforms.uPathFade.value = fade * fade * (3 - 2 * fade);
      }

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
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        if (inView) tryStartLoop();
        else stopLoop();
      },
      { rootMargin: '120px' },
    );

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
    visibilityObserver.observe(mount);

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

      if (card) {
        card.removeEventListener('pointermove', onPointerMove as EventListener);
        card.removeEventListener('pointerleave', onPointerLeave);
      }

      resizeObserver.disconnect();
      visibilityObserver.disconnect();

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
