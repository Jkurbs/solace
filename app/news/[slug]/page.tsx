import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getNewsPost, newsPosts } from '@/features/news/posts';

import Mark from '../../Mark';
import NotePlate from '../../NotePlate';
import ThemeToggle from '../../ThemeToggle';

export function generateStaticParams() {
  return newsPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getNewsPost(slug);
  if (!post) return { title: 'Solace — News' };
  return {
    title: `Solace — ${post.title}`,
    description: post.dek,
    openGraph: {
      title: post.title,
      description: post.dek,
      type: 'article',
      publishedTime: post.date,
    },
  };
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getNewsPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="hx-page">
      <header className="hx-header">
        <div className="hx-header-inner">
          <Link href="/" className="hx-brand">
            <Mark size={20} />
            Solace
          </Link>
          <span className="inline-flex items-center gap-3">
            <ThemeToggle />
            <Link href="/news" className="hx-btn hx-btn-secondary hx-btn-sm">
              All news
            </Link>
          </span>
        </div>
      </header>

      <article className="hx-shell max-w-3xl pb-24 pt-32 md:pt-36">
        <NotePlate seed={post.slug} tint={post.tint} label={post.label} />

        <p className="section-kicker mt-10">
          {post.label} · {dateFormat.format(new Date(post.date))}
        </p>
        <h1 className="hx-title mt-4 text-4xl md:text-6xl">{post.title}</h1>
        <p className="hx-lead mt-6 max-w-2xl text-lg leading-8">{post.dek}</p>

        <div className="news-body theme-divide mt-10 pt-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>

        <div className="theme-divide mt-14 flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="news-footnote max-w-xl">
            No performance claims. Status labels reflect what is live and checkable today.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://solace.fyi/news/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="news-action-link"
            >
              Share on X
            </a>
            <Link href="/brief" className="news-action-link">
              Read the technical brief
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </article>
    </main>
  );
}