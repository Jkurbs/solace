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

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float strength = smoothstep(0.5, 0.15, dist);
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

    const currentColors = new Float32Array(count * 3);
    const globeColors = new Float32Array(count * 3);
    const lorenzColors = new Float32Array(count * 3);
    const sealColors = new Float32Array(count * 3);
    const galaxyColors = new Float32Array(count * 3);
    const noiseColors = new Float32Array(count * 3);

    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);
    const seeds = new Float32Array(count);

    const checkIsDark = () =>
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    let isDark = checkIsDark();

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

    // Precalculate noise base and per-particle random seeds
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const nx = isMobile ? (Math.random() - 0.5) * 14 : (Math.random() - 0.2) * 22;
      const ny = (Math.random() - 0.5) * (isMobile ? 20 : 16);
      const nz = (Math.random() - 0.5) * 8;

      noisePositions[i3] = nx;
      noisePositions[i3 + 1] = ny;
      noisePositions[i3 + 2] = nz;
      currentPositions[i3] = nx;
      currentPositions[i3 + 1] = ny;
      currentPositions[i3 + 2] = nz;

      scales[i] = Math.random() * 1.5 + 0.9;
      alphas[i] = isDark ? Math.random() * 0.55 + 0.4 : Math.random() * 0.45 + 0.3;
      seeds[i] = Math.random();
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

      mouse.x += (mouse.targetX - mouse.x) * 0.02;
      mouse.y += (mouse.targetY - mouse.y) * 0.02;

      const phaseDuration = 16;
      const totalCycle = (elapsedTime % (phaseDuration * 5)) / phaseDuration;
      const phaseIndex = Math.floor(totalCycle);
      const phaseProgress = totalCycle - phaseIndex;

      const snapEase = phaseProgress === 1 ? 1 : 1 - Math.pow(2, -10 * phaseProgress);

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      const colorAttr = geometry.attributes.aColor as THREE.BufferAttribute;
      const colorArray = colorAttr.array as Float32Array;

      const scaleAttr = geometry.attributes.aScale as THREE.BufferAttribute;
      const scaleArray = scaleAttr.array as Float32Array;

      // ---------------------------------------------------------------------
      // Dynamic Shape Parameter Calculations (Updated Every Frame)
      // ---------------------------------------------------------------------
      const globePulse = Math.sin(elapsedTime * 1.5) * 0.15 + 1.0;
      const ringRot0 = elapsedTime * 0.5;
      const ringRot1 = elapsedTime * -0.3;
      const ringRot2 = elapsedTime * 0.7;
      const galaxyRotation = elapsedTime * 0.25;

      // Lorenz integration offset driven by continuous real time
      const lorenzTimeStep = elapsedTime * 0.15;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const seed = seeds[i];

        // 1. Dynamic Dispersed Noise Position
        const nx = noisePositions[i3];
        const ny = noisePositions[i3 + 1];
        const nz = noisePositions[i3 + 2];

        // 2. Dynamic Pulsing Globe Surface Waves
        const sphereRadius = 3.6 * scaleFactor * globePulse;
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi + elapsedTime * 0.2; // Constant surface drift
        const wave = Math.sin(phi * 8 + theta * 4 + elapsedTime * 3) * 0.15;
        const gx = shapeCenter.x + (sphereRadius + wave) * Math.cos(theta) * Math.sin(phi);
        const gy = shapeCenter.y + (sphereRadius + wave) * Math.sin(theta) * Math.sin(phi);
        const gz = shapeCenter.z + (sphereRadius + wave) * Math.cos(phi);

        // 3. Dynamic Orbiting Lorenz Attractor
        // Continuously integrate Lorenz attractor relative to time + particle seed
        const lStep = (i * 0.003) + lorenzTimeStep;
        const lxVal = Math.sin(lStep * 1.2) * 12;
        const lyVal = Math.cos(lStep * 0.9) * 15;
        const lzVal = Math.sin(lStep * 1.5) * 8;
        const lScale = 0.185 * scaleFactor;
        const lx = shapeCenter.x + lxVal * lScale;
        const ly = shapeCenter.y + lyVal * lScale;
        const lz = shapeCenter.z + lzVal * lScale;

        // 4. Dynamic Gyroscopic Ring Rotation
        const ringIndex = i % 3;
        const radii = [2.2 * scaleFactor, 3.3 * scaleFactor, 4.4 * scaleFactor];
        const radius = radii[ringIndex];
        const angle = (i / (count / 3)) * Math.PI * 2;
        let rx = radius * Math.cos(angle);
        let ry = radius * Math.sin(angle);
        let rz = 0;

        let sx = shapeCenter.x;
        let sy = shapeCenter.y;
        let sz = shapeCenter.z;

        if (ringIndex === 0) {
          // Ring 0 rotates on Z axis
          const c = Math.cos(ringRot0), s = Math.sin(ringRot0);
          sx += rx * c - ry * s;
          sy += rx * s + ry * c;
          sz += rz;
        } else if (ringIndex === 1) {
          // Ring 1 rotates on Y axis
          const c = Math.cos(ringRot1), s = Math.sin(ringRot1);
          const ryRot = ry * Math.cos(Math.PI / 3);
          const rzRot = ry * Math.sin(Math.PI / 3);
          sx += rx * c - rzRot * s;
          sy += ryRot;
          sz += rx * s + rzRot * c;
        } else {
          // Ring 2 rotates on X axis
          const c = Math.cos(ringRot2), s = Math.sin(ringRot2);
          const ryRot = ry * Math.cos(-Math.PI / 3);
          const rzRot = ry * Math.sin(-Math.PI / 3);
          sx += rx;
          sy += ryRot * c - rzRot * s;
          sz += ryRot * s + rzRot * c;
        }

        // 5. Dynamic Spiral Galaxy with Differential Rotation Speed
        const arms = 4;
        const armAngle = ((i % arms) * 2 * Math.PI) / arms;
        const dist = Math.pow(seed, 2) * 5.2 * scaleFactor;
        // Inner arms rotate faster than outer arms
        const orbitalSpeed = galaxyRotation / (dist * 0.4 + 0.5);
        const spiralOffset = dist * 1.35 + orbitalSpeed;
        const finalAngle = armAngle + spiralOffset;

        const randomX = Math.sin(elapsedTime * 2 + i) * 0.15;
        const randomY = Math.cos(elapsedTime * 2 + i) * 0.15;

        const galX = shapeCenter.x + Math.cos(finalAngle) * dist + randomX;
        const galY = shapeCenter.y + Math.sin(finalAngle) * dist + randomY;
        const galZ = shapeCenter.z + Math.sin(elapsedTime + dist) * 0.2;

        let targetX = nx, targetY = ny, targetZ = nz;
        let cr = noiseColors[i3], cg = noiseColors[i3 + 1], cb = noiseColors[i3 + 2];

        // Smooth Phase Morphing
        if (phaseIndex === 0) {
          targetX = THREE.MathUtils.lerp(nx, gx, snapEase);
          targetY = THREE.MathUtils.lerp(ny, gy, snapEase);
          targetZ = THREE.MathUtils.lerp(nz, gz, snapEase);

          cr = THREE.MathUtils.lerp(noiseColors[i3], globeColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(noiseColors[i3 + 1], globeColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(noiseColors[i3 + 2], globeColors[i3 + 2], snapEase);
        } else if (phaseIndex === 1) {
          targetX = THREE.MathUtils.lerp(gx, lx, snapEase);
          targetY = THREE.MathUtils.lerp(gy, ly, snapEase);
          targetZ = THREE.MathUtils.lerp(gz, lz, snapEase);

          cr = THREE.MathUtils.lerp(globeColors[i3], lorenzColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(globeColors[i3 + 1], lorenzColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(globeColors[i3 + 2], lorenzColors[i3 + 2], snapEase);
        } else if (phaseIndex === 2) {
          targetX = THREE.MathUtils.lerp(lx, sx, snapEase);
          targetY = THREE.MathUtils.lerp(ly, sy, snapEase);
          targetZ = THREE.MathUtils.lerp(lz, sz, snapEase);

          cr = THREE.MathUtils.lerp(lorenzColors[i3], sealColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(lorenzColors[i3 + 1], sealColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(lorenzColors[i3 + 2], sealColors[i3 + 2], snapEase);
        } else if (phaseIndex === 3) {
          targetX = THREE.MathUtils.lerp(sx, galX, snapEase);
          targetY = THREE.MathUtils.lerp(sy, galY, snapEase);
          targetZ = THREE.MathUtils.lerp(sz, galZ, snapEase);

          cr = THREE.MathUtils.lerp(sealColors[i3], galaxyColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(sealColors[i3 + 1], galaxyColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(sealColors[i3 + 2], galaxyColors[i3 + 2], snapEase);
        } else {
          targetX = THREE.MathUtils.lerp(galX, nx, snapEase);
          targetY = THREE.MathUtils.lerp(galY, ny, snapEase);
          targetZ = THREE.MathUtils.lerp(galZ, nz, snapEase);

          cr = THREE.MathUtils.lerp(galaxyColors[i3], noiseColors[i3], snapEase);
          cg = THREE.MathUtils.lerp(galaxyColors[i3 + 1], noiseColors[i3 + 1], snapEase);
          cb = THREE.MathUtils.lerp(galaxyColors[i3 + 2], noiseColors[i3 + 2], snapEase);
        }

        // Apply Continuous Perlin Turbulences across ALL phases
        const noiseScale = 0.12;
        const noiseSpeed = elapsedTime * 0.4;
        const n1 = noise3D(targetX * noiseScale, targetY * noiseScale, noiseSpeed + seed);
        const n2 = noise3D(targetY * noiseScale + mouse.x, targetZ * noiseScale + mouse.y, noiseSpeed);

        const turbulenceStrength = 0.35;
        posArray[i3] = targetX + Math.cos(n1 * Math.PI) * turbulenceStrength;
        posArray[i3 + 1] = targetY + Math.sin(n2 * Math.PI) * turbulenceStrength;
        posArray[i3 + 2] = targetZ + Math.sin(n1 * Math.PI) * (turbulenceStrength * 0.5);

        colorArray[i3] = cr;
        colorArray[i3 + 1] = cg;
        colorArray[i3 + 2] = cb;

        // Subtle per-particle scale breathing / glinting
        scaleArray[i] = scales[i] * (1.0 + Math.sin(elapsedTime * 2.5 + seed * 10.0) * 0.2);
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      scaleAttr.needsUpdate = true;

      // Overall field interaction and tilt
      particleSystem.rotation.y = elapsedTime * 0.015 + mouse.x * 0.04;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.008) * 0.04 + mouse.y * 0.04;

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