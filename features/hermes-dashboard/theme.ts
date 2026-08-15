import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type SiteTheme } from '@/lib/theme';

export const DASHBOARD_THEME_STORAGE_KEY = 'hermes_dashboard_theme';

export type DashboardTheme = 'dark' | 'light';

export const dashboardThemeChangeEvent = 'dashboard-theme-change';

export function readDashboardTheme(): DashboardTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  try {
    const stored = window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);

    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Private mode / blocked storage.
  }

  try {
    const siteStored = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (siteStored === 'light' || siteStored === 'dark') {
      return siteStored;
    }
  } catch {
    // Private mode / blocked storage.
  }

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'dark';
}

export function applyDashboardThemeToDom(theme: DashboardTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.dashboardTheme = theme;
}

export function writeDashboardTheme(theme: DashboardTheme) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / blocked storage.
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / blocked storage.
  }

  applyDashboardThemeToDom(theme);

  window.dispatchEvent(new CustomEvent<DashboardTheme>(dashboardThemeChangeEvent, { detail: theme }));
  window.dispatchEvent(new CustomEvent<SiteTheme>(THEME_CHANGE_EVENT, { detail: theme }));
}
