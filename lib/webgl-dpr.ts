/**
 * Device pixel ratio for homepage WebGL plates.
 * Phones are often 2–3×; capping at 2 leaves canvases soft when CSS-scaled.
 * Cap at 3 so iPhone/ProMotion stay sharp without over-allocating 4× desktops.
 */
export function getRenderPixelRatio(maxDpr = 3): number {
  if (typeof window === 'undefined') {
    return 1;
  }

  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 1), maxDpr);
}

/** True for narrow viewports (homepage instrument plates go full-bleed). */
export function isMobilePlateViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(max-width: 900px)').matches;
}
