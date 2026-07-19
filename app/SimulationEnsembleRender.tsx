'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Homepage Simulation plate: ensemble of provisional futures that collapse.
// Many faint trajectories; most die; one (or a thin bundle) remains lit.
// Sells the idea — not a dashboard.

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform sampler2D uPaths;
  uniform float uNumPaths;
  uniform float uSurvivor;
  uniform float uCollapse;
  uniform float uEnsembleFade;
  uniform vec2 uPointer;
  uniform float uPointerGlow;

  const int MAX_PATHS = 48;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float hash13(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    // Keep visual mass on the left; copy often sits on the right of the plate.
    vec2 w = uv;
    w.x = uv.x * mix(1.0, 0.82, mobile);

    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.022) * uPointerGlow;

    // Pure black void — ensemble light only.
    vec3 color = vec3(0.0);

    // Soft origin: the present, where all futures begin.
    vec2 origin = vec2(0.045, 0.5);
    float od = length(vec2((w.x - origin.x) * uResolution.x, (uv.y - origin.y) * uResolution.y)) / uPixelRatio;
    float breath = 0.88 + 0.12 * sin(uTime * 0.45);
    color += vec3(0.72, 0.82, 0.9) * exp(-od * od / 14.0) * 0.55 * breath;
    color += vec3(0.35, 0.55, 0.72) * exp(-od * od / (90.0 * 90.0)) * 0.05;

    vec3 ensembleCol = vec3(0.0);
    vec3 survivorCol = vec3(0.0);

    for (int i = 0; i < MAX_PATHS; i++) {
      if (float(i) >= uNumPaths) break;
      float row = (float(i) + 0.5) / uNumPaths;

      vec4 pd = texture2D(uPaths, vec2(clamp(w.x, 0.0, 1.0), row));
      float py = pd.r;
      float defined = pd.g;
      float weight = pd.b;
      float isSurv = pd.a;

      float dxs = 3.0 / 256.0;
      float py2 = texture2D(uPaths, vec2(min(w.x + dxs, 1.0), row)).r;
      float slope = (py2 - py) / max(dxs, 1e-4);
      float corr = inversesqrt(1.0 + slope * slope * (uResolution.y * uResolution.y) / (uResolution.x * uResolution.x));
      float dPix = abs(uv.y - py) * uResolution.y * corr / uPixelRatio;

      // Futures thin as they extend — uncertainty grows with horizon.
      float horizon = smoothstep(0.08, 0.95, w.x);
      float life = defined * (1.0 - 0.55 * horizon);

      float core = exp(-dPix * dPix / (1.1 * 1.1));
      float halo = exp(-dPix * dPix / (8.5 * 8.5));
      float wide = exp(-dPix * dPix / (36.0 * 36.0));

      // Collapse: non-survivors die as uCollapse rises; survivors hold.
      float kill = mix(1.0, 0.02, uCollapse);
      float live = mix(kill, 1.0, isSurv);

      float lum = (0.06 + 0.95 * weight) * life * live;

      // Cool provisional ensemble.
      ensembleCol += vec3(0.55, 0.72, 0.88) * core * 0.22 * lum * (1.0 - isSurv);
      ensembleCol += vec3(0.32, 0.48, 0.68) * halo * 0.05 * lum * (1.0 - isSurv);
      ensembleCol += vec3(0.28, 0.4, 0.55) * wide * 0.012 * weight * life * live * (1.0 - isSurv);

      // Chosen course: warm, sparse, deliberate.
      survivorCol += vec3(1.0, 0.9, 0.72) * core * 0.72 * lum * isSurv;
      survivorCol += vec3(1.0, 0.72, 0.4) * halo * 0.16 * lum * isSurv;
      survivorCol += vec3(1.0, 0.62, 0.3) * wide * 0.04 * weight * isSurv;
    }

    // Soft stochastic shimmer on the field (not a grey floor).
    float dust = hash(floor(w * vec2(90.0, 70.0) + uTime * 0.4));
    color += vec3(0.4, 0.55, 0.7) * step(0.992, dust) * 0.04 * (0.4 + 0.6 * (1.0 - uCollapse));

    color += ensembleCol * uEnsembleFade;
    color += survivorCol * uEnsembleFade;

    // Gentle probe — idea, not UI.
    color *= 1.0 + probe * 0.22;
    color += vec3(0.55, 0.7, 0.85) * probe * 0.04;

    // Grade: keep empty space black.
    float leftMass = smoothstep(0.0, 0.22, uv.x) * smoothstep(1.0, 0.55, uv.x);
    color *= mix(0.55, 1.0, leftMass);
    float vert = smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.82, uv.y);
    color *= 0.78 + 0.22 * vert;

    color = pow(max(color, 0.0), vec3(0.9));
    float lum2 = dot(color, vec3(0.299, 0.587, 0.114));
    float hasLight = smoothstep(0.0, 0.03, lum2);
    color = mix(color, color * vec3(1.05, 1.0, 0.92), smoothstep(0.4, 0.95, lum2) * 0.4 * hasLight);

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 16.0)) - 0.5;
    color += grain * 0.005 * hasLight;
    color = min(color * 1.04, vec3(1.0));

    float alphaLum = dot(color, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(alphaLum * 7.5, 0.0, 1.0);
    vec3 outRgb = alpha > 1e-4 ? color / alpha : vec3(0.0);

    gl_FragColor = vec4(outRgb, alpha);
  }
