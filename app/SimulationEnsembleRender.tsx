'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

import { getRenderPixelRatio, isMobilePlateViewport } from '@/lib/webgl-dpr';
import { isWebglPaused, observeWebglMountVisibility, subscribeWebglPause } from '@/lib/webgl-lifecycle';

// Homepage Simulation plate: self-contained glass cube laboratory.
// Dense GPU particle field morphs through a short ensemble of hypothesis
// worlds. Each cycle: chaos → lock → hold → reject-or-pass break.
// Nothing enters or leaves the box.

const CUBE = 1.0;
const HALF = CUBE * 0.5;
// Texture size → particle count (square). Desktop ~65k, mobile ~20k.
const GPU_SIZE_DESKTOP = 256;
const GPU_SIZE_MOBILE = 144;
const GPU_SIZE_LOW = 128;
const HAZE_COUNT = 6;

// Formation ids in targetFor: 0 sphere · 1 torus · 2 wire cube · 5 infinity
// (helix/galaxy kept in the shader as dormant options; main loop stays tight.)
const MODE_SEQUENCE = [2, 1, 0, 5] as const;
// Break beat per mode: reject (cool burst) or pass (soft gold dissolve).
const MODE_VERDICTS = ['reject', 'pass', 'reject', 'pass'] as const;

function createGlassEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x010204);

  const panels: THREE.Mesh[] = [];
  const addPanel = (
    color: number,
    position: [number, number, number],
    scale: [number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    envScene.add(mesh);
    panels.push(mesh);
  };

  addPanel(0xffffff, [1.2, 2.6, 2.0], [5.5, 0.35], [-0.7, 0.25, 0]);
  addPanel(0x6a9ad4, [-2.8, 0.6, 0.4], [1.4, 3.2], [0, 1.1, 0]);
  addPanel(0xb8a078, [2.2, 0.2, -2.4], [2.2, 1.6], [0.2, -0.5, 0]);
  addPanel(0x1a2838, [0, -2.4, 0.5], [6, 6], [-Math.PI / 2, 0, 0]);
  addPanel(0xe8f2ff, [0.6, 1.8, 2.4], [0.5, 0.5], [-0.4, 0.1, 0]);

  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  for (const mesh of panels) {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  pmrem.dispose();
  return envMap;
}

function createGlassMaterial(envMap: THREE.Texture, opts?: { thickness?: number; transmission?: number }) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xe8f1fa),
    metalness: 0,
    roughness: 0.04,
    transmission: opts?.transmission ?? 1,
    thickness: opts?.thickness ?? 0.55,
    ior: 1.5,
    reflectivity: 0.5,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: THREE.FrontSide,
    envMap,
    envMapIntensity: 1.15,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    attenuationColor: new THREE.Color(0x6f9cc8),
    attenuationDistance: 1.35,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xf2f7ff),
  });
}

