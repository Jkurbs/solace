'use client';

import type { ReactNode } from 'react';

import { useDashboardTheme } from '@/features/hermes-dashboard/use-dashboard-theme';
import { cn } from '@/lib/utils';

type DashboardThemeShellProps = {
  children: ReactNode;
};

export default function DashboardThemeShell({ children }: DashboardThemeShellProps) {
  const { theme } = useDashboardTheme();

  return (
    <div
      className={cn(
        theme === 'dark' && 'dark',
        'min-h-screen transition-colors',
        theme === 'dark' ? 'bg-[#0a0a0a] text-neutral-50' : 'bg-[#f7f5ef] text-neutral-950',
      )}
    >
      {children}
    </div>
  );
}