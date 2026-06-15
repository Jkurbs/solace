import type { ReactNode } from 'react';

import DashboardProviders from './providers';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardProviders>{children}</DashboardProviders>;
}
