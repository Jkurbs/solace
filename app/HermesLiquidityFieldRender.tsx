'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';

interface HermesLiquidityFieldProps {
  posture?: HermesPublicPosture | null;
  maxParticles?: number;
}

const particleVertexShader = `
  attribute float aScale;
  attribute float aAlpha;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Sub-pixel scaling for crisp instrument precision
    gl_PointSize = clamp(aScale * (42.0 / -mvPosition.z), 1.0, 8.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    // Sharper edge falloff for clinical, non-soft look
    float strength = smoothstep(0.5, 0.05, dist);
    
    // Core brilliance with crisp edge separation
    float core = pow(strength, 3.0);
    vec3 luminousColor = vColor * (1.0 + core * 0.85);

    gl_FragColor = vec4(luminousColor, vAlpha * strength);
  }
`;

export default function HermesLiquidityFieldRender({
  posture = 'SELECTIVE',
  maxParticles = 27000,
}: HermesLiquidityFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(maxParticles * 0.35) : maxParticles;

    const shapeCenterX = isMobile ? 0.0 : 4.5;
    const shapeCenterY = isMobile ? -1.2 : 0.0;
    const scaleFactor = isMobile ? 0.95 : 1.45;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      isMobile ? 58 : 48,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, isMobile ? 15 : 12);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const noise3D = createNoise3D();
    const geometry = new THREE.BufferGeometry();

    const currentPositions = new Float32Array(count * 3);
    const noisePositions = new Float32Array(count * 3);
    const globeTargets = new Float32Array(count * 3);
    const lorenzTargets = new Float32Array(count * 3);
    const sealTargets = new Float32Array(count * 3);

    const currentColors = new Float32Array(count * 3);
    const globeColors = new Float32Array(count * 3);
    const lorenzColors = new Float32Array(count * 3);
    const sealColors = new Float32Array(count * 3);
    const noiseColors = new Float32Array(count * 3);

    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);

    const checkIsDark = () =>
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    let isDark = checkIsDark();

    const getThemeColors = (dark: boolean) => ({
      teal: new THREE.Color(dark ? '#22D3EE' : '#0f766e'),
      bronze:
        posture === 'DEFENSIVE'
          ? new THREE.Color(dark ? '#F97316' : '#c2410c')
          : new THREE.Color(dark ? '#d97706' : '#b45309'),
      amber: new THREE.Color(dark ? '#FBBF24' : '#d97706'),
      slate: new THREE.Color(dark ? '#94A3B8' : '#475569'),
      emerald: new THREE.Color(dark ? '#34D399' : '#059669'),
    });

    let activePalette = getThemeColors(isDark);
    const shapeCenter = new THREE.Vector3(shapeCenterX, shapeCenterY, 0);

    // --- Lorenz Attractor Calculation ---
    let lx = 0.1, ly = 0.0, lz = 0.0;
    const dt = 0.008;
    const rawLorenz: number[] = [];
    for (let j = 0; j < count; j++) {
      const dx = 10 * (ly - lx) * dt;
      const dy = (lx * (28 - lz) - ly) * dt;
      const dz = (lx * ly - (8 / 3) * lz) * dt;
      lx += dx;
      ly += dy;
      lz += dz;
      rawLorenz.push(lx, ly, lz - 24);
    }

    const rebuildColors = () => {
      const { teal, bronze, amber, emerald } = activePalette;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const rand = Math.random();

        const c0 = teal.clone().lerp(emerald, rand * 0.25);
        globeColors[i3] = c0.r;
        globeColors[i3 + 1] = c0.g;
        globeColors[i3 + 2] = c0.b;

        const c1 = amber.clone().lerp(teal, rand * 0.35);
        lorenzColors[i3] = c1.r;
        lorenzColors[i3 + 1] = c1.g;
        lorenzColors[i3 + 2] = c1.b;

        const c2 = bronze.clone().lerp(emerald, rand * 0.3);
        sealColors[i3] = c2.r;
        sealColors[i3 + 1] = c2.g;
        sealColors[i3 + 2] = c2.b;

        const c3 = teal.clone().lerp(bronze, rand * 0.7);
        noiseColors[i3] = c3.r;
        noiseColors[i3 + 1] = c3.g;
        noiseColors[i3 + 2] = c3.b;
      }
    };

    const sphereRadius = 3.6 * scaleFactor;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 1. Dispersed Grid/Noise
      const nx = isMobile ? (Math.random() - 0.5) * 14 : (Math.random() - 0.2) * 22;
      const ny = (Math.random() - 0.5) * (isMobile ? 20 : 16);
      const nz = (Math.random() - 0.5) * 8;

      noisePositions[i3] = nx;
      noisePositions[i3 + 1] = ny;
      noisePositions[i3 + 2] = nz;
      currentPositions[i3] = nx;
      currentPositions[i3 + 1] = ny;
      currentPositions[i3 + 2] = nz;

      // 2. Structured Latitudinal Rings & Polar Axes (Foundation Instrument Sphere)
      if (i < count * 0.08) {
        // Polar Vector Axis (vertical telemetry shaft)
        const rayY = ((i / (count * 0.08)) - 0.5) * (sphereRadius * 2.6);
        globeTargets[i3] = shapeCenter.x;
        globeTargets[i3 + 1] = shapeCenter.y + rayY;
        globeTargets[i3 + 2] = shapeCenter.z;
      } else if (i < count * 0.22) {
        // Equatorial Target Ring
        const angle = (i / (count * 0.14)) * Math.PI * 2;
        const ringR = sphereRadius * 1.15;
        globeTargets[i3] = shapeCenter.x + ringR * Math.cos(angle);
        globeTargets[i3 + 1] = shapeCenter.y;
        globeTargets[i3 + 2] = shapeCenter.z + ringR * Math.sin(angle);
      } else if (i < count * 0.75) {
        // Quantized Latitudinal Bands
        const latitudeBands = 12;
        const band = Math.floor(((i - count * 0.22) / (count * 0.53)) * latitudeBands);
        const phi = (band / (latitudeBands - 1)) * Math.PI;
        const theta = (i % 120) * ((Math.PI * 2) / 120);

        globeTargets[i3] = shapeCenter.x + sphereRadius * Math.sin(phi) * Math.cos(theta);
        globeTargets[i3 + 1] = shapeCenter.y + sphereRadius * Math.cos(phi);
        globeTargets[i3 + 2] = shapeCenter.z + sphereRadius * Math.sin(phi) * Math.sin(theta);
      } else {
        // Fibonacci Sphere fill for backing lattice density
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        globeTargets[i3] = shapeCenter.x + sphereRadius * Math.cos(theta) * Math.sin(phi);
        globeTargets[i3 + 1] = shapeCenter.y + sphereRadius * Math.sin(theta) * Math.sin(phi);
        globeTargets[i3 + 2] = shapeCenter.z + sphereRadius * Math.cos(phi);
      }

      // 3. Tight Lorenz
      const lorenzScale = 0.165 * scaleFactor;
      lorenzTargets[i3] = shapeCenter.x + rawLorenz[i3] * lorenzScale;
      lorenzTargets[i3 + 1] = shapeCenter.y + rawLorenz[i3 + 1] * lorenzScale;
      lorenzTargets[i3 + 2] = shapeCenter.z + rawLorenz[i3 + 2] * lorenzScale;

      // 4. Tight Gyroscopic Seal Rings
      const ringIndex = i % 3;
      const radii = [2.2 * scaleFactor, 3.3 * scaleFactor, 4.4 * scaleFactor];
      const radius = radii[ringIndex];
      const angle = (i / (count / 3)) * Math.PI * 2;
      const rx = radius * Math.cos(angle);
      const ry = radius * Math.sin(angle);

      if (ringIndex === 0) {
        sealTargets[i3] = shapeCenter.x + rx;
        sealTargets[i3 + 1] = shapeCenter.y + ry;
        sealTargets[i3 + 2] = shapeCenter.z;
      } else if (ringIndex === 1) {
        sealTargets[i3] = shapeCenter.x + rx;
        sealTargets[i3 + 1] = shapeCenter.y + ry * Math.cos(Math.PI / 3);
        sealTargets[i3 + 2] = shapeCenter.z + ry * Math.sin(Math.PI / 3);
      } else {
        sealTargets[i3] = shapeCenter.x + rx;
        sealTargets[i3 + 1] = shapeCenter.y + ry * Math.cos(-Math.PI / 3);
        sealTargets[i3 + 2] = shapeCenter.z + ry * Math.sin(-Math.PI / 3);
      }

      // 5. Sub-Pixel Scale Hierarchy
      const sizeSeed = Math.random();
      if (sizeSeed > 0.98) {
        scales[i] = 4.2; // Key Telemetry Nodes
        alphas[i] = isDark ? 0.95 : 0.85;
      } else if (sizeSeed > 0.88) {
        scales[i] = 2.1; // Primary Trackers
        alphas[i] = isDark ? 0.70 : 0.60;
      } else {
        scales[i] = 0.75; // High-Density Lattice Micro-Pixels
        alphas[i] = isDark ? 0.35 : 0.25;
      }
    }

    rebuildColors();

    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(currentColors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    const themeObserver = new MutationObserver(() => {
      const darkNow = checkIsDark();
      if (darkNow !== isDark) {
        isDark = darkNow;
        activePalette = getThemeColors(isDark);
        rebuildColors();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const elapsedTime = clock.getElapsedTime();

      mouse.x += (mouse.targetX - mouse.x) * 0.015;
      mouse.y += (mouse.targetY - mouse.y) * 0.015;

      const phaseDuration = 16;
      const totalCycle = (elapsedTime % (phaseDuration * 4)) / phaseDuration;

      const phaseIndex = Math.floor(totalCycle);
      const phaseProgress = totalCycle - phaseIndex;

      const snapEase = phaseProgress === 1 ? 1 : 1 - Math.pow(2, -10 * phaseProgress);

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      const colorAttr = geometry.attributes.aColor as THREE.BufferAttribute;
      const colorArray = colorAttr.array as Float32Array;

      // Stepped clock tick for quantized quantum jitter
      const steppedTime = Math.floor(elapsedTime * 10) / 10;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        const nx = noisePositions[i3];
        const ny = noisePositions[i3 + 1];
        const nz = noisePositions[i3 + 2];

        const gx = globeTargets[i3];
        const gy = globeTargets[i3 + 1];
        const gz = globeTargets[i3 + 2];

        const lxPos = lorenzTargets[i3];
        const lyPos = lorenzTargets[i3 + 1];
        const lzPos = lorenzTargets[i3 + 2];

        const sx = sealTargets[i3];
        const sy = sealTargets[i3 + 1];
        const sz = sealTargets[i3 + 2];

        let targetX = nx;
        let targetY = ny;
        let targetZ = nz;

        let cr = noiseColors[i3];
        let cg = noiseColors[i3 + 1];
        let cb = noiseColors[i3 + 2];

        let noiseDampen = 1.0;

        if (phaseIndex === 0) {
          targetX = THREE.MathUtils.lerp(nx, gx, snapEase);
          targetY = THREE.MathUtils.lerp(ny, gy, snapEase);
          targetZ = THREE.MathUtils.lerp(nz, gz, snapEase);

          cr = THREE.MathUtils.lerp(noiseColors[i3], globeColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(noiseColors[i3 + 1], globeColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(noiseColors[i3 + 2], globeColors[i3 + 2], snapEase);

          noiseDampen = Math.max(0, 1.0 - snapEase * 1.2);
        } else if (phaseIndex === 1) {
          targetX = THREE.MathUtils.lerp(gx, lxPos, snapEase);
          targetY = THREE.MathUtils.lerp(gy, lyPos, snapEase);
          targetZ = THREE.MathUtils.lerp(gz, lzPos, snapEase);

          cr = THREE.MathUtils.lerp(globeColors[i3], lorenzColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(globeColors[i3 + 1], lorenzColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(globeColors[i3 + 2], lorenzColors[i3 + 2], snapEase);

          noiseDampen = 0.02;
        } else if (phaseIndex === 2) {
          targetX = THREE.MathUtils.lerp(lxPos, sx, snapEase);
          targetY = THREE.MathUtils.lerp(lyPos, sy, snapEase);
          targetZ = THREE.MathUtils.lerp(lzPos, sz, snapEase);

          cr = THREE.MathUtils.lerp(lorenzColors[i3], sealColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(lorenzColors[i3 + 1], sealColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(lorenzColors[i3 + 2], sealColors[i3 + 2], snapEase);

          noiseDampen = 0.02;
        } else {
          targetX = THREE.MathUtils.lerp(sx, nx, snapEase);
          targetY = THREE.MathUtils.lerp(sy, ny, snapEase);
          targetZ = THREE.MathUtils.lerp(sz, nz, snapEase);

          cr = THREE.MathUtils.lerp(sealColors[i3], noiseColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(sealColors[i3 + 1], noiseColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(sealColors[i3 + 2], noiseColors[i3 + 2], snapEase);

          noiseDampen = snapEase;
        }

        // Quantized step displacement for instrument feel
        const n1 = noise3D(nx * 0.15, ny * 0.15, steppedTime * 0.04);
        const jitterX = Math.round(Math.cos(n1 * Math.PI) * 3) * 0.04;
        const jitterY = Math.round(Math.sin(n1 * Math.PI) * 3) * 0.04;

        posArray[i3] = targetX + jitterX * noiseDampen;
        posArray[i3 + 1] = targetY + jitterY * noiseDampen;
        posArray[i3 + 2] = targetZ;

        colorArray[i3] = cr;
        colorArray[i3 + 1] = cg;
        colorArray[i3 + 2] = cb;
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      particleSystem.rotation.y = elapsedTime * 0.005 + mouse.x * 0.008;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.003) * 0.03;

      renderer.render(scene, camera);
    };

    renderLoop();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      themeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [maxParticles, posture]);

  return (
    <div className="relative w-full h-full pointer-events-none overflow-hidden select-none">
      {/* WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* Foundation Scientific Instrument Telemetry HUD */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 font-mono text-[10px] tracking-widest text-cyan-500/50 uppercase">
        {/* Top Header Readout */}
        <div className="flex justify-between items-start border-b border-cyan-500/15 pb-2">
          <div className="flex items-center space-x-3">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span>SYS.HERMES // POSTURE: {posture}</span>
          </div>
          <span className="hidden sm:inline">FREQ: 1420.405 MHz</span>
        </div>

        {/* Center Target Reticle Grid */}
        <div className="absolute top-1/2 right-1/2 md:right-[18%] -translate-y-1/2 translate-x-1/2 md:translate-x-0 w-64 h-64 md:w-80 md:h-80 border border-cyan-500/10 rounded-full flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 md:w-72 md:h-72 border border-dashed border-cyan-500/15 rounded-full animate-[spin_90s_linear_infinite]" />
          <div className="absolute w-full h-[1px] bg-cyan-500/10" />
          <div className="absolute h-full w-[1px] bg-cyan-500/10" />
          <div className="absolute w-2 h-2 border-t border-l border-cyan-400/40 -top-1 -left-1" />
          <div className="absolute w-2 h-2 border-t border-r border-cyan-400/40 -top-1 -right-1" />
          <div className="absolute w-2 h-2 border-b border-l border-cyan-400/40 -bottom-1 -left-1" />
          <div className="absolute w-2 h-2 border-b border-r border-cyan-400/40 -bottom-1 -right-1" />
        </div>

        {/* Bottom Coordinates & System Status */}
        <div className="flex justify-between items-end border-t border-cyan-500/15 pt-2">
          <div>
            <div>GRID LAT: 47.6062 N</div>
            <div>GRID LONG: 122.3321 W</div>
          </div>
          <div className="text-right">
            <div>LATTICE DENSITY: {maxParticles.toLocaleString()} PTS</div>
            <div className="text-emerald-400/80">STATUS: NOMINAL</div>
          </div>
        </div>
      </div>
    </div>
  );
}