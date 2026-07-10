export const DASHBOARD_THEME_STORAGE_KEY = 'hermes_dashboard_theme';

export type DashboardTheme = 'dark' | 'light';

export const dashboardThemeChangeEvent = 'dashboard-theme-change';

export function readDashboardTheme(): DashboardTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);

  return stored === 'light' ? 'light' : 'dark';
}

export function writeDashboardTheme(theme: DashboardTheme) {
  window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent<DashboardTheme>(dashboardThemeChangeEvent, { detail: theme }));
}