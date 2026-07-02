import type { Metadata } from 'next';
import Link from 'next/link';

import { newsPosts } from '@/features/news/posts';

import Mark from '../Mark';
import NotePlate from '../NotePlate';

export const metadata: Metadata = {
  title: 'Solace — News',
  description: 'Announcements from the Solace observatory: what shipped, what changed, what is now checkable.',
};

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function NewsPage() {
  return (
    <main className="hx-page">
      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <Link href="/hermes#request-access" className="hx-btn hx-btn-primary hx-btn-sm">
            Request access
          </Link>
        </div>
      </header>

      <section className="hx-shell pt-32 md:pt-36">
        <p className="section-kicker">Solace News</p>
        <h1 className="mt-4 max-w-2xl font-serif text-4xl font-medium leading-tight text-[#fafafa] md:text-6xl">
          The record, as it happens.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[rgba(250,250,250,0.6)]">
          Announcements from the observatory: what shipped, what changed, what is now checkable.
        </p>
      </section>

      <section className="hx-shell pb-28 pt-16">
        <div className="news-grid">
          {newsPosts.map((post) => (
            <Link key={post.slug} href={`/news/${post.slug}`} className="news-item">
              <NotePlate seed={post.slug} tint={post.tint} label={post.label} />
              <span className="news-item-date">{dateFormat.format(new Date(post.date))}</span>
              <span className="news-item-title">{post.title}</span>
              <span className="news-item-dek">{post.dek}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="hx-shell">
        <div className="hx-foot">
          <p>Solace · Independent research observatory</p>
          <Link href="/" className="text-link">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