// Shared GLSL for formation targets (used by velocity compute).
const formationGlsl = `
const float CUBE = 1.0;
const float HALF = 0.5;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec3 clampInside(vec3 v, float pad) {
  float lim = HALF - pad;
  return clamp(v, vec3(-lim), vec3(lim));
}

vec3 trajPoint(float t, float phase) {
  float angle = t * 3.14159265 * 1.6 + phase * 0.4;
  return clampInside(vec3(
    sin(angle * 1.1) * 0.28,
    (t - 0.5) * CUBE * 0.72,
    cos(angle * 0.9) * 0.24
  ), 0.08);
}

// Iconic formations (readable at a glance while held):
// 0 sphere shell · 1 torus · 2 wire cube · 3 double helix · 4 galaxy · 5 infinity
vec3 targetFor(float mode, float seed, float u, float t) {
  float s1 = seed;
  float s2 = fract(seed * 1.6180339887);
  float s3 = fract(seed * 2.718281828);
  float TAU = 6.2831853;
  vec3 outp = vec3(0.0);

  if (mode < 0.5) {
    // Hollow sphere shell — clear ball of possibilities.
    float th = s1 * TAU;
    float ph = acos(clamp(s2 * 2.0 - 1.0, -1.0, 1.0));
    float r = HALF * 0.68 * (0.96 + s3 * 0.06);
    outp = vec3(
      r * sin(ph) * cos(th),
      r * cos(ph),
      r * sin(ph) * sin(th)
    );
  } else if (mode < 1.5) {
    // Torus / ring — slow spin so it reads as a solid object.
    float R = 0.30;
    float rr = 0.105;
    float uu = s1 * TAU + t * 0.12;
    float vv = s2 * TAU;
    float cx = (R + rr * cos(vv)) * cos(uu);
    float cy = rr * sin(vv);
    float cz = (R + rr * cos(vv)) * sin(uu);
    // Tilt for 3D read.
    float tilt = 0.55;
    outp = vec3(cx, cy * cos(tilt) - cz * sin(tilt), cy * sin(tilt) + cz * cos(tilt));
  } else if (mode < 2.5) {
    // Wireframe cube — particles on the 12 edges only.
    float edge = floor(s1 * 12.0);
    float along = s2;
    float e = HALF * 0.62;
    // Edge endpoints as min/max corners along one axis.
    // edges 0-3 bottom square, 4-7 top, 8-11 verticals
    if (edge < 4.0) {
      float k = edge;
      if (k < 0.5) outp = vec3(mix(-e, e, along), -e, -e);
      else if (k < 1.5) outp = vec3(e, -e, mix(-e, e, along));
      else if (k < 2.5) outp = vec3(mix(e, -e, along), -e, e);
      else outp = vec3(-e, -e, mix(e, -e, along));
    } else if (edge < 8.0) {
      float k = edge - 4.0;
      if (k < 0.5) outp = vec3(mix(-e, e, along), e, -e);
      else if (k < 1.5) outp = vec3(e, e, mix(-e, e, along));
      else if (k < 2.5) outp = vec3(mix(e, -e, along), e, e);
      else outp = vec3(-e, e, mix(e, -e, along));
    } else {
      float k = edge - 8.0;
      if (k < 0.5) outp = vec3(-e, mix(-e, e, along), -e);
      else if (k < 1.5) outp = vec3(e, mix(-e, e, along), -e);
      else if (k < 2.5) outp = vec3(e, mix(-e, e, along), e);
      else outp = vec3(-e, mix(-e, e, along), e);
    }
    // Tiny thickness so edges aren't infinitely thin.
    outp += (vec3(s1, s2, s3) - 0.5) * 0.012;
  } else if (mode < 3.5) {
    // Double helix — two clear strands + occasional rungs.
    float y = (s1 - 0.5) * 0.82;
    float strand = step(0.5, s2);
    float ang = y * 9.0 + t * 0.22 + strand * 3.14159265;
    float rad = 0.155;
    if (s3 > 0.82) {
      // Base-pair rung between strands.
      float a0 = y * 9.0 + t * 0.22;
      vec3 p0 = vec3(cos(a0) * rad, y, sin(a0) * rad);
      vec3 p1 = vec3(cos(a0 + 3.14159265) * rad, y, sin(a0 + 3.14159265) * rad);
      outp = mix(p0, p1, s2);
    } else {
      outp = vec3(cos(ang) * rad, y, sin(ang) * rad);
    }
  } else if (mode < 4.5) {
    // Spiral galaxy — tight arms, bright core, thin disk.
    float arms = 2.0;
    float maxR = HALF * 0.78;
    float spin = t * 0.1;
    if (s3 < 0.12) {
      float br = pow(s2, 0.45) * 0.07;
      float ba = s1 * TAU + spin * 1.2;
      outp = vec3(cos(ba) * br, (s3 - 0.06) * 0.12, sin(ba) * br);
    } else {
      float arm = floor(s1 * arms);
      float radius = pow(0.02 + s2 * 0.98, 0.55) * maxR;
      float wind = 3.4;
      float armPhase = (arm / arms) * TAU;
      float theta = armPhase + log(1.0 + radius * 11.0) * wind + spin
                 + (s3 - 0.5) * (0.05 + radius * 0.12);
      float diskH = (s1 - 0.5) * (0.012 + (1.0 - radius / maxR) * 0.03);
      float x = cos(theta) * radius;
      float y = diskH;
      float z = sin(theta) * radius;
      float tilt = 0.48;
      outp = vec3(x, y * cos(tilt) - z * sin(tilt), y * sin(tilt) + z * cos(tilt));
    }
  } else {
    // Infinity (lemniscate) ribbon — unmistakable symbol of open possibility.
    float th = s1 * TAU + t * 0.1;
    float sc = 0.34;
    float den = 1.0 + sin(th) * sin(th);
    float x = sc * cos(th) / den;
    float z = sc * sin(th) * cos(th) / den;
    float y = (s2 - 0.5) * 0.05 + sin(th * 2.0) * 0.02 * s3;
    // Thin ribbon thickness.
    float nx = -sin(th);
    float nz = cos(th) * cos(th) - sin(th) * sin(th);
    float nlen = max(length(vec2(nx, nz)), 1e-4);
    outp = vec3(x, y, z) + vec3(nx, 0.0, nz) / nlen * ((s3 - 0.5) * 0.04);
  }

  // Whisper of life only — keep silhouettes sharp during hold.
  float morph = 0.0035;
  outp.x += sin(t * 0.4 + seed * 11.0) * morph;
  outp.y += cos(t * 0.35 + seed * 9.0) * morph;
  outp.z += sin(t * 0.3 + seed * 7.0) * morph;

  return clampInside(outp, 0.04);
}

vec3 scatterTarget(float seed, float t) {
  float s1 = seed;
  float s2 = fract(seed * 1.6180339887);
  float s3 = fract(seed * 2.718281828);
  float a = s1 * 6.2831853 + t * 0.7;
  float b = s2 * 6.2831853 - t * 0.45;
  float r = (0.2 + s3 * 0.75) * HALF * 0.95;
  return clampInside(vec3(
    sin(a) * cos(b) * r,
    (s2 * 2.0 - 1.0) * HALF * 0.88 + sin(t * 1.1 + s1 * 8.0) * 0.04,
    cos(a) * cos(b) * r
  ), 0.04);
}
`;

