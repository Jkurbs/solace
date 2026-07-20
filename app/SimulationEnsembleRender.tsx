'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Homepage Simulation plate: a self-contained glass cube laboratory.
// Distinct motion vocabulary from Hermes (liquidity field) and Oracle (futures fan).
// Nothing enters or leaves — possibility reorganizes only inside the box.
// The shell is real physical glass (transmission / IOR / thickness), not a fresnel sketch.
// Worlds collapse (detonate → free fall → recondense); path is the emotional climax;
// soft volume haze makes dense regions read as matter.

const CUBE = 1.0;
const HALF = CUBE * 0.5;
const PARTICLE_COUNT_DESKTOP = 5200;
const PARTICLE_COUNT_MOBILE = 2800;
const TRAJ_POINTS = 128;
const FILAMENT_COUNT = 3;
const HAZE_COUNT = 6;

/** Dark studio env: a few bright panels in void so glass gets real speculars without indoor room look. */
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

// Soft scientific dust points.
const pointVertex = `
  attribute float aSize;
  attribute float aBright;
  attribute float aSeed;
  varying float vBright;
  varying float vSeed;
  uniform float uPixelRatio;
  uniform float uTime;

  void main() {
    vBright = aBright;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.82 + 0.18 * sin(uTime * (0.7 + aSeed * 1.4) + aSeed * 12.0);
    gl_PointSize = aSize * uPixelRatio * tw * (180.0 / max(-mv.z, 0.001));
    gl_Position = projectionMatrix * mv;
  }
`;

const pointFragment = `
  precision highp float;
  varying float vBright;
  varying float vSeed;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = exp(-d * d * 3.8);
    float halo = exp(-d * d * 1.2) * 0.35;
    float a = (core + halo) * vBright;
    vec3 cold = vec3(0.45, 0.72, 0.98);
    vec3 mid = vec3(0.72, 0.88, 1.0);
    vec3 warm = vec3(0.98, 0.9, 0.72);
    vec3 col = mix(cold, mid, smoothstep(0.25, 0.75, vBright));
    col = mix(col, warm, smoothstep(0.7, 1.0, vBright) * 0.55);
    col *= 0.92 + 0.08 * sin(vSeed * 40.0);
    gl_FragColor = vec4(col, a);
  }
`;

// Soft volumetric haze balls — density as matter, not only points.
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
    // Soft ball: bright center, fade at limb.
    float body = pow(ndv, 1.6);
    float rim = pow(1.0 - ndv, 2.8) * 0.35;
    float a = (body * 0.55 + rim) * uIntensity;
    vec3 col = uColor * (0.65 + body * 0.9);
    gl_FragColor = vec4(col, a);
  }
