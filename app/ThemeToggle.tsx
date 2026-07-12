'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

// Dark is the site's default (the observatory); light is the paper register
// the brief and scorecard already live in. Choice persists per visitor.
const STORAGE_KEY = 'solace-theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';

    setTheme(next);

    if (next === 'light') {
      document.documentElement.dataset.theme = 'light';
    } else {
      delete document.documentElement.dataset.theme;
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
        <Moon size={15} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Sun size={15} strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
