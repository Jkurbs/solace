'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';

interface HermesLiquidityFieldProps {
  posture?: HermesPublicPosture | null;
  /** Maximum number of particles rendered on desktop. Defaults to 25,000 for concentrated layout. */
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
    
    // Crisp micro-point sizing
    gl_PointSize = clamp(aScale * (25.0 / -mvPosition.z), 1.0, 3.0);
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
  maxParticles = 25000,
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

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    const primaryTeal = new THREE.Color('#0d9488');
    const secondaryBronze =
      posture === 'DEFENSIVE'
        ? new THREE.Color('#c2410c')
        : new THREE.Color('#b45309');

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // ── RIGHT-HEAVY BIAS ──
      // Power curve pushes ~75% of particle origins to positive X (right side)
      const biasRight = Math.pow(Math.random(), 1.8) * 14 + 1.5; 
      const isLeftSpill = Math.random() < 0.2; // 20% gentle spill toward the left
      
      positions[i3] = isLeftSpill ? (Math.random() - 1) * 10 : biasRight;
      positions[i3 + 1] = (Math.random() - 0.5) * 14; // Vertical spread
      positions[i3 + 2] = (Math.random() - 0.5) * 6;  // Depth spread

      velocities[i3] = (Math.random() - 0.5) * 0.002;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.002;

      const mixedColor = primaryTeal.clone().lerp(secondaryBronze, Math.random());
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      // Particles on the far right are slightly larger and denser
      scales[i] = Math.random() * 1.2 + 0.6;
      alphas[i] = Math.random() * 0.35 + 0.15;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const x = posArray[i3];
        const y = posArray[i3 + 1];
        const z = posArray[i3 + 2];

        const n1 = noise3D(x * 0.1, y * 0.1, elapsedTime * 0.05);
        const n2 = noise3D(y * 0.1 + mouse.x * 0.2, z * 0.1 + mouse.y * 0.2, elapsedTime * 0.05);

        // Fluid motion with mild drift back toward the right core
        posArray[i3] += Math.cos(n1 * Math.PI) * 0.003 + velocities[i3];
        posArray[i3 + 1] += Math.sin(n2 * Math.PI) * 0.004 + velocities[i3 + 1];
        posArray[i3 + 2] += Math.sin(n1 * Math.PI) * 0.002;

        // Custom bounds to keep concentration on the right side
        if (posArray[i3] < -10) posArray[i3] = 12 + Math.random() * 4;
        if (posArray[i3] > 16) posArray[i3] = 2 + Math.random() * 10;
        if (Math.abs(posArray[i3 + 1]) > 8) posArray[i3 + 1] = -posArray[i3 + 1] * 0.95;
      }

      posAttr.needsUpdate = true;
      particleSystem.rotation.y = elapsedTime * 0.005 + mouse.x * 0.015;

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