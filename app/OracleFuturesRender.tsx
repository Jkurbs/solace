'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { getRenderPixelRatio } from '@/lib/webgl-dpr';

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
  uniform vec2 uResolved;
  uniform vec2 uPointer;
  uniform float uPointerGlow;
  uniform float uFanFade;

  const int MAX_PATHS = 7;

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

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.07 + vec2(11.3, 7.1);
      a *= 0.5;
    }
    return v;
  }

  // Cold observatory dust, lightly clumped — the Oracle's air is clearer
  // and colder than the Hermes field.
  vec3 dustLayer(vec2 w, float scale, float drift, float weight, float seed, float clump) {
    vec2 q = w + vec2(uTime * drift, uTime * drift * 0.25);
    vec2 g = q * vec2(scale, scale * 0.86);
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float rnd = hash(cell * 1.13 + seed);
    vec2 pp = vec2(hash(cell + vec2(7.1, 3.7) + seed), hash(cell + vec2(2.3, 9.2) + seed)) * 0.8 + 0.1;

    float spawn = step(rnd, 0.05 + clump * 0.07);
    float radius = mix(0.018, 0.06, hash(cell + 5.5 + seed));
    float pt = smoothstep(radius, radius * 0.12, length(fr - pp));
    float tw = 0.55 + 0.45 * sin(uTime * (0.22 + rnd * 0.7) + rnd * 23.0);

    vec3 dcol = mix(vec3(0.55, 0.74, 0.82), vec3(0.92, 0.95, 0.9), hash(cell + 9.9 + seed));
    return dcol * spawn * pt * tw * weight;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    // Mirror of Hermes: the visual mass lives on the LEFT, copy on the right.
    vec2 w = uv;
    w.x = uv.x * mix(1.0, 0.74, mobile);

    // Pointer probe: attention lights the futures under it.
    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.02) * uPointerGlow;

    vec3 color = vec3(0.0028, 0.0038, 0.0058);

    float neb = noise(w * 2.3 + vec2(uTime * 0.01, 0.0)) * 0.6 + noise(w * 4.9) * 0.4;
    color += vec3(0.007, 0.015, 0.024) * neb * 0.6;

    float clump = fbm(w * 3.0 + vec2(uTime * 0.007, -uTime * 0.003));
    clump = smoothstep(0.42, 0.8, clump);

    color += dustLayer(w, 28.0, 0.0022, 0.45, 5.0, clump);
    color += dustLayer(w, 56.0, 0.0038, 0.65, 21.0, clump);
    color += dustLayer(w, 100.0, 0.006, 0.9, 47.0, clump);

    // === THE FUTURES (one present, seven weighted branches) ===
    // Accumulated separately so the fan can fade and redraw when a new
    // reading opens; the present point persists through the refresh.
    vec3 fanCol = vec3(0.0);
    float bundleGlow = 0.0;
    for (int i = 0; i < MAX_PATHS; i++) {
      if (float(i) >= uNumPaths) break;
      float row = (float(i) + 0.5) / uNumPaths;

      vec4 pd = texture2D(uPaths, vec2(w.x, row));
      float py = pd.r;
      float defined = pd.g;
      float weight = pd.b;

      float dxs = 4.0 / 512.0;
      float py2 = texture2D(uPaths, vec2(min(w.x + dxs, 1.0), row)).r;
      float slope = (py2 - py) / dxs;
      float corr = inversesqrt(1.0 + slope * slope * (uResolution.y * uResolution.y) / (uResolution.x * uResolution.x));
      float dPix = abs(uv.y - py) * uResolution.y * corr / uPixelRatio;

      float core = exp(-dPix * dPix / (1.3 * 1.3));
      float halo = exp(-dPix * dPix / (9.0 * 9.0));
      float wide = exp(-dPix * dPix / (42.0 * 42.0));

      // Likelihood is luminance: probable futures burn clearer.
      float lum = (0.1 + 1.05 * weight * weight) * defined;
      fanCol += vec3(0.9, 0.97, 0.94) * core * 0.62 * lum;
      fanCol += vec3(0.53, 0.86, 0.75) * halo * 0.1 * lum;
      fanCol += vec3(0.5, 0.8, 0.74) * wide * 0.025 * weight;
      bundleGlow = max(bundleGlow, halo * weight);
    }
    color += fanCol * uFanFade;

    // The present: a single bright point where all futures begin.
    vec2 origin = vec2(4.0 / 512.0, 0.5);
    float od = length(vec2((w.x - origin.x) * uResolution.x, (uv.y - origin.y) * uResolution.y)) / uPixelRatio;
    float breath = 0.85 + 0.15 * sin(uTime * 0.5);
    color += vec3(0.95, 0.97, 0.93) * exp(-od * od / 9.0) * 1.1 * breath;
    color += vec3(0.53, 0.86, 0.75) * exp(-od * od / (70.0 * 70.0)) * 0.07;

    // The one answered question: a warm point on the strongest branch.
    // It belongs to the current fan, so it fades and returns with it.
    float rd = length(vec2((w.x - uResolved.x) * uResolution.x, (uv.y - uResolved.y) * uResolution.y)) / uPixelRatio;
    float resolvePulse = 0.8 + 0.2 * sin(uTime * 0.35 + 1.7);
    color += vec3(1.0, 0.84, 0.58) * exp(-rd * rd / 5.0) * 1.05 * resolvePulse * uFanFade;
    color += vec3(1.0, 0.7, 0.36) * exp(-rd * rd / (48.0 * 48.0)) * 0.09 * uFanFade;

    // The futures brighten where they are being read.
    color *= 1.0 + probe * 0.3;
    color += vec3(0.6, 0.85, 0.78) * probe * 0.07;

    // === GRADE (same contract as Hermes, mirrored fade) ===
    float rightFade = smoothstep(1.0, 0.7, uv.x);
    color *= mix(mix(0.34, 0.62, mobile), 1.0, rightFade);

    float vert = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.78, uv.y);
    color *= 0.72 + 0.28 * vert;

    color = pow(max(color, 0.0), vec3(0.88));

    float lum2 = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color * vec3(0.82, 0.97, 1.22), color, smoothstep(0.0, 0.3, lum2));
    color = mix(color, color * vec3(1.06, 1.0, 0.9), smoothstep(0.45, 0.95, lum2) * 0.5);

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 18.0)) - 0.5;
    color += grain * 0.009;

    color = min(color * 1.05 + 0.002, vec3(1.0));

    // Luminance-keyed alpha: the void is a thin veil, not a wall — stars
    // from the continuous sky stay visible inside the section.
    float alphaLum = dot(color, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(0.18 + alphaLum * 5.5, 0.0, 1.0);

    gl_FragColor = vec4(color / max(alpha, 0.02), alpha);
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

const PATH_STEPS = 512;
const NUM_PATHS = 7;

function buildFutures(rand: () => number) {
  const texture = new Float32Array(PATH_STEPS * NUM_PATHS * 4);

  // Probability mass, assigned so the strongest branch sits mid-fan.
  const order = [3, 2, 4, 1, 5, 0, 6];
  const base = [1.0, 0.68, 0.52, 0.38, 0.27, 0.19, 0.13];
  const weights = new Array(NUM_PATHS).fill(0);
  order.forEach((pathIndex, rank) => {
    weights[pathIndex] = base[rank];
  });

  const ys: Float32Array[] = [];

  for (let p = 0; p < NUM_PATHS; p++) {
    const yRow = new Float32Array(PATH_STEPS);
    // Analytic cone: each future is a near-straight ray from the present,
    // bowed gently so the fan feels grown rather than drafted.
    const spread = ((p - (NUM_PATHS - 1) / 2) / ((NUM_PATHS - 1) / 2)) * 0.27 + (rand() - 0.5) * 0.02;
    const bow = (rand() - 0.5) * 0.07;
    const texSeed = rand() * 100;

    for (let s = 0; s < PATH_STEPS; s++) {
      const t = s / (PATH_STEPS - 1);
      const y =
        0.5 +
        spread * Math.pow(t, 0.9) +
        bow * Math.sin(t * Math.PI) +
        (Math.sin(s * 0.11 + texSeed) + Math.sin(s * 0.041 + texSeed * 1.7)) * 0.0022 * t;
      yRow[s] = Math.min(Math.max(y, 0.08), 0.92);
    }

    // Smooth into confident arcs, keep a whisper of texture.
    const smoothed = Float32Array.from(yRow);
    for (let pass = 0; pass < 2; pass++) {
      const src = Float32Array.from(smoothed);
      const radius = 8;
      for (let s = 0; s < PATH_STEPS; s++) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const idx = s + k;
          if (idx >= 0 && idx < PATH_STEPS) {
            sum += src[idx];
            count++;
          }
        }
        smoothed[s] = sum / count;
      }
    }
    for (let s = 0; s < PATH_STEPS; s++) {
      yRow[s] = smoothed[s] + (yRow[s] - smoothed[s]) * 0.08;
    }

    ys.push(yRow);
  }

  for (let p = 0; p < NUM_PATHS; p++) {
    for (let s = 0; s < PATH_STEPS; s++) {
      const x = s / (PATH_STEPS - 1);
      // Definition decays as the future extends — uncertainty grows.
      const defined = 1.0 - 0.62 * Math.min(Math.max((x - 0.08) / 0.86, 0), 1);
      const base4 = (p * PATH_STEPS + s) * 4;
      texture[base4] = ys[p][s];
      texture[base4 + 1] = defined;
      texture[base4 + 2] = weights[p];
      texture[base4 + 3] = 1;
    }
  }

  const strongest = order[0];
  const resolvedX = 0.34;
  const resolvedY = ys[strongest][Math.round(resolvedX * (PATH_STEPS - 1))];

  return { texture, resolved: [resolvedX, resolvedY] as [number, number] };
}

