'use client';

import { useEffect } from 'react';

/** Wait before a gentle page nudge on mobile when the visitor never scrolls. */
const DELAY_MS = 30_000;
/** How far to ease down — enough to reveal the next band, not a jump. */
const NUDGE_PX = 140;
/** Treat anything past this as intentional scroll; cancel the nudge. */
const SCROLLED_THRESHOLD_PX = 40;

/**
 * Mobile-only: after 30s at the top of /glorya, smoothly scroll a little
 * so the process/ledger band peeks in. Never fights the user — cancels on
 * any real scroll, reduced motion, or desktop layout.
 */
export default function GloryaScrollNudge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileLayout = window.matchMedia('(max-width: 900px)');

    if (reducedMotion.matches || !mobileLayout.matches) return;

    let cancelled = false;
    let timer: number | null = null;

    const hasUserScrolled = () => window.scrollY > SCROLLED_THRESHOLD_PX;

    const cleanup = () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onIntent);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
      mobileLayout.removeEventListener('change', onLayoutChange);
    };

    const onScroll = () => {
      if (hasUserScrolled()) cleanup();
    };

    const onIntent = () => {
      // Wheel / trackpad = they already know the page moves.
      cleanup();
    };

    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'PageDown' ||
        event.key === 'End' ||
        event.key === ' ' ||
        event.key === 'Spacebar'
      ) {
        cleanup();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      // "Tap to scroll" means they found the affordance — don't auto-nudge later.
      const target = event.target;
      if (target instanceof Element && target.closest('.glorya-scroll-cue')) {
        cleanup();
      }
    };

    const onLayoutChange = () => {
      if (!mobileLayout.matches) cleanup();
    };

    const nudge = () => {
      timer = null;
      if (cancelled || hasUserScrolled() || !mobileLayout.matches || reducedMotion.matches) {
        cleanup();
        return;
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll < 48) {
        cleanup();
        return;
      }

      const target = Math.min(NUDGE_PX, Math.round(maxScroll * 0.1), maxScroll);
      window.scrollTo({ top: target, behavior: 'smooth' });
      cleanup();
    };

    timer = window.setTimeout(nudge, DELAY_MS);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onIntent, { passive: true });
    window.addEventListener('keydown', onKey, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    mobileLayout.addEventListener('change', onLayoutChange);

    return cleanup;
  }, []);

  return null;
}