`;

const trajVertex = `
  attribute float aAlong;
  attribute float aFil;
  varying float vAlong;
  varying float vFil;
  void main() {
    vAlong = aAlong;
    vFil = aFil;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trajFragment = `
  precision highp float;
  varying float vAlong;
  varying float vFil;
  uniform float uFade;
  uniform float uPulse;
  uniform float uFray;

  void main() {
    float life = smoothstep(0.0, 0.06, vAlong) * (1.0 - smoothstep(0.9, 1.0, vAlong));
    // Fray: tail unravels first as the path dies.
    life *= 1.0 - uFray * smoothstep(0.35, 1.0, vAlong) * 0.85;
    float head = exp(-pow(vAlong - uPulse, 2.0) / 0.008);
    float spine = 1.0 - vFil * 0.28;
    vec3 col = mix(vec3(0.42, 0.72, 0.98), vec3(1.0, 0.93, 0.78), head * 0.9 + (1.0 - vFil) * 0.15);
    float a = (0.22 * life * spine + 0.72 * head * spine) * uFade;
    // Secondary filaments slightly dimmer.
    a *= mix(1.0, 0.55, vFil);
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

function clampInside(v: THREE.Vector3, pad = 0.04) {
  const lim = HALF - pad;
  v.x = Math.min(Math.max(v.x, -lim), lim);
  v.y = Math.min(Math.max(v.y, -lim), lim);
  v.z = Math.min(Math.max(v.z, -lim), lim);
  return v;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

const _pathTmp = new THREE.Vector3();
const _pathTmp2 = new THREE.Vector3();

// Formation targets inside the cube. Each mode is a different "hypothesis world".
function targetFor(
  mode: number,
  seed: number,
  i: number,
  n: number,
  t: number,
  out: THREE.Vector3,
) {
  const u = i / Math.max(n - 1, 1);
  const s1 = seed;
  const s2 = (seed * 1.6180339887) % 1;
  const s3 = (seed * 2.718281828) % 1;

  if (mode < 0.5) {
    const a = s1 * Math.PI * 2;
    const b = s2 * Math.PI * 2;
    const r = Math.pow(0.15 + s3 * 0.85, 0.55) * HALF * 0.92;
    out.set(
      Math.sin(a) * Math.cos(b) * r,
      (s2 * 2 - 1) * HALF * 0.85,
      Math.cos(a) * Math.cos(b) * r * 0.9,
    );
    out.x += Math.sin(t * 0.22 + s1 * 9.0) * 0.03;
    out.y += Math.cos(t * 0.18 + s2 * 7.0) * 0.025;
  } else if (mode < 1.5) {
    const cluster = Math.floor(s1 * 3) % 3;
    const cx = cluster === 0 ? -0.22 : cluster === 1 ? 0.2 : 0.02;
    const cy = cluster === 0 ? 0.12 : cluster === 1 ? -0.08 : 0.18;
    const cz = cluster === 0 ? 0.1 : cluster === 1 ? -0.16 : -0.22;
    const spread = 0.1 + s2 * 0.08;
    const a = s3 * Math.PI * 2 + t * 0.15;
    out.set(
      cx + Math.cos(a) * spread * (0.5 + s1 * 0.5),
      cy + Math.sin(a * 1.3) * spread * 0.7,
      cz + Math.sin(a) * spread * (0.5 + s2 * 0.5),
    );
  } else if (mode < 2.5) {
    const g = 7;
    const gx = (Math.floor(s1 * g) + 0.5) / g - 0.5;
    const gy = (Math.floor(s2 * g) + 0.5) / g - 0.5;
    const gz = (Math.floor(s3 * g) + 0.5) / g - 0.5;
    const jitter = 0.018;
    const breath = 1 + 0.02 * Math.sin(t * 0.35 + s1 * 4.0);
    out.set(
      (gx * CUBE * 0.82 + (s1 - 0.5) * jitter) * breath,
      (gy * CUBE * 0.82 + (s2 - 0.5) * jitter) * breath,
      (gz * CUBE * 0.82 + (s3 - 0.5) * jitter) * breath,
    );
  } else if (mode < 3.5) {
    if (s3 > 0.72) {
      const sa = s1 * Math.PI * 2;
      const sr = 0.22 + s2 * 0.2;
      out.set(Math.cos(sa) * sr, (s2 - 0.5) * CUBE * 0.7, Math.sin(sa) * sr);
    } else {
      const turns = 3.2;
      const angle = u * Math.PI * 2 * turns + t * 0.25;
      const radius = 0.08 + (1 - u) * 0.28 * (0.6 + s2 * 0.4);
      const y = (u - 0.5) * CUBE * 0.78;
      out.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  } else if (mode < 4.5) {
    const arms = 3;
    const maxR = HALF * 0.9;
    const spin = t * 0.16;

    if (s3 > 0.9) {
      const ha = s1 * Math.PI * 2;
      const hb = (s2 - 0.5) * Math.PI;
      const hr = Math.pow(0.2 + s1 * 0.8, 0.55) * maxR * 0.72;
      out.set(
        Math.cos(ha) * Math.cos(hb) * hr,
        Math.sin(hb) * hr * 0.55,
        Math.sin(ha) * Math.cos(hb) * hr,
      );
    } else if (s3 < 0.14) {
      const br = Math.pow(s2, 0.55) * 0.085;
      const ba = s1 * Math.PI * 2 + spin * 1.4;
      const bh = (s3 - 0.07) * 0.22;
      out.set(Math.cos(ba) * br, bh, Math.sin(ba) * br);
    } else {
      const arm = Math.floor(s1 * arms) % arms;
      const radius = Math.pow(0.04 + s2 * 0.96, 0.62) * maxR;
      const wind = 2.85;
      const armPhase = (arm / arms) * Math.PI * 2;
      const theta =
        armPhase +
        Math.log(1.0 + radius * 9.0) * wind +
        spin +
        (s3 - 0.5) * (0.1 + radius * 0.22);
      const diskH =
        (s1 - 0.5) * (0.028 + (1.0 - radius / maxR) * 0.055) +
        Math.sin(theta * 2.0 + s2 * 4.0) * 0.008 * radius;
      const x = Math.cos(theta) * radius;
      const y = diskH;
      const z = Math.sin(theta) * radius;
      const tilt = 0.42;
      const cy = Math.cos(tilt);
      const sy = Math.sin(tilt);
      out.set(x * 0.96, y * cy - z * sy, (y * sy + z * cy) * 0.96);
    }
  } else {
    // Dominant trajectory corridor — mass concentrates along one path.
    const pathT = u * 0.92 + s1 * 0.06;
    const angle = pathT * Math.PI * 1.6;
    const px = Math.sin(angle * 1.1) * 0.28;
    const py = (pathT - 0.5) * CUBE * 0.72;
    const pz = Math.cos(angle * 0.9) * 0.24;
    const tx = -Math.cos(angle * 1.1);
    const ty = 0.15;
    const tz = Math.sin(angle * 0.9);
    const tLen = Math.hypot(tx, ty, tz) || 1;
    const tnx = tx / tLen;
    const tny = ty / tLen;
    const tnz = tz / tLen;
    let bx = -tnz;
    let by = 0;
    let bz = tnx;
    const bLen = Math.hypot(bx, by, bz) || 1;
    bx /= bLen;
    by /= bLen;
    bz /= bLen;
    const radial = (s2 - 0.5) * 0.1 * (1.05 - pathT);
    const along = (s3 - 0.5) * 0.035;
    out.set(
      px + bx * radial + tnx * along,
      py + by * radial + tny * along,
      pz + bz * radial + tnz * along,
    );
  }

  return clampInside(out, 0.05);
}

/** Scatter target for the free-fall beat between worlds. */
function scatterTarget(seed: number, t: number, out: THREE.Vector3) {
  const s1 = seed;
  const s2 = (seed * 1.6180339887) % 1;
  const s3 = (seed * 2.718281828) % 1;
  const a = s1 * Math.PI * 2 + t * 0.7;
  const b = s2 * Math.PI * 2 - t * 0.45;
  const r = (0.2 + s3 * 0.75) * HALF * 0.95;
  out.set(
    Math.sin(a) * Math.cos(b) * r,
    (s2 * 2 - 1) * HALF * 0.88 + Math.sin(t * 1.1 + s1 * 8.0) * 0.04,
    Math.cos(a) * Math.cos(b) * r,
  );
  return clampInside(out, 0.04);
}

function trajPoint(t: number, phase: number, out: THREE.Vector3) {
  const angle = t * Math.PI * 1.6 + phase * 0.4;
  out.set(
    Math.sin(angle * 1.1) * 0.28,
    (t - 0.5) * CUBE * 0.72,
    Math.cos(angle * 0.9) * 0.24,
  );
  return clampInside(out, 0.08);
}

/** Offset a path sample onto a braid filament. */
function trajFilament(t: number, phase: number, fil: number, fray: number, out: THREE.Vector3) {
  trajPoint(t, phase, out);
  const angle = t * Math.PI * 1.6 + phase * 0.4;
  const tx = -Math.cos(angle * 1.1);
  const ty = 0.15;
  const tz = Math.sin(angle * 0.9);
  const tLen = Math.hypot(tx, ty, tz) || 1;
  let bx = -tz / tLen;
  let by = 0;
  let bz = tx / tLen;
  const bLen = Math.hypot(bx, by, bz) || 1;
  bx /= bLen;
  bz /= bLen;
  const amp = (0.012 + fil * 0.014) * (1 + fray * 3.5 * t);
  const wave = Math.sin(t * 14.0 + fil * 2.1 + phase) * amp;
  const wave2 = Math.cos(t * 9.0 - fil * 1.7) * amp * 0.45;
  out.x += bx * wave + (tx / tLen) * wave2 * 0.3;
  out.y += by * wave + ty * wave2 * 0.2;
  out.z += bz * wave + (tz / tLen) * wave2 * 0.3;
  return clampInside(out, 0.06);
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
    const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    const rand = mulberry32(20260721);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(1.55, 1.05, 2.05);
    camera.lookAt(0, 0.02, 0);

    const envMap = createGlassEnvironment(renderer);
    scene.environment = envMap;

    const world = new THREE.Group();
    scene.add(world);

    // --- Real glass cube shell ---
    const shell = new THREE.Group();
    world.add(shell);

    const boxGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const outerGlassGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE, 1, 1, 1);
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
    const innerEdges = new THREE.LineSegments(innerEdgesGeo, innerEdgeMat);
    innerEdges.renderOrder = 5;
    shell.add(innerEdges);

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

    // --- Volume haze (soft density orbs) ---
    const hazeGroup = new THREE.Group();
    hazeGroup.renderOrder = 0;
    world.add(hazeGroup);
    const hazeSphereGeo = new THREE.SphereGeometry(1, 20, 16);
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
        side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(hazeSphereGeo, mat);
      mesh.scale.setScalar(0.12);
      mesh.visible = false;
      hazeGroup.add(mesh);
      hazeMeshes.push(mesh);
      hazeMats.push(mat);
    }

    // --- Particle field ---
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brights = new Float32Array(count);
    const seeds = new Float32Array(count);
    const tmp = new THREE.Vector3();
    const target = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const scatter = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const s = rand();
      seeds[i] = s;
      sizes[i] = 0.008 + rand() * 0.016;
      brights[i] = 0.25 + rand() * 0.55;
      targetFor(0, s, i, count, 0, tmp);
      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    pGeo.setAttribute('aBright', new THREE.BufferAttribute(brights, 1));
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    points.renderOrder = 1;
    world.add(points);

    // --- Dominant trajectory + braid filaments ---
    const trajVertCount = TRAJ_POINTS * FILAMENT_COUNT;
    const trajPositions = new Float32Array(trajVertCount * 3);
    const trajAlong = new Float32Array(trajVertCount);
    const trajFil = new Float32Array(trajVertCount);
    const trajIndices: number[] = [];
    for (let f = 0; f < FILAMENT_COUNT; f++) {
      for (let i = 0; i < TRAJ_POINTS; i++) {
        const idx = f * TRAJ_POINTS + i;
        trajAlong[idx] = i / (TRAJ_POINTS - 1);
        trajFil[idx] = f / Math.max(FILAMENT_COUNT - 1, 1);
        trajFilament(trajAlong[idx], 0, f, 0, tmp);
        trajPositions[idx * 3] = tmp.x;
        trajPositions[idx * 3 + 1] = tmp.y;
        trajPositions[idx * 3 + 2] = tmp.z;
        if (i < TRAJ_POINTS - 1) {
          trajIndices.push(idx, idx + 1);
        }
      }
    }
    const trajGeo = new THREE.BufferGeometry();
    trajGeo.setAttribute('position', new THREE.BufferAttribute(trajPositions, 3));
    trajGeo.setAttribute('aAlong', new THREE.BufferAttribute(trajAlong, 1));
    trajGeo.setAttribute('aFil', new THREE.BufferAttribute(trajFil, 1));
    trajGeo.setIndex(trajIndices);
    const trajMat = new THREE.ShaderMaterial({
      uniforms: {
        uFade: { value: 0 },
        uPulse: { value: 0 },
        uFray: { value: 0 },
      },
      vertexShader: trajVertex,
      fragmentShader: trajFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const trajectory = new THREE.LineSegments(trajGeo, trajMat);
    trajectory.renderOrder = 2;
    world.add(trajectory);

    // Soft path head point.
    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const headMat = new THREE.PointsMaterial({
      color: 0xfff0d0,
      size: 0.055,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const headPoint = new THREE.Points(headGeo, headMat);
    headPoint.renderOrder = 2;
    world.add(headPoint);

    const ambient = new THREE.AmbientLight(0x6a88aa, 0.28);
    scene.add(ambient);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.simulationRender = 'glass-cube';
    mount.appendChild(renderer.domElement);

    let frameId: number | null = null;
    let startedAt = performance.now();
    let visible = true;
    let lastT = performance.now();

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

    // Mode cycle: gas → clusters → lattice → helix → galaxy → dominant path.
    // Hold is longer on galaxy/path; blend is a collapse beat (detonate → free fall → reform).
    const MODE_COUNT = 6;
    const MODE_HOLD = 5.2;
    const MODE_BLEND = 1.85;
    const EPOCH = MODE_COUNT * (MODE_HOLD + MODE_BLEND);
    const PATH_MODE = 5;
    const GALAXY_MODE = 4;

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      pMat.uniforms.uPixelRatio.value = dpr;

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
      const cold = new THREE.Color(0.38, 0.62, 0.95);
      const hot = new THREE.Color(0.95, 0.82, 0.58);
      mat.uniforms.uColor.value.copy(cold).lerp(hot, warm);
    };

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const elapsed = (now - startedAt) / 1000;
      pMat.uniforms.uTime.value = elapsed;

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

      const phase = reducedMotion ? MODE_HOLD * 4.8 : elapsed % EPOCH;
      const slotLen = MODE_HOLD + MODE_BLEND;
      const modeIndex = Math.floor(phase / slotLen) % MODE_COUNT;
      const local = phase - modeIndex * slotLen;
      const modeA = modeIndex;
      const modeB = (modeIndex + 1) % MODE_COUNT;
      let blend = 0;
      if (local > MODE_HOLD) {
        blend = smoothstep(0, MODE_BLEND, local - MODE_HOLD);
      }

      // Collapse beat inside the blend: detonate → free fall → recondense.
      // 0–0.38 detonate, 0.38–0.55 scatter, 0.55–1.0 reform.
      const detonate = blend > 0 ? smoothstep(0, 0.38, blend) * (1 - smoothstep(0.38, 0.52, blend)) : 0;
      const freeFall = blend > 0 ? smoothstep(0.32, 0.48, blend) * (1 - smoothstep(0.55, 0.72, blend)) : 0;
      const reform = blend > 0 ? smoothstep(0.52, 0.95, blend) : 0;
      const chaos = Math.max(detonate, freeFall);

      // Path climax envelope + fray on exit.
      let trajFade = 0;
      let trajFray = 0;
      if (modeA === PATH_MODE) {
        // Hold full strength, fray as we leave.
        trajFade = 1 - reform * 0.95;
        trajFray = reform;
      }
      if (modeB === PATH_MODE) {
        trajFade = Math.max(trajFade, reform);
        trajFray = Math.min(trajFray, 1 - reform);
      }
      // Prefade in from galaxy collapse.
      if (modeA === GALAXY_MODE && blend > 0.5) {
        trajFade = Math.max(trajFade, (blend - 0.5) * 1.5 * reform);
      }
      trajFade = reducedMotion ? 0.65 : Math.min(Math.max(trajFade, 0), 1);
      trajMat.uniforms.uFade.value = trajFade * (1 - freeFall * 0.7);
      trajMat.uniforms.uPulse.value = (elapsed * 0.14) % 1;
      trajMat.uniforms.uFray.value = reducedMotion ? 0 : trajFray;

      const inGalaxy =
        modeA === GALAXY_MODE || modeB === GALAXY_MODE
          ? modeA === GALAXY_MODE
            ? 1 - blend
            : blend
          : 0;
      const inPath =
        modeA === PATH_MODE || modeB === PATH_MODE
          ? modeA === PATH_MODE
            ? 1 - reform
            : reform
          : 0;

      const trajPhase = Math.floor(elapsed / EPOCH);
      for (let f = 0; f < FILAMENT_COUNT; f++) {
        for (let i = 0; i < TRAJ_POINTS; i++) {
          const idx = f * TRAJ_POINTS + i;
          const tt = i / (TRAJ_POINTS - 1);
          trajFilament(tt, trajPhase * 0.7, f, trajFray, tmp);
          trajPositions[idx * 3] = tmp.x;
          trajPositions[idx * 3 + 1] = tmp.y;
          trajPositions[idx * 3 + 2] = tmp.z;
        }
      }
      trajGeo.attributes.position.needsUpdate = true;

      // Path head
      const pulse = trajMat.uniforms.uPulse.value as number;
      trajPoint(pulse, trajPhase * 0.7, tmp);
      const headArr = headGeo.attributes.position.array as Float32Array;
      headArr[0] = tmp.x;
      headArr[1] = tmp.y;
      headArr[2] = tmp.z;
      headGeo.attributes.position.needsUpdate = true;
      headMat.opacity = trajFade * (0.55 + 0.45 * (1 - trajFray));
      headMat.size = 0.04 + trajFade * 0.035;

      // --- Volume haze by mode ---
      for (let h = 0; h < HAZE_COUNT; h++) setHaze(h, 0, 0, 0, 0.1, 0);
      const hazeBoost = (1 - freeFall * 0.85) * (1 - detonate * 0.4);
      if (modeA === 0 || modeB === 0) {
        const g = modeA === 0 ? 1 - reform : reform;
        setHaze(0, 0, 0, 0, 0.42, 0.18 * g * hazeBoost, 0.1);
      }
      if (modeA === 1 || modeB === 1) {
        const g = modeA === 1 ? 1 - reform : reform;
        setHaze(0, -0.22, 0.12, 0.1, 0.2, 0.28 * g * hazeBoost, 0.2);
        setHaze(1, 0.2, -0.08, -0.16, 0.18, 0.24 * g * hazeBoost, 0.15);
        setHaze(2, 0.02, 0.18, -0.22, 0.17, 0.22 * g * hazeBoost, 0.12);
      }
      if (modeA === 2 || modeB === 2) {
        const g = modeA === 2 ? 1 - reform : reform;
        setHaze(0, 0, 0, 0, 0.38, 0.14 * g * hazeBoost, 0.05);
      }
      if (modeA === 3 || modeB === 3) {
        const g = modeA === 3 ? 1 - reform : reform;
        setHaze(0, 0, 0, 0, 0.16, 0.22 * g * hazeBoost, 0.25);
        setHaze(1, 0, 0.2, 0, 0.14, 0.14 * g * hazeBoost, 0.1);
        setHaze(2, 0, -0.2, 0, 0.14, 0.14 * g * hazeBoost, 0.1);
      }
      if (inGalaxy > 0.02) {
        setHaze(0, 0, 0, 0, 0.16, 0.42 * inGalaxy * hazeBoost, 0.55);
        setHaze(1, 0.12, 0.02, 0.08, 0.22, 0.16 * inGalaxy * hazeBoost, 0.2);
        setHaze(2, -0.14, -0.03, -0.1, 0.2, 0.14 * inGalaxy * hazeBoost, 0.15);
        setHaze(3, 0.05, -0.08, 0.16, 0.18, 0.12 * inGalaxy * hazeBoost, 0.1);
      }
      if (inPath > 0.02) {
        trajPoint(0.25, trajPhase * 0.7, _pathTmp);
        trajPoint(0.55, trajPhase * 0.7, _pathTmp2);
        trajPoint(0.8, trajPhase * 0.7, tmp);
        setHaze(0, _pathTmp.x, _pathTmp.y, _pathTmp.z, 0.14, 0.22 * inPath * hazeBoost, 0.35);
        setHaze(1, _pathTmp2.x, _pathTmp2.y, _pathTmp2.z, 0.13, 0.28 * inPath * hazeBoost, 0.45);
        setHaze(2, tmp.x, tmp.y, tmp.z, 0.12, 0.2 * inPath * hazeBoost, 0.3);
        // Head bloom
        setHaze(3, headArr[0], headArr[1], headArr[2], 0.1, 0.35 * trajFade * hazeBoost, 0.7);
      }
      // Chaos flash — brief volume bloom on detonate.
      if (detonate > 0.05) {
        setHaze(5, 0, 0, 0, 0.35 + detonate * 0.2, 0.2 * detonate, 0.4);
      }

      const posAttr = pGeo.attributes.position as THREE.BufferAttribute;
      const brightAttr = pGeo.attributes.aBright as THREE.BufferAttribute;
      const damp = 1 - Math.exp(-dt * 3.2);
      const spring = reducedMotion ? 0 : 1;
      const step = Math.min(dt, 0.033);
      const drag = Math.exp(-3.2 * step);

      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const ix = i * 3;

        // Formation targets with collapse beat.
        targetFor(modeA, s, i, count, elapsed, pos);
        if (reform > 0.001) {
          targetFor(modeB, s, i, count, elapsed, target);
          pos.lerp(target, reform);
        }
        if (detonate > 0.001) {
          // Detonate: fling outward from formation center of mass (origin-ish).
          const burst = 1 + detonate * (0.55 + s * 0.45);
          pos.x *= burst;
          pos.y *= burst;
          pos.z *= burst;
          pos.x += (s - 0.5) * detonate * 0.2;
          pos.y += (((s * 1.7) % 1) - 0.5) * detonate * 0.2;
          pos.z += (((s * 2.3) % 1) - 0.5) * detonate * 0.2;
          clampInside(pos, 0.04);
        }
        if (freeFall > 0.001) {
          scatterTarget(s, elapsed + modeIndex * 3.1, scatter);
          pos.lerp(scatter, freeFall);
        }

        // Path climax: hard magnetize onto corridor; fray on exit.
        if (inPath > 0.02) {
          const pathT = Math.min(Math.max((positions[ix + 1] / (CUBE * 0.72) + 0.5) * 0.85 + s * 0.12, 0), 1);
          trajPoint(pathT, trajPhase * 0.7, target);
          const magnet = inPath * (0.55 + (1 - trajFray) * 0.4);
          pos.lerp(target, magnet);
          if (trajFray > 0.05) {
            // Unravel: splay off the spine.
            const splay = trajFray * (0.08 + s * 0.12);
            pos.x += (s - 0.5) * splay * 2.2;
            pos.y += (((s * 1.3) % 1) - 0.5) * splay;
            pos.z += (((s * 2.1) % 1) - 0.5) * splay * 2.2;
          }
          clampInside(pos, 0.05);
        }

        let px = positions[ix];
        let py = positions[ix + 1];
        let pz = positions[ix + 2];
        let vx = velocities[ix];
        let vy = velocities[ix + 1];
        let vz = velocities[ix + 2];

        if (spring) {
          const aMul =
            1 +
            inGalaxy * 0.4 +
            inPath * 0.55 +
            reform * 0.35 +
            detonate * 0.2 -
            freeFall * 0.25;
          const nMul = Math.max(0.15, 1 - inGalaxy * 0.55 - inPath * 0.4 + freeFall * 0.9 + detonate * 0.5);
          const attract = 6.8 * aMul;
          vx = (vx + (pos.x - px) * attract * step) * drag;
          vy = (vy + (pos.y - py) * attract * step) * drag;
          vz = (vz + (pos.z - pz) * attract * step) * drag;
          vx += Math.sin(elapsed * 0.9 + s * 20.0) * 0.14 * nMul * step;
          vy += Math.cos(elapsed * 0.7 + s * 17.0) * 0.12 * nMul * step;
          vz += Math.sin(elapsed * 0.6 + s * 13.0) * 0.14 * nMul * step;
          // Detonate impulse once per particle direction.
          if (detonate > 0.2 && detonate < 0.85) {
            const impulse = detonate * 0.35 * step * 8;
            vx += px * impulse;
            vy += py * impulse;
            vz += pz * impulse;
          }
          px += vx;
          py += vy;
          pz += vz;
        } else {
          px += (pos.x - px) * damp;
          py += (pos.y - py) * damp;
          pz += (pos.z - pz) * damp;
          vx = 0;
          vy = 0;
          vz = 0;
        }

        const lim = HALF - 0.03;
        if (px > lim || px < -lim) {
          px = Math.min(Math.max(px, -lim), lim);
          vx *= -0.28;
        }
        if (py > lim || py < -lim) {
          py = Math.min(Math.max(py, -lim), lim);
          vy *= -0.28;
        }
        if (pz > lim || pz < -lim) {
          pz = Math.min(Math.max(pz, -lim), lim);
          vz *= -0.28;
        }

        positions[ix] = px;
        positions[ix + 1] = py;
        positions[ix + 2] = pz;
        velocities[ix] = vx;
        velocities[ix + 1] = vy;
        velocities[ix + 2] = vz;

        let b = 0.2 + s * 0.42;
        // Depth cue: slightly dim farther particles (view-ish using -z bias in world).
        b *= 0.88 + 0.12 * ((pz + HALF) / CUBE);

        if (trajFade > 0.04) {
          const pathT = Math.min(Math.max(py / (CUBE * 0.72) + 0.5, 0), 1);
          trajPoint(pathT, trajPhase * 0.7, _pathTmp);
          const dx = px - _pathTmp.x;
          const dy = py - _pathTmp.y;
          const dz = pz - _pathTmp.z;
          const dist2 = dx * dx + dy * dy + dz * dz;
          b += Math.exp(-dist2 / 0.015) * 0.75 * trajFade * (1 - trajFray * 0.5);
          b += Math.exp(-dist2 / 0.06) * 0.2 * trajFade;
        }
        if (modeA === 1 || modeB === 1) {
          b += 0.08 * (modeA === 1 ? 1 - reform : reform);
        }
        if (inGalaxy > 0.02) {
          const coreR2 = px * px + py * py * 1.4 + pz * pz;
          b += Math.exp(-coreR2 / 0.012) * 0.75 * inGalaxy;
          b += Math.exp(-coreR2 / 0.08) * 0.2 * inGalaxy;
          if (coreR2 > 0.22) b *= 1 - 0.2 * inGalaxy;
        }
        // Chaos flash
        b += detonate * 0.2 + freeFall * 0.06;
        // Soft floor shadow: dim lower half slightly.
        b *= 0.92 + 0.08 * ((py + HALF) / CUBE);

        brights[i] = Math.min(b, 1.25);
      }

      posAttr.needsUpdate = true;
      brightAttr.needsUpdate = true;

      // Glass reacts to interior energy (path / detonate).
      const interiorHeat = trajFade * 0.55 + detonate * 0.35 + inGalaxy * 0.15;
      glassMat.roughness = 0.03 + 0.02 * Math.sin(elapsed * 0.2) + pointer.glow * 0.01;
      glassMat.envMapIntensity = 1.05 + pointer.glow * 0.25 + interiorHeat * 0.45;
      glassMat.clearcoatRoughness = 0.05 + (1 - interiorHeat) * 0.04;
      innerGlassMat.envMapIntensity = 0.5 + pointer.glow * 0.12 + interiorHeat * 0.2;
      edgeMat.opacity = 0.48 + 0.12 * pointer.glow + 0.18 * trajFade + 0.1 * detonate;
      innerEdgeMat.opacity = 0.18 + 0.06 * pointer.glow + 0.08 * interiorHeat;
      (corners.material as THREE.PointsMaterial).opacity =
        0.55 + 0.25 * pointer.glow + 0.2 * trajFade + 0.15 * detonate;

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
          lastT = performance.now();
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
      startedAt -= 22_000;
      render();
    } else {
      animate();
    }

    window.requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
    });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (card) {
        card.removeEventListener('pointermove', onPointerMove as EventListener);
        card.removeEventListener('pointerleave', onPointerLeave);
      }
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
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
        trajGeo.dispose();
        trajMat.dispose();
        headGeo.dispose();
        headMat.dispose();
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

  return <div ref={mountRef} className="hermes-render-host" />;
}
