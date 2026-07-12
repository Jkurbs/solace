import type { ReactNode } from 'react';

import DashboardProviders from './providers';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('hermes_dashboard_theme');document.documentElement.dataset.dashboardTheme=t==='light'?'light':'dark'}catch(e){}",
        }}
      />
      <DashboardProviders>{children}</DashboardProviders>
    </>
  );
}
