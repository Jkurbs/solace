/**
 * Site theme — single source of truth for light/dark.
 *
 * Storage: localStorage `solace-theme` (`light` | `dark`)
 * DOM: html[data-theme] for CSS variables, html.dark for Tailwind `dark:` and
 * legacy `.dark` selectors. Both must stay in sync.
 */

export const THEME_STORAGE_KEY = 'solace-theme';
export const THEME_CHANGE_EVENT = 'solace-theme-change';

export type SiteTheme = 'light' | 'dark';

export function isSiteTheme(value: unknown): value is SiteTheme {
  return value === 'light' || value === 'dark';
}

/** Read preference; defaults to light (paper). Never throws. */
export function readSiteTheme(): SiteTheme {
  if (typeof document !== 'undefined') {
    const fromDom = document.documentElement.dataset.theme;
    if (isSiteTheme(fromDom)) return fromDom;
    if (document.documentElement.classList.contains('dark')) return 'dark';
  }

  if (typeof window === 'undefined') return 'light';

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isSiteTheme(stored)) return stored;
  } catch {
    // Private mode / blocked storage.
  }

  return 'light';
}

/**
 * Apply theme to <html> and persist.
 * Sets data-theme + classList `dark` so CSS vars and Tailwind both respond.
 */
export function applySiteTheme(theme: SiteTheme, options: { persist?: boolean } = {}) {
  const { persist = true } = options;
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.theme = theme;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Preference still applies for this session.
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }),
    );
  }
}

export function toggleSiteTheme(): SiteTheme {
  const next: SiteTheme = readSiteTheme() === 'dark' ? 'light' : 'dark';
  applySiteTheme(next);
  return next;
}

/**
 * Inline boot script for root layout — runs before paint to avoid FOUC.
 * Keep in sync with applySiteTheme DOM rules.
 */
export const THEME_BOOT_SCRIPT = `try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=t==='dark';var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.classList.toggle('dark',d)}catch(e){var r2=document.documentElement;r2.dataset.theme='light';r2.classList.remove('dark')}`;
