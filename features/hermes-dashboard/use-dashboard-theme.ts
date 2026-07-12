'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DASHBOARD_THEME_STORAGE_KEY,
  type DashboardTheme,
  dashboardThemeChangeEvent,
  readDashboardTheme,
  writeDashboardTheme,
} from './theme';

export function useDashboardTheme() {
  const [theme, setTheme] = useState<DashboardTheme>(() => readDashboardTheme());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === DASHBOARD_THEME_STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
        setTheme(event.newValue);
      }
    };

    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<DashboardTheme>).detail;

      if (detail === 'light' || detail === 'dark') {
        setTheme(detail);
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(dashboardThemeChangeEvent, onThemeChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(dashboardThemeChangeEvent, onThemeChange);
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