import type { ReactNode } from 'react';

import DashboardProviders from './providers';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html:
            "try{var dk='hermes_dashboard_theme';var sk='solace-theme';var t=localStorage.getItem(dk)||localStorage.getItem(sk);var d=t==='light'?'light':'dark';var r=document.documentElement;r.dataset.theme=d;r.classList.toggle('dark',d==='dark');r.dataset.dashboardTheme=d;}catch(e){}",
        }}
      />
      <DashboardProviders>{children}</DashboardProviders>
    </>
  );
}
