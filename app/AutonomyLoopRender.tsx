'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Homepage Autonomy plate: observe → model → act → monitor.
// Distinct motion vocabulary — a sequential loop that can stand down.
// Gated: the exit toward the world never fully opens. Cool steel-cyan, not
// Hermes amber or Simulation celestial.

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
  uniform vec2 uPointer;
  uniform float uPointerGlow;
  // Token phase 0..1 around the loop; dwells encoded in JS → smooth progress.
  uniform float uToken;
  // 0..1 how "open" the world gate is (always low while Autonomy is gated).
  uniform float uGate;
  // Stand-down energy: dims Act station and slows the token visually.
  uniform float uStandDown;

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

  // Rounded rectangle SDF (loop rail path is a rounded rect track).
  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // Point on rounded-rect centerline parameterized by t in [0,1].
  // Order: bottom → right → top → left (clockwise from bottom-left of top edge... 
  // Start at Observe (left-center) going clockwise: left → top → right → bottom.
  vec2 loopPoint(float t) {
    // Normalized perimeter of a rounded rect with half-size b and corner radius r.
    vec2 b = vec2(0.34, 0.22);
    float r = 0.10;
    // Straight lengths
    float hx = 2.0 * (b.x - r);
    float hy = 2.0 * (b.y - r);
    float arc = 1.5707963 * r; // quarter circle
    float perim = 2.0 * hx + 2.0 * hy + 4.0 * arc;
    float s = fract(t) * perim;

    // Start mid-left, going up (into top-left arc first after half left edge).
    // Rebuild: start bottom-left going right for cleaner station placement.
    // Bottom edge L→R
    if (s < hx) {
      float u = s / hx;
      return vec2(mix(-(b.x - r), (b.x - r), u), -b.y);
    }
    s -= hx;
    // Bottom-right arc
    if (s < arc) {
      float a = -1.5707963 + (s / arc) * 1.5707963;
      return vec2(b.x - r, -b.y + r) + r * vec2(cos(a), sin(a));
    }
    s -= arc;
    // Right edge B→T
    if (s < hy) {
      float u = s / hy;
      return vec2(b.x, mix(-(b.y - r), (b.y - r), u));
    }
    s -= hy;
    // Top-right arc
    if (s < arc) {
      float a = 0.0 + (s / arc) * 1.5707963;
      return vec2(b.x - r, b.y - r) + r * vec2(cos(a), sin(a));
    }
    s -= arc;
    // Top edge R→L
    if (s < hx) {
      float u = s / hx;
      return vec2(mix((b.x - r), -(b.x - r), u), b.y);
    }
    s -= hx;
    // Top-left arc
    if (s < arc) {
      float a = 1.5707963 + (s / arc) * 1.5707963;
      return vec2(-(b.x - r), b.y - r) + r * vec2(cos(a), sin(a));
    }
    s -= arc;
    // Left edge T→B
    if (s < hy) {
      float u = s / hy;
      return vec2(-b.x, mix((b.y - r), -(b.y - r), u));
    }
    s -= hy;
    // Bottom-left arc
    float a = 3.14159265 + (s / arc) * 1.5707963;
    return vec2(-(b.x - r), -(b.y - r)) + r * vec2(cos(a), sin(a));
  }

  float nodeGlow(vec2 w, vec2 c, float rPix, float energy) {
    float d = length((w - c) * uResolution.xy) / uPixelRatio;
    float core = exp(-d * d / (rPix * rPix));
    float halo = exp(-d * d / ((rPix * 4.2) * (rPix * 4.2)));
    return (core * 1.1 + halo * 0.22) * energy;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    // Composition: loop sits mid-left so copy can live on the right.
    vec2 w = uv;
    w.x = mix(w.x, 0.08 + w.x * 0.78, mobile * 0.4);
    w = (w - 0.5) * vec2(1.0, 1.0 / max(aspect * 0.55 + 0.45, 0.75)) + 0.5;
    // Center the loop slightly left of plate center.
    vec2 p = w - vec2(0.46, 0.52);

    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.02) * uPointerGlow;

    // Void — cool steel, not dead black.
    vec3 color = vec3(0.0025, 0.0038, 0.006);
    float neb = hash(floor(w * 40.0 + uTime * 0.02));
    color += vec3(0.01, 0.018, 0.03) * neb * 0.15;

    // --- LOOP RAIL ---
    // Distance to rounded-rect track via sample of nearest point on path.
    float minD = 1e5;
    float nearestT = 0.0;
    for (int i = 0; i < 64; i++) {
      float tt = float(i) / 64.0;
      vec2 lp = loopPoint(tt);
      float d = length((p - lp) * uResolution.xy) / uPixelRatio;
      if (d < minD) {
        minD = d;
        nearestT = tt;
      }
    }

    float railCore = exp(-minD * minD / (1.6 * 1.6));
    float railHalo = exp(-minD * minD / (10.0 * 10.0));
    float railWide = exp(-minD * minD / (28.0 * 28.0));
    // Dimmer after Act (token progress) and during stand-down.
    float railLife = mix(0.55, 1.0, 1.0 - uStandDown * 0.45);
    vec3 railCol = vec3(0.35, 0.62, 0.78);
    color += railCol * railCore * 0.55 * railLife;
    color += railCol * railHalo * 0.12 * railLife;
    color += vec3(0.15, 0.28, 0.4) * railWide * 0.04;

    // Direction ticks (subtle chevrons along the rail).
    float tick = abs(fract(nearestT * 18.0 + uTime * 0.02) - 0.5);
    color += vec3(0.45, 0.75, 0.9) * railCore * smoothstep(0.2, 0.02, tick) * 0.25 * railLife;

    // --- FOUR STATIONS ---
    // Approximate station positions on the loop (Observe L, Model T, Act R, Monitor B).
    vec2 cObs = loopPoint(0.88);   // left side
    vec2 cMod = loopPoint(0.12);   // bottom→right region → use top: ~0.38
    cMod = loopPoint(0.38);
    vec2 cAct = loopPoint(0.62);   // right
    vec2 cMon = loopPoint(0.12);   // bottom

    // Station energies: pulse when token is near; Act dims on stand-down.
    float tok = uToken;
    float nearObs = exp(-pow(min(abs(tok - 0.88), 1.0 - abs(tok - 0.88)) * 8.0, 2.0));
    float nearMod = exp(-pow(min(abs(tok - 0.38), 1.0 - abs(tok - 0.38)) * 8.0, 2.0));
    float nearAct = exp(-pow(min(abs(tok - 0.62), 1.0 - abs(tok - 0.62)) * 8.0, 2.0));
    float nearMon = exp(-pow(min(abs(tok - 0.12), 1.0 - abs(tok - 0.12)) * 8.0, 2.0));

    float eObs = 0.35 + 0.65 * nearObs;
    float eMod = 0.35 + 0.65 * nearMod;
    float eAct = (0.35 + 0.65 * nearAct) * mix(1.0, 0.28, uStandDown);
    float eMon = 0.35 + 0.65 * nearMon;

    vec3 cool = vec3(0.4, 0.75, 0.95);
    vec3 actCol = mix(vec3(0.55, 0.82, 0.95), vec3(0.35, 0.42, 0.5), uStandDown);

    color += cool * nodeGlow(p, cObs, 5.5, eObs);
    color += cool * nodeGlow(p, cMod, 5.5, eMod);
    color += actCol * nodeGlow(p, cAct, 5.5, eAct);
    color += cool * nodeGlow(p, cMon, 5.5, eMon);

    // Station rings (thin).
    float ring = 0.0;
    ring += exp(-pow(length((p - cObs) * uResolution.xy) / uPixelRatio - 9.0, 2.0) / 2.5) * eObs;
    ring += exp(-pow(length((p - cMod) * uResolution.xy) / uPixelRatio - 9.0, 2.0) / 2.5) * eMod;
    ring += exp(-pow(length((p - cAct) * uResolution.xy) / uPixelRatio - 9.0, 2.0) / 2.5) * eAct;
    ring += exp(-pow(length((p - cMon) * uResolution.xy) / uPixelRatio - 9.0, 2.0) / 2.5) * eMon;
    color += vec3(0.5, 0.8, 0.95) * ring * 0.35;

    // --- TOKEN ---
    vec2 tokenP = loopPoint(tok);
    float td = length((p - tokenP) * uResolution.xy) / uPixelRatio;
    float breath = 0.85 + 0.15 * sin(uTime * 2.2);
    float tCore = exp(-td * td / (3.2 * 3.2)) * breath;
    float tHalo = exp(-td * td / (16.0 * 16.0));
    float tWide = exp(-td * td / (40.0 * 40.0));
    vec3 tCol = mix(vec3(0.55, 0.85, 1.0), vec3(0.9, 0.92, 0.75), 1.0 - uStandDown * 0.5);
    color += tCol * tCore * 1.15;
    color += tCol * tHalo * 0.35;
    color += tCol * tWide * 0.08;

    // Token wake along the rail behind it.
    float wake = 0.0;
    for (int k = 1; k <= 6; k++) {
      float wt = fract(tok - float(k) * 0.012);
      vec2 wp = loopPoint(wt);
      float wd = length((p - wp) * uResolution.xy) / uPixelRatio;
      wake += exp(-wd * wd / (2.5 * 2.5)) * (1.0 - float(k) / 7.0);
    }
    color += tCol * wake * 0.22 * (1.0 - uStandDown * 0.4);

    // --- WORLD GATE (right side — incomplete exit) ---
    // A vertical shutter just outside the Act station: mostly closed.
    vec2 gateC = vec2(0.42, 0.0);
    float gateX = abs(p.x - gateC.x);
    float gateY = abs(p.y);
    float gateBar = smoothstep(0.03, 0.0, gateX) * smoothstep(0.28, 0.08, gateY);
    float teeth = abs(fract(p.y * 22.0) - 0.5);
    float gateTeeth = gateBar * smoothstep(0.22, 0.05, teeth);
    float gateOpen = uGate; // low while gated
    float gateVis = gateBar * (1.0 - gateOpen * 0.7);
    color += vec3(0.45, 0.55, 0.62) * gateVis * 0.2;
    color += vec3(0.7, 0.85, 0.95) * gateTeeth * 0.35;
    // Soft light leaking through the nearly-closed gate.
    float leak = exp(-gateX * gateX / 0.0012) * exp(-gateY * gateY / 0.06) * (0.08 + gateOpen * 0.5);
    color += vec3(0.5, 0.72, 0.85) * leak * 0.15;

    // Stand-down veil — whole loop quiets.
    color *= mix(1.0, 0.72, uStandDown);

    // Pointer probe.
    color *= 1.0 + probe * 0.22;
    color += vec3(0.4, 0.7, 0.9) * probe * 0.06;

    // Grade.
    float leftFade = smoothstep(0.0, 0.2, uv.x);
    color *= mix(mix(0.4, 0.7, mobile), 1.0, leftFade);
    float rightFade = smoothstep(1.0, 0.55, uv.x);
    color *= mix(0.5, 1.0, rightFade);
    float vert = smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.82, uv.y);
    color *= 0.78 + 0.22 * vert;

    color = pow(max(color, 0.0), vec3(0.9));
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color * vec3(0.85, 0.95, 1.15), color, smoothstep(0.0, 0.25, lum));

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 14.0)) - 0.5;
    color += grain * 0.008 * smoothstep(0.0, 0.04, lum);
    color = min(color * 1.05, vec3(1.0));

    float alphaLum = dot(color, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(0.16 + alphaLum * 5.8, 0.0, 1.0);
    gl_FragColor = vec4(color / max(alpha, 0.02), alpha);
  }
