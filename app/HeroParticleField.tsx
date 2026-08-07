'use client';

/**
 * Hero particle field — Foundation-title language for Solace.
 *
 * Discrete points (ticks / agents) form a fluid continuum: structure emerges,
 * disperses, and reforms under noise + interaction. Not a chart; an instrument
 * for reading complexity.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { getRenderPixelRatio } from '@/lib/webgl-dpr';
import {
  isWebglPaused,
  observeWebglMountVisibility,
  subscribeWebglPause,
} from '@/lib/webgl-lifecycle';

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aKind; // 0 gold, 1 teal, 2 ember

  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform float uPointerStrength;

  varying float vAlpha;
  varying float vKind;
  varying float vTwinkle;

  // Compact hash / value noise (no external noise lib).
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise3(p);
      p = p * 2.03 + 13.1;
      a *= 0.5;
    }
    return v;
  }

  // Curl-ish displacement from fbm gradients (fluid market field).
  vec3 field(vec3 p, float t) {
    float e = 0.14;
    float n = fbm(p * 0.55 + vec3(t * 0.07, t * 0.05, t * 0.04));
    float nx = fbm(p * 0.55 + vec3(e, 0.0, 0.0) + t * 0.06);
    float ny = fbm(p * 0.55 + vec3(0.0, e, 0.0) + t * 0.06);
    float nz = fbm(p * 0.55 + vec3(0.0, 0.0, e) + t * 0.06);
    vec3 g = vec3(nx - n, ny - n, nz - n) / e;
    return vec3(g.y - g.z, g.z - g.x, g.x - g.y);
  }

  void main() {
    vKind = aKind;
    float t = uTime * (0.22 + aSeed * 0.08);

    vec3 p = position;

    // Slow orbital drift + fluid field.
    float ang = t * 0.15 + aSeed * 6.2831;
    p.xy += vec2(cos(ang), sin(ang)) * (0.04 + aSeed * 0.06);
    p += field(p * 1.2 + aSeed * 3.0, uTime * 0.35) * (0.18 + aSeed * 0.12);

    // Soft dual attractors: structure emerges then loosens (psychohistory mass).
    float epoch = sin(uTime * 0.11) * 0.5 + 0.5;
    vec3 attractA = vec3(-0.35, 0.15, 0.0);
    vec3 attractB = vec3(0.4, -0.1, 0.1);
    float pullA = 0.08 * epoch;
    float pullB = 0.07 * (1.0 - epoch * 0.6);
    p = mix(p, attractA + normalize(p - attractA + 0.001) * 0.55, pullA * (0.4 + aSeed * 0.6));
    p = mix(p, attractB + normalize(p - attractB + 0.001) * 0.7, pullB * (0.3 + aSeed * 0.7));

    // Pointer force field (liquidity path under attention).
    vec3 ptr = vec3(uPointer * 1.4, 0.0);
    float dPtr = length(p.xy - ptr.xy);
    float influence = uPointerStrength * exp(-dPtr * dPtr * 2.2);
    vec2 away = normalize(p.xy - ptr.xy + 0.0001);
    // Curl around pointer — flow, not scatter.
    vec2 tang = vec2(-away.y, away.x);
    p.xy += tang * influence * 0.35;
    p.xy += away * influence * -0.12;
    p.z += influence * 0.15 * sin(uTime + aSeed * 10.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = clamp((-mv.z - 1.0) / 6.0, 0.0, 1.0);
    float tw = 0.65 + 0.35 * sin(uTime * (1.2 + aSeed * 2.5) + aSeed * 40.0);
    vTwinkle = tw;
    vAlpha = (0.35 + 0.55 * tw) * (0.55 + 0.45 * (1.0 - depth));

    float size = aSize * (0.7 + 0.5 * tw) * (1.0 + influence * 1.4);
    gl_PointSize = size * uPixelRatio * (280.0 / max(-mv.z, 1.5));
    gl_PointSize = clamp(gl_PointSize, 0.5 * uPixelRatio, 28.0 * uPixelRatio);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vKind;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Soft luminous dust — gold / teal / ember.
    float core = exp(-d * d * 14.0);
    float halo = exp(-d * d * 4.5) * 0.55;
    float glow = core + halo;

    vec3 gold = vec3(1.0, 0.78, 0.38);
    vec3 amber = vec3(0.95, 0.55, 0.22);
    vec3 teal = vec3(0.35, 0.78, 0.92);
    vec3 ice = vec3(0.55, 0.82, 0.95);
    vec3 ember = vec3(0.95, 0.42, 0.28);

    vec3 col = gold;
    if (vKind > 0.5 && vKind < 1.5) {
      col = mix(teal, ice, vTwinkle);
    } else if (vKind >= 1.5) {
      col = mix(amber, ember, vTwinkle * 0.6);
    } else {
      col = mix(gold, amber, 0.35 + 0.35 * vTwinkle);
    }

    float alpha = glow * vAlpha;
    // Premultiplied-friendly additive look
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

export type HeroParticleFieldProps = {
  className?: string;
};

export default function HeroParticleField({ className }: HeroParticleFieldProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const count = isMobile ? 14_000 : 28_000;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'hero-particle-canvas';
    renderer.domElement.dataset.heroRender = 'particles';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
    camera.position.set(0, 0, 4.2);

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const kinds = new Float32Array(count);

    // Seed a soft cloud with bias toward a sculpted mass (emergent form).
    for (let i = 0; i < count; i++) {
      const seed = Math.random();
      seeds[i] = seed;
      // Gaussian-ish shell with a denser core.
      const r = Math.pow(Math.random(), 0.55) * (1.15 + seed * 0.9);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      // Flatten slightly into a hero-friendly mass.
      const x = r * Math.sin(phi) * Math.cos(theta) * 1.15;
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.85;
      const z = r * Math.cos(phi) * 0.55;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = 0.6 + Math.random() * 2.4;
      // Mix: mostly gold, some teal stream, some ember.
      const k = Math.random();
      kinds[i] = k < 0.58 ? 0 : k < 0.86 ? 1 : 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));

    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uPointer: { value: new THREE.Vector2(10, 10) },
      uPointerStrength: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Soft ambient dark wash so additive particles read as dust in void.
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 14),
      new THREE.MeshBasicMaterial({
        color: 0x05060a,
        transparent: true,
        opacity: 0.0, // fully transparent — section CSS provides dark
      }),
    );
    plate.position.z = -2;
    scene.add(plate);

    let frameId: number | null = null;
    let startedAt = performance.now();
    let inView = true;
    let pageVisible = !document.hidden;
    const pointerTarget = new THREE.Vector2(10, 10);
    const pointerSmooth = new THREE.Vector2(10, 10);
    let pointerStrength = 0;
    let pointerStrengthTarget = 0;

    const canRun = () => inView && pageVisible && !isWebglPaused() && !reducedMotion;

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      const dpr = getRenderPixelRatio(isMobile ? 2 : 2.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uPixelRatio.value = dpr;
    };

    const render = () => {
      const t = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = t;
      pointerSmooth.lerp(pointerTarget, 0.06);
      pointerStrength += (pointerStrengthTarget - pointerStrength) * 0.05;
      uniforms.uPointer.value.copy(pointerSmooth);
      uniforms.uPointerStrength.value = pointerStrength;

      // Gentle camera drift — living observatory, not fixed plate.
      camera.position.x = Math.sin(t * 0.07) * 0.12;
      camera.position.y = Math.cos(t * 0.09) * 0.08;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    const stopLoop = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const animate = () => {
      if (!canRun()) {
        frameId = null;
        return;
      }
      render();
      frameId = requestAnimationFrame(animate);
    };

    const tryStartLoop = () => {
      if (!canRun() || frameId !== null) return;
      frameId = requestAnimationFrame(animate);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerTarget.set(nx * 1.6, ny * 1.1);
      pointerStrengthTarget = 1;
    };

    const onPointerLeave = () => {
      pointerStrengthTarget = 0;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render();
    });

    const visibilityWatch = observeWebglMountVisibility(mount, (visible) => {
      inView = visible;
      if (visible) tryStartLoop();
      else stopLoop();
    });

    const onDocVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) tryStartLoop();
      else stopLoop();
    };

    const unsubPause = subscribeWebglPause((paused) => {
      if (paused) stopLoop();
      else tryStartLoop();
    });

    mount.addEventListener('pointermove', onPointer, { passive: true });
    mount.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onDocVisibility);

    resize();
    resizeObserver.observe(mount);

    if (reducedMotion) {
      uniforms.uTime.value = 8.4;
      render();
    } else {
      tryStartLoop();
    }

    requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
    });

    return () => {
      stopLoop();
      unsubPause();
      document.removeEventListener('visibilitychange', onDocVisibility);
      mount.removeEventListener('pointermove', onPointer);
      mount.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver.disconnect();
      visibilityWatch.disconnect();
      geometry.dispose();
      material.dispose();
      plate.geometry.dispose();
      (plate.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className ?? 'hero-particle-field'}
      aria-hidden="true"
    />
  );
}
