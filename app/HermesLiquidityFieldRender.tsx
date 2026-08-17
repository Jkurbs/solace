'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';

export type MetricFocus = 'decisions' | 'verified' | 'anchored';

interface HermesLiquidityFieldProps {
  posture?: HermesPublicPosture | null;
  maxParticles?: number;
  activeMetric?: MetricFocus | null;
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
  activeMetric = null,
}: HermesLiquidityFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMetricRef = useRef<MetricFocus | null>(activeMetric);

  useEffect(() => {
    activeMetricRef.current = activeMetric;
  }, [activeMetric]);

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

    const geometry = new THREE.BufferGeometry();

    const currentPositions = new Float32Array(count * 3);
    const globeTargets = new Float32Array(count * 3);
    const lorenzTargets = new Float32Array(count * 3);
    const sealTargets = new Float32Array(count * 3);

    const currentColors = new Float32Array(count * 3);
    const globeColors = new Float32Array(count * 3);
    const lorenzColors = new Float32Array(count * 3);
    const sealColors = new Float32Array(count * 3);

    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);

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
      }
    };

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 1. Globe Target (Equilibrium Sphere)
      const sphereRadius = 3.6 * scaleFactor;
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const gx = shapeCenter.x + sphereRadius * Math.cos(theta) * Math.sin(phi);
      const gy = shapeCenter.y + sphereRadius * Math.sin(theta) * Math.sin(phi);
      const gz = shapeCenter.z + sphereRadius * Math.cos(phi);

      globeTargets[i3] = gx;
      globeTargets[i3 + 1] = gy;
      globeTargets[i3 + 2] = gz;

      // Start positions directly on Globe Target
      currentPositions[i3] = gx;
      currentPositions[i3 + 1] = gy;
      currentPositions[i3 + 2] = gz;

      // 2. Lorenz Attractor Target
      const lorenzScale = 0.165 * scaleFactor;
      lorenzTargets[i3] = shapeCenter.x + rawLorenz[i3] * lorenzScale;
      lorenzTargets[i3 + 1] = shapeCenter.y + rawLorenz[i3 + 1] * lorenzScale;
      lorenzTargets[i3 + 2] = shapeCenter.z + rawLorenz[i3 + 2] * lorenzScale;

      // 3. Gyroscopic Ring Seal Target
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

      let targetPhase = 0;
      if (activeMetricRef.current === 'decisions') targetPhase = 0;
      else if (activeMetricRef.current === 'verified') targetPhase = 1;
      else if (activeMetricRef.current === 'anchored') targetPhase = 2;
      else {
        targetPhase = Math.floor((elapsedTime / 10) % 3);
      }

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      const colorAttr = geometry.attributes.aColor as THREE.BufferAttribute;
      const colorArray = colorAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        const gx = globeTargets[i3];
        const gy = globeTargets[i3 + 1];
        const gz = globeTargets[i3 + 2];

        const lxPos = lorenzTargets[i3];
        const lyPos = lorenzTargets[i3 + 1];
        const lzPos = lorenzTargets[i3 + 2];

        const sx = sealTargets[i3];
        const sy = sealTargets[i3 + 1];
        const sz = sealTargets[i3 + 2];

        let toX = gx;
        let toY = gy;
        let toZ = gz;

        let toR = globeColors[i3];
        let toG = globeColors[i3 + 1];
        let toB = globeColors[i3 + 2];

        if (targetPhase === 0) {
          toX = gx; toY = gy; toZ = gz;
          toR = globeColors[i3]; toG = globeColors[i3 + 1]; toB = globeColors[i3 + 2];
        } else if (targetPhase === 1) {
          toX = lxPos; toY = lyPos; toZ = lzPos;
          toR = lorenzColors[i3]; toG = lorenzColors[i3 + 1]; toB = lorenzColors[i3 + 2];
        } else {
          toX = sx; toY = sy; toZ = sz;
          toR = sealColors[i3]; toG = sealColors[i3 + 1]; toB = sealColors[i3 + 2];
        }

        posArray[i3] += (toX - posArray[i3]) * 0.05;
        posArray[i3 + 1] += (toY - posArray[i3 + 1]) * 0.05;
        posArray[i3 + 2] += (toZ - posArray[i3 + 2]) * 0.05;

        colorArray[i3] += (toR - colorArray[i3]) * 0.05;
        colorArray[i3 + 1] += (toG - colorArray[i3 + 1]) * 0.05;
        colorArray[i3 + 2] += (toB - colorArray[i3 + 2]) * 0.05;
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