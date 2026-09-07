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

    const update = () => {
      const height = el.clientHeight;
      if (height <= 0) {
        return;
      }

      setSlots(Math.max(1, Math.floor(height / itemHeight)));
    };

    update();
    const frame = window.requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [itemHeight]);

  return { ref, slots };
}
