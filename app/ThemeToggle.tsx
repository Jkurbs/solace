'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applySiteTheme,
  readSiteTheme,
  type SiteTheme,
  toggleSiteTheme,
} from '@/lib/theme';

export type ThemeToggleVariant = 'paper' | 'ink';

export default function ThemeToggle({ variant = 'paper' }: { variant?: ThemeToggleVariant }) {
  const [theme, setTheme] = useState<SiteTheme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readSiteTheme());
    setReady(true);

    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<SiteTheme>).detail;
      if (detail === 'light' || detail === 'dark') setTheme(detail);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      if (event.newValue === 'dark' || event.newValue === 'light') {
        applySiteTheme(event.newValue, { persist: false });
        setTheme(event.newValue);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = () => {
    const next = toggleSiteTheme();
    setTheme(next);
  };

  const isInk = variant === 'ink';
  const label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <button
      type="button"
      className={`theme-toggle inline-flex flex-0 items-center justify-center w-[1.35rem] h-[1.35rem] rounded-full border bg-transparent cursor-pointer transition-colors duration-200 ${
        isInk
          ? 'border-white/20 text-white/75 hover:border-white/50 hover:text-white'
          : 'border-[var(--paper-line)] text-[var(--paper-muted)] hover:border-[var(--paper-ink)]/35 hover:text-[var(--paper-ink)]'
      }`}
      onClick={toggle}
      aria-label={label}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
      // Avoid wrong icon flash before hydration matches DOM theme.
      suppressHydrationWarning
    >
      {!ready || theme === 'light' ? (
        <Moon strokeWidth={1.75} className="w-[0.72rem] h-[0.72rem]" aria-hidden="true" />
      ) : (
        <Sun strokeWidth={1.75} className="w-[0.72rem] h-[0.72rem]" aria-hidden="true" />
      )}
    </button>
  );
}