export default function OracleFuturesRender() {
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

    const rand = mulberry32(20260612);
    const { texture: pathData, resolved } = buildFutures(rand);
    // Separate stream for fan-refresh epochs; the opening fan stays identical.
    const epochRand = mulberry32(881003);

    const pathTexture = new THREE.DataTexture(
      pathData,
      PATH_STEPS,
      NUM_PATHS,
      THREE.RGBAFormat,
      THREE.FloatType
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
      uResolved: { value: new THREE.Vector2(resolved[0], resolved[1]) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerGlow: { value: 0 },
      uFanFade: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
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
    renderer.domElement.dataset.oracleRender = 'futures';
    mount.appendChild(renderer.domElement);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = getRenderPixelRatio(3);
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));

      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w * dpr, h * dpr);
      uniforms.uPixelRatio.value = dpr;
    };

    // Pointer probe: eased toward the cursor while it is over the card.
    const pointerState = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, glow: 0, glowTarget: 0 };
    const card = mount.closest('.inst-card');

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
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

    // Fan-refresh epochs: the futures fade, a new fan opens from the same
    // present, the resolved point moves with it. Offset from the Hermes
    // card's cadence so the two never breathe in sync.
    const EPOCH = 29;
    const EPOCH_FADE = 1.05;
    let swappedEpoch = -1;

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.09;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.09;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.055;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

      if (!reducedMotion) {
        const phase = elapsed % EPOCH;
        const epochIndex = Math.floor(elapsed / EPOCH);
        let fade = 1;
        if (phase > EPOCH - EPOCH_FADE * 2) {
          fade =
            phase < EPOCH - EPOCH_FADE
              ? 1 - (phase - (EPOCH - EPOCH_FADE * 2)) / EPOCH_FADE
              : (phase - (EPOCH - EPOCH_FADE)) / EPOCH_FADE;
        }
        if (phase >= EPOCH - EPOCH_FADE && swappedEpoch !== epochIndex) {
          swappedEpoch = epochIndex;
          const next = buildFutures(epochRand);
          pathData.set(next.texture);
          pathTexture.needsUpdate = true;
          uniforms.uResolved.value.set(next.resolved[0], next.resolved[1]);
        }
        uniforms.uFanFade.value = fade * fade * (3 - 2 * fade);
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
      { rootMargin: '120px' }
    );

    resize();
    resizeObserver.observe(mount);
    visibilityObserver.observe(mount);

    if (reducedMotion) {
      startedAt -= 8400;
      render();
    } else {
      animate();
    }

    // First frame is painted at opacity 0; the class swap runs the CSS fade-in.
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
