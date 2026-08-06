'use client';

/**
 * The Lattice — homepage hero instrument.
 *
 * Cognitive grammar (honest fiction over public signals):
 *   OBSERVE → NOTICE → PROPAGATE → SETTLE → WAIT
 *
 * Foundation-inspired aesthetic:
 *   - Posture-driven spectral identity
 *   - Energy propagation with bloom
 *   - Interactive disturbance field
 *   - Atmospheric particle dust
 *   - Phase annotations & mathematical residue
 *   - Transition cinematics on posture change
 */

import { useEffect, useRef } from 'react';

import type { HermesPublicPosture } from '@/features/hermes-public-reading/types';
import { getRenderPixelRatio } from '@/lib/webgl-dpr';
import {
  isWebglPaused,
  observeWebglMountVisibility,
  subscribeWebglPause,
} from '@/lib/webgl-lifecycle';

/* ── Posture Palettes ── */
type Palette = { r: number; g: number; b: number; name?: string };

const posturePalette: Record<
  HermesPublicPosture,
  Palette
> = {
  DEPLOYED:     { r: 218, g: 165, b:  85, name: 'amber' },
  SELECTIVE:    { r: 135, g: 206, b: 235, name: 'cyan' },
  DEFENSIVE:    { r: 176, g: 196, b: 222, name: 'steel' },
  STANDING_DOWN:{ r: 147, g: 112, b: 219, name: 'violet' },
  RISK_OFF:     { r: 178, g: 102, b: 102, name: 'arterial' },
};

const defaultPalette: Palette = { r: 200, g: 195, b: 188, name: 'bone' };

/* ── Cognition Profile ── */
type CognitionProfile = {
  exploration: number;
  confidence: number;
  pulseAmp: number;
  waitMean: number;
  maxPulses: number;
};

const postureCognition: Record<HermesPublicPosture, CognitionProfile> = {
  DEPLOYED: {
    exploration: 0.72,
    confidence: 0.78,
    pulseAmp: 1,
    waitMean: 9,
    maxPulses: 5,
  },
  SELECTIVE: {
    exploration: 0.88,
    confidence: 0.48,
    pulseAmp: 0.92,
    waitMean: 6.5,
    maxPulses: 7,
  },
  DEFENSIVE: {
    exploration: 0.45,
    confidence: 0.7,
    pulseAmp: 0.7,
    waitMean: 11,
    maxPulses: 4,
  },
  STANDING_DOWN: {
    exploration: 0.18,
    confidence: 0.92,
    pulseAmp: 0.42,
    waitMean: 16,
    maxPulses: 2,
  },
  RISK_OFF: {
    exploration: 0.14,
    confidence: 0.95,
    pulseAmp: 0.35,
    waitMean: 18,
    maxPulses: 1,
  },
};

const defaultCognition: CognitionProfile = {
  exploration: 0.55,
  confidence: 0.62,
  pulseAmp: 0.75,
  waitMean: 10,
  maxPulses: 4,
};

type Phase = 'observe' | 'notice' | 'propagate' | 'settle' | 'wait';
type Vec3 = { x: number; y: number; z: number };
type Role = 'stable' | 'exploratory' | 'bridge' | 'ephemeral';

type Node = {
  rest: Vec3;
  phase: number;
  role: Role;
  memory: number;
  activation: number;
};

type Edge = {
  a: number;
  b: number;
  kind: 1 | 2;
  strength: number;
  memory: number;
};

type Pulse = {
  edgeIndex: number;
  t: number;
  speed: number;
  amp: number;
  forward: boolean;
  hopsLeft: number;
  fromNode: number;
};

type Trace = {
  edgeIndex: number;
  glow: number;
};

type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
};

type Glyph = {
  x: number;
  y: number;
  symbol: string;
  opacity: number;
  drift: number;
  size: number;
  born: number;
};

type Annotation = {
  text: string;
  x: number;
  y: number;
  opacity: number;
  born: number;
  duration: number;
};

export type HeroLatticeProps = {
  posture?: HermesPublicPosture | null;
  pathsCount?: number | null;
  className?: string;
};

