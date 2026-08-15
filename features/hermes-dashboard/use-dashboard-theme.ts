'use client';

import { useCallback, useEffect, useState } from 'react';

import { THEME_CHANGE_EVENT, type SiteTheme } from '@/lib/theme';

import {
  applyDashboardThemeToDom,
  DASHBOARD_THEME_STORAGE_KEY,
  type DashboardTheme,
  dashboardThemeChangeEvent,
  readDashboardTheme,
  writeDashboardTheme,
} from './theme';

export function useDashboardTheme() {
  const [theme, setTheme] = useState<DashboardTheme>(() => readDashboardTheme());

  // Keep the <html> element in sync with the dashboard theme so Tailwind
  // dark: variants and CSS variables respond everywhere, not just inside the
  // dashboard shell.
  useEffect(() => {
    applyDashboardThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DASHBOARD_THEME_STORAGE_KEY && event.key !== 'solace-theme') {
        return;
      }

      const next =
        event.newValue === 'light' ? 'light' : event.newValue === 'dark' ? 'dark' : readDashboardTheme();

      setTheme((current) => (current === next ? current : next));
    };

    const onDashboardThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<DashboardTheme>).detail;

      if (detail === 'light' || detail === 'dark') {
        setTheme((current) => (current === detail ? current : detail));
      }
    };

    const onSiteThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<SiteTheme>).detail;

      if (detail === 'light' || detail === 'dark') {
        setTheme((current) => (current === detail ? current : detail));
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(dashboardThemeChangeEvent, onDashboardThemeChange);
    window.addEventListener(THEME_CHANGE_EVENT, onSiteThemeChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(dashboardThemeChangeEvent, onDashboardThemeChange);
      window.removeEventListener(THEME_CHANGE_EVENT, onSiteThemeChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      writeDashboardTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
