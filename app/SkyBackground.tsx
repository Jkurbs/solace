'use client';

import { useEffect, useRef } from 'react';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The one sky behind every section. Drawn once per resize — a static plate,
// not a fourth render loop. Density is kept "grain of the night" low so it
// never competes with text or the instrument renders.
export default function SkyBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const rand = mulberry32(20260612);
      const long = Math.max(width, height);

      // Cold depth plus the faint color washes the page gradient used to carry.
      const washes: Array<[number, number, number, string]> = [
        [0.45, 0.35, 1.15, 'rgba(8, 14, 24, 0.38)'],
        [0.8, 0.06, 0.42, 'rgba(214, 208, 196, 0.045)'],
        [0.12, 0.6, 0.5, 'rgba(112, 93, 178, 0.03)'],
        [0.72, 0.85, 0.52, 'rgba(184, 190, 199, 0.028)'],
      ];

      for (const [x, y, r, color] of washes) {
        const gradient = ctx.createRadialGradient(x * width, y * height, 0, x * width, y * height, r * long);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Sparse, dim stars: cold ivory and blue, the occasional warm one.
      const count = Math.round((width * height) / 15000);

      for (let i = 0; i < count; i++) {
        const x = rand() * width;
        const y = rand() * height;
        const size = 0.4 + rand() * 0.85;
        const alpha = 0.07 + rand() * 0.28;

        const roll = rand();
        const color =
          roll < 0.16
            ? `rgba(214, 208, 196, ${alpha})`
            : roll < 0.58
              ? `rgba(196, 212, 232, ${alpha})`
              : `rgba(230, 232, 228, ${alpha})`;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // A few stars get a soft halo so the field has depth.
        if (rand() < 0.055) {
          const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 7);
          halo.addColorStop(0, `rgba(214, 200, 170, ${alpha * 0.4})`);
          halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = halo;
          ctx.fillRect(x - size * 7, y - size * 7, size * 14, size * 14);
        }
      }
    };

    draw();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(draw, 180);
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, []);

  return <canvas ref={canvasRef} className="sky-background" aria-hidden="true" />;
}