const GLYPHS = ['∑', '∂', '∇', '∫', 'π', 'φ', '∞', '≈', '±', '√', 'δ', 'λ', 'ω', 'θ'];
const PHASE_LABELS: Record<Phase, string> = {
  observe: 'OBSERVING',
  notice: 'NOTICING',
  propagate: 'PROPAGATING',
  settle: 'SETTLING',
  wait: 'WAITING',
};

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function daySeed(): number {
  const d = new Date();
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const day = Math.floor((d.getTime() - start) / 86_400_000);
  return day * 0.017 + d.getUTCFullYear() * 0.31;
}

function roleFor(x: number, y: number, z: number, phase: number): Role {
  const r2 = x * x + y * y + z * z;
  if (r2 <= 1) return 'stable';
  if (phase < 0.22) return 'ephemeral';
  if (phase > 0.78) return 'bridge';
  return 'exploratory';
}

function buildLattice(extent = 2): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const indexOf = new Map<string, number>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

  for (let x = -extent; x <= extent; x++) {
    for (let y = -extent; y <= extent; y++) {
      for (let z = -extent; z <= extent; z++) {
        const r2 = x * x + y * y + z * z;
        if (r2 > extent * extent + 0.5) continue;
        const phase = hash01(x * 19.1 + y * 7.3 + z * 3.7 + 1.1);
        indexOf.set(key(x, y, z), nodes.length);
        nodes.push({
          rest: { x, y, z },
          phase,
          role: roleFor(x, y, z, phase),
          memory: 0,
          activation: 0,
        });
      }
    }
  }

  const edges: Edge[] = [];
  const seen = new Set<string>();

  const tryEdge = (i: number, j: number, kind: 1 | 2) => {
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const id = `${a}-${b}`;
    if (seen.has(id)) return;
    seen.add(id);
    const pa = nodes[a].phase;
    const pb = nodes[b].phase;
    const base = kind === 1 ? 0.55 : 0.28;
    const strength = base + 0.35 * hash01(a * 13.7 + b * 5.3 + kind);
    edges.push({
      a,
      b,
      kind,
      strength: Math.min(1, strength * (0.85 + 0.3 * ((pa + pb) * 0.5))),
      memory: 0,
    });
  };

  for (let i = 0; i < nodes.length; i++) {
    const { x, y, z } = nodes[i].rest;
    for (const [dx, dy, dz] of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as const) {
      const j = indexOf.get(key(x + dx, y + dy, z + dz));
      if (j !== undefined) tryEdge(i, j, 1);
    }
    if ((x + y + z) % 2 === 0) {
      for (const [dx, dy, dz] of [
        [1, 1, 0],
        [1, -1, 0],
        [1, 0, 1],
        [1, 0, -1],
        [0, 1, 1],
        [0, 1, -1],
      ] as const) {
        const j = indexOf.get(key(x + dx, y + dy, z + dz));
        if (j !== undefined) tryEdge(i, j, 2);
      }
    }
  }

  return { nodes, edges };
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function project(
  p: Vec3,
  scale: number,
  cx: number,
  cy: number,
  perspective: number,
) {
  const z = p.z * scale;
  const depth = perspective / (perspective - z);
  return {
    x: cx + p.x * scale * depth,
    y: cy - p.y * scale * depth,
    depth,
    z,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function adjacency(edges: Edge[], n: number): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, i) => {
    adj[e.a].push(i);
    adj[e.b].push(i);
  });
  return adj;
}

function reorganize(
  nodes: Node[],
  edges: Edge[],
  focus: number,
  exploration: number,
  rng: () => number,
) {
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const nearFocus =
      e.a === focus ||
      e.b === focus ||
      nodes[e.a].activation > 0.2 ||
      nodes[e.b].activation > 0.2 ||
      e.memory > 0.15;

    if (nearFocus) {
      e.strength = Math.min(1, e.strength + 0.08 + rng() * 0.1 * exploration);
    } else if (
      nodes[e.a].role === 'ephemeral' ||
      nodes[e.b].role === 'ephemeral'
    ) {
      e.strength = Math.max(0.08, e.strength - 0.06 - rng() * 0.08);
    } else if (e.kind === 2 && rng() < 0.35 * exploration) {
      e.strength = Math.max(0.12, e.strength - 0.04);
    }
  }
}

