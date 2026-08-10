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
    gl_PointSize = clamp(aScale * (38.0 / -mvPosition.z), 1.8, 5.2);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader now adds a subtle core brilliance without tinting to neon
const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    // Smooth radial edge falloff
    float strength = smoothstep(0.5, 0.15, dist);
    
    // Core highlight boost for crispness without hyper-saturation
    vec3 luminousColor = mix(vColor, vColor + vec3(0.08), strength * 0.4);

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

    const shapeCenterX = isMobile ? 0.5 : 5.0;
    const shapeCenterY = isMobile ? -1.8 : 0.0;
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
    const galaxyTargets = new Float32Array(count * 3);

    const currentColors = new Float32Array(count * 3);
    const globeColors = new Float32Array(count * 3);
    const lorenzColors = new Float32Array(count * 3);
    const sealColors = new Float32Array(count * 3);
    const galaxyColors = new Float32Array(count * 3);
    const noiseColors = new Float32Array(count * 3);

    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);

    // Dark Mode helper
    const checkIsDark = () =>
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    let isDark = checkIsDark();

    // Theme adaptive palette: Elegant, luminous hues
    const getThemeColors = (dark: boolean) => ({
      teal: new THREE.Color(dark ? '#2dd4bf' : '#0f766e'),
      bronze:
        posture === 'DEFENSIVE'
          ? new THREE.Color(dark ? '#f97316' : '#c2410c')
          : new THREE.Color(dark ? '#d97706' : '#b45309'),
      amber: new THREE.Color(dark ? '#fbbf24' : '#d97706'),
      slate: new THREE.Color(dark ? '#cbd5e1' : '#475569'),
      emerald: new THREE.Color(dark ? '#34d399' : '#059669'),
    });

    let activePalette = getThemeColors(isDark);

    const shapeCenter = new THREE.Vector3(shapeCenterX, shapeCenterY, 0);

    // --- Lorenz Attractor ---
    let lx = 0.1,
      ly = 0.0,
      lz = 0.0;
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
      const { teal, bronze, amber, slate, emerald } = activePalette;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const rand = Math.random();

        const c0 = teal.clone().lerp(slate, rand * 0.3);
        globeColors[i3] = c0.r;
        globeColors[i3 + 1] = c0.g;
        globeColors[i3 + 2] = c0.b;

        const c1 = amber.clone().lerp(teal, rand * 0.5);
        lorenzColors[i3] = c1.r;
        lorenzColors[i3 + 1] = c1.g;
        lorenzColors[i3 + 2] = c1.b;

        const c2 = bronze.clone().lerp(emerald, rand * 0.3);
        sealColors[i3] = c2.r;
        sealColors[i3 + 1] = c2.g;
        sealColors[i3 + 2] = c2.b;

        const c3 = emerald.clone().lerp(teal, rand * 0.4);
        galaxyColors[i3] = c3.r;
        galaxyColors[i3 + 1] = c3.g;
        galaxyColors[i3 + 2] = c3.b;

        const c4 = teal.clone().lerp(bronze, rand);
        noiseColors[i3] = c4.r;
        noiseColors[i3 + 1] = c4.g;
        noiseColors[i3 + 2] = c4.b;
      }
    };

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 1. Dispersed Noise
      const nx = isMobile ? (Math.random() - 0.5) * 14 : (Math.random() - 0.2) * 22;
      const ny = (Math.random() - 0.5) * (isMobile ? 20 : 16);
      const nz = (Math.random() - 0.5) * 8;

      noisePositions[i3] = nx;
      noisePositions[i3 + 1] = ny;
      noisePositions[i3 + 2] = nz;
      currentPositions[i3] = nx;
      currentPositions[i3 + 1] = ny;
      currentPositions[i3 + 2] = nz;

      // 2. Tight Globe
      const sphereRadius = 3.6 * scaleFactor;
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      globeTargets[i3] = shapeCenter.x + sphereRadius * Math.cos(theta) * Math.sin(phi);
      globeTargets[i3 + 1] = shapeCenter.y + sphereRadius * Math.sin(theta) * Math.sin(phi);
      globeTargets[i3 + 2] = shapeCenter.z + sphereRadius * Math.cos(phi);

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

      // 5. Spiral Galaxy (4 Logarithmic Arms)
      const arms = 4;
      const armAngle = ((i % arms) * 2 * Math.PI) / arms;
      const dist = Math.pow(Math.random(), 2) * 5.2 * scaleFactor;
      const spiralOffset = dist * 1.35;
      const finalAngle = armAngle + spiralOffset;

      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.45;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.45;
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.35;

      galaxyTargets[i3] = shapeCenter.x + Math.cos(finalAngle) * dist + randomX;
      galaxyTargets[i3 + 1] = shapeCenter.y + Math.sin(finalAngle) * dist + randomY;
      galaxyTargets[i3 + 2] = shapeCenter.z + randomZ;

      scales[i] = Math.random() * 1.5 + 0.9;
      alphas[i] = isDark ? Math.random() * 0.55 + 0.4 : Math.random() * 0.45 + 0.3;
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
      blending: THREE.NormalBlending,
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
      const totalCycle = (elapsedTime % (phaseDuration * 5)) / phaseDuration;

      const phaseIndex = Math.floor(totalCycle);
      const phaseProgress = totalCycle - phaseIndex;

      const snapEase = phaseProgress === 1 ? 1 : 1 - Math.pow(2, -10 * phaseProgress);

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      const colorAttr = geometry.attributes.aColor as THREE.BufferAttribute;
      const colorArray = colorAttr.array as Float32Array;

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

        const galX = galaxyTargets[i3];
        const galY = galaxyTargets[i3 + 1];
        const galZ = galaxyTargets[i3 + 2];

        let targetX = nx;
        let targetY = ny;
        let targetZ = nz;

        let cr = noiseColors[i3];
        let cg = noiseColors[i3 + 1];
        let cb = noiseColors[i3 + 2];

        let noiseDampen = 1.0;

        if (phaseIndex === 0) {
          // Noise -> Globe
          targetX = THREE.MathUtils.lerp(nx, gx, snapEase);
          targetY = THREE.MathUtils.lerp(ny, gy, snapEase);
          targetZ = THREE.MathUtils.lerp(nz, gz, snapEase);

          cr = THREE.MathUtils.lerp(noiseColors[i3], globeColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(noiseColors[i3 + 1], globeColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(noiseColors[i3 + 2], globeColors[i3 + 2], snapEase);

          noiseDampen = Math.max(0, 1.0 - snapEase * 1.2);
        } else if (phaseIndex === 1) {
          // Globe -> Lorenz
          targetX = THREE.MathUtils.lerp(gx, lxPos, snapEase);
          targetY = THREE.MathUtils.lerp(gy, lyPos, snapEase);
          targetZ = THREE.MathUtils.lerp(gz, lzPos, snapEase);

          cr = THREE.MathUtils.lerp(globeColors[i3], lorenzColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(globeColors[i3 + 1], lorenzColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(globeColors[i3 + 2], lorenzColors[i3 + 2], snapEase);

          noiseDampen = 0.02;
        } else if (phaseIndex === 2) {
          // Lorenz -> Gyroscopic Seal
          targetX = THREE.MathUtils.lerp(lxPos, sx, snapEase);
          targetY = THREE.MathUtils.lerp(lyPos, sy, snapEase);
          targetZ = THREE.MathUtils.lerp(lzPos, sz, snapEase);

          cr = THREE.MathUtils.lerp(lorenzColors[i3], sealColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(lorenzColors[i3 + 1], sealColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(lorenzColors[i3 + 2], sealColors[i3 + 2], snapEase);

          noiseDampen = 0.02;
        } else if (phaseIndex === 3) {
          // Gyroscopic Seal -> Spiral Galaxy
          targetX = THREE.MathUtils.lerp(sx, galX, snapEase);
          targetY = THREE.MathUtils.lerp(sy, galY, snapEase);
          targetZ = THREE.MathUtils.lerp(sz, galZ, snapEase);

          cr = THREE.MathUtils.lerp(sealColors[i3], galaxyColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(sealColors[i3 + 1], galaxyColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(sealColors[i3 + 2], galaxyColors[i3 + 2], snapEase);

          noiseDampen = 0.15;
        } else {
          // Spiral Galaxy -> Dispersed Noise
          targetX = THREE.MathUtils.lerp(galX, nx, snapEase);
          targetY = THREE.MathUtils.lerp(galY, ny, snapEase);
          targetZ = THREE.MathUtils.lerp(galZ, nz, snapEase);

          cr = THREE.MathUtils.lerp(galaxyColors[i3], noiseColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(galaxyColors[i3 + 1], noiseColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(galaxyColors[i3 + 2], noiseColors[i3 + 2], snapEase);

          noiseDampen = snapEase;
        }

        const n1 = noise3D(nx * 0.1, ny * 0.1, elapsedTime * 0.012);
        const n2 = noise3D(ny * 0.1 + mouse.x * 0.2, nz * 0.1 + mouse.y * 0.2, elapsedTime * 0.012);

        posArray[i3] = targetX + Math.cos(n1 * Math.PI) * 0.3 * noiseDampen;
        posArray[i3 + 1] = targetY + Math.sin(n2 * Math.PI) * 0.3 * noiseDampen;
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
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
    />
  );
}