'use client';

import { Moon, Sun } from 'lucide-react';

import { useDashboardTheme } from '@/features/hermes-dashboard/use-dashboard-theme';
import { cn } from '@/lib/utils';

type DashboardThemeToggleProps = {
  className?: string;
};

export default function DashboardThemeToggle({ className }: DashboardThemeToggleProps) {
  const { theme, toggleTheme } = useDashboardTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-900',
        className,
      )}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {theme === 'light' ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
    </button>
  );
}