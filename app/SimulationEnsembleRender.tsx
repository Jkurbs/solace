'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Homepage Simulation plate: a self-contained glass cube laboratory.
// Distinct motion vocabulary from Hermes (liquidity field) and Oracle (futures fan).
// Nothing enters or leaves — possibility reorganizes only inside the box.
// The shell is real physical glass (transmission / IOR / thickness), not a fresnel sketch.

const CUBE = 1.0;
const HALF = CUBE * 0.5;
const PARTICLE_COUNT_DESKTOP = 5200;
const PARTICLE_COUNT_MOBILE = 2800;
const TRAJ_POINTS = 96;

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

  // Key strip light (top-front) — primary specular edge on glass.
  addPanel(0xffffff, [1.2, 2.6, 2.0], [5.5, 0.35], [-0.7, 0.25, 0]);
  // Cool fill (left)
  addPanel(0x6a9ad4, [-2.8, 0.6, 0.4], [1.4, 3.2], [0, 1.1, 0]);
  // Soft warm rim (back-right) — barely there, keeps glass alive in rotation.
  addPanel(0xb8a078, [2.2, 0.2, -2.4], [2.2, 1.6], [0.2, -0.5, 0]);
  // Ground bounce (very dim)
  addPanel(0x1a2838, [0, -2.4, 0.5], [6, 6], [-Math.PI / 2, 0, 0]);
  // Small hard spark for crystal corners
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
    // Cool laboratory palette; denser / brighter cores go slightly warm.
    vec3 cold = vec3(0.45, 0.72, 0.98);
    vec3 mid = vec3(0.72, 0.88, 1.0);
    vec3 warm = vec3(0.98, 0.9, 0.72);
    vec3 col = mix(cold, mid, smoothstep(0.25, 0.75, vBright));
    col = mix(col, warm, smoothstep(0.7, 1.0, vBright) * 0.55);
    col *= 0.92 + 0.08 * sin(vSeed * 40.0);
    gl_FragColor = vec4(col, a);
  }
