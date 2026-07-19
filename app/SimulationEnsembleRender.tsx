'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Homepage Simulation plate: probability cloud / field of outcomes.
// Dense clusters = likely; sparse regions = unlikely; a glowing trajectory
// threads the high-mass corridor. Same craft language as Hermes/Oracle —
// orthographic shader plate, dust, grade, pointer probe — different idea.

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
  uniform sampler2D uPath;
  uniform float uPathFade;
  uniform float uFieldMix;
  uniform vec2 uWell;
  uniform vec2 uPointer;
  uniform float uPointerGlow;

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
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.07 + vec2(11.3, 7.1);
      a *= 0.5;
    }
    return v;
  }

  float fieldRaw(vec2 w) {
    float inBounds = step(0.0, w.x) * step(w.x, 1.0) * step(0.0, w.y) * step(w.y, 1.0);
    vec4 t = texture2D(uField, clamp(w, 0.0, 1.0));
    float f = mix(t.r, t.g, uFieldMix) * inBounds;
    float breathe = 0.96 + 0.04 * sin(uTime * 0.18);
    return f * breathe;
  }

  // Probability dust: spawn density tracks the field so the cloud *is* the data.
  vec3 cloudLayer(vec2 w, float scale, float drift, float weight, float seed, float radMul) {
    vec2 q = w + vec2(uTime * drift, uTime * drift * 0.22);
    vec2 g = q * vec2(scale, scale * 0.88);
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float rnd = hash(cell * 1.17 + seed);
    vec2 pp = vec2(hash(cell + vec2(7.1, 3.7) + seed), hash(cell + vec2(2.3, 9.2) + seed)) * 0.78 + 0.11;
    vec2 sampleW = (cell + pp) / vec2(scale, scale * 0.88) - vec2(uTime * drift, uTime * drift * 0.22);

    float fc = fieldRaw(sampleW);
    // Dense clusters = high probability; sparse = unlikely.
    float dens = smoothstep(0.03, 0.72, fc);
    float spawn = step(rnd, dens * dens * 0.78 + dens * 0.14 + 0.014);

    float radius = mix(0.012, 0.05, hash(cell + 5.5 + seed)) * radMul;
    float pt = smoothstep(radius, radius * 0.08, length(fr - pp));
    float tw = 0.55 + 0.45 * sin(uTime * (0.38 + rnd * 1.5) + rnd * 21.0);

    // Cool scientific cloud; warm only in the densest cores.
    float temp = smoothstep(0.28, 0.9, fc);
    vec3 cold = vec3(0.38, 0.62, 0.95);
    vec3 mid = vec3(0.58, 0.8, 0.98);
    vec3 warm = vec3(0.95, 0.86, 0.7);
    vec3 dcol = mix(cold, mid, smoothstep(0.12, 0.55, fc));
    dcol = mix(dcol, warm, temp * 0.7);

    return dcol * spawn * pt * tw * weight * (0.28 + fc * 1.4);
  }

  // Soft out-of-focus foreground particles — prestige-cinema depth of field.
  vec3 bokeh(vec2 w, float scale, float drift, float seed) {
    vec2 q = w + vec2(uTime * drift, uTime * drift * 0.3);
    vec2 g = q * scale;
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float rnd = hash(cell * 1.31 + seed);
    float spawn = step(rnd, 0.12);
    vec2 pp = vec2(hash(cell + vec2(3.1, 8.7) + seed), hash(cell + vec2(9.4, 2.2) + seed)) * 0.7 + 0.15;

    float r = mix(0.13, 0.29, hash(cell + 6.8 + seed));
    float disc = smoothstep(r, r * 0.36, length(fr - pp));
    float tw = 0.55 + 0.45 * sin(uTime * (0.22 + rnd) + rnd * 29.0);

    float fc = fieldRaw((cell + pp) / scale - vec2(uTime * drift, uTime * drift * 0.3));
    vec3 col = mix(vec3(0.42, 0.64, 0.9), vec3(0.96, 0.86, 0.62), smoothstep(0.18, 0.75, fc));
    return col * spawn * disc * tw * 0.05 * (0.4 + fc);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    // Visual mass lives left-center so plate copy can sit cleanly on the right.
    vec2 w = uv;
    w.x = mix(w.x, 0.14 + w.x * 0.8, mobile * 0.55);

    // Slow camera drift + breathe — film, not wallpaper.
    w += vec2(sin(uTime * 0.01), cos(uTime * 0.0075)) * 0.011;
    w = (w - 0.5) * (1.0 + 0.007 * sin(uTime * 0.0065)) + 0.5;

    // Gentle lensing toward the densest probability well.
    vec2 toWell = w - uWell;
    float wr = length(toWell * vec2(1.25, 1.0));
    vec2 wWarp = w - (toWell / max(wr, 0.001)) * 0.016 * exp(-wr * wr / 0.05);

    // Pointer probe: attention gently bends and lights the field under it.
    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.02) * uPointerGlow;
    wWarp -= (toPtr / max(prd, 0.001)) * 0.007 * probe;

    // Holographic parallax: depth layers slide against the pointer.
    vec2 ptrPar = (vec2(0.5) - uPointer) * 0.015 * uPointerGlow;

    // Deep observatory void — never dead black (matches Hermes/Oracle contract).
    vec3 color = vec3(0.0026, 0.0036, 0.0062);

    float neb = noise(w * 2.35 + vec2(uTime * 0.011, 0.0)) * 0.6 + noise(w * 5.0) * 0.4;
    color += vec3(0.007, 0.014, 0.028) * neb * 0.65;

    // Billowing cloud structure: low-frequency fbm clumps the dust into weather.
    vec2 clumpDrift = vec2(uTime * 0.0085, -uTime * 0.0038);
    float clump = fbm(wWarp * 3.05 + clumpDrift);
    clump = smoothstep(0.38, 0.76, clump);

    // Pseudo self-shadowing toward a soft light from upper-left.
    float clumpTowardLight = fbm((wWarp + vec2(-0.48, 0.82) * 0.05) * 3.05 + clumpDrift);
    clumpTowardLight = smoothstep(0.34, 0.72, clumpTowardLight);
    float cloudLight = 0.48 + 0.95 * smoothstep(0.28, -0.32, clumpTowardLight - clump);

    // God-ray: soft volumetric shaft raking through the densest well.
    vec2 rayOrigin = vec2(uWell.x - 0.18, 1.28);
    vec2 rayDir = normalize(uWell - rayOrigin + vec2(0.0, 0.02));
    vec2 rel = w - rayOrigin;
    float along = max(dot(rel, rayDir), 0.0);
    float across = abs(rel.x * rayDir.y - rel.y * rayDir.x);
    float shaft = exp(-across * across / (0.012 + along * 0.065)) * exp(-along * 0.95);
    shaft *= 0.7 + 0.3 * fbm(vec2(along * 3.2 - uTime * 0.016, across * 9.0));
    color += vec3(0.72, 0.86, 1.0) * shaft * 0.1;

    // === PROBABILITY HAZE (the field itself as glowing terrain) ===
    float f = fieldRaw(wWarp + ptrPar * 0.2);
    vec3 deep = vec3(0.1, 0.18, 0.36);
    vec3 midH = vec3(0.28, 0.48, 0.72);
    vec3 pale = vec3(0.78, 0.88, 0.98);
    vec3 warmCore = vec3(0.95, 0.82, 0.62);
    vec3 haze = mix(deep, midH, smoothstep(0.12, 0.55, f));
    haze = mix(haze, pale, smoothstep(0.55, 0.9, f));
    haze = mix(haze, warmCore, smoothstep(0.72, 0.98, f) * 0.55);

    // Soft iso-density shells — the cloud reads as a volume, not a wash.
    float shell = abs(sin(f * 18.0 + fbm(wWarp * 6.0) * 2.0));
    shell = pow(1.0 - shell, 8.0) * smoothstep(0.12, 0.55, f);
    color += haze * pow(f, 2.2) * 0.42 * (0.45 + 0.85 * clump) * cloudLight;
    color += pale * shell * 0.07 * cloudLight;

    // Cold counter-haze where probability thins — teal breath in the void.
    color += vec3(0.04, 0.1, 0.18) * (1.0 - smoothstep(0.04, 0.38, f)) * (0.35 + 0.65 * clump) * 0.45;

    // === PROBABILITY DUST (four depths, clumped, lit by the shaft) ===
    float dustBoost = (0.22 + 1.25 * clump) * (1.0 + shaft * 1.8) * cloudLight;
    color += cloudLayer(wWarp + ptrPar * 0.45, 32.0, 0.0025, 0.42, 0.0, 1.0) * dustBoost;
    color += cloudLayer(wWarp + ptrPar * 0.95, 60.0, 0.0042, 0.68, 17.0, 1.35) * dustBoost;
    color += cloudLayer(wWarp + ptrPar * 1.6, 108.0, 0.0068, 0.95, 41.0, 2.15) * dustBoost;
    color += cloudLayer(wWarp + ptrPar * 2.2, 180.0, 0.0092, 0.82, 71.0, 3.4) * clump * clump * (1.45 + shaft * 1.6);

    // Micro-glitter in dense cores — the cloud has a crystalline body.
    float micro = hash(floor(wWarp * vec2(170.0, 148.0) + uTime * 0.4));
    color += vec3(0.92, 0.96, 1.0) * step(0.9965, micro) * smoothstep(0.35, 0.85, f) * 0.14;

    // === TRAJECTORY through the probability field ===
    vec4 path = texture2D(uPath, vec2(clamp(w.x, 0.0, 1.0), 0.5));
    float py = path.r;
    float pDefined = path.g;

    float dxs = 3.0 / 512.0;
    float py2 = texture2D(uPath, vec2(min(w.x + dxs, 1.0), 0.5)).r;
    float slope = (py2 - py) / max(dxs, 1e-4);
    float corr = inversesqrt(1.0 + slope * slope * (uResolution.y * uResolution.y) / (uResolution.x * uResolution.x));
    float sPix = (uv.y - py) * uResolution.y * corr / uPixelRatio;
    float dPix = abs(sPix);

    float core = exp(-dPix * dPix / (1.15 * 1.15));
    float halo = exp(-dPix * dPix / (12.0 * 12.0));
    float wide = exp(-dPix * dPix / (50.0 * 50.0));

    // Braided filaments — same craft language as Hermes, cooler then warm head.
    float fil = 0.0;
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float fph = hash(vec2(fk * 2.3 + 1.0, 3.7)) * 6.2831;
      float amp = 1.0 + fk * 0.8;
      float off = sin(w.x * (7.5 + fk * 3.0) + fph + uTime * (0.2 + fk * 0.06)) * amp
                + sin(w.x * (18.0 + fk * 4.5) - fph * 1.6 + uTime * 0.12) * amp * 0.32;
      float d = sPix - off;
      float shimmer = 0.78 + 0.22 * sin(w.x * 38.0 + fph * 3.0 + uTime * 0.55);
      fil += exp(-d * d / (0.8 * 0.8)) * shimmer;
    }

    float ph = fract(uTime * 0.04);
    float pdist = w.x - ph;
    float pulse = exp(-pdist * pdist / 0.003);
    float headY = texture2D(uPath, vec2(ph, 0.5)).r;
    float headD = length(vec2((w.x - ph) * uResolution.x, (uv.y - headY) * uResolution.y)) / uPixelRatio;
    float head = exp(-headD * headD / (24.0 * 24.0));

    float pathLife = pDefined * smoothstep(0.015, 0.1, w.x) * (1.0 - 0.28 * smoothstep(0.68, 1.0, w.x));
    float energize = 1.0 + 1.35 * pulse;
    vec3 pathCol = vec3(0.0);
    pathCol += vec3(0.88, 0.96, 1.0) * fil * 0.42 * energize;
    pathCol += vec3(0.55, 0.82, 0.98) * core * 0.58 * energize;
    pathCol += vec3(0.42, 0.68, 0.92) * halo * 0.16;
    pathCol += vec3(0.36, 0.52, 0.72) * wide * 0.04;
    pathCol += vec3(1.0, 0.9, 0.72) * head * 0.7;
    // Warm where the trajectory rides dense probability.
    pathCol = mix(pathCol, pathCol * vec3(1.12, 1.0, 0.85), smoothstep(0.32, 0.85, f) * 0.5);
    color += pathCol * pathLife * uPathFade;

    // The present: a single bright seed where the trajectory begins.
    vec2 origin = vec2(0.04, texture2D(uPath, vec2(0.04, 0.5)).r);
    float od = length(vec2((w.x - origin.x) * uResolution.x, (uv.y - origin.y) * uResolution.y)) / uPixelRatio;
    float breath = 0.85 + 0.15 * sin(uTime * 0.48);
    color += vec3(0.92, 0.96, 1.0) * exp(-od * od / 8.0) * 1.05 * breath * uPathFade;
    color += vec3(0.5, 0.75, 0.95) * exp(-od * od / (68.0 * 68.0)) * 0.08 * uPathFade;

    // === FOREGROUND BOKEH ===
    color += bokeh(w + ptrPar * 2.6, 5.3, 0.0058, 4.0);
    color += bokeh(w + ptrPar * 2.6, 3.1, 0.009, 27.0);

    // The field brightens where it is being read.
    color *= 1.0 + probe * 0.3;
    color += vec3(0.55, 0.78, 0.98) * probe * pow(max(f, 0.0), 1.3) * 0.14;

    // === GRADE (same contract as Hermes/Oracle) ===
    float leftFade = smoothstep(0.0, 0.28, uv.x);
    color *= mix(mix(0.36, 0.64, mobile), 1.0, leftFade);

    float rightFade = smoothstep(1.0, 0.58, uv.x);
    color *= mix(0.55, 1.0, rightFade);

    float vert = smoothstep(0.0, 0.16, uv.y) * smoothstep(1.0, 0.78, uv.y);
    color *= 0.74 + 0.26 * vert;

    color = pow(max(color, 0.0), vec3(0.88));

    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color * vec3(0.84, 0.96, 1.2), color, smoothstep(0.0, 0.3, lum));
    color = mix(color, color * vec3(1.06, 1.0, 0.9), smoothstep(0.45, 0.95, lum) * 0.5);

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 18.0)) - 0.5;
    color += grain * 0.009;

    color = min(color * 1.06 + 0.002, vec3(1.0));

    // Luminance-keyed alpha: bright content opaque, empty void a thin veil
    // so continuous sky can breathe through the plate.
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

