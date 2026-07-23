/**
 * Pause homepage (and other) WebGL loops as soon as the user commits to a
 * navigation. The previous page stays mounted until the next route is ready;
 * without this, GPU particle scenes keep burning the main thread during that wait.
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