`;

const trajVertex = `
  attribute float aAlong;
  varying float vAlong;
  void main() {
    vAlong = aAlong;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trajFragment = `
  precision highp float;
  varying float vAlong;
  uniform float uFade;
  uniform float uPulse;

  void main() {
    float life = smoothstep(0.0, 0.08, vAlong) * (1.0 - smoothstep(0.88, 1.0, vAlong));
    float head = exp(-pow(vAlong - uPulse, 2.0) / 0.01);
    vec3 col = mix(vec3(0.4, 0.7, 0.95), vec3(1.0, 0.92, 0.75), head);
    float a = (0.35 * life + 0.55 * head) * uFade;
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
  // Decorrelate seed into three channels without allocating.
  const s1 = seed;
  const s2 = (seed * 1.6180339887) % 1;
  const s3 = (seed * 2.718281828) % 1;

  if (mode < 0.5) {
    // Diffuse probability gas.
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
    // Three coalescing clusters (hypothesis basins).
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
    // Lattice / crystal of possible states.
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
    // Spiral / helical structure collapsing toward an axis.
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
  } else {
    // Dominant trajectory corridor — mass concentrates along one path.
    const pathT = u * 0.92 + s1 * 0.06;
    const angle = pathT * Math.PI * 1.6;
    const px = Math.sin(angle * 1.1) * 0.28;
    const py = (pathT - 0.5) * CUBE * 0.72;
    const pz = Math.cos(angle * 0.9) * 0.24;
    // Orthonormal offset in the path's normal plane (no heap alloc).
    const tx = -Math.cos(angle * 1.1);
    const ty = 0.15;
    const tz = Math.sin(angle * 0.9);
    const tLen = Math.hypot(tx, ty, tz) || 1;
    const tnx = tx / tLen;
    const tny = ty / tLen;
    const tnz = tz / tLen;
    // bitangent ≈ tangent × up
    let bx = tny * 0 - tnz * 1;
    let by = tnz * 0 - tnx * 0;
    let bz = tnx * 1 - tny * 0;
    const bLen = Math.hypot(bx, by, bz) || 1;
    bx /= bLen;
    by /= bLen;
    bz /= bLen;
    const radial = (s2 - 0.5) * 0.12 * (1.1 - pathT);
    const along = (s3 - 0.5) * 0.04;
    out.set(
      px + bx * radial + tnx * along,
      py + by * radial + tny * along,
      pz + bz * radial + tnz * along,
    );
  }

  return clampInside(out, 0.05);
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

    // --- Real glass cube shell (physical transmission) ---
    const shell = new THREE.Group();
    world.add(shell);

    const boxGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    // Slightly higher segment count so refraction/speculars don't faceted-look on edges.
    const outerGlassGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE, 1, 1, 1);
    const innerGlassGeo = new THREE.BoxGeometry(CUBE * 0.965, CUBE * 0.965, CUBE * 0.965);

    const glassMat = createGlassMaterial(envMap, { thickness: 0.62, transmission: 1 });
    const glassMesh = new THREE.Mesh(outerGlassGeo, glassMat);
    glassMesh.renderOrder = 2;
    shell.add(glassMesh);

    // Inner surface: reads as pane thickness when the cube turns (aquarium glass).
    const innerGlassMat = createGlassMaterial(envMap, { thickness: 0.18, transmission: 0.92 });
    innerGlassMat.side = THREE.BackSide;
    innerGlassMat.envMapIntensity = 0.55;
    innerGlassMat.roughness = 0.08;
    innerGlassMat.opacity = 0.55;
    const innerGlassMesh = new THREE.Mesh(innerGlassGeo, innerGlassMat);
    innerGlassMesh.renderOrder = 2;
    shell.add(innerGlassMesh);

    const edgesGeo = new THREE.EdgesGeometry(boxGeo, 15);
    const edgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xd0e4f8),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(edgesGeo, edgeMat);
    edges.renderOrder = 4;
    shell.add(edges);

    // Inner edge double for optical thickness.
    const innerEdgesGeo = new THREE.EdgesGeometry(innerGlassGeo, 15);
    const innerEdgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x7aa0c4),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const innerEdges = new THREE.LineSegments(innerEdgesGeo, innerEdgeMat);
    innerEdges.renderOrder = 4;
    shell.add(innerEdges);

    // Soft corner catches — physical glass still benefits from a whisper of point glints.
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
    corners.renderOrder = 5;
    shell.add(corners);

    // --- Particle field ---
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brights = new Float32Array(count);
    const seeds = new Float32Array(count);
    const tmp = new THREE.Vector3();
    const target = new THREE.Vector3();
    const pos = new THREE.Vector3();

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
    // Particles first; glass shell over them so transmission refracts the field.
    points.renderOrder = 1;
    world.add(points);

    // --- Dominant trajectory (emerges in mode 4, fades otherwise) ---
    const trajPositions = new Float32Array(TRAJ_POINTS * 3);
    const trajAlong = new Float32Array(TRAJ_POINTS);
    for (let i = 0; i < TRAJ_POINTS; i++) {
      trajAlong[i] = i / (TRAJ_POINTS - 1);
      trajPoint(trajAlong[i], 0, tmp);
      trajPositions[i * 3] = tmp.x;
      trajPositions[i * 3 + 1] = tmp.y;
      trajPositions[i * 3 + 2] = tmp.z;
    }
    const trajGeo = new THREE.BufferGeometry();
    trajGeo.setAttribute('position', new THREE.BufferAttribute(trajPositions, 3));
    trajGeo.setAttribute('aAlong', new THREE.BufferAttribute(trajAlong, 1));
    const trajMat = new THREE.ShaderMaterial({
      uniforms: {
        uFade: { value: 0 },
        uPulse: { value: 0 },
      },
      vertexShader: trajVertex,
      fragmentShader: trajFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const trajectory = new THREE.Line(trajGeo, trajMat);
    trajectory.renderOrder = 1;
    world.add(trajectory);

    // Studio lights for clearcoat / specular response on the physical glass.
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

    // Mode cycle: gas → clusters → lattice → helix → dominant path → dissolve.
    const MODE_COUNT = 5;
    const MODE_HOLD = 5.8;
    const MODE_BLEND = 1.6;
    const EPOCH = MODE_COUNT * (MODE_HOLD + MODE_BLEND);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      pMat.uniforms.uPixelRatio.value = dpr;

      // Keep cube framed with a little air; bias left on wide plates for copy.
      const aspect = width / height;
      const dist = aspect < 1 ? 3.35 : 2.85;
      camera.position.set(dist * 0.72, dist * 0.48, dist * 0.95);
      camera.lookAt(aspect < 1.1 ? 0 : -0.05, 0.02, 0);
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

      // Slow laboratory turn + pointer lean.
      if (!reducedMotion) {
        world.rotation.y = elapsed * 0.045 + pointer.x * 0.18 * pointer.glow;
        world.rotation.x = 0.22 + Math.sin(elapsed * 0.11) * 0.03 + pointer.y * 0.1 * pointer.glow;
        world.rotation.z = Math.sin(elapsed * 0.07) * 0.02;
      } else {
        world.rotation.y = 0.55;
        world.rotation.x = 0.25;
      }

      // Mode timeline.
      const phase = reducedMotion ? MODE_HOLD * 2.2 : elapsed % EPOCH;
      const slot = phase / (MODE_HOLD + MODE_BLEND);
      const modeIndex = Math.floor(slot) % MODE_COUNT;
      const local = phase - modeIndex * (MODE_HOLD + MODE_BLEND);
      let modeA = modeIndex;
      let modeB = (modeIndex + 1) % MODE_COUNT;
      let blend = 0;
      if (local > MODE_HOLD) {
        blend = smoothstep(0, MODE_BLEND, local - MODE_HOLD);
      }

      // Trajectory visible mainly in dominant-path mode.
      let trajFade = 0;
      if (modeA === 4) trajFade = 1 - blend * 0.85;
      if (modeB === 4) trajFade = Math.max(trajFade, blend);
      if (modeA === 3 && blend > 0.5) trajFade = Math.max(trajFade, (blend - 0.5) * 1.4);
      trajMat.uniforms.uFade.value = reducedMotion ? 0.55 : Math.min(trajFade, 1);
      trajMat.uniforms.uPulse.value = (elapsed * 0.12) % 1;

      // Update trajectory curve gently each frame (same analytic path).
      const trajPhase = Math.floor(elapsed / EPOCH);
      for (let i = 0; i < TRAJ_POINTS; i++) {
        const tt = i / (TRAJ_POINTS - 1);
        trajPoint(tt, trajPhase * 0.7, tmp);
        trajPositions[i * 3] = tmp.x;
        trajPositions[i * 3 + 1] = tmp.y;
        trajPositions[i * 3 + 2] = tmp.z;
      }
      trajGeo.attributes.position.needsUpdate = true;

      // Particles seek blended formation targets; stay strictly inside the cube.
      const posAttr = pGeo.attributes.position as THREE.BufferAttribute;
      const brightAttr = pGeo.attributes.aBright as THREE.BufferAttribute;
      const damp = 1 - Math.exp(-dt * 3.2);
      const spring = reducedMotion ? 0 : 1;

      const step = Math.min(dt, 0.033);
      const attract = 6.5;
      const drag = Math.exp(-3.4 * step);

      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const ix = i * 3;
        targetFor(modeA, s, i, count, elapsed, pos);
        if (blend > 0.001) {
          targetFor(modeB, s, i, count, elapsed, target);
          pos.lerp(target, blend);
        }

        let px = positions[ix];
        let py = positions[ix + 1];
        let pz = positions[ix + 2];
        let vx = velocities[ix];
        let vy = velocities[ix + 1];
        let vz = velocities[ix + 2];

        if (spring) {
          vx = (vx + (pos.x - px) * attract * step) * drag;
          vy = (vy + (pos.y - py) * attract * step) * drag;
          vz = (vz + (pos.z - pz) * attract * step) * drag;
          // Soft turbulence so it never freezes into a static diagram.
          vx += Math.sin(elapsed * 0.9 + s * 20.0) * 0.12 * step;
          vy += Math.cos(elapsed * 0.7 + s * 17.0) * 0.1 * step;
          vz += Math.sin(elapsed * 0.6 + s * 13.0) * 0.12 * step;
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

        // Hard box constraint — nothing leaves the laboratory.
        const lim = HALF - 0.03;
        if (px > lim || px < -lim) {
          px = Math.min(Math.max(px, -lim), lim);
          vx *= -0.25;
        }
        if (py > lim || py < -lim) {
          py = Math.min(Math.max(py, -lim), lim);
          vy *= -0.25;
        }
        if (pz > lim || pz < -lim) {
          pz = Math.min(Math.max(pz, -lim), lim);
          vz *= -0.25;
        }

        positions[ix] = px;
        positions[ix + 1] = py;
        positions[ix + 2] = pz;
        velocities[ix] = vx;
        velocities[ix + 1] = vy;
        velocities[ix + 2] = vz;

        // Brighten particles near the dominant trajectory during path mode.
        let b = 0.22 + s * 0.45;
        if (trajFade > 0.05) {
          trajPoint(Math.min(Math.max(py / (CUBE * 0.72) + 0.5, 0), 1), trajPhase * 0.7, _pathTmp);
          const dx = px - _pathTmp.x;
          const dy = py - _pathTmp.y;
          const dz = pz - _pathTmp.z;
          const dist2 = dx * dx + dy * dy + dz * dz;
          b += Math.exp(-dist2 / 0.02) * 0.55 * trajFade;
        }
        if (modeA === 1 || modeB === 1) {
          b += 0.08 * (modeA === 1 ? 1 - blend : blend);
        }
        brights[i] = Math.min(b, 1.15);
      }

      posAttr.needsUpdate = true;
      brightAttr.needsUpdate = true;

      // Glass stays mostly still; edges brighten slightly under attention / path climax.
      const glassLive = 0.04 * Math.sin(elapsed * 0.2);
      glassMat.roughness = 0.035 + glassLive * 0.5 + pointer.glow * 0.01;
      glassMat.envMapIntensity = 1.05 + pointer.glow * 0.25 + trajFade * 0.15;
      innerGlassMat.envMapIntensity = 0.5 + pointer.glow * 0.12;
      edgeMat.opacity = 0.48 + 0.12 * pointer.glow + 0.1 * trajFade;
      innerEdgeMat.opacity = 0.18 + 0.06 * pointer.glow;
      (corners.material as THREE.PointsMaterial).opacity = 0.55 + 0.25 * pointer.glow + 0.1 * trajFade;

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
      startedAt -= 14_000;
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
        pGeo.dispose();
        pMat.dispose();
        trajGeo.dispose();
        trajMat.dispose();
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