type Well = { x: number; y: number; sx: number; sy: number; a: number };

function buildWells(rand: () => number): Well[] {
  // Primary corridor + secondary lobes — reads as a probability landscape.
  return [
    { x: 0.34 + (rand() - 0.5) * 0.05, y: 0.5 + (rand() - 0.5) * 0.06, sx: 0.15, sy: 0.09, a: 1.2 },
    { x: 0.52 + (rand() - 0.5) * 0.06, y: 0.62 + (rand() - 0.5) * 0.07, sx: 0.1, sy: 0.065, a: 0.78 },
    { x: 0.48 + (rand() - 0.5) * 0.07, y: 0.34 + (rand() - 0.5) * 0.06, sx: 0.095, sy: 0.055, a: 0.62 },
    { x: 0.68 + (rand() - 0.5) * 0.05, y: 0.52 + (rand() - 0.5) * 0.08, sx: 0.085, sy: 0.055, a: 0.55 },
    { x: 0.24 + (rand() - 0.5) * 0.04, y: 0.4 + (rand() - 0.5) * 0.05, sx: 0.07, sy: 0.05, a: 0.42 },
    { x: 0.78 + (rand() - 0.5) * 0.04, y: 0.42 + (rand() - 0.5) * 0.07, sx: 0.07, sy: 0.048, a: 0.38 },
  ];
}

