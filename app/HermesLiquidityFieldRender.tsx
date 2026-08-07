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
    const count = isMobile ? Math.floor(maxParticles * 0.25) : maxParticles;

    // Responsive anchors and scaling
    const shapeCenterX = isMobile ? 0.8 : 5.5;
    const shapeCenterY = isMobile ? -2.2 : 0.0;
    const scaleFactor = isMobile ? 0.65 : 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      isMobile ? 60 : 50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, isMobile ? 18 : 15);

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

    // Color Palette Definitions
    const tealColor = new THREE.Color('#0d9488');
    const bronzeColor = posture === 'DEFENSIVE' ? new THREE.Color('#c2410c') : new THREE.Color('#b45309');
    const amberColor = new THREE.Color('#f59e0b');
    const slateColor = new THREE.Color('#64748b');
    const emeraldColor = new THREE.Color('#10b981');

    const shapeCenter = new THREE.Vector3(shapeCenterX, shapeCenterY, 0);

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
      const rand = Math.random();

      // 1. Noise Field (Dispersed State)
      const nx = isMobile ? (Math.random() - 0.5) * 12 : (Math.random() - 0.3) * 18;
      const ny = (Math.random() - 0.5) * (isMobile ? 18 : 14);
      const nz = (Math.random() - 0.5) * 6;

      noisePositions[i3] = nx;
      noisePositions[i3 + 1] = ny;
      noisePositions[i3 + 2] = nz;
      currentPositions[i3] = nx;
      currentPositions[i3 + 1] = ny;
      currentPositions[i3 + 2] = nz;

      // 2. Shape A: Globe / Sphere
      const sphereRadius = 3.8 * scaleFactor;
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      globeTargets[i3] = shapeCenter.x + sphereRadius * Math.cos(theta) * Math.sin(phi);
      globeTargets[i3 + 1] = shapeCenter.y + sphereRadius * Math.sin(theta) * Math.sin(phi);
      globeTargets[i3 + 2] = shapeCenter.z + sphereRadius * Math.cos(phi);

      // 3. Shape B: Lorenz Attractor
      const lorenzScale = 0.16 * scaleFactor;
      lorenzTargets[i3] = shapeCenter.x + rawLorenz[i3] * lorenzScale;
      lorenzTargets[i3 + 1] = shapeCenter.y + rawLorenz[i3 + 1] * lorenzScale;
      lorenzTargets[i3 + 2] = shapeCenter.z + rawLorenz[i3 + 2] * lorenzScale;

      // 4. Shape C: Concentric Gyroscopic Seal Rings
      const ringIndex = i % 3;
      const radii = [2.2 * scaleFactor, 3.4 * scaleFactor, 4.6 * scaleFactor];
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

      // --- Color Assignments per Phase ---
      // Phase 0: Globe (Teal + Slate)
      const c0 = tealColor.clone().lerp(slateColor, rand * 0.4);
      globeColors[i3] = c0.r; globeColors[i3 + 1] = c0.g; globeColors[i3 + 2] = c0.b;

      // Phase 1: Lorenz (Amber + Teal)
      const c1 = amberColor.clone().lerp(tealColor, rand * 0.6);
      lorenzColors[i3] = c1.r; lorenzColors[i3 + 1] = c1.g; lorenzColors[i3 + 2] = c1.b;

      // Phase 2: Seal (Bronze + Emerald)
      const c2 = bronzeColor.clone().lerp(emeraldColor, rand * 0.35);
      sealColors[i3] = c2.r; sealColors[i3 + 1] = c2.g; sealColors[i3 + 2] = c2.b;

      // Phase 3: Noise Field (Teal + Bronze base)
      const c3 = tealColor.clone().lerp(bronzeColor, rand);
      noiseColors[i3] = c3.r; noiseColors[i3 + 1] = c3.g; noiseColors[i3 + 2] = c3.b;

      // Set initial colors
      currentColors[i3] = c3.r;
      currentColors[i3 + 1] = c3.g;
      currentColors[i3 + 2] = c3.b;

      scales[i] = Math.random() * 1.2 + 0.6;
      alphas[i] = Math.random() * 0.35 + 0.15;
    }

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

      const phaseDuration = 12;
      const totalCycle = (elapsedTime % (phaseDuration * 4)) / phaseDuration;
      
      const phaseIndex = Math.floor(totalCycle);
      const phaseProgress = totalCycle - phaseIndex;
      const ease = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);

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

        let targetX = nx;
        let targetY = ny;
        let targetZ = nz;

        let cr = noiseColors[i3];
        let cg = noiseColors[i3 + 1];
        let cb = noiseColors[i3 + 2];

        let noiseDampen = 1.0;

        if (phaseIndex === 0) {
          // Noise -> Globe
          targetX = THREE.MathUtils.lerp(nx, gx, ease);
          targetY = THREE.MathUtils.lerp(ny, gy, ease);
          targetZ = THREE.MathUtils.lerp(nz, gz, ease);

          cr = THREE.MathUtils.lerp(noiseColors[i3], globeColors[i3], ease);
          cg = THREE.MathUtils.lerp(noiseColors[i3 + 1], globeColors[i3 + 1], ease);
          cb = THREE.MathUtils.lerp(noiseColors[i3 + 2], globeColors[i3 + 2], ease);

          noiseDampen = 1.0 - ease;
        } else if (phaseIndex === 1) {
          // Globe -> Lorenz
          targetX = THREE.MathUtils.lerp(gx, lxPos, ease);
          targetY = THREE.MathUtils.lerp(gy, lyPos, ease);
          targetZ = THREE.MathUtils.lerp(gz, lzPos, ease);

          cr = THREE.MathUtils.lerp(globeColors[i3], lorenzColors[i3], ease);
          cg = THREE.MathUtils.lerp(globeColors[i3 + 1], lorenzColors[i3 + 1], ease);
          cb = THREE.MathUtils.lerp(globeColors[i3 + 2], lorenzColors[i3 + 2], ease);

          noiseDampen = 0.1;
        } else if (phaseIndex === 2) {
          // Lorenz -> Seal
          targetX = THREE.MathUtils.lerp(lxPos, sx, ease);
          targetY = THREE.MathUtils.lerp(lyPos, sy, ease);
          targetZ = THREE.MathUtils.lerp(lzPos, sz, ease);

          cr = THREE.MathUtils.lerp(lorenzColors[i3], sealColors[i3], ease);
          cg = THREE.MathUtils.lerp(lorenzColors[i3 + 1], sealColors[i3 + 1], ease);
          cb = THREE.MathUtils.lerp(lorenzColors[i3 + 2], sealColors[i3 + 2], ease);

          noiseDampen = 0.1;
        } else {
          // Seal -> Dispersed Noise
          targetX = THREE.MathUtils.lerp(sx, nx, ease);
          targetY = THREE.MathUtils.lerp(sy, ny, ease);
          targetZ = THREE.MathUtils.lerp(sz, nz, ease);

          cr = THREE.MathUtils.lerp(sealColors[i3], noiseColors[i3], ease);
          cg = THREE.MathUtils.lerp(sealColors[i3 + 1], noiseColors[i3 + 1], ease);
          cb = THREE.MathUtils.lerp(sealColors[i3 + 2], noiseColors[i3 + 2], ease);

          noiseDampen = ease;
        }

        // Ambient fluid noise movement
        const n1 = noise3D(nx * 0.1, ny * 0.1, elapsedTime * 0.03);
        const n2 = noise3D(ny * 0.1 + mouse.x * 0.2, nz * 0.1 + mouse.y * 0.2, elapsedTime * 0.03);

        posArray[i3] = targetX + Math.cos(n1 * Math.PI) * 0.4 * noiseDampen;
        posArray[i3 + 1] = targetY + Math.sin(n2 * Math.PI) * 0.4 * noiseDampen;
        posArray[i3 + 2] = targetZ;

        colorArray[i3] = cr;
        colorArray[i3 + 1] = cg;
        colorArray[i3 + 2] = cb;
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      // System rotation
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