`;

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PATH_STEPS = 256;
const NUM_PATHS = 48;

function buildEnsemble(rand: () => number) {
  const texture = new Float32Array(PATH_STEPS * NUM_PATHS * 4);
  const survivor = Math.floor(rand() * NUM_PATHS);
  // One near-neighbor as a faint secondary survivor (thin bundle).
  const secondary = (survivor + 1 + Math.floor(rand() * 3)) % NUM_PATHS;

  for (let p = 0; p < NUM_PATHS; p++) {
    const isSurv = p === survivor || p === secondary ? 1 : 0;
    const weight =
      p === survivor ? 1 : p === secondary ? 0.42 + rand() * 0.18 : 0.08 + rand() * 0.28;

    // Brownian-ish path from a shared present.
    let y = 0.5 + (rand() - 0.5) * 0.04;
    const drift = (rand() - 0.5) * 0.55;
    const vol = 0.012 + rand() * 0.028;
    const bend = (rand() - 0.5) * 0.12;
    const ys = new Float32Array(PATH_STEPS);

    for (let s = 0; s < PATH_STEPS; s++) {
      const t = s / (PATH_STEPS - 1);
      y += drift * 0.0045 + (rand() - 0.5) * vol + bend * Math.sin(t * Math.PI) * 0.008;
      y = Math.min(Math.max(y, 0.06), 0.94);
      ys[s] = y;
    }

    // Light smooth — keep stochastic character.
    const smoothed = Float32Array.from(ys);
    for (let pass = 0; pass < 2; pass++) {
      const src = Float32Array.from(smoothed);
      for (let s = 0; s < PATH_STEPS; s++) {
        let sum = 0;
        let count = 0;
        for (let k = -3; k <= 3; k++) {
          const idx = s + k;
          if (idx >= 0 && idx < PATH_STEPS) {
            sum += src[idx];
            count += 1;
          }
        }
        smoothed[s] = sum / count;
      }
    }
    for (let s = 0; s < PATH_STEPS; s++) {
      ys[s] = smoothed[s] * 0.82 + ys[s] * 0.18;
    }

    for (let s = 0; s < PATH_STEPS; s++) {
      const x = s / (PATH_STEPS - 1);
      const defined = 1.0 - 0.72 * Math.min(Math.max((x - 0.04) / 0.9, 0), 1);
      const base4 = (p * PATH_STEPS + s) * 4;
      texture[base4] = ys[s];
      texture[base4 + 1] = defined;
      texture[base4 + 2] = weight;
      texture[base4 + 3] = isSurv;
    }
  }

  return { survivor, texture };
}

export default function SimulationEnsembleRender() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    while (mount.firstChild) {
      mount.removeChild(mount.firstChild);
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return undefined;
    }

    const rand = mulberry32(20260719);
    const { texture: pathData, survivor } = buildEnsemble(rand);
    const epochRand = mulberry32(440011);

    const pathTexture = new THREE.DataTexture(
      pathData,
      PATH_STEPS,
      NUM_PATHS,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    pathTexture.minFilter = THREE.LinearFilter;
    pathTexture.magFilter = THREE.LinearFilter;
    pathTexture.wrapS = THREE.ClampToEdgeWrapping;
    pathTexture.wrapT = THREE.ClampToEdgeWrapping;
    pathTexture.needsUpdate = true;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
      uPaths: { value: pathTexture },
      uNumPaths: { value: NUM_PATHS },
      uSurvivor: { value: survivor },
      uCollapse: { value: 0 },
      uEnsembleFade: { value: 1 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerGlow: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId: number | null = null;
    let startedAt = performance.now();
    let visible = true;

    scene.add(mesh);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.simulationRender = 'ensemble';
    mount.appendChild(renderer.domElement);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width * dpr, height * dpr);
      uniforms.uPixelRatio.value = dpr;
    };

    const pointerState = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, glow: 0, glowTarget: 0 };
    const card = mount.closest('.inst-card');

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return;
      }

      pointerState.tx = (event.clientX - rect.left) / rect.width;
      pointerState.ty = 1 - (event.clientY - rect.top) / rect.height;
      pointerState.glowTarget = 1;
    };
    const onPointerLeave = () => {
      pointerState.glowTarget = 0;
    };

    if (card && !reducedMotion) {
      card.addEventListener('pointermove', onPointerMove as EventListener);
      card.addEventListener('pointerleave', onPointerLeave);
    }

    // Cycle: explore (many paths) → collapse → hold survivor → reseed.
    const EPOCH = 32;
    const FADE = 1.1;
    let swappedEpoch = -1;

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.08;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.08;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.05;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

      if (!reducedMotion) {
        const phase = elapsed % EPOCH;
        const epochIndex = Math.floor(elapsed / EPOCH);

        // Collapse rises through mid-epoch, holds, then ensemble fades to reseed.
        let collapse = 0;
        if (phase < 10) {
          collapse = 0;
        } else if (phase < 16) {
          collapse = (phase - 10) / 6;
        } else if (phase < EPOCH - FADE * 2) {
          collapse = 1;
        } else if (phase < EPOCH - FADE) {
          collapse = 1;
        } else {
          collapse = 1;
        }
        // Smoothstep
        collapse = collapse * collapse * (3 - 2 * collapse);
        uniforms.uCollapse.value = collapse;

        let fade = 1;
        if (phase > EPOCH - FADE * 2) {
          fade =
            phase < EPOCH - FADE
              ? 1 - (phase - (EPOCH - FADE * 2)) / FADE
              : (phase - (EPOCH - FADE)) / FADE;
        }
        if (phase >= EPOCH - FADE && swappedEpoch !== epochIndex) {
          swappedEpoch = epochIndex;
          const next = buildEnsemble(epochRand);
          pathData.set(next.texture);
          pathTexture.needsUpdate = true;
          uniforms.uSurvivor.value = next.survivor;
        }
        uniforms.uEnsembleFade.value = fade * fade * (3 - 2 * fade);
      } else {
        uniforms.uCollapse.value = 0.85;
        uniforms.uEnsembleFade.value = 1;
      }

      renderer.render(scene, camera);
    };

    const animate = () => {
      render();
      frameId = visible ? window.requestAnimationFrame(animate) : null;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render();
    });

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const nowVisible = entries.some((entry) => entry.isIntersecting);
        if (nowVisible && !visible) {
          visible = true;
          if (!reducedMotion && frameId === null) {
            frameId = window.requestAnimationFrame(animate);
          }
        } else if (!nowVisible) {
          visible = false;
        }
      },
      { rootMargin: '120px' },
    );

    resize();
    resizeObserver.observe(mount);
    visibilityObserver.observe(mount);

    if (reducedMotion) {
      startedAt -= 14_000;
      render();
    } else {
      animate();
    }

    window.requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      if (card) {
        card.removeEventListener('pointermove', onPointerMove as EventListener);
        card.removeEventListener('pointerleave', onPointerLeave);
      }

      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      try {
        geometry.dispose();
        material.dispose();
        pathTexture.dispose();
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        while (mount.firstChild) {
          mount.removeChild(mount.firstChild);
        }
      } catch {
        // swallow disposal errors during rapid HMR
      }
    };
  }, []);

  return <div ref={mountRef} className="hermes-render-host" />;
}
