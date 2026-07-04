'use client';

import { useEffect, useRef } from 'react';

import { hashStr, mulberry32 } from '@/lib/note-plate';

// Glass-plate backdrop for a resolved question: teal star field, one traced
// arc, a bright node where the world answered. Seeded by the question id.
const TEAL = { glow: '88,201,172', core: '218,247,238', dust: '160,220,205' };

function drawQuestionPlate(canvas: HTMLCanvasElement, seed: string) {
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

  const rnd = mulberry32(hashStr(`${seed}::question-plate`));

  const vg = ctx.createRadialGradient(cw * 0.5, ch * 0.4, ch * 0.1, cw * 0.5, ch * 0.5, cw * 0.7);
  vg.addColorStop(0, 'rgba(15,17,16,1)');
  vg.addColorStop(1, 'rgba(9,10,10,1)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, cw, ch);

  for (let i = 0; i < 54; i++) {
    const x = rnd() * cw;
    const y = rnd() * ch;
    const r = 0.35 + rnd() * 1.05;
    const a = 0.1 + rnd() * 0.5;
    ctx.fillStyle = `rgba(${rnd() < 0.4 ? TEAL.dust : '236,238,240'},${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (rnd() < 0.05) {
      ctx.strokeStyle = `rgba(236,238,240,${a * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 4);
      ctx.stroke();
    }
  }

  const x0 = -cw * 0.02;
  const y0 = ch * (0.32 + rnd() * 0.36);
  const x1 = cw * 1.02;
  const y1 = ch * (0.28 + rnd() * 0.4);
  const cxp = cw * (0.35 + rnd() * 0.3);
  const cyp = ch * (rnd() < 0.5 ? 0.06 + rnd() * 0.2 : 0.74 + rnd() * 0.18);

  ctx.save();
  ctx.strokeStyle = `rgba(${TEAL.glow},0.3)`;
  ctx.lineWidth = 2.4;
  ctx.filter = 'blur(3px)';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cxp, cyp, x1, y1);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = `rgba(${TEAL.core},0.7)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cxp, cyp, x1, y1);
  ctx.stroke();

  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cxp + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cyp + t * t * y1;
    ctx.strokeStyle = 'rgba(236,238,240,0.28)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.stroke();
  }

  const nt = 0.55 + rnd() * 0.3;
  const nmt = 1 - nt;
  const nx = nmt * nmt * x0 + 2 * nmt * nt * cxp + nt * nt * x1;
  const ny = nmt * nmt * y0 + 2 * nmt * nt * cyp + nt * nt * y1;
  const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 20);
  g.addColorStop(0, `rgba(${TEAL.core},0.9)`);
  g.addColorStop(0.3, `rgba(${TEAL.glow},0.32)`);
  g.addColorStop(1, `rgba(${TEAL.glow},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(nx, ny, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${TEAL.core},0.65)`;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(nx, ny, 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(236,238,240,0.28)';
  ctx.lineWidth = 1;
  const m = 11;
  const L = 8;
  const corners: Array<[number, number, number, number]> = [
    [m, m, 1, 1],
    [cw - m, m, -1, 1],
    [m, ch - m, 1, -1],
    [cw - m, ch - m, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * L, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * L);
    ctx.stroke();
  }
}

export default function QuestionPlate({ seed }: { seed: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const draw = () => drawQuestionPlate(canvas, seed);
    draw();

    const observer = new ResizeObserver(draw);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [seed]);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
