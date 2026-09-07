'use client';

import { useEffect, useRef, useState } from 'react';

/** How many fixed-height rows fit in a flex child. */
export function useFitSlots(itemHeight: number, fallback = 4) {
  const ref = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return undefined;
    }

    const update = (height: number) => {
      if (height <= 0) {
        return;
      }

      setSlots(Math.max(1, Math.floor(height / itemHeight)));
    };

    update(el.clientHeight);
    const frame = window.requestAnimationFrame(() => update(el.clientHeight));
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height ?? el.clientHeight;
      update(next);
    });
    observer.observe(el);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [itemHeight]);

  return { ref, slots };
}
