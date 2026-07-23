/**
 * Pause homepage (and other) WebGL loops as soon as the user commits to a
 * navigation. The previous page stays mounted until the next route is ready;
 * without this, GPU particle scenes keep burning the main thread during that wait.
 *
 * Visibility observing debounces "out of view" so scroll thrashing cannot kill
 * an in-view rAF loop (brief isIntersecting=false blips during scroll).
 */

type PauseListener = (paused: boolean) => void;

let paused = false;
const listeners = new Set<PauseListener>();

export function isWebglPaused() {
  return paused;
}

export function setWebglPaused(next: boolean) {
  if (paused === next) return;
  paused = next;
  for (const listener of listeners) {
    listener(paused);
  }
}

export function subscribeWebglPause(listener: PauseListener) {
  listeners.add(listener);
  listener(paused);
  return () => {
    listeners.delete(listener);
  };
}

/** True when a same-origin in-app navigation is about to start from this click. */
export function isInAppNavigationAnchor(anchor: HTMLAnchorElement) {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    // Pure hash change on the same path — not a route transition.
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export type WebglVisibilityHandle = {
  disconnect: () => void;
};

type ObserveVisibilityOptions = {
  /** Delay before treating the mount as off-screen. Default 320ms. */
  hideDelayMs?: number;
  /** Expand the root box so plates near the edge stay warm. Default 40% vertical. */
  rootMargin?: string;
};

/**
 * Watch a WebGL mount for on-screen presence without thrashing the animation loop.
 * Scroll often emits brief isIntersecting=false callbacks while the plate is still
 * visibly on screen; debouncing hide fixes in-view freezes.
 */
export function observeWebglMountVisibility(
  mount: Element,
  onChange: (inView: boolean) => void,
  options: ObserveVisibilityOptions = {},
): WebglVisibilityHandle {
  const hideDelayMs = options.hideDelayMs ?? 320;
  const rootMargin = options.rootMargin ?? '40% 0px';
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let lastInView = true;

  const publish = (next: boolean) => {
    if (next === lastInView) return;
    lastInView = next;
    onChange(next);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible) {
        if (hideTimer !== null) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        publish(true);
        return;
      }

      if (hideTimer !== null) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        hideTimer = null;
        publish(false);
      }, hideDelayMs);
    },
    {
      root: null,
      rootMargin,
      // Multiple thresholds catch partial visibility during scroll better than default 0 alone.
      threshold: [0, 0.01, 0.05, 0.1],
    },
  );

  observer.observe(mount);

  return {
    disconnect() {
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      observer.disconnect();
    },
  };
}