function dominantWell(wells: Well[]) {
  let best = wells[0];
  for (const w of wells) {
    if (w.a > best.a) best = w;
  }
  return { x: best.x, y: best.y };
}

function buildProbabilityChannel(rand: () => number, wells: Well[]) {
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
      for (const well of wells) {
        const dx = (u - well.x) / well.sx;
        const dy = (v - well.y) / well.sy;
        value += well.a * Math.exp(-0.5 * (dx * dx + dy * dy));
      }

      // Soft ridge connecting the primary corridor — preferred path of mass.
      const ridgeY = 0.5 + 0.07 * Math.sin(u * Math.PI * 1.6);
      const ridge = Math.exp(-Math.pow((v - ridgeY) / 0.09, 2)) * 0.28 * (0.25 + 0.75 * u);
      value += ridge;

      value += latticeAt(u, v) * 0.28 + latticeAt((u * 2.6) % 1, (v * 2.2) % 1) * 0.14;

      // Horizon fade: less structure far into the future.
      const horizon = 0.38 + 0.62 * (1 - Math.pow(u, 1.12));
      value *= horizon;

      data[j * FIELD_W + i] = value;
      if (value > max) max = value;
    }
  }

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.pow(data[i] / Math.max(max, 1e-6), 1.2);
  }

  return data;
}