const velocityShader = `
  uniform float uTime;
  uniform float uDt;
  uniform float uModeA;
  uniform float uShape;      // 0 = chaos, 1 = fully locked to formation
  uniform float uShapeLock;  // extra snap during hold
  uniform float uDetonate;
  uniform float uFreeFall;
  uniform float uInPath;
  uniform float uInGalaxy;
  uniform float uTrajFray;
  uniform float uTrajPhase;
  uniform float uIndexScale;

  ${formationGlsl}

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posSample = texture2D(texturePosition, uv);
    vec4 velSample = texture2D(textureVelocity, uv);
    vec3 p = posSample.xyz;
    vec3 v = velSample.xyz;
    float seed = posSample.w;
    float idx = (gl_FragCoord.x - 0.5) + (gl_FragCoord.y - 0.5) * resolution.x;
    float u = idx * uIndexScale;

    // Cadence: chaos scatter ↔ formation target. Shape holds when uShapeLock is high.
    vec3 form = targetFor(uModeA, seed, u, uTime);
    vec3 chaos = scatterTarget(seed, uTime * 1.15 + uModeA * 4.2);
    vec3 target = mix(chaos, form, clamp(uShape, 0.0, 1.0));

    if (uDetonate > 0.001) {
      float burst = 1.0 + uDetonate * (0.85 + seed * 0.55);
      target *= burst;
      target += vec3(seed - 0.5, fract(seed * 1.7) - 0.5, fract(seed * 2.3) - 0.5) * uDetonate * 0.35;
      target = clampInside(target, 0.04);
    }
    if (uFreeFall > 0.001) {
      target = mix(target, chaos, uFreeFall);
    }
    if (uInPath > 0.02 && uShape > 0.35) {
      float pathT = clamp((p.y / (CUBE * 0.72) + 0.5) * 0.85 + seed * 0.12, 0.0, 1.0);
      vec3 corridor = trajPoint(pathT, uTrajPhase);
      float magnet = uInPath * uShape * (0.6 + (1.0 - uTrajFray) * 0.4);
      target = mix(target, corridor, magnet);
      if (uTrajFray > 0.05) {
        float splay = uTrajFray * (0.1 + seed * 0.14);
        target += vec3(seed - 0.5, fract(seed * 1.3) - 0.5, fract(seed * 2.1) - 0.5) * splay * vec3(2.2, 1.0, 2.2);
      }
      target = clampInside(target, 0.05);
    }

    // Stronger hold snap so icons stay sharp; chaos stays wild.
    float aMul = 0.5
      + uShape * 1.25
      + uShapeLock * 2.1
      + uInGalaxy * 0.3
      + uInPath * 0.35
      - uFreeFall * 0.4
      - uDetonate * 0.15;
    float nMul = max(0.03,
      0.18
      + uFreeFall * 1.4
      + uDetonate * 0.95
      - uShape * 0.65
      - uShapeLock * 1.05
      - uInGalaxy * 0.2
      - uInPath * 0.2);
    float attract = 11.0 * max(aMul, 0.2);
    float drag = exp(-(2.6 + uShapeLock * 3.4) * uDt);

    v += (target - p) * attract * uDt;
    v *= drag;
    v += vec3(
      sin(uTime * 1.1 + seed * 20.0),
      cos(uTime * 0.85 + seed * 17.0),
      sin(uTime * 0.7 + seed * 13.0)
    ) * 0.22 * nMul * uDt;

    if (uDetonate > 0.15) {
      v += p * uDetonate * 0.55 * uDt * 10.0;
      v += vec3(
        sin(seed * 40.0 + uTime * 8.0),
        cos(seed * 31.0 - uTime * 7.0),
        sin(seed * 23.0 + uTime * 9.0)
      ) * uDetonate * 0.45 * uDt * 12.0;
    }

    gl_FragColor = vec4(v, 1.0);
  }
`;

const positionShader = `
  uniform float uDt;

  ${formationGlsl}

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posSample = texture2D(texturePosition, uv);
    vec4 velSample = texture2D(textureVelocity, uv);
    vec3 p = posSample.xyz;
    vec3 v = velSample.xyz;
    float seed = posSample.w;

    p += v;

    float lim = HALF - 0.03;
    if (p.x > lim || p.x < -lim) { p.x = clamp(p.x, -lim, lim); }
    if (p.y > lim || p.y < -lim) { p.y = clamp(p.y, -lim, lim); }
    if (p.z > lim || p.z < -lim) { p.z = clamp(p.z, -lim, lim); }

    gl_FragColor = vec4(p, seed);
  }
`;

