'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Homepage Simulation plate: probability cloud / field of outcomes.
// Dense clusters = likely; sparse regions = unlikely; a glowing trajectory
// moves through the field. Sells "explore possibility space" — not a dashboard.

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

  float fieldAt(vec2 w) {
    float inBounds = step(0.0, w.x) * step(w.x, 1.0) * step(0.0, w.y) * step(w.y, 1.0);
    float f = texture2D(uField, clamp(w, 0.0, 1.0)).r * inBounds;
    float breathe = 0.96 + 0.04 * sin(uTime * 0.17);
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

    float fc = fieldAt(sampleW);
    // Dense clusters = high probability; sparse = unlikely.
    float dens = smoothstep(0.04, 0.78, fc);
    float spawn = step(rnd, dens * dens * 0.72 + dens * 0.12 + 0.012);

    float radius = mix(0.012, 0.048, hash(cell + 5.5 + seed)) * radMul;
    float pt = smoothstep(radius, radius * 0.08, length(fr - pp));
    float tw = 0.58 + 0.42 * sin(uTime * (0.35 + rnd * 1.4) + rnd * 21.0);

    // Cool scientific cloud; warm only in the densest cores.
    float temp = smoothstep(0.35, 0.92, fc);
    vec3 cold = vec3(0.42, 0.68, 0.92);
    vec3 mid = vec3(0.62, 0.82, 0.95);
    vec3 warm = vec3(0.95, 0.88, 0.72);
    vec3 dcol = mix(cold, mid, smoothstep(0.15, 0.55, fc));
    dcol = mix(dcol, warm, temp * 0.65);

    return dcol * spawn * pt * tw * weight * (0.22 + fc * 1.35);
  }

  vec3 bokeh(vec2 w, float scale, float drift, float seed) {
    vec2 q = w + vec2(uTime * drift, uTime * drift * 0.3);
    vec2 g = q * scale;
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float rnd = hash(cell * 1.31 + seed);
    float spawn = step(rnd, 0.1);
    vec2 pp = vec2(hash(cell + vec2(3.1, 8.7) + seed), hash(cell + vec2(9.4, 2.2) + seed)) * 0.7 + 0.15;

    float r = mix(0.12, 0.28, hash(cell + 6.8 + seed));
    float disc = smoothstep(r, r * 0.35, length(fr - pp));
    float tw = 0.55 + 0.45 * sin(uTime * (0.22 + rnd) + rnd * 29.0);

    float fc = fieldAt((cell + pp) / scale - vec2(uTime * drift, uTime * drift * 0.3));
    vec3 col = mix(vec3(0.4, 0.62, 0.85), vec3(0.95, 0.86, 0.65), smoothstep(0.2, 0.75, fc));
    return col * spawn * disc * tw * 0.04 * (0.35 + fc);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    vec2 w = uv;
    // Bias composition toward the left so the idea sits in the plate.
    w.x = mix(w.x, 0.12 + w.x * 0.82, mobile * 0.55);

    // Slow camera drift — film, not wallpaper.
    w += vec2(sin(uTime * 0.009), cos(uTime * 0.007)) * 0.01;
    w = (w - 0.5) * (1.0 + 0.006 * sin(uTime * 0.006)) + 0.5;

    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.02) * uPointerGlow;
    vec2 ptrPar = (vec2(0.5) - uPointer) * 0.014 * uPointerGlow;
    vec2 wWarp = w - (toPtr / max(prd, 0.001)) * 0.006 * probe;

    // Pure black void.
    vec3 color = vec3(0.0);

    // Probability density from blended field texture (two epochs crossfade).
    float f0 = texture2D(uField, clamp(wWarp, 0.0, 1.0)).r;
    float f1 = texture2D(uField, clamp(wWarp + vec2(0.017, -0.011), 0.0, 1.0)).g;
    float f = mix(f0, f1, uFieldMix);
    f *= 0.96 + 0.04 * sin(uTime * 0.17);

    // Soft volumetric body of the cloud (not a grey floor — only where density lives).
    float body = pow(smoothstep(0.08, 0.85, f), 1.6);
    float clump = fbm(wWarp * 2.8 + vec2(uTime * 0.008, -uTime * 0.004));
    clump = smoothstep(0.32, 0.78, clump);
    vec3 bodyCol = mix(vec3(0.08, 0.16, 0.28), vec3(0.22, 0.38, 0.52), smoothstep(0.2, 0.8, f));
    bodyCol = mix(bodyCol, vec3(0.45, 0.38, 0.28), smoothstep(0.55, 0.95, f) * 0.35);
    color += bodyCol * body * 0.22 * (0.45 + 0.55 * clump);

    // Self-shadow: denser cloud toward light = darker underside.
    float fLight = texture2D(uField, clamp(wWarp + vec2(-0.03, 0.04), 0.0, 1.0)).r;
    float cloudLight = 0.55 + 0.75 * smoothstep(0.25, -0.2, fLight - f);
    color *= mix(1.0, cloudLight, body * 0.65);

    // Multi-depth probability dust — the field as points.
    float dustBoost = (0.35 + 1.1 * clump) * cloudLight;
    color += cloudLayer(wWarp + ptrPar * 0.4, 34.0, 0.0024, 0.42, 0.0, 1.0) * dustBoost;
    color += cloudLayer(wWarp + ptrPar * 0.9, 62.0, 0.0041, 0.68, 19.0, 1.35) * dustBoost;
    color += cloudLayer(wWarp + ptrPar * 1.5, 110.0, 0.0065, 0.95, 43.0, 2.1) * dustBoost;
    color += cloudLayer(wWarp + ptrPar * 2.1, 185.0, 0.009, 0.8, 71.0, 3.2) * clump * clump * 1.4;

    // Micro-glitter in dense cores.
    float micro = hash(floor(wWarp * vec2(160.0, 140.0) + uTime * 0.35));
    color += vec3(0.9, 0.95, 1.0) * step(0.997, micro) * body * 0.12;

    // === TRAJECTORY through the probability field ===
    vec4 path = texture2D(uPath, vec2(clamp(w.x, 0.0, 1.0), 0.5));
    float py = path.r;
    float pDefined = path.g;

    float dxs = 2.5 / 256.0;
    float py2 = texture2D(uPath, vec2(min(w.x + dxs, 1.0), 0.5)).r;
    float slope = (py2 - py) / max(dxs, 1e-4);
    float corr = inversesqrt(1.0 + slope * slope * (uResolution.y * uResolution.y) / (uResolution.x * uResolution.x));
    float sPix = (uv.y - py) * uResolution.y * corr / uPixelRatio;
    float dPix = abs(sPix);

    float core = exp(-dPix * dPix / (1.0 * 1.0));
    float halo = exp(-dPix * dPix / (11.0 * 11.0));
    float wide = exp(-dPix * dPix / (48.0 * 48.0));

    // Braided filaments — same craft language as Hermes, cooler then warm head.
    float fil = 0.0;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float fph = hash(vec2(fk * 2.1 + 1.0, 3.7)) * 6.2831;
      float amp = 0.9 + fk * 0.7;
      float off = sin(w.x * (8.0 + fk * 2.8) + fph + uTime * (0.18 + fk * 0.05)) * amp
                + sin(w.x * (19.0 + fk * 4.2) - fph * 1.5 + uTime * 0.11) * amp * 0.3;
      float d = sPix - off;
      fil += exp(-d * d / (0.75 * 0.75));
    }

    float ph = fract(uTime * 0.038);
    float pdist = w.x - ph;
    float pulse = exp(-pdist * pdist / 0.0028);
    float headY = texture2D(uPath, vec2(ph, 0.5)).r;
    float headD = length(vec2((w.x - ph) * uResolution.x, (uv.y - headY) * uResolution.y)) / uPixelRatio;
    float head = exp(-headD * headD / (22.0 * 22.0));

    float pathLife = pDefined * smoothstep(0.02, 0.12, w.x) * (1.0 - 0.25 * smoothstep(0.7, 1.0, w.x));
    float energize = 1.0 + 1.2 * pulse;
    vec3 pathCol = vec3(0.0);
    pathCol += vec3(0.85, 0.95, 1.0) * fil * 0.38 * energize;
    pathCol += vec3(0.55, 0.82, 0.95) * core * 0.55 * energize;
    pathCol += vec3(0.4, 0.65, 0.9) * halo * 0.14;
    pathCol += vec3(0.35, 0.5, 0.7) * wide * 0.035;
    pathCol += vec3(1.0, 0.9, 0.7) * head * 0.65;
    // Warm where the trajectory rides dense probability.
    pathCol = mix(pathCol, pathCol * vec3(1.15, 1.0, 0.82), smoothstep(0.35, 0.85, f) * 0.45);
    color += pathCol * pathLife * uPathFade;

    // Soft bokeh depth layers.
    color += bokeh(w + ptrPar * 2.4, 5.2, 0.0055, 4.0);
    color += bokeh(w + ptrPar * 2.4, 3.0, 0.0085, 27.0);

    // Pointer probe.
    color *= 1.0 + probe * 0.28;
    color += vec3(0.55, 0.75, 0.95) * probe * pow(max(f, 0.0), 1.2) * 0.12;

    // Grade — empty stays black.
    float mass = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.52, uv.x);
    color *= mix(0.5, 1.0, mass);
    float vert = smoothstep(0.0, 0.14, uv.y) * smoothstep(1.0, 0.8, uv.y);
    color *= 0.76 + 0.24 * vert;

    color = pow(max(color, 0.0), vec3(0.88));
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float hasLight = smoothstep(0.0, 0.035, lum);
    color = mix(color, color * vec3(1.05, 1.0, 0.92), smoothstep(0.4, 0.95, lum) * 0.45 * hasLight);

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 17.0)) - 0.5;
    color += grain * 0.006 * hasLight;
    color = min(color * 1.05, vec3(1.0));

    float alphaLum = dot(color, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(alphaLum * 7.2, 0.0, 1.0);
    vec3 outRgb = alpha > 1e-4 ? color / alpha : vec3(0.0);

    gl_FragColor = vec4(outRgb, alpha);
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

const FIELD_RES = 128;
const PATH_STEPS = 256;

function buildProbabilityField(rand: () => number) {
  // RG = two probability density fields for crossfade morphing.
  const data = new Float32Array(FIELD_RES * FIELD_RES * 4);

  const wellsA = [
    { x: 0.32 + (rand() - 0.5) * 0.06, y: 0.48 + (rand() - 0.5) * 0.08, r: 0.14, a: 1.0 },
    { x: 0.55 + (rand() - 0.5) * 0.08, y: 0.62 + (rand() - 0.5) * 0.1, r: 0.1, a: 0.72 },
    { x: 0.48 + (rand() - 0.5) * 0.1, y: 0.32 + (rand() - 0.5) * 0.08, r: 0.09, a: 0.55 },
    { x: 0.72 + (rand() - 0.5) * 0.06, y: 0.5 + (rand() - 0.5) * 0.12, r: 0.08, a: 0.4 },
  ];
  const wellsB = [
    { x: 0.38 + (rand() - 0.5) * 0.07, y: 0.55 + (rand() - 0.5) * 0.09, r: 0.13, a: 0.95 },
    { x: 0.58 + (rand() - 0.5) * 0.08, y: 0.4 + (rand() - 0.5) * 0.1, r: 0.11, a: 0.7 },
    { x: 0.28 + (rand() - 0.5) * 0.06, y: 0.35 + (rand() - 0.5) * 0.08, r: 0.09, a: 0.5 },
    { x: 0.68 + (rand() - 0.5) * 0.07, y: 0.58 + (rand() - 0.5) * 0.1, r: 0.085, a: 0.45 },
  ];

  const sampleWells = (wells: typeof wellsA, x: number, y: number) => {
    let d = 0;
    for (const well of wells) {
      const dx = (x - well.x) * 1.15;
      const dy = y - well.y;
      const r2 = dx * dx + dy * dy;
      d += well.a * Math.exp(-r2 / (well.r * well.r));
    }
    // Soft ridge connecting wells — a preferred corridor of probability.
    const ridge = Math.exp(-Math.pow((y - 0.5) - 0.08 * Math.sin(x * Math.PI * 2.0), 2) / 0.035) * 0.22 * x;
    d += ridge;
    return Math.min(d, 1.35);
  };

  for (let j = 0; j < FIELD_RES; j++) {
    for (let i = 0; i < FIELD_RES; i++) {
      const x = i / (FIELD_RES - 1);
      const y = j / (FIELD_RES - 1);
      // Horizon fade: less structure far into the future.
      const horizon = 0.35 + 0.65 * (1 - Math.pow(x, 1.15));
      const n =
        (Math.sin(x * 17.0 + y * 11.0) * 0.5 + 0.5) * 0.08 +
        (Math.sin(x * 41.0 - y * 23.0 + 2.1) * 0.5 + 0.5) * 0.05;
      let a = sampleWells(wellsA, x, y) * horizon + n * horizon;
      let b = sampleWells(wellsB, x, y) * horizon + n * 0.9 * horizon;
      a = Math.min(Math.max(a, 0), 1);
      b = Math.min(Math.max(b, 0), 1);
      const idx = (j * FIELD_RES + i) * 4;
      data[idx] = a;
      data[idx + 1] = b;
      data[idx + 2] = 0;
      data[idx + 3] = 1;
    }
  }

  return data;
}

function buildTrajectory(rand: () => number, field: Float32Array) {
  const texture = new Float32Array(PATH_STEPS * 4);
  let y = 0.5 + (rand() - 0.5) * 0.05;
  const ys = new Float32Array(PATH_STEPS);

  const fieldSample = (x: number, yy: number) => {
    const ix = Math.min(Math.max(Math.floor(x * (FIELD_RES - 1)), 0), FIELD_RES - 1);
    const iy = Math.min(Math.max(Math.floor(yy * (FIELD_RES - 1)), 0), FIELD_RES - 1);
    return field[(iy * FIELD_RES + ix) * 4];
  };

  for (let s = 0; s < PATH_STEPS; s++) {
    const t = s / (PATH_STEPS - 1);
    // Prefer climbing density gradient (hill-climb with noise).
    const fHere = fieldSample(t, y);
    const fUp = fieldSample(t, Math.min(y + 0.02, 0.95));
    const fDown = fieldSample(t, Math.max(y - 0.02, 0.05));
    const pull = (fUp - fDown) * 0.55;
    y += pull * 0.04 + (rand() - 0.5) * 0.018 * (0.4 + t);
    y += Math.sin(t * Math.PI * 1.4 + rand()) * 0.004;
    y = Math.min(Math.max(y, 0.08), 0.92);
    ys[s] = y;
  }

  // Smooth into a confident arc while keeping a little texture.
  const smoothed = Float32Array.from(ys);
  for (let pass = 0; pass < 3; pass++) {
    const src = Float32Array.from(smoothed);
    for (let s = 0; s < PATH_STEPS; s++) {
      let sum = 0;
      let count = 0;
      for (let k = -5; k <= 5; k++) {
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
    ys[s] = smoothed[s] * 0.88 + ys[s] * 0.12;
  }

  for (let s = 0; s < PATH_STEPS; s++) {
    const x = s / (PATH_STEPS - 1);
    const defined = 1.0 - 0.35 * Math.min(Math.max((x - 0.05) / 0.9, 0), 1);
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
    const fieldData = buildProbabilityField(rand);
    const pathData = buildTrajectory(rand, fieldData);
    const epochRand = mulberry32(910033);

    const fieldTexture = new THREE.DataTexture(
      fieldData,
      FIELD_RES,
      FIELD_RES,
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
    const EPOCH = 34;
    const FADE = 1.2;
    let swappedEpoch = -1;

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.08;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.08;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.05;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

      if (!reducedMotion) {
        const phase = elapsed % EPOCH;
        const epochIndex = Math.floor(elapsed / EPOCH);

        // Field crossfade through the middle of the epoch.
        let fieldMix = 0;
        if (phase < 8) {
          fieldMix = 0;
        } else if (phase < 14) {
          fieldMix = (phase - 8) / 6;
        } else if (phase < EPOCH - FADE * 2) {
          fieldMix = 1;
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
          const nextField = buildProbabilityField(epochRand);
          fieldData.set(nextField);
          fieldTexture.needsUpdate = true;
          const nextPath = buildTrajectory(epochRand, fieldData);
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
