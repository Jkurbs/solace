'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';

interface HermesLiquidityFieldProps {
  posture?: HermesPublicPosture | null;
  maxParticles?: number;
}

const particleVertexShader = `
  attribute float aScale;
  attribute float aAlpha;
  
  attribute vec3 aPosGlobe;
  attribute vec3 aPosLorenz;
  attribute vec3 aPosSeal;
  attribute vec3 aPosWave;

  attribute vec3 aColorGlobe;
  attribute vec3 aColorLorenz;
  attribute vec3 aColorSeal;
  attribute vec3 aColorWave;

  uniform float uTime;
  uniform float uPhaseIndex;
  uniform float uSnapEase;
  uniform vec2 uMouse;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;

    vec3 targetPos = vec3(0.0);
    vec3 targetColor = vec3(0.0);
    float waveDampen = 0.0;

    if (uPhaseIndex < 0.5) {
      targetPos = mix(aPosWave, aPosGlobe, uSnapEase);
      targetColor = mix(aColorWave, aColorGlobe, uSnapEase);
      waveDampen = 1.0 - uSnapEase;
    } else if (uPhaseIndex < 1.5) {
      targetPos = mix(aPosGlobe, aPosLorenz, uSnapEase);
      targetColor = mix(aColorGlobe, aColorLorenz, uSnapEase);
      waveDampen = 0.05;
    } else if (uPhaseIndex < 2.5) {
      targetPos = mix(aPosLorenz, aPosSeal, uSnapEase);
      targetColor = mix(aColorLorenz, aColorSeal, uSnapEase);
      waveDampen = 0.05;
    } else {
      targetPos = mix(aPosSeal, aPosWave, uSnapEase);
      targetColor = mix(aColorSeal, aColorWave, uSnapEase);
      waveDampen = uSnapEase;
    }

    if (waveDampen > 0.01) {
      float waveSpeed = uTime * 1.4;
      float waveFreq = 0.35;
      
      float waveZ = sin(targetPos.x * waveFreq + waveSpeed) * 0.75 +
                    cos(targetPos.y * waveFreq * 0.8 + waveSpeed * 1.1) * 0.4;

      float distToMouse = length(targetPos.xy - (uMouse * 8.0));
      float ripple = sin(distToMouse * 1.8 - uTime * 3.5) * exp(-distToMouse * 0.25) * 0.5;

      targetPos.z += (waveZ + ripple) * waveDampen;
    }

    vColor = targetColor;

    vec4 mvPosition = modelViewMatrix * vec4(targetPos, 1.0);
    // Point size floor ensures particles remain visible at all camera distances
    gl_PointSize = clamp(aScale * (42.0 / -mvPosition.z), 2.0, 6.0);
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
    vec3 luminousColor = mix(vColor, vColor + vec3(0.12), strength * 0.5);

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

    // Ensure non-zero dimensional bounds
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    const isLowPower = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false;
    
    let count = maxParticles;
    if (isMobile) {
      count = Math.floor(maxParticles * 0.3);
    } else if (isLowPower) {
      count = Math.floor(maxParticles * 0.5);
    }

    const scaleFactor = isMobile ? 0.95 : 1.45;
    const shapeCenterX = isMobile ? 0.0 : 4.0;
    const shapeCenterY = isMobile ? -1.0 : 0.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      isMobile ? 58 : 48,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 0, isMobile ? 16 : 13);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2.0));
    renderer.setSize(width, height);
    
    // Clear any existing children before appending
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();

    const posGlobe = new Float32Array(count * 3);
    const posLorenz = new Float32Array(count * 3);
    const posSeal = new Float32Array(count * 3);
    const posWave = new Float32Array(count * 3);

    const colorGlobe = new Float32Array(count * 3);
    const colorLorenz = new Float32Array(count * 3);
    const colorSeal = new Float32Array(count * 3);
    const colorWave = new Float32Array(count * 3);

    const scales = new Float32Array(count);
    const alphas = new Float32Array(count);

    const checkIsDark = () =>
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const isDark = checkIsDark();

    const palette = {
      teal: new THREE.Color(isDark ? '#2dd4bf' : '#0d9488'),
      bronze: posture === 'DEFENSIVE' 
        ? new THREE.Color(isDark ? '#f97316' : '#c2410c') 
        : new THREE.Color(isDark ? '#d97706' : '#b45309'),
      amber: new THREE.Color(isDark ? '#fbbf24' : '#d97706'),
      slate: new THREE.Color(isDark ? '#cbd5e1' : '#475569'),
      emerald: new THREE.Color(isDark ? '#34d399' : '#059669'),
    };

    const shapeCenter = new THREE.Vector3(shapeCenterX, shapeCenterY, 0);

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

      const c0 = palette.teal.clone().lerp(palette.slate, rand * 0.3);
      colorGlobe[i3] = c0.r; colorGlobe[i3 + 1] = c0.g; colorGlobe[i3 + 2] = c0.b;

      const c1 = palette.amber.clone().lerp(palette.teal, rand * 0.5);
      colorLorenz[i3] = c1.r; colorLorenz[i3 + 1] = c1.g; colorLorenz[i3 + 2] = c1.b;

      const c2 = palette.bronze.clone().lerp(palette.emerald, rand * 0.3);
      colorSeal[i3] = c2.r; colorSeal[i3 + 1] = c2.g; colorSeal[i3 + 2] = c2.b;

      const c3 = palette.teal.clone().lerp(palette.bronze, rand);
      colorWave[i3] = c3.r; colorWave[i3 + 1] = c3.g; colorWave[i3 + 2] = c3.b;

      posWave[i3] = isMobile ? (Math.random() - 0.5) * 14 : (Math.random() - 0.2) * 22;
      posWave[i3 + 1] = (Math.random() - 0.5) * (isMobile ? 20 : 16);
      posWave[i3 + 2] = (Math.random() - 0.5) * 4;

      const sphereRadius = 3.6 * scaleFactor;
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      posGlobe[i3] = shapeCenter.x + sphereRadius * Math.cos(theta) * Math.sin(phi);
      posGlobe[i3 + 1] = shapeCenter.y + sphereRadius * Math.sin(theta) * Math.sin(phi);
      posGlobe[i3 + 2] = shapeCenter.z + sphereRadius * Math.cos(phi);

      const lorenzScale = 0.165 * scaleFactor;
      posLorenz[i3] = shapeCenter.x + rawLorenz[i3] * lorenzScale;
      posLorenz[i3 + 1] = shapeCenter.y + rawLorenz[i3 + 1] * lorenzScale;
      posLorenz[i3 + 2] = shapeCenter.z + rawLorenz[i3 + 2] * lorenzScale;

      const ringIndex = i % 3;
      const radii = [2.2 * scaleFactor, 3.3 * scaleFactor, 4.4 * scaleFactor];
      const radius = radii[ringIndex];
      const angle = (i / (count / 3)) * Math.PI * 2;
      const rx = radius * Math.cos(angle);
      const ry = radius * Math.sin(angle);

      if (ringIndex === 0) {
        posSeal[i3] = shapeCenter.x + rx;
        posSeal[i3 + 1] = shapeCenter.y + ry;
        posSeal[i3 + 2] = shapeCenter.z;
      } else if (ringIndex === 1) {
        posSeal[i3] = shapeCenter.x + rx;
        posSeal[i3 + 1] = shapeCenter.y + ry * Math.cos(Math.PI / 3);
        posSeal[i3 + 2] = shapeCenter.z + ry * Math.sin(Math.PI / 3);
      } else {
        posSeal[i3] = shapeCenter.x + rx;
        posSeal[i3 + 1] = shapeCenter.y + ry * Math.cos(-Math.PI / 3);
        posSeal[i3 + 2] = shapeCenter.z + ry * Math.sin(-Math.PI / 3);
      }

      scales[i] = Math.random() * 1.6 + 1.0;
      alphas[i] = isDark ? Math.random() * 0.6 + 0.45 : Math.random() * 0.5 + 0.35;
    }

    geometry.setAttribute('aPosGlobe', new THREE.BufferAttribute(posGlobe, 3));
    geometry.setAttribute('aPosLorenz', new THREE.BufferAttribute(posLorenz, 3));
    geometry.setAttribute('aPosSeal', new THREE.BufferAttribute(posSeal, 3));
    geometry.setAttribute('aPosWave', new THREE.BufferAttribute(posWave, 3));

    geometry.setAttribute('aColorGlobe', new THREE.BufferAttribute(colorGlobe, 3));
    geometry.setAttribute('aColorLorenz', new THREE.BufferAttribute(colorLorenz, 3));
    geometry.setAttribute('aColorSeal', new THREE.BufferAttribute(colorSeal, 3));
    geometry.setAttribute('aColorWave', new THREE.BufferAttribute(colorWave, 3));

    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const uniforms = {
      uTime: { value: 0 },
      uPhaseIndex: { value: 0 },
      uSnapEase: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms,
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
    let isVisible = true; // Default to visible on mount
    const clock = new THREE.Clock();

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.0 }
    );
    observer.observe(container);

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);

      if (!isVisible) return;

      const elapsedTime = prefersReducedMotion ? 0.0 : clock.getElapsedTime();

      mouse.x += (mouse.targetX - mouse.x) * 0.02;
      mouse.y += (mouse.targetY - mouse.y) * 0.02;

      const phaseDuration = 16;
      const totalCycle = (elapsedTime % (phaseDuration * 4)) / phaseDuration;
      const phaseIndex = Math.floor(totalCycle);
      const phaseProgress = totalCycle - phaseIndex;
      const snapEase = phaseProgress === 1 ? 1 : 1 - Math.pow(2, -10 * phaseProgress);

      uniforms.uTime.value = elapsedTime;
      uniforms.uPhaseIndex.value = phaseIndex;
      uniforms.uSnapEase.value = snapEase;
      uniforms.uMouse.value.set(mouse.x, mouse.y);

      particleSystem.rotation.y = elapsedTime * 0.005 + mouse.x * 0.008;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.003) * 0.03;

      renderer.render(scene, camera);
    };

    // Trigger initial render immediately
    renderLoop();

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }, 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeout);
      observer.disconnect();
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
      className="absolute inset-0 h-full w-full pointer-events-none min-h-[300px]"
      aria-hidden="true"
    />
  );
}