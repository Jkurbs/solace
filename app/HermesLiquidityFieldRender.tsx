'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { THEME_CHANGE_EVENT, readSiteTheme } from '@/lib/theme';
import { isWebglPaused, observeWebglMountVisibility, subscribeWebglPause } from '@/lib/webgl-lifecycle';

// Posture drives energy only — field stays dense at every level.
const postureEnergy: Record<HermesPublicPosture, number> = {
  DEPLOYED: 1,
  SELECTIVE: 0.78,
  DEFENSIVE: 0.55,
  STANDING_DOWN: 0.34,
  RISK_OFF: 0.28,
};

// Soft particle field: render below CSS size, upscale (looks fine, huge GPU win).
const RENDER_SCALE = 0.55;
const MAX_DPR = 1.25;
// ~30fps is plenty for slow grain drift.
const FRAME_MS = 1000 / 30;

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Lean fragment: early-out left, cheap noise, few layers, dense spawn.
const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform sampler2D uField;
  uniform vec2 uWell;
  uniform vec2 uPointer;
  uniform float uPointerGlow;
  uniform float uEnergy;
  uniform float uDarkMode;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
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

  // 2 octaves — enough structure, half the cost of 4.
  float fbm2(vec2 p) {
    return noise(p) * 0.66 + noise(p * 2.07 + 11.3) * 0.34;
  }

  float fieldAt(vec2 w) {
    float inB = step(0.0, w.x) * step(w.x, 1.0) * step(0.0, w.y) * step(w.y, 1.0);
    return texture2D(uField, clamp(w, 0.0, 1.0)).r * inB;
  }

  // Dense grains only. fc sampled once by caller.
  vec3 dustLayer(
    vec2 w,
    float scale,
    float drift,
    float weight,
    float seed,
    float radMul,
    float coolBias,
    float fc
  ) {
    vec2 flow = vec2(uTime * drift * 0.75, uTime * drift * -0.2);
    float swirl = uTime * (0.06 + seed * 0.01);
    vec2 q = w + flow;
    q += vec2(sin(q.y * 2.4 + swirl), cos(q.x * 1.9 - swirl * 0.65)) * 0.016;
    vec2 g = q * vec2(scale, scale * 0.9);
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float dens = smoothstep(0.0, 0.32, max(fc, 0.42));
    float spawnBase = dens * 0.35 + 0.78;

    // Precompute palette sides once (not per grain).
    vec3 emerald = vec3(0.24, 0.48, 0.36);
    vec3 sage = vec3(0.42, 0.58, 0.48);
    vec3 teal = vec3(0.38, 0.58, 0.62);
    vec3 mist = vec3(0.55, 0.66, 0.68);
    vec3 ink = vec3(0.32, 0.36, 0.38);
    vec3 greenSide = mix(emerald, sage, smoothstep(0.15, 0.85, fc));
    vec3 coolSide = mix(teal, mist, smoothstep(0.1, 0.8, fc));
    float baseMix = clamp(0.3 + coolBias * 0.35 + 0.15 * smoothstep(0.1, 0.8, fc), 0.05, 0.95);
    baseMix = mix(baseMix * 0.55 + 0.2, baseMix, 0.35 + 0.65 * uEnergy);
    vec3 baseCol = mix(coolSide, greenSide, baseMix);
    baseCol = mix(baseCol, ink, (1.0 - uEnergy) * 0.35);

    vec3 acc = vec3(0.0);
    for (int n = 0; n < 10; n++) {
      float fn = float(n);
      float rnd = hash(cell * 1.13 + seed + fn * 17.3);
      float spawn = step(rnd, spawnBase);
      // Skip dead candidates early.
      if (spawn < 0.5) continue;

      vec2 pp = vec2(
        hash(cell + vec2(7.1 + fn, 3.7) + seed),
        hash(cell + vec2(2.3, 9.2 + fn * 1.7) + seed)
      ) * 0.9 + 0.05;

      float radius = mix(0.005, 0.022, hash(cell + 5.5 + seed + fn)) * radMul;
      float d = length(fr - pp);
      float pt = smoothstep(radius, radius * 0.1, d);
      float bloom = exp(-d * d / max(radius * radius * 3.2, 1e-5));
      float grain = max(pt, bloom * 0.75);
      float tw = 0.6 + 0.4 * sin(uTime * mix(0.35, 1.0, uEnergy) * (0.45 + rnd) + rnd * 19.0 + fn);

      // Light per-grain tone variation only.
      float spat = 0.5 + 0.5 * sin(w.x * 4.2 + seed + fn * 0.6);
      vec3 dcol = mix(baseCol, mix(sage, teal, 0.5), spat * 0.18);

      acc += dcol * grain * tw * weight * (0.5 + fc * 1.15);
    }
    return acc;
  }

  float cloudMass(vec2 w) {
    float t = uTime * 0.055;
    float right = smoothstep(0.28, 0.48, w.x);
    vec2 c1 = vec2(0.72 + sin(t * 0.35) * 0.03, 0.48 + cos(t * 0.28) * 0.04);
    float m1 = smoothstep(0.72, 0.08, length((w - c1) * vec2(1.15, 0.95)));
    vec2 c2 = vec2(0.82 + cos(t * 0.3) * 0.025, 0.62 + sin(t * 0.4) * 0.03);
    float m2 = smoothstep(0.48, 0.06, length((w - c2) * vec2(1.5, 1.2)));
    vec2 c3 = vec2(0.68 + sin(t * 0.25) * 0.02, 0.32 + cos(t * 0.33) * 0.025);
    float m3 = smoothstep(0.42, 0.05, length((w - c3) * vec2(1.6, 1.35)));
    float mass = max(m1, max(m2 * 0.85, m3 * 0.7)) * right;
    // Single noise pass (was 2× fbm4).
    float n = fbm2(w * 2.4 + vec2(t * 0.35, -t * 0.28));
    mass *= 0.75 + 0.35 * n;
    mass = max(mass, right * 0.35 * smoothstep(0.35, 0.7, n));
    return clamp(mass, 0.0, 1.0);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;

    vec3 plateLight = vec3(0.980, 0.980, 0.976);
    vec3 plateDark = vec3(0.039, 0.039, 0.039);
    vec3 plate = mix(plateLight, plateDark, uDarkMode);

    // Left copy column: solid plate, no particle work.
    if (uv.x < 0.26) {
      gl_FragColor = vec4(plate, 1.0);
      return;
    }

    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    vec2 w = uv;
    w.x = mix(w.x, 0.12 + w.x * 0.88, mobile);

    float still = mix(0.4, 1.0, uEnergy);
    w += vec2(sin(uTime * 0.032 * still), cos(uTime * 0.026 * still)) * 0.008;

    // Cheap curl (one fbm2, not two full fbm4).
    float cn = fbm2(w * 1.6 + vec2(uTime * 0.04, 1.7));
    vec2 wFlow = w + vec2(cn - 0.5, fbm2(w * 1.5 + 2.9) - 0.5) * 0.022;

    vec2 toWell = w - uWell;
    float wr = length(toWell * vec2(1.25, 1.0));
    vec2 wWarp = wFlow - (toWell / max(wr, 0.001)) * 0.01 * exp(-wr * wr / 0.05);

    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.15, 1.0));
    float probe = exp(-prd * prd / 0.02) * uPointerGlow;
    wWarp += (toPtr / max(prd, 0.001)) * 0.012 * probe;
    vec2 ptrPar = (vec2(0.5) - uPointer) * 0.01 * uPointerGlow;

    float mass = cloudMass(wFlow);
    float fc = max(fieldAt(wWarp + ptrPar * 0.08), mass * 0.92);
    fc = max(fc, 0.4 * smoothstep(0.32, 0.55, w.x));

    float clump = smoothstep(0.16, 0.52, fbm2(wFlow * 2.0 + vec2(uTime * 0.022 * still, -uTime * 0.014 * still)));
    float density = clamp(max(mass, clump * 0.85) * (0.55 + 0.55 * fc), 0.0, 1.0);
    float cloudLight = 0.55 + 0.7 * clump;

    float tempField = 0.5
      + 0.22 * sin(w.x * 3.5 + uTime * 0.08)
      + 0.18 * cos(w.y * 3.0 - uTime * 0.06);
    tempField = clamp(tempField, 0.0, 1.0);
    tempField = mix(tempField * 0.6 + 0.15, tempField, 0.4 + 0.6 * uEnergy);

    float energyDrift = mix(0.5, 1.0, uEnergy);
    float dustBoost = (0.95 + 1.5 * density) * cloudLight * (0.75 + 0.35 * uEnergy);

    // 4 layers keep density; finer grids pack more grains than more expensive layers.
    vec3 dust =
      dustLayer(wWarp + ptrPar * 0.1, 120.0, 0.007 * energyDrift, 1.2, 0.0, 1.3, mix(0.25, 0.55, tempField), fc) * dustBoost +
      dustLayer(wWarp + ptrPar * 0.3, 240.0, 0.014 * energyDrift, 1.35, 9.0, 1.05, mix(0.3, 0.6, tempField), fc) * dustBoost +
      dustLayer(wWarp + ptrPar * 0.55, 420.0, 0.022 * energyDrift, 1.3, 19.0, 0.9, mix(0.4, 0.7, tempField), fc) * dustBoost +
      dustLayer(wWarp + ptrPar * 0.9, 720.0, 0.032 * energyDrift, 1.15, 37.0, 0.7, mix(0.45, 0.75, tempField), fc) * dustBoost * density +
      dustLayer(wWarp + ptrPar * 1.3, 1100.0, 0.04 * energyDrift, 0.95, 53.0, 0.55, mix(0.5, 0.8, tempField), fc) * dustBoost * density;

    vec3 color;
    if (uDarkMode > 0.5) {
      color = plate;
      color += dust * 0.92;
      vec3 wash = mix(vec3(0.4, 0.55, 0.58), vec3(0.32, 0.52, 0.42), tempField);
      color = mix(color, color + wash * 0.08 * density, 0.55);
      color += vec3(0.45, 0.7, 0.65) * probe * density * 0.12;
    } else {
      color = plate;
      float dustAmt = clamp(dot(dust, vec3(0.33)) * 2.6 * (0.35 + 0.7 * density), 0.0, 0.95);
      color = mix(color, min(dust * 0.95 + color * 0.2, vec3(1.0)), dustAmt);
      vec3 wash = mix(vec3(0.5, 0.62, 0.64), vec3(0.45, 0.62, 0.52), tempField);
      color = mix(color, mix(color, wash, 0.4), density * 0.35);
    }

    float leftFade = smoothstep(0.26, 0.42, uv.x);
    float rightGate = smoothstep(0.3, 0.48, uv.x);
    float presence = clamp(density * rightGate + 0.15 * rightGate, 0.0, 1.0);

    if (uDarkMode > 0.5) {
      color *= mix(0.22, 1.0, mix(0.4, 1.0, leftFade));
      color *= mix(0.0, 1.0, presence);
      float vert = smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.85, uv.y);
      color *= 0.75 + 0.25 * vert;
      color = pow(max(color, 0.0), vec3(0.92));
    } else {
      color = mix(plate, color, max(leftFade, presence * 0.95));
      float vert = smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.9, uv.y);
      color = mix(color, plate, (1.0 - vert) * 0.08);
    }

    float birth = smoothstep(0.0, 2.6, uTime);
    birth = birth * birth * (3.0 - 2.0 * birth);
    color = mix(plate, color, birth);
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

