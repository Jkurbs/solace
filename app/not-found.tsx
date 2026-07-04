import Link from 'next/link';

import Mark from './Mark';

export default function NotFound() {
  return (
    <main className="hx-page grid min-h-screen place-items-center px-6">
      <div className="grid justify-items-center gap-5 text-center">
        <Mark size={28} className="text-[#d6d0c4]" />
        <p className="section-kicker">404 · Nothing resolved here</p>
        <h1 className="max-w-xl font-serif text-4xl font-medium leading-tight text-[#fafafa] md:text-5xl">
          This coordinate is empty.
        </h1>
        <p className="max-w-md text-base leading-7 text-[rgba(250,250,250,0.6)]">
          The page you were looking for doesn&apos;t exist, or has been superseded. The observatory keeps its
          record elsewhere.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="hx-btn hx-btn-primary">
            Return home
          </Link>
          <Link href="/brief" className="hx-btn hx-btn-secondary">
            Read the brief
          </Link>
        </div>
      </div>
    </main>
  );
}
