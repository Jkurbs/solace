'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

// Light paper is the site default. Dark is an explicit preference.
const STORAGE_KEY = 'solace-theme';

export type ThemeToggleVariant = 'paper' | 'ink';

export default function ThemeToggle({ variant = 'paper' }: { variant?: ThemeToggleVariant }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';

    setTheme(next);

    if (next === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      // Light is default, keep dataset.theme='light' so existing light-mode
      // component overrides (written for data-theme=light) still apply.
      document.documentElement.dataset.theme = 'light';
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the toggle still works for this page view.
    }
  };

  const isInk = variant === 'ink';

  return (
    <button
      type="button"
      className={`inline-flex flex-0 items-center justify-center w-[1.35rem] h-[1.35rem] rounded-full border bg-transparent cursor-pointer transition-colors duration-200 ${
        isInk
          ? 'border-white/20 text-white/75 hover:border-white/50 hover:text-white'
          : 'border-[var(--paper-line)] text-[var(--paper-muted)] hover:border-[var(--paper-ink)]/30 hover:text-[var(--paper-ink)]'
      }`}
      onClick={toggle}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {theme === 'light' ? (
        <Moon strokeWidth={1.75} className="w-[0.72rem] h-[0.72rem]" aria-hidden="true" />
      ) : (
        <Sun strokeWidth={1.75} className="w-[0.72rem] h-[0.72rem]" aria-hidden="true" />
      )}
    </button>
  );
}