function packField(channelA: Float32Array, channelB: Float32Array) {
  const data = new Float32Array(FIELD_W * FIELD_H * 4);
  for (let i = 0; i < FIELD_W * FIELD_H; i++) {
    const base = i * 4;
    data[base] = channelA[i];
    data[base + 1] = channelB[i];
    data[base + 2] = 0;
    data[base + 3] = 1;
  }
  return data;
}

function sampleChannel(data: Float32Array, u: number, v: number) {
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

function buildTrajectory(rand: () => number, field: Float32Array) {
  const texture = new Float32Array(PATH_STEPS * 4);
  let y = 0.5 + (rand() - 0.5) * 0.04;
  let vy = 0;
  const ys = new Float32Array(PATH_STEPS);

  for (let s = 0; s < PATH_STEPS; s++) {
    const t = s / (PATH_STEPS - 1);
    // Hill-climb density gradient with damping — prefers the probability corridor.
    const grad =
      (sampleChannel(field, t, Math.min(y + 0.016, 0.95)) -
        sampleChannel(field, t, Math.max(y - 0.016, 0.05))) /
      0.032;
    vy += grad * 0.0018;
    vy += (rand() - 0.5) * 0.0011 * (0.35 + t);
    vy *= 0.9;
    y += vy + Math.sin(t * Math.PI * 1.35 + rand() * 0.5) * 0.0032;
    y = Math.min(Math.max(y, 0.1), 0.9);
    ys[s] = y;
  }

  // Smooth into a confident arc; keep a whisper of texture.
  const smoothed = Float32Array.from(ys);
  for (let pass = 0; pass < 3; pass++) {
    const src = Float32Array.from(smoothed);
    const radius = 7;
    for (let s = 0; s < PATH_STEPS; s++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const idx = s + k;
        if (idx >= 0 && idx < PATH_STEPS) {
          sum += src[idx];
          count += 1;
        }
      }
      smoothed[s] = sum / count;
    }
  }
  for (let s = 0; s < PATH_STEPS; s++) {
    ys[s] = smoothed[s] * 0.9 + ys[s] * 0.1;
  }

  for (let s = 0; s < PATH_STEPS; s++) {
    const x = s / (PATH_STEPS - 1);
    // Definition softens as uncertainty grows into the horizon.
    const defined = 1.0 - 0.42 * Math.min(Math.max((x - 0.06) / 0.88, 0), 1);
    const base = s * 4;
    texture[base] = ys[s];
    texture[base + 1] = defined;
    texture[base + 2] = 1;
    texture[base + 3] = 1;
  }

  return texture;
}

