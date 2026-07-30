'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

// Light paper is the site default. Dark is an explicit preference.
const STORAGE_KEY = 'solace-theme';

export default function ThemeToggle() {
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

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {theme === 'light' ? (
        <Moon strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Sun strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
