'use client';

import type { ReactNode, RefObject } from 'react';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

// Tracks which step element (matching `selector`) sits closest to the viewport
// anchor while a sticky stage scrolls — shared by the scroll walkthroughs.
export function useWalkthroughStep(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  selector = '.hx-walk-step',
  viewportAnchorRatio = 0.5,
  itemAnchorRatio = 0.5,
) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStep(0);
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const element = ref.current;

      if (!element) {
        return;
      }

      const steps = Array.from(element.querySelectorAll<HTMLElement>(selector));
      const viewportAnchor = window.innerHeight * viewportAnchorRatio;
      const nextStep = steps.reduce(
        (best, item, index) => {
          const rect = item.getBoundingClientRect();
          const itemAnchor = rect.top + rect.height * itemAnchorRatio;
          const distance = Math.abs(itemAnchor - viewportAnchor);

          return distance < best.distance ? { distance, index } : best;
        },
        { distance: Number.POSITIVE_INFINITY, index: 0 },
      ).index;

      setStep((current) => (current === nextStep ? current : nextStep));
    };

    const requestUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [enabled, itemAnchorRatio, ref, selector, viewportAnchorRatio]);

  return step;
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
