'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { getRenderPixelRatio } from '@/lib/webgl-dpr';

// Homepage Autonomy plate: observe → model → act → monitor.
// Sequential loop that can stand down; world gate stays nearly closed.
// Clarity: SDF rail (constant width), distinct station glyphs, smooth token.

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Shared loop geometry constants (half-size + corner radius in plate space).
const fragmentShader = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerGlow;
  uniform float uToken;
  uniform float uGate;
  uniform float uStandDown;

  const vec2 LOOP_B = vec2(0.32, 0.205);
  const float LOOP_R = 0.095;
  const float PI = 3.14159265;
  const float HALF_PI = 1.5707963;

  float hash13(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // Arc length of the rounded-rect centerline.
  float loopPerim() {
    float hx = 2.0 * (LOOP_B.x - LOOP_R);
    float hy = 2.0 * (LOOP_B.y - LOOP_R);
    float arc = HALF_PI * LOOP_R;
    return 2.0 * hx + 2.0 * hy + 4.0 * arc;
  }

  // Point on centerline, t in [0,1]. Start mid-bottom, go CCW:
  // bottom mid → right → top → left → bottom mid.
  // Reparameterized so stations land at clean 0, 0.25, 0.5, 0.75.
  vec2 loopPoint(float t) {
    float hx = 2.0 * (LOOP_B.x - LOOP_R);
    float hy = 2.0 * (LOOP_B.y - LOOP_R);
    float arc = HALF_PI * LOOP_R;
    float perim = loopPerim();
    // Offset so t=0 is bottom-center (Monitor).
    float s = fract(t + 0.0) * perim;
    // Start halfway along bottom edge (left half already done conceptually):
    // Begin at bottom-left corner going right, but shift by hx/2 so t=0 is mid-bottom.
    s = mod(s + hx * 0.5, perim);

    if (s < hx) {
      float u = s / hx;
      return vec2(mix(-(LOOP_B.x - LOOP_R), (LOOP_B.x - LOOP_R), u), -LOOP_B.y);
    }
    s -= hx;
    if (s < arc) {
      float a = -HALF_PI + (s / arc) * HALF_PI;
      return vec2(LOOP_B.x - LOOP_R, -LOOP_B.y + LOOP_R) + LOOP_R * vec2(cos(a), sin(a));
    }
    s -= arc;
    if (s < hy) {
      float u = s / hy;
      return vec2(LOOP_B.x, mix(-(LOOP_B.y - LOOP_R), (LOOP_B.y - LOOP_R), u));
    }
    s -= hy;
    if (s < arc) {
      float a = 0.0 + (s / arc) * HALF_PI;
      return vec2(LOOP_B.x - LOOP_R, LOOP_B.y - LOOP_R) + LOOP_R * vec2(cos(a), sin(a));
    }
    s -= arc;
    if (s < hx) {
      float u = s / hx;
      return vec2(mix((LOOP_B.x - LOOP_R), -(LOOP_B.x - LOOP_R), u), LOOP_B.y);
    }
    s -= hx;
    if (s < arc) {
      float a = HALF_PI + (s / arc) * HALF_PI;
      return vec2(-(LOOP_B.x - LOOP_R), LOOP_B.y - LOOP_R) + LOOP_R * vec2(cos(a), sin(a));
    }
    s -= arc;
    if (s < hy) {
      float u = s / hy;
      return vec2(-LOOP_B.x, mix((LOOP_B.y - LOOP_R), -(LOOP_B.y - LOOP_R), u));
    }
    s -= hy;
    float a = PI + (s / arc) * HALF_PI;
    return vec2(-(LOOP_B.x - LOOP_R), -(LOOP_B.y - LOOP_R)) + LOOP_R * vec2(cos(a), sin(a));
  }

  // Exact station slots after mid-bottom offset: Monitor, Act, Model, Observe.
  // t = 0 bottom, ~0.25 right, ~0.5 top, ~0.75 left.
  vec2 stationMonitor() { return loopPoint(0.0); }
  vec2 stationAct() { return loopPoint(0.25); }
  vec2 stationModel() { return loopPoint(0.5); }
  vec2 stationObserve() { return loopPoint(0.75); }

  float pixDist(vec2 a, vec2 b) {
    return length((a - b) * uResolution.xy) / uPixelRatio;
  }

  // Soft disc + ring for a station.
  vec3 drawStation(vec2 p, vec2 c, vec3 col, float energy, int kind) {
    float d = pixDist(p, c);
    float core = exp(-d * d / (4.5 * 4.5));
    float body = exp(-d * d / (9.0 * 9.0));
    float halo = exp(-d * d / (22.0 * 22.0));
    float ring = exp(-pow(d - 11.0, 2.0) / 2.8);

    // Glyphs: 0 observe (double ring), 1 model (diamond-ish cross), 2 act (solid + chevron), 3 monitor (square ring)
    float glyph = 0.0;
    vec2 q = (p - c) * uResolution.xy / uPixelRatio;
    if (kind == 0) {
      // Observe — concentric rings (eye).
      glyph = exp(-pow(length(q) - 5.5, 2.0) / 1.8);
      glyph += exp(-pow(length(q) - 2.2, 2.0) / 1.2) * 0.8;
    } else if (kind == 1) {
      // Model — small diamond.
      float dia = abs(q.x) + abs(q.y);
      glyph = exp(-pow(dia - 5.0, 2.0) / 2.2);
      glyph += exp(-dia * dia / 6.0) * 0.35;
    } else if (kind == 2) {
      // Act — filled core + outward chevron.
      glyph = exp(-length(q) * length(q) / 12.0);
      float chev = abs(q.y) + q.x * 0.9;
      glyph += exp(-pow(chev - 4.5, 2.0) / 2.0) * step(0.0, q.x) * 0.7;
    } else {
      // Monitor — rounded square ring.
      float sq = max(abs(q.x), abs(q.y));
      glyph = exp(-pow(sq - 5.0, 2.0) / 2.0);
      glyph += exp(-sq * sq / 10.0) * 0.25;
    }

    vec3 outc = vec3(0.0);
    outc += col * core * 0.95 * energy;
    outc += col * body * 0.28 * energy;
    outc += col * halo * 0.1 * energy;
    outc += col * ring * 0.55 * energy;
    outc += col * glyph * 0.85 * energy;
    return outc;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    vec2 w = uv;
    w.x = mix(w.x, 0.1 + w.x * 0.8, mobile * 0.35);
    // Stable aspect so the loop stays circular-ish on all plates.
    float ax = max(aspect, 0.85);
    w = (w - vec2(0.47, 0.52)) * vec2(1.0, 1.15 / ax);

    vec2 p = w;

    vec2 toPtr = uv - uPointer;
    float prd = length(toPtr * vec2(1.2, 1.0));
    float probe = exp(-prd * prd / 0.018) * uPointerGlow;

    // Deep cool void.
    vec3 color = vec3(0.0018, 0.0028, 0.0045);

    // --- RAIL (SDF — perfectly smooth constant-width track) ---
    float dRail = abs(sdRoundBox(p, LOOP_B, LOOP_R));
    float dPix = dRail * min(uResolution.x, uResolution.y) / uPixelRatio;

    float railLife = mix(1.0, 0.55, uStandDown);
    // Dual rail for clarity.
    float railIn = exp(-pow(dPix - 0.0, 2.0) / 1.1);
    float railMid = exp(-pow(dPix - 2.2, 2.0) / 1.6);
    float railHalo = exp(-dPix * dPix / (14.0 * 14.0));
    float railWide = exp(-dPix * dPix / (36.0 * 36.0));

    vec3 railCol = mix(vec3(0.38, 0.68, 0.88), vec3(0.28, 0.4, 0.5), uStandDown);
    color += railCol * railIn * 0.85 * railLife;
    color += railCol * railMid * 0.4 * railLife;
    color += railCol * railHalo * 0.14 * railLife;
    color += vec3(0.12, 0.22, 0.35) * railWide * 0.05;

    // Flow ticks — sparse, slow, only on the rail.
    float ang = atan(p.y, p.x);
    float tick = abs(fract(ang / (2.0 * PI) * 16.0 - uTime * 0.04) - 0.5);
    color += vec3(0.55, 0.85, 1.0) * railIn * smoothstep(0.18, 0.04, tick) * 0.28 * railLife;

    // --- STATIONS ---
    vec2 cMon = stationMonitor();
    vec2 cAct = stationAct();
    vec2 cMod = stationModel();
    vec2 cObs = stationObserve();

    float tok = uToken;
    // Smooth proximity along the loop parameter.
    float nearMon = exp(-pow(min(abs(tok - 0.0), 1.0 - abs(tok - 0.0)) * 10.0, 2.0));
    float nearAct = exp(-pow(min(abs(tok - 0.25), 1.0 - abs(tok - 0.25)) * 10.0, 2.0));
    float nearMod = exp(-pow(min(abs(tok - 0.5), 1.0 - abs(tok - 0.5)) * 10.0, 2.0));
    float nearObs = exp(-pow(min(abs(tok - 0.75), 1.0 - abs(tok - 0.75)) * 10.0, 2.0));

    float eMon = 0.4 + 0.6 * nearMon;
    float eAct = (0.4 + 0.6 * nearAct) * mix(1.0, 0.22, uStandDown);
    float eMod = 0.4 + 0.6 * nearMod;
    float eObs = 0.4 + 0.6 * nearObs;

    vec3 cool = vec3(0.45, 0.78, 0.98);
    vec3 actCol = mix(vec3(0.65, 0.88, 1.0), vec3(0.32, 0.38, 0.45), uStandDown);

    color += drawStation(p, cMon, cool, eMon, 3);
    color += drawStation(p, cAct, actCol, eAct, 2);
    color += drawStation(p, cMod, cool, eMod, 1);
    color += drawStation(p, cObs, cool, eObs, 0);

    // --- TOKEN (smooth along centerline) ---
    vec2 tokenP = loopPoint(tok);
    float td = pixDist(p, tokenP);
    float breath = 0.88 + 0.12 * sin(uTime * 1.6);
    float tCore = exp(-td * td / (2.8 * 2.8)) * breath;
    float tMid = exp(-td * td / (8.0 * 8.0));
    float tHalo = exp(-td * td / (20.0 * 20.0));
    float tWide = exp(-td * td / (48.0 * 48.0));
    vec3 tCol = mix(vec3(0.7, 0.92, 1.0), vec3(0.75, 0.78, 0.7), uStandDown * 0.65);
    color += tCol * tCore * 1.35;
    color += tCol * tMid * 0.45;
    color += tCol * tHalo * 0.2;
    color += tCol * tWide * 0.07;

    // Soft wake — denser samples, shorter span, smoother falloff.
    float wake = 0.0;
    for (int k = 1; k <= 10; k++) {
      float fk = float(k);
      float wt = fract(tok - fk * 0.0085);
      float wd = pixDist(p, loopPoint(wt));
      float fall = exp(-fk * 0.22);
      wake += exp(-wd * wd / (2.2 * 2.2)) * fall;
    }
    color += tCol * wake * 0.18 * (1.0 - uStandDown * 0.5);

    // --- WORLD GATE (outside Act, right) — clean shutter, clearly closed ---
    vec2 gateCenter = cAct + vec2(0.085, 0.0);
    float gx = abs(p.x - gateCenter.x);
    float gy = abs(p.y - gateCenter.y);
    float bar = smoothstep(0.022, 0.0, gx) * smoothstep(0.2, 0.05, gy);
    float seam = abs(fract((p.y - gateCenter.y) * 14.0 + 0.5) - 0.5);
    float teeth = bar * smoothstep(0.2, 0.06, seam);
    float closed = 1.0 - uGate * 0.65;
    color += vec3(0.4, 0.52, 0.6) * bar * 0.35 * closed;
    color += vec3(0.75, 0.9, 1.0) * teeth * 0.45 * closed;
    // Dim leak only.
    float leak = exp(-gx * gx / 0.0009) * exp(-gy * gy / 0.035) * (0.05 + uGate * 0.4);
    color += vec3(0.45, 0.7, 0.88) * leak * 0.12;

    // Faint label dots under stations (progress legend without type).
    // (glyph already communicates)

    color *= mix(1.0, 0.7, uStandDown);
    color *= 1.0 + probe * 0.18;
    color += vec3(0.35, 0.65, 0.9) * probe * 0.05;

    // Grade — keep mass on the left-center.
    float mass = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.52, uv.x);
    color *= mix(0.45, 1.0, mass);
    float vert = smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.85, uv.y);
    color *= 0.8 + 0.2 * vert;

    color = pow(max(color, 0.0), vec3(0.92));
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color * vec3(0.88, 0.96, 1.12), color, smoothstep(0.0, 0.2, lum));

    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 12.0)) - 0.5;
    color += grain * 0.006 * smoothstep(0.0, 0.03, lum);
    color = min(color, vec3(1.0));

    float alphaLum = dot(color, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(0.14 + alphaLum * 6.2, 0.0, 1.0);
    gl_FragColor = vec4(color / max(alpha, 0.02), alpha);
  }