const FIELD_W = 128;
const FIELD_H = 80;

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
  const LX = 17;
  const LY = 11;
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

export default function HermesLiquidityFieldRender({ posture }: { posture?: HermesPublicPosture } = {}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    while (mount.firstChild) {
      mount.removeChild(mount.firstChild);
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: new URLSearchParams(window.location.search).has('verify-webgl'),
      });
    } catch {
      return undefined;
    }

    // Avoid Three default shadow maps / sort work on a fullscreen quad.
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(1);

    const rand = mulberry32(20260611);
    const fieldData = buildField(rand);

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

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uField: { value: fieldTexture },
      uWell: { value: new THREE.Vector2(WELLS[0].x, WELLS[0].y) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerGlow: { value: 0 },
      uEnergy: { value: posture ? postureEnergy[posture] : 1 },
      uDarkMode: { value: readSiteTheme() === 'dark' ? 1 : 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId: number | null = null;
    let startedAt = performance.now();
    let lastFrameAt = 0;
    let inView = true;
    let pageVisible = typeof document !== 'undefined' ? !document.hidden : true;
    const canRun = () => inView && pageVisible && !isWebglPaused() && !reducedMotion;

    const applyThemeClear = () => {
      const dark = readSiteTheme() === 'dark';
      uniforms.uDarkMode.value = dark ? 1 : 0;
      renderer.setClearColor(dark ? 0x0a0a0a : 0xfafaf9, 1);
    };

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    applyThemeClear();
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.hermesRender = 'liquidity-field';
    // CSS fills the stage; internal buffer is smaller (see resize).
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const resize = () => {
      const cssW = Math.max(1, mount.clientWidth);
      const cssH = Math.max(1, mount.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const scale = RENDER_SCALE * dpr;
      const w = Math.max(1, Math.floor(cssW * scale));
      const h = Math.max(1, Math.floor(cssH * scale));
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w, h);
    };

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
      pointerHost.addEventListener('pointermove', onPointerMove as EventListener, { passive: true });
      pointerHost.addEventListener('pointerleave', onPointerLeave);
    }

    const render = (now: number) => {
      uniforms.uTime.value = (now - startedAt) / 1000;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.09;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.09;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.055;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

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

    const animate = (now: number) => {
      if (!canRun()) {
        frameId = null;
        return;
      }
      // Cap to ~30fps — grain motion is slow; half the GPU load.
      if (now - lastFrameAt >= FRAME_MS) {
        lastFrameAt = now;
        render(now);
      }
      frameId = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render(performance.now());
    });

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

    const onThemeChange = () => {
      applyThemeClear();
      render(performance.now());
    };
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    resize();
    resizeObserver.observe(mount);

    if (reducedMotion) {
      startedAt -= 8400;
      render(performance.now());
    } else {
      tryStartLoop();
    }

    window.requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
    });

    return () => {
      stopLoop();
      unsubPause();
      document.removeEventListener('visibilitychange', onDocVisibility);
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      themeObserver.disconnect();

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
        renderer.dispose();
        if (renderer.domElement?.parentNode) {
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
