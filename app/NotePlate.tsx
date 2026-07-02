'use client';

import { useEffect, useRef } from 'react';

import {
  PLATE_TINTS,
  type PlateTint,
  buildReading,
  filamentOffset,
} from '@/lib/note-plate';

function drawPlate(canvas: HTMLCanvasElement, seed: string, tintName: PlateTint) {
  const wrap = canvas.parentElement;
  if (!wrap) return;

  const cw = wrap.clientWidth;
  const ch = wrap.clientHeight;
  if (cw < 1 || ch < 1) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const tint = PLATE_TINTS[tintName];
  const reading = buildReading(seed);

  // Vignette floor.
  const vg = ctx.createRadialGradient(cw * 0.5, ch * 0.42, ch * 0.1, cw * 0.5, ch * 0.5, cw * 0.75);
  vg.addColorStop(0, 'rgba(16,16,14,1)');
  vg.addColorStop(1, 'rgba(9,9,8,1)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, cw, ch);

  // Dust.
  for (const speck of reading.dust) {
    ctx.fillStyle = `rgba(${speck.cold ? '184,190,199' : tint.dust},${speck.a})`;
    ctx.beginPath();
    ctx.arc(speck.x * cw, speck.y * ch, speck.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wide under-glow following the spine.
  ctx.save();
  ctx.strokeStyle = `rgba(${tint.glow},0.16)`;
  ctx.lineWidth = 9;
  ctx.filter = 'blur(10px)';
  ctx.beginPath();
  reading.spine.forEach((point, index) => {
    if (index) ctx.lineTo(point.x * cw, point.y * ch);
    else ctx.moveTo(point.x * cw, point.y * ch);
  });
  ctx.stroke();
  ctx.restore();

  // Braided filaments; the lead strand gets a glow pass.
  for (const filament of reading.filaments) {
    const passes = filament.lead ? (['glow', 'core'] as const) : (['core'] as const);
    for (const pass of passes) {
      ctx.save();
      if (pass === 'glow') {
        ctx.strokeStyle = `rgba(${tint.glow},0.5)`;
        ctx.lineWidth = 2.6;
        ctx.filter = 'blur(3px)';
      } else {
        ctx.strokeStyle = `rgba(${tint.core},${filament.alpha})`;
        ctx.lineWidth = filament.lead ? 1.1 : 0.7;
      }
      ctx.beginPath();
      reading.spine.forEach((point, index) => {
        const t = index / (reading.spine.length - 1);
        const y = (point.y + filamentOffset(filament, t)) * ch;
        if (index) ctx.lineTo(point.x * cw, y);
        else ctx.moveTo(point.x * cw, y);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  // Hot node where the reading lands.
  const nx = reading.node.x * cw;
  const ny = reading.node.y * ch;
  const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, ch * 0.22);
  glow.addColorStop(0, `rgba(${tint.core},0.85)`);
  glow.addColorStop(0.18, `rgba(${tint.glow},0.3)`);
  glow.addColorStop(1, `rgba(${tint.glow},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(nx, ny, ch * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Glass-plate furniture: corner reticles.
  ctx.strokeStyle = 'rgba(236,238,240,0.3)';
  ctx.lineWidth = 1;
  const m = 12;
  const arm = 9;
  const corners: Array<[number, number, number, number]> = [
    [m, m, 1, 1],
    [cw - m, m, -1, 1],
    [m, ch - m, 1, -1],
    [cw - m, ch - m, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * arm, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * arm);
    ctx.stroke();
  }
}

export default function NotePlate({
  seed,
  tint = 'cream',
  label,
  className,
}: {
  seed: string;
  tint?: PlateTint;
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const draw = () => drawPlate(canvas, seed, tint);
    draw();

    const observer = new ResizeObserver(draw);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [seed, tint]);

  return (
    <div className={`note-plate${className ? ` ${className}` : ''}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {label ? <span className="note-plate-label">{label}</span> : null}
      <span className="note-plate-mark" aria-hidden="true">
        ✦
      </span>
    </div>
  );
}
