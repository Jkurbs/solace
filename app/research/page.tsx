import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getLatestPublishedArticle } from '@/features/articles/store';
import type { ArticleRecord } from '@/features/articles/types';

import Mark from '../Mark';

export const metadata: Metadata = {
  title: 'Solace — Research',
  description:
    'Public Solace research notes on capital allocation, uncertainty, market structure, and disciplined system design.',
};

export const dynamic = 'force-dynamic';

const fallbackArticle: ArticleRecord = {
  author: 'Solace Research',
  body: `Most market conversations start too late. They begin at entry, confirmation, or the next visible move. By then, capital has already passed through an earlier decision: whether the opportunity deserved attention at all.

Solace treats markets as allocation environments. The work is not to predict every fluctuation. The work is to decide where capital belongs, when evidence justifies commitment, whether the thesis remains intact, and when capital should be preserved or recycled.

## Selection

Selection asks: where should capital go?

The first discipline is rejection. Most visible movement is not worth capital. A useful system reduces the market before it exposes capital to it.

For Hermes, selection is where liquidity, regime, opportunity cost, and capital efficiency compress into one question: is this path worth continued attention?

## Commitment

Commitment asks: when is the evidence strong enough to move?

Movement alone is not evidence. Capital should commit only when structure and timing improve the asymmetry between risk taken and opportunity offered.

Patience is not inactivity. It is the decision to withhold exposure until the market earns it.

## Monitoring

Monitoring asks: is this still the same allocation?

A position is not a frozen thesis. New liquidity, volatility, news, sentiment, and path behavior can change the quality of the original decision.

This is where Hermes spends most of its life. It does not treat deployment as completion. It keeps asking whether the evidence still supports the capital at risk.

## Exit

Exit asks: should capital stay, reduce, or recycle?

The hardest decision is often leaving a working idea. Profit, time, deteriorating structure, and better opportunities all compete for the same capital.

The goal is not to maximize one allocation. It is to preserve judgment and optionality across a long series of decisions.

## The philosophy

These are not chart steps. They are four questions capital asks.

Where should I go? When should I commit? Has anything changed? Should I stay?

That is why Solace frames markets as capital allocation under uncertainty rather than prediction. Prediction tries to be right about the next move. Allocation tries to survive and compound through many moves.`,
  coverDirection: '',
  createdAt: '2026-07-01T00:00:00.000Z',
  dek: 'Every allocation lives inside four decisions. Most market systems only optimize one.',
  handle: '@solacefyi',
  id: 'research-note-001',
  label: 'Research note 001 · V0.1 · July 2026',
  publishedAt: '2026-07-01T00:00:00.000Z',
  slug: 'the-four-decisions-that-govern-capital',
  status: 'published',
  title: 'The Four Decisions That Govern Capital',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

export default async function ResearchPage() {
  const article = (await getLatestPublishedArticle()) ?? fallbackArticle;

  return (
    <main className="brief-paper relative min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/10 bg-[rgba(247,242,232,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            <Mark size={20} />
            Solace
          </Link>
          <nav className="flex items-center gap-5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#6b6354]">
            <Link href="/brief" className="transition-colors hover:text-[#13110c]">
              Brief
            </Link>
            <Link href="/" className="transition-colors hover:text-[#13110c]">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 pb-24 pt-36 md:px-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#7c7468]">
          Solace Research
        </p>

        <section className="mt-5 border-b border-black/10 pb-14">
          <h1 className="max-w-3xl font-serif text-5xl font-medium leading-tight text-[#13110c] md:text-7xl">
            Notes on markets under uncertainty.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#3f3a30]">
            Public research from Solace. Short, inspectable language about market structure,
            uncertainty, and how capital moves.
          </p>
        </section>

        <section className="mt-12 border-b border-black/10 pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-[#7c7468]">
                Featured
              </p>
              <h2 className="mt-4 max-w-2xl font-serif text-4xl font-medium leading-tight text-[#13110c] md:text-5xl">
                {article.title}
              </h2>
            </div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#6b6354]">
              {article.label}
            </p>
          </div>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#3f3a30]">{article.dek}</p>
          <div className="mt-8 flex items-center gap-3 border-t border-black/10 pt-8">
            <div className="grid h-10 w-10 place-items-center border border-black/10 bg-[#efe8d8] text-[#6b6354]">
              <Mark size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#13110c]">{article.author}</p>
              <p className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#7c7468]">
                {article.handle}
              </p>
            </div>
          </div>
        </section>

        <article className="border-b border-black/10 py-12">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ children, ...props }) => (
                <a className="text-[#13110c] underline underline-offset-4" {...props}>
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-7 border-l-2 border-black/20 pl-5 text-[#3f3a30]">{children}</blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-black/5 px-1.5 py-0.5 font-mono text-sm text-[#13110c]">{children}</code>
              ),
              h2: ({ children }) => (
                <h2 className="mt-12 font-serif text-3xl font-medium tracking-[-0.02em] text-[#13110c] first:mt-0 md:text-4xl">
                  {children}
                </h2>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
              ol: ({ children }) => <ol className="my-6 list-decimal space-y-2 pl-6 text-base leading-8 text-[#3f3a30]">{children}</ol>,
              p: ({ children }) => <p className="mt-5 text-base leading-8 text-[#3f3a30] first:mt-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-[#13110c]">{children}</strong>,
              ul: ({ children }) => <ul className="my-6 list-disc space-y-2 pl-6 text-base leading-8 text-[#3f3a30]">{children}</ul>,
            }}
          >
            {article.body}
          </ReactMarkdown>
        </article>

        <div className="mt-14 flex flex-col gap-5 border-t border-black/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm leading-6 text-[#6b6354]">
            Public research only. This note does not publish weights, thresholds, live symbol
            examples, execution rules, or alert conditions.
          </p>
          <Link
            href="/brief"
            className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            Read the technical brief
          </Link>
        </div>
      </article>
    </main>
  );
}