export default function SimulationEnsembleRender() {
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
      });
    } catch {
      return undefined;
    }

    const rand = mulberry32(20260719);
    const wellsA = buildWells(rand);
    const wellsB = buildWells(rand);
    let channelA = buildProbabilityChannel(rand, wellsA);
    let channelB = buildProbabilityChannel(rand, wellsB);
    const fieldData = packField(channelA, channelB);
    const pathData = buildTrajectory(rand, channelA);
    const epochRand = mulberry32(910033);
    let well = dominantWell(wellsA);
    let wellTarget = dominantWell(wellsB);

    const fieldTexture = new THREE.DataTexture(
      fieldData,
      FIELD_W,
      FIELD_H,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    fieldTexture.minFilter = THREE.LinearFilter;
    fieldTexture.magFilter = THREE.LinearFilter;
    fieldTexture.wrapS = THREE.ClampToEdgeWrapping;
    fieldTexture.wrapT = THREE.ClampToEdgeWrapping;
    fieldTexture.needsUpdate = true;

    const pathTexture = new THREE.DataTexture(
      pathData,
      PATH_STEPS,
      1,
      THREE.RGBAFormat,
      THREE.FloatType,
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
      uPath: { value: pathTexture },
      uPathFade: { value: 1 },
      uFieldMix: { value: 0 },
      uWell: { value: new THREE.Vector2(well.x, well.y) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerGlow: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId: number | null = null;
    let startedAt = performance.now();
    let visible = true;

    scene.add(mesh);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.simulationRender = 'probability-cloud';
    mount.appendChild(renderer.domElement);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width * dpr, height * dpr);
      uniforms.uPixelRatio.value = dpr;
    };

    const pointerState = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, glow: 0, glowTarget: 0 };
    const card = mount.closest('.inst-card');

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return;
      }

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

    // Morph field A↔B and reseed trajectory on a slow epoch (offset from Hermes/Oracle).
    const EPOCH = 32;
    const FADE = 1.15;
    let swappedEpoch = -1;

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.08;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.08;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.05;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

      // Softly track the densest well as fields crossfade.
      const mix = uniforms.uFieldMix.value;
      const wx = well.x + (wellTarget.x - well.x) * mix;
      const wy = well.y + (wellTarget.y - well.y) * mix;
      uniforms.uWell.value.set(wx, wy);

      if (!reducedMotion) {
        const phase = elapsed % EPOCH;
        const epochIndex = Math.floor(elapsed / EPOCH);

        // Field crossfade through the middle of the epoch.
        let fieldMix = 0;
        if (phase < 7) {
          fieldMix = 0;
        } else if (phase < 13) {
          fieldMix = (phase - 7) / 6;
        } else {
          fieldMix = 1;
        }
        fieldMix = fieldMix * fieldMix * (3 - 2 * fieldMix);
        uniforms.uFieldMix.value = fieldMix;

        let pathFade = 1;
        if (phase > EPOCH - FADE * 2) {
          pathFade =
            phase < EPOCH - FADE
              ? 1 - (phase - (EPOCH - FADE * 2)) / FADE
              : (phase - (EPOCH - FADE)) / FADE;
        }
        if (phase >= EPOCH - FADE && swappedEpoch !== epochIndex) {
          swappedEpoch = epochIndex;
          // Promote B→A, generate a new B so the next morph has fresh structure.
          channelA = channelB;
          const nextWells = buildWells(epochRand);
          channelB = buildProbabilityChannel(epochRand, nextWells);
          fieldData.set(packField(channelA, channelB));
          fieldTexture.needsUpdate = true;
          well = wellTarget;
          wellTarget = dominantWell(nextWells);
          const nextPath = buildTrajectory(epochRand, channelA);
          pathData.set(nextPath);
          pathTexture.needsUpdate = true;
          uniforms.uFieldMix.value = 0;
        }
        uniforms.uPathFade.value = pathFade * pathFade * (3 - 2 * pathFade);
      } else {
        uniforms.uFieldMix.value = 0.35;
        uniforms.uPathFade.value = 1;
      }

      renderer.render(scene, camera);
    };

    const animate = () => {
      render();
      frameId = visible ? window.requestAnimationFrame(animate) : null;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render();
    });

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const nowVisible = entries.some((entry) => entry.isIntersecting);
        if (nowVisible && !visible) {
          visible = true;
          if (!reducedMotion && frameId === null) {
            frameId = window.requestAnimationFrame(animate);
          }
        } else if (!nowVisible) {
          visible = false;
        }
      },
      { rootMargin: '120px' },
    );

    resize();
    resizeObserver.observe(mount);
    visibilityObserver.observe(mount);

    if (reducedMotion) {
      startedAt -= 12_000;
      render();
    } else {
      animate();
    }

    window.requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

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
  }, []);

  return <div ref={mountRef} className="hermes-render-host" />;
}
