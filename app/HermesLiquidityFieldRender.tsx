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
    gl_PointSize = clamp(aScale * (25.0 / -mvPosition.z), 1.0, 3.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float strength = smoothstep(0.5, 0.2, dist);
    gl_FragColor = vec4(vColor, vAlpha * strength);
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
    const count = isMobile ? Math.floor(maxParticles * 0.3) : maxParticles;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 15);

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

    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);

    const primaryTeal = new THREE.Color('#0d9488');
    const secondaryBronze =
      posture === 'DEFENSIVE'
        ? new THREE.Color('#c2410c')
        : new THREE.Color('#b45309');

    const shapeCenter = new THREE.Vector3(5.5, 0, 0);

    // --- Pre-computing Lorenz Attractor Points ---
    let lx = 0.1, ly = 0.0, lz = 0.0;
    const dt = 0.008;
    const rawLorenz: number[] = [];
    for (let j = 0; j < count; j++) {
      const dx = 10 * (ly - lx) * dt;
      const dy = (lx * (28 - lz) - ly) * dt;
      const dz = (lx * ly - (8 / 3) * lz) * dt;
      lx += dx; ly += dy; lz += dz;
      rawLorenz.push(lx, ly, lz - 24);
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // 1. Noise Field (Dispersed State)
      const biasRight = Math.pow(Math.random(), 1.8) * 14 + 1.5;
      const isLeftSpill = Math.random() < 0.2;
      const nx = isLeftSpill ? (Math.random() - 1) * 10 : biasRight;
      const ny = (Math.random() - 0.5) * 14;
      const nz = (Math.random() - 0.5) * 6;

      noisePositions[i3] = nx;
      noisePositions[i3 + 1] = ny;
      noisePositions[i3 + 2] = nz;
      currentPositions[i3] = nx;
      currentPositions[i3 + 1] = ny;
      currentPositions[i3 + 2] = nz;

      // 2. Shape A: Globe / Sphere
      const sphereRadius = 3.8;
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      globeTargets[i3] = shapeCenter.x + sphereRadius * Math.cos(theta) * Math.sin(phi);
      globeTargets[i3 + 1] = shapeCenter.y + sphereRadius * Math.sin(theta) * Math.sin(phi);
      globeTargets[i3 + 2] = shapeCenter.z + sphereRadius * Math.cos(phi);

      // 3. Shape B: Lorenz Attractor
      lorenzTargets[i3] = shapeCenter.x + rawLorenz[i3] * 0.16;
      lorenzTargets[i3 + 1] = shapeCenter.y + rawLorenz[i3 + 1] * 0.16;
      lorenzTargets[i3 + 2] = shapeCenter.z + rawLorenz[i3 + 2] * 0.16;

      // 4. Shape C: Concentric Gyroscopic Seal Rings
      const ringIndex = i % 3;
      const radii = [2.2, 3.4, 4.6];
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

      // Attributes
      const mixedColor = primaryTeal.clone().lerp(secondaryBronze, Math.random());
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
      scales[i] = Math.random() * 1.2 + 0.6;
      alphas[i] = Math.random() * 0.35 + 0.15;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
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

      mouse.x += (mouse.targetX - mouse.x) * 0.03;
      mouse.y += (mouse.targetY - mouse.y) * 0.03;

      // ── MULTI-STAGE STATE ENGINE ──
      // Time per phase: ~12 seconds. Full loop through all shapes: ~48 seconds.
      const phaseDuration = 12;
      const totalCycle = (elapsedTime % (phaseDuration * 4)) / phaseDuration;
      
      const phaseIndex = Math.floor(totalCycle); // 0: Globe, 1: Lorenz, 2: Seal, 3: Dispersed Noise
      const phaseProgress = totalCycle - phaseIndex;
      
      // Smoothstep easing for smooth state blending
      const ease = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

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
        let noiseDampen = 1.0;

        // Transition logic between target states
        if (phaseIndex === 0) {
          // Noise -> Globe
          targetX = THREE.MathUtils.lerp(nx, gx, ease);
          targetY = THREE.MathUtils.lerp(ny, gy, ease);
          targetZ = THREE.MathUtils.lerp(nz, gz, ease);
          noiseDampen = 1.0 - ease;
        } else if (phaseIndex === 1) {
          // Globe -> Lorenz
          targetX = THREE.MathUtils.lerp(gx, lxPos, ease);
          targetY = THREE.MathUtils.lerp(gy, lyPos, ease);
          targetZ = THREE.MathUtils.lerp(gz, lzPos, ease);
          noiseDampen = 0.1;
        } else if (phaseIndex === 2) {
          // Lorenz -> Seal Rings
          targetX = THREE.MathUtils.lerp(lxPos, sx, ease);
          targetY = THREE.MathUtils.lerp(lyPos, sy, ease);
          targetZ = THREE.MathUtils.lerp(lzPos, sz, ease);
          noiseDampen = 0.1;
        } else {
          // Seal Rings -> Dispersed Noise
          targetX = THREE.MathUtils.lerp(sx, nx, ease);
          targetY = THREE.MathUtils.lerp(sy, ny, ease);
          targetZ = THREE.MathUtils.lerp(sz, nz, ease);
          noiseDampen = ease;
        }

        // Add subtle fluid noise offset when dispersed or transitioning
        const n1 = noise3D(nx * 0.1, ny * 0.1, elapsedTime * 0.03);
        const n2 = noise3D(ny * 0.1 + mouse.x * 0.2, nz * 0.1 + mouse.y * 0.2, elapsedTime * 0.03);

        posArray[i3] = targetX + Math.cos(n1 * Math.PI) * 0.5 * noiseDampen;
        posArray[i3 + 1] = targetY + Math.sin(n2 * Math.PI) * 0.5 * noiseDampen;
        posArray[i3 + 2] = targetZ;
      }

      posAttr.needsUpdate = true;

      // Slow orbital rotation for formed geometric structures
      particleSystem.rotation.y = elapsedTime * 0.012 + mouse.x * 0.01;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.008) * 0.04;

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
      className="absolute inset-0 h-full w-full pointer-events-none bg-white"
      aria-hidden="true"
    />
  );
}