const pointVertex = `
  attribute vec2 aRef;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform sampler2D texturePosition;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uDetonate;
  uniform float uFreeFall;
  uniform float uInPath;
  uniform float uVerdict; // -1 reject · 0 neutral · +1 pass
  varying float vBright;
  varying vec3 vColor;
  varying float vVerdict;

  ${formationGlsl}

  void main() {
    vec4 posSample = texture2D(texturePosition, aRef);
    vec3 pos = posSample.xyz;
    vColor = aColor;
    vVerdict = uVerdict;

    float b = 0.22 + aSeed * 0.45;
    b *= 0.88 + 0.12 * ((pos.z + HALF) / CUBE);
    b *= 0.92 + 0.08 * ((pos.y + HALF) / CUBE);

    // Infinity hold: brighten the ribbon corridor slightly.
    if (uInPath > 0.02) {
      float pathT = clamp(pos.y / (CUBE * 0.72) + 0.5, 0.0, 1.0);
      vec3 corridor = trajPoint(pathT, 0.0);
      float dist2 = dot(pos - corridor, pos - corridor);
      b += exp(-dist2 / 0.04) * 0.22 * uInPath;
    }
    b += uDetonate * 0.22 + uFreeFall * 0.06;
    // Pass holds warm; reject breaks cool and spike bright.
    b += max(uVerdict, 0.0) * 0.08;
    b += max(-uVerdict, 0.0) * uDetonate * 0.12;
    vBright = min(b, 1.3);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float size = mix(0.009, 0.022, aSeed);
    float tw = 0.85 + 0.15 * sin(uTime * (0.5 + aSeed * 1.2) + aSeed * 12.0);
    gl_PointSize = size * uPixelRatio * tw * (220.0 / max(-mv.z, 0.001));
    gl_Position = projectionMatrix * mv;
  }
`;

const pointFragment = `
  precision highp float;
  varying float vBright;
  varying vec3 vColor;
  varying float vVerdict;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = exp(-d * d * 3.2);
    float halo = exp(-d * d * 1.05) * 0.45;
    float a = (core + halo) * clamp(vBright, 0.15, 1.25) * 0.75;
    vec3 col = vColor * (0.65 + 0.55 * core);
    // Pass: gold lift. Reject: cool rose/slate shift.
    col = mix(col, vec3(1.0, 0.78, 0.35), smoothstep(0.9, 1.25, vBright) * 0.22);
    col = mix(col, vec3(1.0, 0.82, 0.42), max(vVerdict, 0.0) * 0.35);
    col = mix(col, vec3(0.55, 0.42, 0.95), max(-vVerdict, 0.0) * 0.4);
    col = mix(col, vec3(0.95, 0.35, 0.48), max(-vVerdict, 0.0) * 0.25 * core);
    gl_FragColor = vec4(col, a);
  }
`;

/** High-chroma celestial families for vertex colors (visible under additive stack). */
function celestialRgb(seed: number): [number, number, number] {
  const t = seed - Math.floor(seed);
  if (t < 0.2) return [0.35, 0.25, 1.0]; // indigo
  if (t < 0.4) return [0.2, 0.65, 1.0]; // azure
  if (t < 0.58) return [0.78, 0.22, 1.0]; // violet
  if (t < 0.74) return [0.15, 0.95, 0.8]; // teal
  if (t < 0.9) return [1.0, 0.28, 0.55]; // rose
  return [1.0, 0.75, 0.2]; // gold
}