export default function HeroLattice({
  posture = null,
  pathsCount = null,
  className,
}: HeroLatticeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const postureRef = useRef(posture);
  const pathsRef = useRef(pathsCount);
  postureRef.current = posture;
  pathsRef.current = pathsCount;

  useEffect(() => {
    const mount = mountRef.current;
    const canvas = canvasRef.current;
    if (!mount || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const { nodes, edges } = buildLattice(2);
    const adj = adjacency(edges, nodes.length);
    const seed = daySeed();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rngState = (seed * 10000 + 17) | 0;
    const rng = () => {
      rngState = (rngState * 1664525 + 1013904223) | 0;
      return (rngState >>> 0) / 4294967296;
    };

    let frameId: number | null = null;
    let startedAt = performance.now();
    let lastFrame = startedAt;
    let inView = true;
    let pageVisible = !document.hidden;

    /* ── Color & Transition State ── */
    let currentInk = defaultPalette;
    let targetInk = posture ? posturePalette[posture] : defaultPalette;
    let transitionT = 0;
    let transitionActive = false;
    let prevPostureForTransition: HermesPublicPosture | null | undefined = posture;

    /* ── Mouse Interaction ── */
    const mouse = { x: -1000, y: -1000, active: false };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onMouseLeave = () => {
      mouse.active = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
        mouse.active = true;
      }
    };
    const onTouchEnd = () => {
      mouse.active = false;
    };

    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('mouseleave', onMouseLeave);
    mount.addEventListener('touchmove', onTouchMove, { passive: true });
    mount.addEventListener('touchend', onTouchEnd);

    /* ── Cognitive State ── */
    let phase: Phase = 'observe';
    let phaseT = 0;
    let phaseDur = 4;
    let focusNode = Math.floor(rng() * nodes.length);
    let attentionNode = focusNode;
    let pulses: Pulse[] = [];
    let traces: Trace[] = [];
    let cyclesSinceReorg = 0;
    let rotY = seed * 0.4;
    let rotX = 0.42 + Math.sin(seed * 1.7) * 0.08;
    let prevPosture: HermesPublicPosture | null | undefined = postureRef.current;

    /* ── Atmosphere ── */
    const particles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: rng() * 2 - 1,
        y: rng() * 2 - 1,
        z: rng() * 2 - 1,
        vx: (rng() - 0.5) * 0.08,
        vy: (rng() - 0.5) * 0.08,
        vz: (rng() - 0.5) * 0.04,
        life: rng() * 100,
        maxLife: 80 + rng() * 120,
        size: 0.3 + rng() * 0.7,
      });
    }

    /* ── Residue ── */
    let glyphs: Glyph[] = [];
    let annotations: Annotation[] = [];

    const profile = (): CognitionProfile => {
      const p = postureRef.current;
      const base = p ? postureCognition[p] : defaultCognition;
      const paths = pathsRef.current ?? 0;
      const breadth = Math.min(0.2, Math.max(0, paths) * 0.015);
      return {
        ...base,
        exploration: Math.min(1, base.exploration + breadth),
        maxPulses: base.maxPulses + (paths >= 4 ? 1 : 0),
      };
    };

    const pickFocus = (cog: CognitionProfile) => {
      const weights = nodes.map((n) => {
        if (cog.confidence > 0.8 && n.role === 'stable') return 2.2;
        if (cog.exploration > 0.6 && n.role === 'exploratory') return 2.4;
        if (n.role === 'bridge') return 1.6;
        if (n.role === 'ephemeral') return 0.6 + cog.exploration;
        return 1;
      });
      const sum = weights.reduce((a, b) => a + b, 0);
      let r = rng() * sum;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
      }
      return Math.floor(rng() * nodes.length);
    };

    const enterPhase = (next: Phase, cog: CognitionProfile) => {
      phase = next;
      phaseT = 0;

      /* Annotation */
      annotations.push({
        text: PHASE_LABELS[next],
        x: 0,
        y: 0,
        opacity: 0,
        born: performance.now(),
        duration: 1.2,
      });

      switch (next) {
        case 'observe':
          phaseDur = 3.2 + cog.confidence * 4.5 + rng() * 1.5;
          break;
        case 'notice':
          focusNode = pickFocus(cog);
          attentionNode = focusNode;
          nodes[focusNode].activation = 1;
          nodes[focusNode].memory = Math.min(1, nodes[focusNode].memory + 0.35);
          phaseDur = 0.7 + (1 - cog.confidence) * 0.6 + rng() * 0.4;
          break;
        case 'propagate': {
          pulses = [];
          const startEdges = adj[focusNode];
          const budget = Math.max(
            1,
            Math.round(cog.maxPulses * (0.55 + cog.exploration * 0.45)),
          );
          const shuffled = [...startEdges].sort(() => rng() - 0.5);
          for (let i = 0; i < Math.min(budget, shuffled.length); i++) {
            const ei = shuffled[i];
            const e = edges[ei];
            if (e.strength < 0.12) continue;
            const forward = e.a === focusNode;
            pulses.push({
              edgeIndex: ei,
              t: 0,
              speed: 0.55 + rng() * 0.55 + cog.exploration * 0.35,
              amp: (0.55 + rng() * 0.45) * cog.pulseAmp,
              forward,
              hopsLeft: 1 + Math.floor(rng() * (1 + cog.exploration * 2.5)),
              fromNode: focusNode,
            });
          }
          phaseDur = 1.8 + cog.exploration * 2.2 + rng() * 0.8;
          break;
        }
        case 'settle':
          cyclesSinceReorg += 1;
          const shouldReorg =
            cyclesSinceReorg >= 3 + Math.floor(rng() * 3) ||
            (prevPosture !== postureRef.current && postureRef.current != null);
          if (shouldReorg) {
            reorganize(nodes, edges, focusNode, cog.exploration, rng);
            cyclesSinceReorg = 0;
          }
          prevPosture = postureRef.current;

          /* Mathematical residue */
          const glyphCount = 2 + Math.floor(rng() * 3 * cog.confidence);
          for (let g = 0; g < glyphCount; g++) {
            glyphs.push({
              x: 0,
              y: 0,
              symbol: GLYPHS[Math.floor(rng() * GLYPHS.length)],
              opacity: 0,
              drift: 8 + rng() * 12,
              size: 8 + rng() * 6,
              born: performance.now(),
            });
          }

          phaseDur = 1.4 + cog.confidence * 2.2;
          break;
        case 'wait':
          phaseDur =
            cog.waitMean * (0.75 + rng() * 0.5) * (0.85 + cog.confidence * 0.35);
          break;
      }
    };

    const advancePhase = (cog: CognitionProfile) => {
      const order: Phase[] = ['observe', 'notice', 'propagate', 'settle', 'wait'];
      const i = order.indexOf(phase);
      enterPhase(order[(i + 1) % order.length], cog);
    };

    const canRun = () => inView && pageVisible && !isWebglPaused() && !reducedMotion;

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const dpr = getRenderPixelRatio(2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const stepCognition = (dt: number, cog: CognitionProfile) => {
      phaseT += dt;
      if (phaseT >= phaseDur) advancePhase(cog);

      /* Color transition */
      const newTarget = postureRef.current
        ? posturePalette[postureRef.current]
        : defaultPalette;
      if (newTarget !== targetInk) {
        targetInk = newTarget;
        transitionActive = true;
        transitionT = 0;
      }
      if (transitionActive) {
        transitionT += dt * 1.5; // 0.66s transition
        if (transitionT >= 1) {
          transitionT = 1;
          transitionActive = false;
          currentInk = targetInk;
        } else {
          currentInk = lerpColor(currentInk, targetInk, transitionT);
        }
      }

      const memDecay = Math.exp(-dt * 0.12);
      for (const n of nodes) {
        n.memory *= memDecay;
        if (phase === 'observe' || phase === 'wait' || phase === 'settle') {
          n.activation *= Math.exp(-dt * (phase === 'settle' ? 1.2 : 0.55));
        }
      }
      for (const e of edges) {
        e.memory *= Math.exp(-dt * 0.18);
      }
      traces = traces
        .map((t) => ({ ...t, glow: t.glow * Math.exp(-dt * 0.55) }))
        .filter((t) => t.glow > 0.02);

      /* Mouse disturbance */
      if (mouse.active) {
        for (let i = 0; i < nodes.length; i++) {
          /* Will be calculated in draw; apply activation boost here */
        }
      }

      if (phase === 'notice') {
        const flicker = 0.65 + 0.35 * Math.sin(phaseT * 14);
        nodes[focusNode].activation = flicker;
        attentionNode = focusNode;
      }

      if (phase === 'propagate' || pulses.length > 0) {
        const next: Pulse[] = [];
        for (const p of pulses) {
          p.t += p.speed * dt;
          const e = edges[p.edgeIndex];
          e.memory = Math.min(1, e.memory + p.amp * dt * 0.8);

          if (p.t > 0.15 && p.t < 0.9) {
            const mid = p.t;
            nodes[e.a].activation = Math.max(
              nodes[e.a].activation,
              p.amp * (1 - Math.abs(mid - (p.forward ? 0.25 : 0.75))),
            );
            nodes[e.b].activation = Math.max(
              nodes[e.b].activation,
              p.amp * (1 - Math.abs(mid - (p.forward ? 0.75 : 0.25))),
            );
          }

          if (p.t < 1) {
            next.push(p);
            continue;
          }

          traces.push({ edgeIndex: p.edgeIndex, glow: p.amp * 0.85 });
          const toNode = p.forward ? e.b : e.a;
          nodes[toNode].activation = Math.max(nodes[toNode].activation, p.amp);
          nodes[toNode].memory = Math.min(1, nodes[toNode].memory + 0.2 * p.amp);
          attentionNode = toNode;

          if (p.hopsLeft > 0 && phase === 'propagate') {
            const candidates = adj[toNode]
              .filter((ei) => ei !== p.edgeIndex && edges[ei].strength > 0.14)
              .sort((a, b) => edges[b].strength - edges[a].strength);
            const take = Math.min(
              1 + (rng() < cog.exploration ? 1 : 0),
              candidates.length,
            );
            for (let k = 0; k < take; k++) {
              if (next.length >= cog.maxPulses + 2) break;
              const ei = candidates[k];
              const ne = edges[ei];
              const forward = ne.a === toNode;
              next.push({
                edgeIndex: ei,
                t: 0,
                speed: p.speed * (0.85 + rng() * 0.25),
                amp: p.amp * (0.72 + rng() * 0.18),
                forward,
                hopsLeft: p.hopsLeft - 1,
                fromNode: toNode,
              });
            }
          }
        }
        pulses = next;
      }

      const spin = 0.004 + (1 - cog.confidence) * 0.018;
      rotY += dt * spin;
      rotX = 0.42 + Math.sin(seed * 1.7) * 0.08 + Math.sin(rotY * 0.35) * 0.03;

      /* Update particles */
      for (const pt of particles) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.z += pt.vz * dt;
        pt.life += dt * 60;
        if (pt.life > pt.maxLife) {
          pt.x = rng() * 2 - 1;
          pt.y = rng() * 2 - 1;
          pt.z = rng() * 2 - 1;
          pt.life = 0;
        }
      }

      /* Update glyphs */
      const now = performance.now();
      glyphs = glyphs
        .map((g) => ({
          ...g,
          opacity: Math.min(0.35, (now - g.born) / 400) * Math.max(0, 1 - (now - g.born - 2000) / 2000),
        }))
        .filter((g) => g.opacity > 0.005);

      /* Update annotations */
      annotations = annotations
        .map((a) => ({
          ...a,
          opacity:
            now - a.born < 300
              ? (now - a.born) / 300
              : Math.max(0, 1 - (now - a.born - a.duration * 300) / (a.duration * 700)),
        }))
        .filter((a) => a.opacity > 0.005);
    };

    const draw = (timeSec: number, dt: number) => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width < 2 || height < 2) return;

      const cog = profile();

      if (!reducedMotion) {
        stepCognition(dt, cog);
      }

      const cx = width * 0.5;
      const cy = height * 0.5;
      const minDim = Math.min(width, height);
      const widePlate = width / Math.max(height, 1) > 1.15;
      const scale = minDim * (widePlate ? 0.155 : 0.148);
      const perspective = minDim * 0.95;

      const breatheBase =
        phase === 'observe' || phase === 'wait'
          ? 0.97 + 0.03 * Math.sin(timeSec * 0.35 + seed)
          : 0.94 + 0.06 * Math.sin(timeSec * 0.5 + seed);
      const presence = 0.5 + 0.5 * cog.pulseAmp;

      const ink = currentInk;

      ctx.clearRect(0, 0, width, height);

      /* ── Ambient Core Glow ── */
      const coreAlpha =
        0.03 * presence * breatheBase +
        (phase === 'propagate' ? 0.02 * cog.pulseAmp : 0);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.38);
      core.addColorStop(0, `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${coreAlpha})`);
      core.addColorStop(0.55, `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${coreAlpha * 0.35})`);
      core.addColorStop(1, `rgba(${ink.r}, ${ink.g}, ${ink.b}, 0)`);
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, width, height);

      /* ── Project Nodes ── */
      type Proj = { x: number; y: number; depth: number; z: number; i: number };
      const projected: Proj[] = nodes.map((node, i) => {
        const pull = node.activation * 0.03 * (1 - cog.confidence * 0.5);
        let p: Vec3 = {
          x: node.rest.x + pull * Math.sin(node.phase * 6.2),
          y: node.rest.y + pull * Math.cos(node.phase * 4.1),
          z: node.rest.z,
        };
        p = rotateY(p, rotY);
        p = rotateX(p, rotX);
        const pr = project(p, scale, cx, cy, perspective);

        /* Mouse disturbance: boost activation */
        if (mouse.active) {
          const mdx = pr.x - mouse.x;
          const mdy = pr.y - mouse.y;
          const mdist = Math.hypot(mdx, mdy);
          const influence = Math.max(0, 1 - mdist / 120);
          if (influence > 0) {
            node.activation = Math.min(1, node.activation + influence * 0.4 * dt * 4);
          }
        }

        return { ...pr, i };
      });

      const attentionActive = phase === 'notice' || phase === 'propagate';
      const att = projected[attentionNode];

      /* ── Particle Dust ── */
      for (const pt of particles) {
        let pp = rotateY(
          rotateX({ x: pt.x, y: pt.y, z: pt.z }, rotX),
          rotY,
        );
        const pr = project(pp, scale * 1.4, cx, cy, perspective);
        const lifeRatio = pt.life / pt.maxLife;
        const pAlpha = Math.sin(lifeRatio * Math.PI) * 0.12 * presence * breatheBase * pr.depth;

        if (pAlpha < 0.01) continue;

        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pt.size * pr.depth, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${pAlpha})`;
        ctx.fill();

        /* Faint connection to nearest active node */
        let nearestDist = Infinity;
        let nearestNode = -1;
        for (let ni = 0; ni < projected.length; ni++) {
          const nd = Math.hypot(projected[ni].x - pr.x, projected[ni].y - pr.y);
          if (nd < nearestDist && nd < 60) {
            nearestDist = nd;
            nearestNode = ni;
          }
        }
        if (nearestNode >= 0 && nodes[nearestNode].activation > 0.1) {
          ctx.beginPath();
          ctx.moveTo(pr.x, pr.y);
          ctx.lineTo(projected[nearestNode].x, projected[nearestNode].y);
          ctx.strokeStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${pAlpha * 0.3})`;
          ctx.lineWidth = 0.3;
          ctx.stroke();
        }
      }

      /* ── Edges (with glow layer) ── */
      const edgeOrder = edges
        .map((e, edgeIndex) => {
          const pa = projected[e.a];
          const pb = projected[e.b];
          return { e, edgeIndex, midZ: (pa.z + pb.z) * 0.5, pa, pb };
        })
        .sort((a, b) => a.midZ - b.midZ);

      /* Glow pass */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const { e, edgeIndex, pa, pb } of edgeOrder) {
        if (e.strength < 0.1 && e.memory < 0.05) continue;

        const depthFade = Math.min(pa.depth, pb.depth);
        const kindWeight = e.kind === 1 ? 1 : 0.45;
        const mem = e.memory;
        let alpha =
          (0.06 + 0.2 * e.strength * presence) *
          kindWeight *
          breatheBase *
          (0.55 + 0.45 * depthFade);
        alpha += mem * 0.22 * cog.pulseAmp;

        if (attentionActive && att) {
          const midX = (pa.x + pb.x) * 0.5;
          const midY = (pa.y + pb.y) * 0.5;
          const dist = Math.hypot(midX - att.x, midY - att.y) / minDim;
          alpha *= 1 - Math.min(0.45, dist * 0.7);
        }

        const tr = traces.find((t) => t.edgeIndex === edgeIndex);
        if (tr) alpha += tr.glow * 0.35;

        if (alpha < 0.015) continue;

        /* Glow line */
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${Math.min(0.25, alpha * 0.4)})`;
        ctx.lineWidth = (e.kind === 1 ? 2.5 : 1.5) * (1 + mem);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();

      /* Sharp pass */
      for (const { e, edgeIndex, pa, pb } of edgeOrder) {  // ← added edgeIndex
        if (e.strength < 0.1 && e.memory < 0.05) continue;

        const depthFade = Math.min(pa.depth, pb.depth);
        const kindWeight = e.kind === 1 ? 1 : 0.45;
        const mem = e.memory;
        let alpha =
          (0.06 + 0.2 * e.strength * presence) *
          kindWeight *
          breatheBase *
          (0.55 + 0.45 * depthFade);
        alpha += mem * 0.22 * cog.pulseAmp;

        if (attentionActive && att) {
          const midX = (pa.x + pb.x) * 0.5;
          const midY = (pa.y + pb.y) * 0.5;
          const dist = Math.hypot(midX - att.x, midY - att.y) / minDim;
          alpha *= 1 - Math.min(0.45, dist * 0.7);
        }

        const tr = traces.find((t) => t.edgeIndex === edgeIndex);
        if (tr) alpha += tr.glow * 0.35;

        if (alpha < 0.015) continue;

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${Math.min(0.55, alpha)})`;
        ctx.lineWidth = e.kind === 1 ? 1 : 0.65;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      /* ── Energy Pulses ── */
      for (const p of pulses) {
        const e = edges[p.edgeIndex];
        const pa = projected[e.a];
        const pb = projected[e.b];
        const t = p.forward ? p.t : 1 - p.t;
        const x = pa.x + (pb.x - pa.x) * t;
        const y = pa.y + (pb.y - pa.y) * t;
        const r = 1.6 + p.amp * 2.2;

        /* Glow */
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
        g.addColorStop(
          0,
          `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${0.3 * p.amp * cog.pulseAmp})`,
        );
        g.addColorStop(0.4, `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${0.08 * p.amp})`);
        g.addColorStop(1, `rgba(${ink.r}, ${ink.g}, ${ink.b}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* Core */
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${Math.min(0.95, 0.5 + p.amp * 0.45)})`;
        ctx.fill();
      }

      /* ── Nodes ── */
      const nodeOrder = [...projected].sort((a, b) => a.z - b.z);
      for (const pr of nodeOrder) {
        const node = nodes[pr.i];
        const roleMul =
          node.role === 'stable'
            ? 1.05
            : node.role === 'bridge'
              ? 0.95
              : node.role === 'ephemeral'
                ? 0.75 + node.activation * 0.4
                : 0.9;

        /* Depth of field: farther = dimmer */
        const dofFade = 0.4 + 0.6 * pr.depth;

        let alpha =
          (0.16 + 0.28 * presence) *
          roleMul *
          breatheBase *
          (0.5 + 0.5 * pr.depth) *
          (0.55 + 0.45 * Math.max(0.35, eStrengthNear(edges, pr.i))) *
          dofFade;

        alpha += node.memory * 0.2;
        alpha += node.activation * 0.45 * cog.pulseAmp;

        if (attentionActive && pr.i !== attentionNode && node.activation < 0.15) {
          alpha *= 0.72;
        }

        if (
          node.role === 'ephemeral' &&
          node.memory < 0.08 &&
          node.activation < 0.05
        ) {
          alpha *= 0.35;
        }

        if (alpha < 0.03) continue;

        const baseR =
          (1.05 + 1.35 * pr.depth) *
          roleMul *
          (1 + node.activation * 0.35) *
          (0.9 + 0.1 * cog.pulseAmp);

        if (node.activation > 0.25 || node.memory > 0.25) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, baseR * 6);
          g.addColorStop(
            0,
            `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${Math.min(0.25, alpha * 0.3)})`,
          );
          g.addColorStop(1, `rgba(${ink.r}, ${ink.g}, ${ink.b}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, baseR * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(pr.x, pr.y, baseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${Math.min(0.88, alpha)})`;
        ctx.fill();
      }

      /* ── Mathematical Glyphs ── */
      const now = performance.now();
      for (const g of glyphs) {
        if (!att) continue;
        const age = now - g.born;
        const gy = att.y - (age / 1000) * g.drift;
        const gx = att.x + Math.sin(age * 0.002 + g.born) * 10;

        ctx.save();
        ctx.globalAlpha = g.opacity * 0.25;
        ctx.font = `${g.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillStyle = `rgb(${ink.r}, ${ink.g}, ${ink.b})`;
        ctx.textAlign = 'center';
        ctx.fillText(g.symbol, gx, gy);
        ctx.restore();
      }

      /* ── Phase Annotations ── */
      for (const a of annotations) {
        if (!att) continue;
        ctx.save();
        ctx.globalAlpha = a.opacity * 0.15;
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = `rgb(${ink.r}, ${ink.g}, ${ink.b})`;
        ctx.textAlign = 'center';
        ctx.letterSpacing = '0.15em';
        ctx.fillText(a.text, att.x, att.y - 18);
        ctx.restore();
      }

      /* ── Instrument Housing ── */
      const ringR = minDim * 0.36;
      const ringA =
        (0.045 + (phase === 'propagate' ? 0.03 : 0)) *
        presence *
        (phase === 'wait' ? 0.75 : 1);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${ringA})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const tickAlpha = ringA * 1.15;
      ctx.strokeStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${tickAlpha})`;
      for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) / 2 + rotY * 0.12;
        const c0 = Math.cos(ang);
        const s0 = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(cx + c0 * (ringR - 6), cy + s0 * (ringR - 6));
        ctx.lineTo(cx + c0 * (ringR + 4), cy + s0 * (ringR + 4));
        ctx.stroke();
      }

      /* ── Transition Flash ── */
      if (transitionActive) {
        const flash = Math.sin(transitionT * Math.PI) * 0.08;
        ctx.fillStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${flash})`;
        ctx.fillRect(0, 0, width, height);
      }
    };

    function eStrengthNear(es: Edge[], nodeIndex: number): number {
      let s = 0;
      let c = 0;
      for (const e of es) {
        if (e.a === nodeIndex || e.b === nodeIndex) {
          s += e.strength;
          c += 1;
        }
      }
      return c ? s / c : 0.5;
    }

    const stopLoop = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const animate = (now: number) => {
      if (!canRun()) {
        frameId = null;
        return;
      }
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const t = (now - startedAt) / 1000;
      draw(t, dt);
      frameId = window.requestAnimationFrame(animate);
    };

    const tryStartLoop = () => {
      if (!canRun() || frameId !== null) return;
      lastFrame = performance.now();
      frameId = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(
        reducedMotion ? seed * 40 + 12 : (performance.now() - startedAt) / 1000,
        0,
      );
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

    const themeObserver = new MutationObserver(() => {
      draw(
        reducedMotion ? seed * 40 + 12 : (performance.now() - startedAt) / 1000,
        0,
      );
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    document.addEventListener('visibilitychange', onDocVisibility);

    resize();
    resizeObserver.observe(mount);

    enterPhase('observe', profile());

    if (reducedMotion) {
      for (const e of edges) e.memory = e.strength * 0.15;
      nodes[focusNode].memory = 0.2;
      draw(seed * 40 + 12, 0);
    } else {
      tryStartLoop();
    }

    requestAnimationFrame(() => {
      canvas.classList.add('is-ready');
    });

    return () => {
      stopLoop();
      unsubPause();
      document.removeEventListener('visibilitychange', onDocVisibility);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('mouseleave', onMouseLeave);
      mount.removeEventListener('touchmove', onTouchMove);
      mount.removeEventListener('touchend', onTouchEnd);
      resizeObserver.disconnect();
      visibilityWatch.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className ?? 'hero-lattice'}
      style={{ color: 'var(--foreground)' }}
    >
      <canvas ref={canvasRef} className="hero-lattice-canvas" aria-hidden="true" />
    </div>
  );
}