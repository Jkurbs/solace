import Link from 'next/link';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

import Mark from './Mark';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader variant="ink" />

      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-16 text-center">
        <Mark size={28} className="text-accent" />
        <p className="section-kicker mt-6">404 · Nothing resolved here</p>
        <h1 className="hx-title mt-5 max-w-xl text-4xl md:text-5xl">This coordinate is empty.</h1>
        <p className="hx-lead mt-4 max-w-md text-base leading-7">
          The page you were looking for doesn&apos;t exist, or has been superseded. The observatory keeps its
          record elsewhere.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="hx-btn hx-btn-primary">
            Return home
          </Link>
          <Link href="/brief" className="hx-btn hx-btn-secondary">
            Read the brief
          </Link>
        </div>
      </main>

      <SiteFooter variant="ink" />
    </div>
  );
}