`;

/** Map raw time → token phase with station dwells + occasional stand-down at Act. */
function tokenPhase(elapsed: number) {
  // Segment weights around the loop (must sum to 1).
  // Bottom travel, Monitor dwell, left travel, Observe dwell, top travel, Model dwell,
  // right travel, Act dwell (sometimes long = stand-down).
  const CYCLE = 14.0;
  const t = (elapsed % CYCLE) / CYCLE;

  // Piecewise ease through stations at fixed perimeter positions:
  // Mon 0.12, Obs 0.88, Mod 0.38, Act 0.62 — use ordered stops along t.
  // Order along path starting bottom-left going right:
  // 0.00–0.12 bottom → Mon(0.12), dwell, left side up to Obs(~0.88 wraps)...
  // Simpler: keyframe stops in path-t space with holds.
  const keys = [
    { t: 0.0, p: 0.0 },
    { t: 0.08, p: 0.1 }, // approach Monitor
    { t: 0.18, p: 0.12 }, // dwell Monitor
    { t: 0.28, p: 0.35 },
    { t: 0.38, p: 0.38 }, // dwell Model (top)
    { t: 0.48, p: 0.55 },
    { t: 0.52, p: 0.62 }, // arrive Act
    // Stand-down window: hold at Act longer every other cycle.
    { t: 0.72, p: 0.62 },
    { t: 0.82, p: 0.85 },
    { t: 0.9, p: 0.88 }, // dwell Observe
    { t: 1.0, p: 1.0 },
  ];

  // Every other cycle, extend Act hold (stand-down).
  const cycleIndex = Math.floor(elapsed / CYCLE);
  const standDownCycle = cycleIndex % 2 === 1;

  let phase = t;
  if (standDownCycle && t >= 0.52 && t < 0.78) {
    // Linger at Act.
    return { token: 0.62, standDown: smoothstepLocal(0.52, 0.58, t) * (1 - smoothstepLocal(0.72, 0.78, t)) };
  }

  // Interpolate keys.
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (phase >= a.t && phase <= b.t) {
      const u = (phase - a.t) / Math.max(b.t - a.t, 1e-6);
      const e = u * u * (3 - 2 * u);
      return { token: a.p + (b.p - a.p) * e, standDown: 0 };
    }
  }
  return { token: 0, standDown: 0 };
}

function smoothstepLocal(e0: number, e1: number, x: number) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

export default function AutonomyLoopRender() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

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
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerGlow: { value: 0 },
      uToken: { value: 0.12 },
      uGate: { value: 0.08 },
      uStandDown: { value: 0 },
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
    scene.add(mesh);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId: number | null = null;
    let startedAt = performance.now();
    let visible = true;
    let standDownSmoothed = 0;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.autonomyRender = 'loop';
    mount.appendChild(renderer.domElement);

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
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.08;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.08;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.05;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

      if (!reducedMotion) {
        const { token, standDown } = tokenPhase(elapsed);
        uniforms.uToken.value = token;
        standDownSmoothed += (standDown - standDownSmoothed) * 0.04;
        uniforms.uStandDown.value = standDownSmoothed;
        // Gate stays almost closed — Autonomy is not open.
        uniforms.uGate.value = 0.06 + 0.04 * Math.sin(elapsed * 0.15);
      } else {
        uniforms.uToken.value = 0.38;
        uniforms.uStandDown.value = 0.55;
        uniforms.uGate.value = 0.08;
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
      startedAt -= 8_000;
      render();
    } else {
      animate();
    }

    window.requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
    });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (card) {
        card.removeEventListener('pointermove', onPointerMove as EventListener);
        card.removeEventListener('pointerleave', onPointerLeave);
      }
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      try {
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        while (mount.firstChild) mount.removeChild(mount.firstChild);
      } catch {
        // HMR
      }
    };
  }, []);

  return <div ref={mountRef} className="hermes-render-host" />;
}
