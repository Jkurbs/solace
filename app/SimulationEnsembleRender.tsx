// app/simulation-ensemble.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const CUBE = 1.0;
const PARTICLES = 1800;
const WORLD_SCENARIOS = [
  { label: 'Bull Run', detail: 'Markets surge. Capital deploys across high-beta positions.' },
  { label: 'Black Swan', detail: 'Sudden collapse. Liquidity vanishes. Correlation goes to 1.' },
  { label: 'Regime Shift', detail: 'Policy pivots. Rates, currencies, and flows reprice overnight.' },
  { label: 'Stagnation', detail: 'Growth stalls. Volatility compresses. Opportunity cost rises.' },
  { label: 'Recovery', detail: 'Confidence returns. Asymmetric setups emerge from the wreckage.' },
  { label: 'Euphoria', detail: 'Momentum feeds on itself. The system tests its own limits.' },
];

export default function SimulationEnsemble() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Renderer with tone mapping for bloom prep
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    // Post-processing (Bloom)
    let composer: any;
    try {
      const { EffectComposer } = require('three/addons/postprocessing/EffectComposer.js');
      const { RenderPass } = require('three/addons/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = require('three/addons/postprocessing/UnrealBloomPass.js');
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        0.5,   // strength
        0.4,   // radius
        0.85,  // threshold
      );
      composer.addPass(bloom);
    } catch {
      // Fallback if addons not available
      composer = null;
    }

    // Environment map for reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x020408);
    const envLight = new THREE.DirectionalLight(0xffffff, 2);
    envLight.position.set(1, 1, 1);
    envScene.add(envLight);
    const envMap = pmrem.fromScene(envScene).texture;

    // World group
    const world = new THREE.Group();
    scene.add(world);

    // Shell group (glass cube)
    const shell = new THREE.Group();
    world.add(shell);

    // Glass cube
    const glassGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x050a14,
      metalness: 0.05,
      roughness: 0.08,
      transmission: 0.92,
      thickness: 0.6,
      ior: 1.52,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      envMap,
      envMapIntensity: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.renderOrder = 3;
    shell.add(glass);

    // Inner glow plane
    const glowGeo = new THREE.PlaneGeometry(CUBE * 0.85, CUBE * 0.85);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0a1a2e,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = 0.01;
    glow.renderOrder = 1;
    shell.add(glow);

    // Specimen label etched into glass
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const lctx = labelCanvas.getContext('2d')!;
    lctx.fillStyle = 'rgba(200, 220, 255, 0.12)';
    lctx.font = '500 22px SF Mono, monospace';
    lctx.fillText('SIMULATION ENSEMBLE · ACTIVE', 20, 55);
    lctx.fillStyle = 'rgba(200, 220, 255, 0.08)';
    lctx.font = '500 16px SF Mono, monospace';
    lctx.fillText('DECISION MATRIX: UNRESOLVED', 20, 90);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.19), labelMat);
    labelMesh.position.set(0, -0.38, 0.505);
    labelMesh.renderOrder = 7;
    shell.add(labelMesh);

    // Crack overlay for stress visualization
    const crackCanvas = document.createElement('canvas');
    crackCanvas.width = 512;
    crackCanvas.height = 512;
    const cctx = crackCanvas.getContext('2d')!;
    cctx.strokeStyle = 'rgba(255, 200, 150, 0.3)';
    cctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const x = 256 + (Math.random() - 0.5) * 400;
      const y = 256 + (Math.random() - 0.5) * 400;
      cctx.beginPath();
      cctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        cctx.lineTo(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 80);
      }
      cctx.stroke();
    }
    const crackTexture = new THREE.CanvasTexture(crackCanvas);
    const crackMat = new THREE.MeshBasicMaterial({
      map: crackTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(CUBE * 1.005, CUBE * 1.005, CUBE * 1.005), crackMat);
    crackMesh.renderOrder = 8;
    shell.add(crackMesh);

    // Edges with pulse capability
    const edges = new THREE.EdgesGeometry(glassGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x6a9ad4),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMat);
    edgeLines.renderOrder = 5;
    shell.add(edgeLines);

    // Floor reflection
    const floorGeo = new THREE.PlaneGeometry(5, 5);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x020408,
      metalness: 0.95,
      roughness: 0.1,
      envMap,
      envMapIntensity: 0.3,
      transparent: true,
      opacity: 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    floor.renderOrder = 0;
    world.add(floor);

    // Particles
    const pos = new Float32Array(PARTICLES * 3);
    const vel = new Float32Array(PARTICLES * 3);
    const seed = new Float32Array(PARTICLES);
    const palette = new Float32Array(PARTICLES * 3);
    const target = new Float32Array(PARTICLES * 3);

    const celestialPalette = [
      new THREE.Color(0x6a9ad4),
      new THREE.Color(0x18f2cc),
      new THREE.Color(0xff4775),
      new THREE.Color(0xffbf33),
      new THREE.Color(0x5a7a9a),
    ];

    for (let i = 0; i < PARTICLES; i++) {
      seed[i] = Math.random();
      const x = (Math.random() - 0.5) * CUBE * 0.9;
      const y = (Math.random() - 0.5) * CUBE * 0.9;
      const z = (Math.random() - 0.5) * CUBE * 0.9;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      vel[i * 3] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;

      const color = celestialPalette[Math.floor(Math.random() * celestialPalette.length)];
      palette[i * 3] = color.r;
      palette[i * 3 + 1] = color.g;
      palette[i * 3 + 2] = color.b;

      target[i * 3] = x;
      target[i * 3 + 1] = y;
      target[i * 3 + 2] = z;
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pointGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    pointGeo.setAttribute('aColor', new THREE.BufferAttribute(palette, 3));
    pointGeo.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));

    const pointVertex = `
      attribute float aSeed;
      attribute vec3 aColor;
      attribute vec3 aTarget;
      varying float vBright;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uShapeLock;
      uniform float uFreeFall;
      uniform float uDetonate;
      uniform float uDt;

      void main() {
        vec3 p = position;
        float seed = aSeed;

        // Formation pull
        float lock = uShapeLock;
        float chaos = 1.0 - lock;
        vec3 attract = aTarget - p;
        float dist = length(attract);
        float spring = mix(0.02, 0.55, lock) * smoothstep(0.5, 0.0, dist);
        p += attract * spring;

        // Brownian drift
        float t = uTime;
        float drift = mix(0.003, 0.0003, lock);
        p += vec3(
          sin(t * (0.7 + seed * 0.6) + seed * 10.0),
          cos(t * (0.5 + seed * 0.8) + seed * 20.0),
          sin(t * (0.9 + seed * 0.4) + seed * 30.0)
        ) * drift;

        // Chaos burst
        float det = uDetonate;
        if (det > 0.01) {
          vec3 noise = vec3(
            sin(seed * 137.0 + t * 3.0),
            cos(seed * 251.0 + t * 2.5),
            sin(seed * 389.0 + t * 3.5)
          );
          p += noise * det * 0.35;
        }

        // Soft boundary
        float limit = 0.48;
        float edgeDist = max(abs(p.x), max(abs(p.y), abs(p.z)));
        if (edgeDist > limit) {
          float push = (edgeDist - limit) * 0.08;
          p = mix(p, p * (limit / edgeDist), push);
        }

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        // Decision temperature coloring
        float temp = uFreeFall * 0.5 + uDetonate * 0.5;
        vec3 coldColor = vec3(0.15, 0.95, 0.8);   // teal — resolved
        vec3 hotColor = vec3(1.0, 0.28, 0.55);    // rose — chaotic
        vec3 tempColor = mix(coldColor, hotColor, temp);
        vColor = mix(aColor, tempColor, 0.35);

        // Brightness
        float tw = 0.85 + 0.15 * sin(uTime * (0.5 + seed * 1.2) + seed * 12.0);
        float distFade = smoothstep(4.0, 1.5, -mv.z);
        float size = mix(0.012, 0.028, seed);
        gl_PointSize = size * uPixelRatio * tw * (300.0 / max(-mv.z, 0.001)) * distFade;

        vBright = tw * (0.7 + 0.3 * lock);
      }
    `;

    const pointFragment = `
      precision highp float;
      varying float vBright;
      varying vec3 vColor;
      uniform float uDetonate;

      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = length(p);
        if (d > 1.0) discard;

        // Chromatic aberration during detonate
        float ca = uDetonate * 0.06;
        float coreR = exp(-d * d * (3.2 - ca));
        float coreG = exp(-d * d * 3.2);
        float coreB = exp(-d * d * (3.2 + ca));

        float halo = exp(-d * d * 1.05) * 0.45;
        float a = (coreG + halo) * clamp(vBright, 0.15, 1.2) * 0.75;

        vec3 col = vColor * (0.65 + 0.55 * coreG);
        col = mix(col, vec3(1.0, 0.78, 0.35), smoothstep(0.95, 1.25, vBright) * 0.25);

        // Apply RGB split
        col.r *= (0.92 + coreR * 0.15);
        col.b *= (0.92 + coreB * 0.15);

        gl_FragColor = vec4(col, a);
      }
    `;

    const pointUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uShapeLock: { value: 0 },
      uFreeFall: { value: 0 },
      uDetonate: { value: 0 },
      uDt: { value: 0.016 },
    };

    const pointMat = new THREE.ShaderMaterial({
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      uniforms: pointUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(pointGeo, pointMat);
    points.renderOrder = 4;
    world.add(points);

    // Leaked particles (outside cube)
    const leakCount = 150;
    const leakPos = new Float32Array(leakCount * 3);
    const leakVel = new Float32Array(leakCount * 3);
    const leakLife = new Float32Array(leakCount);
    const leakSeed = new Float32Array(leakCount);

    for (let i = 0; i < leakCount; i++) {
      leakLife[i] = 0;
      leakSeed[i] = Math.random();
    }

    const leakGeo = new THREE.BufferGeometry();
    leakGeo.setAttribute('position', new THREE.BufferAttribute(leakPos, 3));
    leakGeo.setAttribute('aLife', new THREE.BufferAttribute(leakLife, 1));
    leakGeo.setAttribute('aSeed', new THREE.BufferAttribute(leakSeed, 1));

    const leakMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aLife;
        attribute float aSeed;
        varying float vLife;
        varying float vSeed;
        uniform float uPixelRatio;
        void main() {
          vLife = aLife;
          vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float size = 0.008 * uPixelRatio * (200.0 / max(-mv.z, 0.001));
          gl_PointSize = size * aLife;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vLife;
        varying float vSeed;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          if (length(p) > 1.0) discard;
          float core = exp(-length(p) * length(p) * 4.0);
          vec3 col = mix(vec3(1.0, 0.3, 0.2), vec3(1.0, 0.6, 0.3), vSeed);
          gl_FragColor = vec4(col, core * vLife * 0.7);
        }
      `,
      uniforms: {
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const leaks = new THREE.Points(leakGeo, leakMat);
    leaks.renderOrder = 9;
    scene.add(leaks);

    // Pointer glow
    const pointer = { x: 0, y: 0, glow: 0 };
    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.glow = 1;
    };
    container.addEventListener('mousemove', onMove);

    // Simulation state
    let scenarioIdx = 0;
    let shapeLock = 0;
    let freeFall = 0;
    let detonate = 0;
    let trajFade = 0;
    let lastTime = performance.now();

    // Formation targets
    const setFormation = (idx: number) => {
      scenarioIdx = idx;
      const scenario = WORLD_SCENARIOS[idx];

      for (let i = 0; i < PARTICLES; i++) {
        const s = seed[i];
        let tx: number, ty: number, tz: number;

        switch (scenario.label) {
          case 'Bull Run':
            tx = (s - 0.5) * CUBE * 0.85;
            ty = (s * s - 0.25) * CUBE * 0.6;
            tz = Math.sin(s * Math.PI * 2) * 0.15;
            break;
          case 'Black Swan':
            tx = (Math.random() - 0.5) * CUBE * 0.9;
            ty = (Math.random() - 0.5) * CUBE * 0.9;
            tz = (Math.random() - 0.5) * CUBE * 0.9;
            break;
          case 'Regime Shift':
            tx = (s - 0.5) * CUBE * 0.9;
            ty = Math.sin(s * Math.PI * 3) * 0.25;
            tz = (s - 0.5) * 0.3;
            break;
          case 'Stagnation':
            tx = Math.cos(s * Math.PI * 2) * 0.35;
            ty = Math.sin(s * Math.PI * 2) * 0.35;
            tz = (s - 0.5) * 0.1;
            break;
          case 'Recovery':
            tx = (s - 0.5) * CUBE * 0.7;
            ty = Math.abs(s - 0.5) * CUBE * 0.5;
            tz = Math.sin(s * Math.PI * 4) * 0.2;
            break;
          case 'Euphoria':
            tx = (s - 0.5) * CUBE * 0.95;
            ty = (s * s - 0.25) * CUBE * 0.8;
            tz = Math.cos(s * Math.PI * 3) * 0.25;
            break;
          default:
            tx = (s - 0.5) * CUBE * 0.8;
            ty = (s - 0.5) * CUBE * 0.8;
            tz = (s - 0.5) * CUBE * 0.8;
        }

        target[i * 3] = tx;
        target[i * 3 + 1] = ty;
        target[i * 3 + 2] = tz;
      }

      pointGeo.attributes.aTarget.needsUpdate = true;
      setScenarioIndex(idx);
    };

    // Cycle formations
    const cycle = () => {
      setFormation((scenarioIdx + 1) % WORLD_SCENARIOS.length);
    };

    const cycleInterval = setInterval(cycle, 10000);
    setFormation(0);

    // Resize
    const onResize = () => {
      const nw = container.offsetWidth;
      const nh = container.offsetHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      if (composer) composer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = now / 1000;

      // Phase logic
      const cycleProgress = (now % 10000) / 10000;
      const holdEnd = 0.72;
      const chaosStart = 0.78;

      if (cycleProgress < holdEnd) {
        shapeLock = THREE.MathUtils.lerp(shapeLock, 1, 0.04);
        freeFall = THREE.MathUtils.lerp(freeFall, 0, 0.06);
        detonate = THREE.MathUtils.lerp(detonate, 0, 0.08);
        trajFade = THREE.MathUtils.lerp(trajFade, 1, 0.03);
      } else if (cycleProgress < chaosStart) {
        shapeLock = THREE.MathUtils.lerp(shapeLock, 0, 0.15);
        freeFall = THREE.MathUtils.lerp(freeFall, 1, 0.2);
        detonate = THREE.MathUtils.lerp(detonate, 0, 0.1);
        trajFade = THREE.MathUtils.lerp(trajFade, 0, 0.1);
      } else {
        shapeLock = THREE.MathUtils.lerp(shapeLock, 0, 0.08);
        freeFall = THREE.MathUtils.lerp(freeFall, 0.3, 0.05);
        detonate = THREE.MathUtils.lerp(detonate, 1, 0.12);
        trajFade = THREE.MathUtils.lerp(trajFade, 0, 0.05);
      }

      // Pointer glow decay
      pointer.glow = THREE.MathUtils.lerp(pointer.glow, 0, 0.05);

      // World rotation
      world.rotation.y = Math.sin(elapsed * 0.12) * 0.15;
      world.rotation.x = Math.cos(elapsed * 0.08) * 0.08;

      // Camera breathing
      const targetDist = 3.2 + shapeLock * 0.3 - detonate * 0.4;
      const currentDist = camera.position.length();
      camera.position.normalize().multiplyScalar(
        THREE.MathUtils.lerp(currentDist, targetDist, 0.02)
      );

      // Shell rotation (independent)
      shell.rotation.y = elapsed * 0.15;
      shell.rotation.z = Math.sin(elapsed * 0.1) * 0.03;

      // Edge pulse
      const edgePulse = 0.45 + 0.15 * Math.sin(elapsed * 0.8) * shapeLock + 0.2 * trajFade;
      edgeMat.opacity = edgePulse + 0.3 * pointer.glow;
      const edgeHue = 0.58 + 0.05 * Math.sin(elapsed * 0.3);
      edgeMat.color.setHSL(edgeHue, 0.4, 0.82 + 0.1 * Math.sin(elapsed * 0.5));

      // Crack stress visualization
      crackMat.opacity = detonate * 0.25 * (0.7 + 0.3 * Math.sin(elapsed * 18));

      // Glow shift
      glowMat.opacity = 0.1 + shapeLock * 0.06 + detonate * 0.04;

      // Update particle uniforms
      pointUniforms.uTime.value = elapsed;
      pointUniforms.uShapeLock.value = shapeLock;
      pointUniforms.uFreeFall.value = freeFall;
      pointUniforms.uDetonate.value = detonate;
      pointUniforms.uDt.value = dt;

      // Update particle positions from simulation
      const positions = pointGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLES; i++) {
        const ix = i * 3;
        const px = positions[ix];
        const py = positions[ix + 1];
        const pz = positions[ix + 2];

        // Velocity integration
        positions[ix] += vel[ix];
        positions[ix + 1] += vel[ix + 1];
        positions[ix + 2] += vel[ix + 2];

        // Damping
        vel[ix] *= 0.98;
        vel[ix + 1] *= 0.98;
        vel[ix + 2] *= 0.98;

        // Formation attraction
        const tx = target[ix];
        const ty = target[ix + 1];
        const tz = target[ix + 2];
        const attractX = (tx - px) * 0.02 * shapeLock;
        const attractY = (ty - py) * 0.02 * shapeLock;
        const attractZ = (tz - pz) * 0.02 * shapeLock;

        vel[ix] += attractX;
        vel[ix + 1] += attractY;
        vel[ix + 2] += attractZ;
      }
      pointGeo.attributes.position.needsUpdate = true;

      // Leak particles
      const leakPositions = leakGeo.attributes.position.array as Float32Array;
      const leakLifes = leakGeo.attributes.aLife.array as Float32Array;

      // Spawn leaks during detonate
      if (detonate > 0.2 && Math.random() < detonate * 0.08) {
        for (let i = 0; i < leakCount; i++) {
          if (leakLifes[i] <= 0) {
            // Spawn from cube edge
            const edge = Math.floor(Math.random() * 12);
            const side = Math.floor(edge / 2);
            const sign = edge % 2 === 0 ? 1 : -1;
            const half = CUBE * 0.5;
            if (side === 0) {
              leakPositions[i * 3] = sign * half;
              leakPositions[i * 3 + 1] = (Math.random() - 0.5) * CUBE;
              leakPositions[i * 3 + 2] = (Math.random() - 0.5) * CUBE;
            } else if (side === 1) {
              leakPositions[i * 3] = (Math.random() - 0.5) * CUBE;
              leakPositions[i * 3 + 1] = sign * half;
              leakPositions[i * 3 + 2] = (Math.random() - 0.5) * CUBE;
            } else {
              leakPositions[i * 3] = (Math.random() - 0.5) * CUBE;
              leakPositions[i * 3 + 1] = (Math.random() - 0.5) * CUBE;
              leakPositions[i * 3 + 2] = sign * half;
            }
            leakVel[i * 3] = (Math.random() - 0.5) * 0.01;
            leakVel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
            leakVel[i * 3 + 2] = sign * 0.02 + (Math.random() - 0.5) * 0.01;
            leakLifes[i] = 1.0;
            break;
          }
        }
      }

      // Update leaks
      for (let i = 0; i < leakCount; i++) {
        if (leakLifes[i] > 0) {
          leakPositions[i * 3] += leakVel[i * 3];
          leakPositions[i * 3 + 1] += leakVel[i * 3 + 1];
          leakPositions[i * 3 + 2] += leakVel[i * 3 + 2];
          leakLifes[i] -= dt * 0.4;
          if (leakLifes[i] < 0) leakLifes[i] = 0;
        }
      }
      leakGeo.attributes.position.needsUpdate = true;
      leakGeo.attributes.aLife.needsUpdate = true;

      // Render
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();
    setReady(true);

    return () => {
      clearInterval(cycleInterval);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMove);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const scenario = WORLD_SCENARIOS[scenarioIndex];

  return (
    <div className="simulation-ensemble">
      <div className="simulation-ensemble-canvas" ref={containerRef} />
      <div className="simulation-ensemble-readout">
        <div className="readout-header">
          <span className="readout-status-light" data-status={ready ? 'locked' : 'resolving'} />
          <span className="readout-id">SIM-{String(scenarioIndex + 1).padStart(3, '0')}</span>
        </div>

        <div className="readout-formation">
          <span className="readout-label">FORMATION</span>
          <strong>{scenario.label.toUpperCase()}</strong>
        </div>

        <div className="readout-metrics">
          <div className="metric">
            <span>STABILITY</span>
            <div className="metric-bar">
              <div className="metric-fill" style={{ width: `${(scenarioIndex % 2 === 0 ? 0.85 : 0.3) * 100}%` }} />
            </div>
          </div>
          <div className="metric">
            <span>ENTROPY</span>
            <div className="metric-bar">
              <div className="metric-fill metric-fill-entropy" style={{ width: `${(scenarioIndex % 2 === 0 ? 0.2 : 0.75) * 100}%` }} />
            </div>
          </div>
        </div>

        <p className="readout-detail">{scenario.detail}</p>

        <div className="readout-footer">
          <span>{scenarioIndex % 2 === 0 ? 'CONTAINED' : 'BRANCHING...'}</span>
          <span className="readout-timestamp">
            {new Date().toISOString().slice(11, 19)}Z
          </span>
        </div>
      </div>
    </div>
  );
}