'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

  const float TAU = 6.28318530718;

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

  mat2 rot2(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  // Cold, sparse observatory dust — same lattice technique as the Hermes
  // field, but uniform density: the instrument floats in clear night air.
  vec3 dustLayer(vec2 w, float scale, float drift, float weight, float seed) {
    vec2 q = w + vec2(uTime * drift, uTime * drift * 0.2);
    vec2 g = q * vec2(scale, scale * 0.86);
    vec2 cell = floor(g);
    vec2 fr = fract(g);

    float rnd = hash(cell * 1.13 + seed);
    vec2 pp = vec2(hash(cell + vec2(7.1, 3.7) + seed), hash(cell + vec2(2.3, 9.2) + seed)) * 0.8 + 0.1;

    float spawn = step(rnd, 0.045);
    float radius = mix(0.02, 0.06, hash(cell + 5.5 + seed));
    float pt = smoothstep(radius, radius * 0.12, length(fr - pp));
    float tw = 0.55 + 0.45 * sin(uTime * (0.18 + rnd * 0.5) + rnd * 23.0);

    vec3 dcol = mix(vec3(0.66, 0.70, 0.76), vec3(0.95, 0.92, 0.86), hash(cell + 9.9 + seed));
    return dcol * spawn * pt * tw * weight;
  }

  // One hairline elliptical orbit: crisp 1px line, slow dash rotation,
  // a soft glow, and a node riding the track.
  vec3 orbitRing(vec2 p, float radius, float squash, float tilt, float period, float phase, vec3 tint, float weight) {
    float pxPerUnit = uResolution.y / uPixelRatio;

    vec2 q = rot2(tilt) * p;
    q.y /= squash;
    float r = length(q);
    float ang = atan(q.y, q.x);

    float d = abs(r - radius) * pxPerUnit * mix(squash, 1.0, 0.5);
    float line = exp(-d * d / 0.55);
    float glow = exp(-d * d / (26.0 * 26.0));

    float dash = 0.62 + 0.38 * sin(ang * 3.0 - uTime * TAU / period + phase);

    vec3 col = tint * (line * 0.52 * dash + glow * 0.022) * weight;

    // Node riding the orbit.
    float na = uTime * TAU / (period * 1.35) + phase * 2.7;
    vec2 npos = vec2(cos(na), sin(na)) * radius;
    npos.y *= squash;
    npos = rot2(-tilt) * npos;
    float nd = length(p - npos) * pxPerUnit;
    col += vec3(0.97, 0.94, 0.88) * exp(-nd * nd / 3.2) * 0.8 * weight;
    col += tint * exp(-nd * nd / (90.0 * 90.0)) * 0.05 * weight;

    return col;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    vec2 w = uv;
    vec2 center = mix(vec2(0.67, 0.5), vec2(0.56, 0.44), mobile);
    vec2 p = w - center;
    p.x *= aspect;

    // Cold night base, faint nebula — same floor as the Hermes field's void.
    vec3 color = vec3(0.0028, 0.0037, 0.0055);
    float neb = noise(w * 2.2 + vec2(uTime * 0.008, 0.0)) * 0.6 + noise(w * 4.7) * 0.4;
    color += vec3(0.008, 0.014, 0.023) * neb * 0.55;

    // Sparse cold dust, two depths.
    color += dustLayer(w, 26.0, 0.0016, 0.5, 3.0);
    color += dustLayer(w, 54.0, 0.0028, 0.7, 19.0);

    // === THE INSTRUMENT (three tilted orbits, axes, center) ===
    color += orbitRing(p, 0.21, 0.38, -0.28, 46.0, 0.0, vec3(0.82, 0.80, 0.75), 1.0);
    color += orbitRing(p, 0.305, 0.52, 0.66, 58.0, 2.1, vec3(0.66, 0.72, 0.78), 0.7);
    color += orbitRing(p, 0.405, 0.66, 1.33, 68.0, 4.4, vec3(0.95, 0.92, 0.86), 0.55);

    float pxPerUnit = uResolution.y / uPixelRatio;

    // Two hairline axes through the center, faded along their length.
    for (int i = 0; i < 2; i++) {
      float theta = i == 0 ? 0.21 : 1.78;
      vec2 dir = vec2(cos(theta), sin(theta));
      float across = abs(p.x * dir.y - p.y * dir.x) * pxPerUnit;
      float along = abs(dot(p, dir));
      float axis = exp(-across * across / 0.45) * smoothstep(0.5, 0.05, along);
      color += vec3(0.86, 0.84, 0.79) * axis * (i == 0 ? 0.07 : 0.045);
    }

    // Slow radar sweep brushing across the orbit band.
    float ang = atan(p.y, p.x);
    float sweepA = fract(uTime / 34.0) * TAU - 3.14159;
    float angD = abs(mod(ang - sweepA + 3.14159, TAU) - 3.14159);
    float band = smoothstep(0.05, 0.16, length(p)) * smoothstep(0.5, 0.3, length(p));
    color += vec3(0.82, 0.80, 0.74) * smoothstep(0.6, 0.0, angD) * band * 0.05;

    // Center: the observatory's eye.
    float cd = length(p) * pxPerUnit;
    color += vec3(0.97, 0.94, 0.88) * exp(-cd * cd / 4.5) * 1.1;
    color += vec3(0.82, 0.80, 0.75) * exp(-cd * cd / (120.0 * 120.0)) * 0.05;

    // Warm foreshadow: the Hermes field glowing just below the fold.
    vec2 fs = (w - vec2(1.04, 1.12)) * vec2(1.0, 1.5);
    color += vec3(0.40, 0.38, 0.34) * exp(-dot(fs, fs) / 0.2) * 0.55;

    // === GRADE (identical contract to the Hermes render) ===
    float leftFade = smoothstep(0.0, 0.30, uv.x);
    color *= mix(mix(0.38, 0.66, mobile), 1.0, leftFade);

    float vert = smoothstep(0.0, 0.16, uv.y) * smoothstep(1.0, 0.8, uv.y);
    color *= 0.74 + 0.26 * vert;

    color = pow(max(color, 0.0), vec3(0.88));

    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color * vec3(0.82, 0.97, 1.22), color, smoothstep(0.0, 0.3, lum));
    color = mix(color, color * vec3(1.06, 1.0, 0.9), smoothstep(0.45, 0.95, lum) * 0.5);

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 18.0)) - 0.5;
    color += grain * 0.009;

    color = min(color * 1.05 + 0.002, vec3(1.0));

    // Luminance-keyed alpha so the sky's stars read through the hero's air.
    float alphaLum = dot(color, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(0.18 + alphaLum * 5.5, 0.0, 1.0);

    gl_FragColor = vec4(color / max(alpha, 0.02), alpha);
  }
`;

export default function HeroObservatoryRender() {
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

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
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
    renderer.setClearColor(0x020202, 0);
    renderer.domElement.className = 'hero-render-canvas';
    renderer.domElement.dataset.heroRender = 'observatory';
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

    const render = () => {
      uniforms.uTime.value = (performance.now() - startedAt) / 1000;
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

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      try {
        geometry.dispose();
        material.dispose();
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

  return <div ref={mountRef} className="hero-render-host" />;
}