const hazeVertex = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const hazeFragment = `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform float uIntensity;

  void main() {
    float ndv = max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float body = pow(ndv, 1.6);
    float rim = pow(1.0 - ndv, 2.8) * 0.35;
    float a = (body * 0.55 + rim) * uIntensity;
    vec3 col = uColor * (0.65 + body * 0.9);
    gl_FragColor = vec4(col, a);
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

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

function fillParticleTextures(
  posTex: THREE.DataTexture,
  velTex: THREE.DataTexture,
  size: number,
  rand: () => number,
) {
  const pos = posTex.image.data as Float32Array;
  const vel = velTex.image.data as Float32Array;
  const n = size * size;
  for (let i = 0; i < n; i++) {
    const i4 = i * 4;
    const seed = rand();
    const a = rand() * Math.PI * 2;
    const b = rand() * Math.PI * 2;
    const r = Math.pow(0.15 + rand() * 0.85, 0.55) * HALF * 0.9;
    pos[i4] = Math.sin(a) * Math.cos(b) * r;
    pos[i4 + 1] = (rand() * 2 - 1) * HALF * 0.85;
    pos[i4 + 2] = Math.cos(a) * Math.cos(b) * r * 0.9;
    pos[i4 + 3] = seed;
    vel[i4] = 0;
    vel[i4 + 1] = 0;
    vel[i4 + 2] = 0;
    vel[i4 + 3] = 1;
  }
  posTex.needsUpdate = true;
  velTex.needsUpdate = true;
}

export default function SimulationEnsembleRender() {
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
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const lowEnd =
      typeof navigator !== 'undefined' &&
      typeof navigator.hardwareConcurrency === 'number' &&
      navigator.hardwareConcurrency > 0 &&
      navigator.hardwareConcurrency <= 4;
    const gpuSize = isMobile
      ? lowEnd
        ? GPU_SIZE_LOW
        : GPU_SIZE_MOBILE
      : lowEnd
        ? GPU_SIZE_MOBILE
        : GPU_SIZE_DESKTOP;
    const particleCount = gpuSize * gpuSize;
    const rand = mulberry32(20260722);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(1.55, 1.05, 2.05);
    camera.lookAt(0, 0.02, 0);

    const envMap = createGlassEnvironment(renderer);
    scene.environment = envMap;

    const world = new THREE.Group();
    scene.add(world);

    // --- Glass shell ---
    const shell = new THREE.Group();
    world.add(shell);

    const boxGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const outerGlassGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const innerGlassGeo = new THREE.BoxGeometry(CUBE * 0.965, CUBE * 0.965, CUBE * 0.965);

    const glassMat = createGlassMaterial(envMap, { thickness: 0.62, transmission: 1 });
    const glassMesh = new THREE.Mesh(outerGlassGeo, glassMat);
    glassMesh.renderOrder = 3;
    shell.add(glassMesh);

    const innerGlassMat = createGlassMaterial(envMap, { thickness: 0.18, transmission: 0.92 });
    innerGlassMat.side = THREE.BackSide;
    innerGlassMat.envMapIntensity = 0.55;
    innerGlassMat.roughness = 0.08;
    innerGlassMat.opacity = 0.55;
    const innerGlassMesh = new THREE.Mesh(innerGlassGeo, innerGlassMat);
    innerGlassMesh.renderOrder = 3;
    shell.add(innerGlassMesh);

    const edgesGeo = new THREE.EdgesGeometry(boxGeo, 15);
    const edgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xd0e4f8),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(edgesGeo, edgeMat);
    edges.renderOrder = 5;
    shell.add(edges);

    const innerEdgesGeo = new THREE.EdgesGeometry(innerGlassGeo, 15);
    const innerEdgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x7aa0c4),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    shell.add(new THREE.LineSegments(innerEdgesGeo, innerEdgeMat));

    const cornerGeo = new THREE.BufferGeometry();
    const cornerPos = new Float32Array(8 * 3);
    let ci = 0;
    for (const x of [-HALF, HALF]) {
      for (const y of [-HALF, HALF]) {
        for (const z of [-HALF, HALF]) {
          cornerPos[ci++] = x;
          cornerPos[ci++] = y;
          cornerPos[ci++] = z;
        }
      }
    }
    cornerGeo.setAttribute('position', new THREE.BufferAttribute(cornerPos, 3));
    const corners = new THREE.Points(
      cornerGeo,
      new THREE.PointsMaterial({
        color: 0xf2f8ff,
        size: 0.032,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      }),
    );
    corners.renderOrder = 6;
    shell.add(corners);

    // --- Volume haze ---
    const hazeGroup = new THREE.Group();
    world.add(hazeGroup);
    const hazeSphereGeo = new THREE.SphereGeometry(1, 16, 12);
    const hazeMeshes: THREE.Mesh[] = [];
    const hazeMats: THREE.ShaderMaterial[] = [];
    for (let h = 0; h < HAZE_COUNT; h++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0.4, 0.65, 0.95) },
          uIntensity: { value: 0 },
        },
        vertexShader: hazeVertex,
        fragmentShader: hazeFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(hazeSphereGeo, mat);
      mesh.scale.setScalar(0.12);
      mesh.visible = false;
      hazeGroup.add(mesh);
      hazeMeshes.push(mesh);
      hazeMats.push(mat);
    }

    // --- GPU particle field ---
    const gpuCompute = new GPUComputationRenderer(gpuSize, gpuSize, renderer);
    // Prefer half-float on mobile for memory/bandwidth.
    if (isMobile) {
      gpuCompute.setDataType(THREE.HalfFloatType);
    }

    const pos0 = gpuCompute.createTexture();
    const vel0 = gpuCompute.createTexture();
    fillParticleTextures(pos0, vel0, gpuSize, rand);

    const velVar = gpuCompute.addVariable('textureVelocity', velocityShader, vel0);
    const posVar = gpuCompute.addVariable('texturePosition', positionShader, pos0);
    gpuCompute.setVariableDependencies(velVar, [velVar, posVar]);
    gpuCompute.setVariableDependencies(posVar, [velVar, posVar]);

    const velUniforms = velVar.material.uniforms;
    velUniforms.uTime = { value: 0 };
    velUniforms.uDt = { value: 0.016 };
    velUniforms.uModeA = { value: 0 };
    velUniforms.uShape = { value: 0 };
    velUniforms.uShapeLock = { value: 0 };
    velUniforms.uDetonate = { value: 0 };
    velUniforms.uFreeFall = { value: 1 };
    velUniforms.uInPath = { value: 0 };
    velUniforms.uInGalaxy = { value: 0 };
    velUniforms.uTrajFray = { value: 0 };
    velUniforms.uTrajPhase = { value: 0 };
    velUniforms.uIndexScale = { value: 1 / Math.max(particleCount - 1, 1) };

    posVar.material.uniforms.uDt = { value: 0.016 };

    let gpuOk = true;
    const gpuError = gpuCompute.init();
    if (gpuError !== null) {
      // Retry with half float if full float failed.
      gpuCompute.setDataType(THREE.HalfFloatType);
      const retry = gpuCompute.init();
      if (retry !== null) {
        gpuOk = false;
        console.warn('Simulation GPU particles unavailable:', retry);
      }
    }

    const refs = new Float32Array(particleCount * 2);
    const seeds = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const posData = pos0.image.data as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const x = (i % gpuSize) / gpuSize;
      const y = Math.floor(i / gpuSize) / gpuSize;
      // Sample texel centers.
      refs[i * 2] = x + 0.5 / gpuSize;
      refs[i * 2 + 1] = y + 0.5 / gpuSize;
      const seed = posData[i * 4 + 3];
      seeds[i] = seed;
      const [cr, cg, cb] = celestialRgb(seed);
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }

    const pGeo = new THREE.BufferGeometry();
    // Dummy positions required by Three; real positions come from texture.
    pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
    pGeo.setAttribute('aRef', new THREE.BufferAttribute(refs, 2));
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    pGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.2);

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        texturePosition: { value: null as THREE.Texture | null },
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
        uDetonate: { value: 0 },
        uFreeFall: { value: 0 },
        uInPath: { value: 0 },
        uVerdict: { value: 0 },
      },
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      transparent: true,
      depthWrite: false,
      // Explicit additive that multiplies by fragment alpha (not One,One).
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
      toneMapped: false,
    });
    const points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    // Draw after glass shell so transmission/clearcoat cannot grey the field out.
    points.renderOrder = 4;
    if (gpuOk) world.add(points);

    scene.add(new THREE.AmbientLight(0x6a88aa, 0.28));
    const key = new THREE.DirectionalLight(0xf2f7ff, 1.35);
    key.position.set(2.4, 3.2, 2.8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6a9ad4, 0.45);
    fill.position.set(-2.2, 0.8, 1.2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xb8c4d8, 0.35);
    rim.position.set(-0.5, 1.2, -2.6);
    scene.add(rim);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Milder tone map so celestial chroma isn't crushed to grey-blue.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.simulationRender = 'glass-cube-gpu';
    renderer.domElement.dataset.particleCount = String(particleCount);
    mount.appendChild(renderer.domElement);

    let frameId: number | null = null;
    let startedAt = performance.now();
    let inView = true;
    let pageVisible = typeof document !== 'undefined' ? !document.hidden : true;
    let lastT = performance.now();

    const canRun = () => inView && pageVisible && !isWebglPaused() && !reducedMotion;

    const pointer = { x: 0, y: 0, tx: 0, ty: 0, glow: 0, glowTarget: 0 };
    const card = mount.closest('.inst-card');

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.ty = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.glowTarget = 1;
    };
    const onPointerLeave = () => {
      pointer.glowTarget = 0;
      pointer.tx = 0;
      pointer.ty = 0;
    };

    if (card && !reducedMotion) {
      card.addEventListener('pointermove', onPointerMove as EventListener);
      card.addEventListener('pointerleave', onPointerLeave);
    }

    // Cadence: disturbance → lock → hold → reject-or-pass release.
    // Four short silhouettes; full ensemble ~36s (was ~80s).
    const MODE_COUNT = MODE_SEQUENCE.length;
    const T_CHAOS = 1.35;
    const T_LOCK = 1.85;
    const T_HOLD = 4.4;
    const T_BREAK = 1.55;
    const SLOT = T_CHAOS + T_LOCK + T_HOLD + T_BREAK;
    const EPOCH = MODE_COUNT * SLOT;
    const PATH_MODE = 5; // infinity formation id

    // First paint mid-hold on market geometry (wire cube) — strongest lab read.
    const START_OFFSET = 0 * SLOT + T_CHAOS + T_LOCK + T_HOLD * 0.35;
    startedAt = performance.now() - START_OFFSET * 1000;

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = getRenderPixelRatio(3);
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Mobile: larger points so the dense field doesn't look mushy at distance.
      pMat.uniforms.uPixelRatio.value = dpr * (isMobilePlateViewport() ? 1.15 : 1);

      const aspect = width / height;
      const dist = aspect < 1 ? 3.35 : 2.85;
      camera.position.set(dist * 0.72, dist * 0.48, dist * 0.95);
      camera.lookAt(aspect < 1.1 ? 0 : -0.05, 0.02, 0);
    };

    const setHaze = (
      index: number,
      x: number,
      y: number,
      z: number,
      scale: number,
      intensity: number,
      warm = 0,
    ) => {
      if (index >= HAZE_COUNT) return;
      const mesh = hazeMeshes[index];
      const mat = hazeMats[index];
      if (intensity < 0.02) {
        mesh.visible = false;
        mat.uniforms.uIntensity.value = 0;
        return;
      }
      mesh.visible = true;
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      mat.uniforms.uIntensity.value = intensity;
      // Match particle celestial cast: indigo → violet → soft gold.
      const nebula = new THREE.Color(0.32, 0.38, 0.92);
      const stellar = new THREE.Color(0.45, 0.72, 1.0);
      const gold = new THREE.Color(0.98, 0.86, 0.58);
      mat.uniforms.uColor.value.copy(nebula).lerp(stellar, 0.45).lerp(gold, warm);
    };

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const elapsed = (now - startedAt) / 1000;

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      pointer.glow += (pointer.glowTarget - pointer.glow) * 0.05;

      if (!reducedMotion) {
        world.rotation.y = elapsed * 0.045 + pointer.x * 0.18 * pointer.glow;
        world.rotation.x = 0.22 + Math.sin(elapsed * 0.11) * 0.03 + pointer.y * 0.1 * pointer.glow;
        world.rotation.z = Math.sin(elapsed * 0.07) * 0.02;
      } else {
        world.rotation.y = 0.55;
        world.rotation.x = 0.25;
      }

      // Reduced motion: freeze mid-hold on market geometry (wire cube).
      const phase = reducedMotion ? T_CHAOS + T_LOCK + T_HOLD * 0.45 : elapsed % EPOCH;
      const modeIndex = Math.floor(phase / SLOT) % MODE_COUNT;
      const local = phase - modeIndex * SLOT;
      const modeA = MODE_SEQUENCE[modeIndex];
      const rejects = MODE_VERDICTS[modeIndex] === 'reject';

      // Explicit four-beat loop (readable formation, not constant soup).
      let freeFall = 0;
      let detonate = 0;
      let shape = 0;
      let shapeLock = 0;
      let verdict = 0;

      if (local < T_CHAOS) {
        const t = local / T_CHAOS;
        freeFall = 1;
        shape = 0;
        shapeLock = 0;
        detonate = t < 0.22 ? (1 - t / 0.22) * 0.28 : 0;
      } else if (local < T_CHAOS + T_LOCK) {
        const t = smoothstep(0, 1, (local - T_CHAOS) / T_LOCK);
        freeFall = 1 - t;
        shape = t;
        shapeLock = t * t;
        detonate = 0;
      } else if (local < T_CHAOS + T_LOCK + T_HOLD) {
        freeFall = 0;
        detonate = 0;
        shape = 1;
        shapeLock = 1;
      } else {
        // Break: reject (hard cool burst) or pass (soft gold dissolve).
        const t = smoothstep(0, 1, (local - T_CHAOS - T_LOCK - T_HOLD) / T_BREAK);
        shape = 1 - t;
        shapeLock = Math.max(0, 1 - t * (rejects ? 1.55 : 1.15));
        if (rejects) {
          detonate = Math.sin(t * Math.PI) * 1.15;
          freeFall = smoothstep(0.12, 1, t);
          verdict = -smoothstep(0.05, 0.45, t) * (1 - smoothstep(0.75, 1, t));
        } else {
          detonate = Math.sin(t * Math.PI) * 0.32;
          freeFall = smoothstep(0.35, 1, t) * 0.55;
          verdict = smoothstep(0.0, 0.35, t) * (1 - smoothstep(0.7, 1, t));
        }
      }

      // Hover: bounded stress on a held world — teaches robustness, not a toy.
      const hoverPerturbation = pointer.glow * shapeLock * 0.32;
      detonate = Math.max(detonate, hoverPerturbation);
      if (pointer.glow > 0.35 && shapeLock > 0.8) {
        verdict = Math.min(verdict, -pointer.glow * 0.25);
      }

      if (reducedMotion) {
        freeFall = 0;
        detonate = 0;
        shape = 1;
        shapeLock = 1;
        verdict = 0;
      }

      const inPath = modeA === PATH_MODE ? shape : 0;
      const inGalaxy = 0;

      // Soft volume under each icon while held.
      for (let h = 0; h < HAZE_COUNT; h++) setHaze(h, 0, 0, 0, 0.1, 0);
      const hazeBoost = shape * shapeLock * (1 - freeFall * 0.7) * (1 - detonate * 0.35);
      if (modeA === 0) {
        setHaze(0, 0, 0, 0, 0.55, 0.12 * hazeBoost, 0.08);
      }
      if (modeA === 1) {
        setHaze(0, 0, 0, 0, 0.28, 0.18 * hazeBoost, 0.15);
      }
      if (modeA === 2) {
        setHaze(0, 0, 0, 0, 0.42, 0.1 * hazeBoost, 0.05);
      }
      if (inPath > 0.02) {
        setHaze(0, 0.2, 0, 0, 0.16, 0.2 * inPath * hazeBoost, 0.4);
        setHaze(1, -0.2, 0, 0, 0.16, 0.2 * inPath * hazeBoost, 0.4);
        setHaze(2, 0, 0, 0, 0.1, 0.14 * inPath * hazeBoost, 0.3);
      }
      if (detonate > 0.05) {
        const warm = rejects ? 0.05 : 0.55;
        setHaze(5, 0, 0, 0, 0.38 + detonate * 0.28, 0.22 * detonate, warm);
      }

      // GPU sim step
      const step = Math.min(dt, 0.033);
      if (gpuOk && !reducedMotion) {
        velUniforms.uTime.value = elapsed;
        velUniforms.uDt.value = step;
        velUniforms.uModeA.value = modeA;
        velUniforms.uShape.value = shape;
        velUniforms.uShapeLock.value = shapeLock;
        velUniforms.uDetonate.value = detonate;
        velUniforms.uFreeFall.value = freeFall;
        velUniforms.uInPath.value = inPath;
        velUniforms.uInGalaxy.value = inGalaxy;
        velUniforms.uTrajFray.value = 0;
        velUniforms.uTrajPhase.value = 0;
        posVar.material.uniforms.uDt.value = step;
        gpuCompute.compute();
        pMat.uniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(posVar).texture;
      } else if (gpuOk) {
        velUniforms.uModeA.value = MODE_SEQUENCE[0];
        velUniforms.uShape.value = 1;
        velUniforms.uShapeLock.value = 1;
        velUniforms.uFreeFall.value = 0;
        velUniforms.uDetonate.value = 0;
        // One compute so reduced-motion freezes on the start formation.
        if (pMat.uniforms.texturePosition.value === null) {
          gpuCompute.compute();
        }
        pMat.uniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(posVar).texture;
      }

      pMat.uniforms.uTime.value = elapsed;
      pMat.uniforms.uDetonate.value = detonate;
      pMat.uniforms.uFreeFall.value = freeFall;
      pMat.uniforms.uInPath.value = inPath;
      pMat.uniforms.uVerdict.value = verdict;

      const interiorHeat = detonate * 0.35 + Math.max(verdict, 0) * 0.25 + inPath * 0.12;
      glassMat.roughness = 0.03 + 0.02 * Math.sin(elapsed * 0.2) + pointer.glow * 0.01;
      glassMat.envMapIntensity = 1.05 + pointer.glow * 0.25 + interiorHeat * 0.45;
      glassMat.clearcoatRoughness = 0.05 + (1 - interiorHeat) * 0.04;
      innerGlassMat.envMapIntensity = 0.5 + pointer.glow * 0.12 + interiorHeat * 0.2;
      edgeMat.opacity = 0.48 + 0.12 * pointer.glow + 0.1 * detonate + Math.max(verdict, 0) * 0.12;
      (corners.material as THREE.PointsMaterial).opacity =
        0.55 + 0.25 * pointer.glow + 0.15 * detonate + Math.max(verdict, 0) * 0.15;

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
      lastT = performance.now();
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

    // Warm up so first paint locks the start formation (wire cube).
    if (gpuOk) {
      velUniforms.uTime.value = START_OFFSET;
      velUniforms.uDt.value = 0.016;
      velUniforms.uModeA.value = MODE_SEQUENCE[0];
      velUniforms.uShape.value = 1;
      velUniforms.uShapeLock.value = 1;
      velUniforms.uFreeFall.value = 0;
      velUniforms.uDetonate.value = 0;
      // Settle particles toward the formation target before the first frame.
      for (let i = 0; i < 28; i++) {
        gpuCompute.compute();
      }
      pMat.uniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(posVar).texture;
    }

    if (reducedMotion) {
      render();
    } else {
      animate();
    }

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
      visibilityWatch.disconnect();
      try {
        boxGeo.dispose();
        outerGlassGeo.dispose();
        innerGlassGeo.dispose();
        edgesGeo.dispose();
        innerEdgesGeo.dispose();
        edgeMat.dispose();
        innerEdgeMat.dispose();
        glassMat.dispose();
        innerGlassMat.dispose();
        cornerGeo.dispose();
        (corners.material as THREE.Material).dispose();
        hazeSphereGeo.dispose();
        for (const mat of hazeMats) mat.dispose();
        pGeo.dispose();
        pMat.dispose();
        pos0.dispose();
        vel0.dispose();
        envMap.dispose();
        scene.environment = null;
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        while (mount.firstChild) mount.removeChild(mount.firstChild);
      } catch {
        // swallow HMR disposal races
      }
    };
  }, []);

  return (
    <div className="simulation-ensemble-render" aria-hidden="true">
      <div ref={mountRef} className="hermes-render-host" />
    </div>
  );
}