`;

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

function smootherstep(e0: number, e1: number, x: number) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Token motion on path parameter:
 * Monitor(0) → Act(0.25) → Model(0.5) → Observe(0.75) → Monitor(1/0)
 * Long dwells, smooth travel, periodic stand-down at Act.
 */
function tokenPhase(elapsed: number) {
  // Full cycle ~18s for a calmer, readable pace.
  const CYCLE = 18;
  const cycleIndex = Math.floor(elapsed / CYCLE);
  const standDownCycle = cycleIndex % 2 === 1;
  const u = (elapsed % CYCLE) / CYCLE;

  // Timeline in normalized cycle time → path t
  // Travel segments short; dwells long.
  // Mon dwell, travel→Act, Act dwell (±stand-down), travel→Mod, Mod dwell,
  // travel→Obs, Obs dwell, travel→Mon.
  type Key = { u: number; p: number };
  const keys: Key[] = standDownCycle
    ? [
        { u: 0.0, p: 0.0 },
        { u: 0.1, p: 0.0 }, // dwell Monitor
        { u: 0.18, p: 0.25 }, // → Act
        { u: 0.42, p: 0.25 }, // long stand-down at Act
        { u: 0.5, p: 0.5 }, // → Model
        { u: 0.62, p: 0.5 }, // dwell Model
        { u: 0.7, p: 0.75 }, // → Observe
        { u: 0.84, p: 0.75 }, // dwell Observe
        { u: 0.94, p: 1.0 }, // → Monitor
        { u: 1.0, p: 1.0 },
      ]
    : [
        { u: 0.0, p: 0.0 },
        { u: 0.12, p: 0.0 },
        { u: 0.22, p: 0.25 },
        { u: 0.34, p: 0.25 }, // brief Act (still acts)
        { u: 0.44, p: 0.5 },
        { u: 0.58, p: 0.5 },
        { u: 0.68, p: 0.75 },
        { u: 0.84, p: 0.75 },
        { u: 0.94, p: 1.0 },
        { u: 1.0, p: 1.0 },
      ];

  let token = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (u >= a.u && u <= b.u) {
      const k = smootherstep(a.u, b.u, u);
      token = a.p + (b.p - a.p) * k;
      break;
    }
  }

  let standDown = 0;
  if (standDownCycle) {
    // Rise into Act hold, hold, ease out.
    standDown = smoothstep(0.18, 0.26, u) * (1 - smoothstep(0.4, 0.48, u));
  }

  return { token: token % 1, standDown };
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
        antialias: true,
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
      uToken: { value: 0 },
      uGate: { value: 0.07 },
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

    // Smoothed state for butter-smooth motion.
    let tokenSmoothed = 0;
    let standDownSmoothed = 0;
    let tokenTarget = 0;
    let standDownTarget = 0;

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
      const dpr = getRenderPixelRatio(3);
      renderer.setPixelRatio(dpr);
      renderer.setSize(Math.floor(width), Math.floor(height), false);
      uniforms.uResolution.value.set(Math.floor(width) * dpr, Math.floor(height) * dpr);
      uniforms.uPixelRatio.value = dpr;
    };

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      uniforms.uTime.value = elapsed;

      pointerState.x += (pointerState.tx - pointerState.x) * 0.07;
      pointerState.y += (pointerState.ty - pointerState.y) * 0.07;
      pointerState.glow += (pointerState.glowTarget - pointerState.glow) * 0.05;
      uniforms.uPointer.value.set(pointerState.x, pointerState.y);
      uniforms.uPointerGlow.value = pointerState.glow;

      if (!reducedMotion) {
        const phase = tokenPhase(elapsed);
        tokenTarget = phase.token;
        standDownTarget = phase.standDown;

        // Shortest-path lerp on the circle so wrap-around stays smooth.
        let delta = tokenTarget - tokenSmoothed;
        if (delta > 0.5) delta -= 1;
        if (delta < -0.5) delta += 1;
        // Critically damped-ish: snappier when traveling, stickier when dwelling.
        const travel = Math.abs(delta) > 0.002 ? 0.1 : 0.06;
        tokenSmoothed = (tokenSmoothed + delta * travel + 1) % 1;
        standDownSmoothed += (standDownTarget - standDownSmoothed) * 0.045;

        uniforms.uToken.value = tokenSmoothed;
        uniforms.uStandDown.value = standDownSmoothed;
        uniforms.uGate.value = 0.05 + 0.03 * Math.sin(elapsed * 0.12);
      } else {
        uniforms.uToken.value = 0.5;
        uniforms.uStandDown.value = 0.6;
        uniforms.uGate.value = 0.06;
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
      startedAt -= 10_000;
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
