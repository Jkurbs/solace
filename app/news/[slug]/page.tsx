import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getNewsPost, newsPosts } from '@/features/news/posts';

import Mark from '../../Mark';
import NotePlate from '../../NotePlate';

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
          <Link href="/news" className="hx-btn hx-btn-secondary hx-btn-sm">
            All news
          </Link>
        </div>
      </header>

      <article className="hx-shell max-w-3xl pb-24 pt-32 md:pt-36">
        <NotePlate seed={post.slug} tint={post.tint} label={post.label} />

        <p className="section-kicker mt-10">
          {post.label} · {dateFormat.format(new Date(post.date))}
        </p>
        <h1 className="mt-4 font-serif text-4xl font-medium leading-tight text-[#fafafa] md:text-6xl">
          {post.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[rgba(250,250,250,0.66)]">{post.dek}</p>

        <div className="news-body mt-10 border-t border-white/10 pt-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ children, ...props }) => (
                <a className="text-[#fafafa] underline underline-offset-4" {...props}>
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-7 border-l-2 border-white/20 pl-5 text-[rgba(250,250,250,0.7)]">
                  {children}
                </blockquote>
              ),
              h2: ({ children }) => (
                <h2 className="mt-12 font-serif text-2xl font-medium tracking-[-0.01em] text-[#fafafa] first:mt-0 md:text-3xl">
                  {children}
                </h2>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
              ol: ({ children }) => (
                <ol className="my-6 list-decimal space-y-2 pl-6 text-base leading-8 text-[rgba(250,250,250,0.66)]">
                  {children}
                </ol>
              ),
              p: ({ children }) => (
                <p className="mt-5 text-base leading-8 text-[rgba(250,250,250,0.66)] first:mt-0">{children}</p>
              ),
              strong: ({ children }) => <strong className="font-semibold text-[#fafafa]">{children}</strong>,
              ul: ({ children }) => (
                <ul className="my-6 list-disc space-y-2 pl-6 text-base leading-8 text-[rgba(250,250,250,0.66)]">
                  {children}
                </ul>
              ),
            }}
          >
            {post.body}
          </ReactMarkdown>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm leading-6 text-[rgba(250,250,250,0.45)]">
            No performance claims. Status labels reflect what is live and checkable today.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://solace.fyi/news/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-[0.18em] text-[rgba(250,250,250,0.55)] transition-colors hover:text-[#fafafa]"
            >
              Share on X
            </a>
            <Link
              href="/brief"
              className="font-mono text-xs uppercase tracking-[0.18em] text-[rgba(250,250,250,0.55)] transition-colors hover:text-[#fafafa]"
            >
              Read the technical brief
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
