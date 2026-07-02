'use client';

import {
  Bold,
  Clipboard,
  Edit3,
  Expand,
  FileJson,
  ImagePlus,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MoreHorizontal,
  Plus,
  Quote,
  Strikethrough,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ArticleRecord, ArticleStatus } from '@/features/articles/types';

type ArticleDraft = {
  author: string;
  body: string;
  coverDirection: string;
  dek: string;
  handle: string;
  id: string;
  label: string;
  publishedAt?: string;
  slug: string;
  status: ArticleStatus;
  title: string;
  updatedAt: string;
};

type LegacyDraft = {
  author?: string;
  coverDirection?: string;
  dek?: string;
  label?: string;
  sections?: Array<{ body: string; heading: string }>;
  slug?: string;
  title?: string;
};

const storageKey = 'solace.articleCreator.v2';
const legacyStorageKey = 'solace.articleCreator.v1';

const starterBody = `Most market conversations start too late. They begin at entry, confirmation, or the next visible move. By then, capital has already passed through an earlier decision: whether the opportunity deserved attention at all.

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

That is why Solace frames markets as capital allocation under uncertainty rather than prediction. Prediction tries to be right about the next move. Allocation tries to survive and compound through many moves.`;

const initialDraft: ArticleDraft = {
  author: 'Solace Research',
  body: starterBody,
  coverDirection: 'Minimal black 5:2 cover. White Solace wordmark, title centered, restrained institutional feel.',
  dek: 'Every allocation lives inside four decisions. Most market systems only optimize one.',
  handle: '@solacefyi',
  id: 'research-note-001',
  label: 'Research note 001 · V0.1 · July 2026',
  slug: 'the-four-decisions-that-govern-capital',
  status: 'draft',
  title: 'The Four Decisions That Govern Capital',
  updatedAt: new Date().toISOString(),
};

function createDraftId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `article-${Date.now()}`;
}

function bodyFromLegacyDraft(draft: LegacyDraft) {
  if (!draft.sections?.length) {
    return starterBody;
  }

  return draft.sections.map((section) => `## ${section.heading}\n\n${section.body}`).join('\n\n');
}

function fromLegacyDraft(draft: LegacyDraft): ArticleDraft {
  return {
    ...initialDraft,
    author: draft.author || initialDraft.author,
    body: bodyFromLegacyDraft(draft),
    coverDirection: draft.coverDirection || initialDraft.coverDirection,
    dek: draft.dek || initialDraft.dek,
    id: createDraftId(),
    label: draft.label || initialDraft.label,
    slug: draft.slug || initialDraft.slug,
    title: draft.title || initialDraft.title,
    updatedAt: new Date().toISOString(),
  };
}

function countWords(value: string) {
  return value
    .replace(/[#*_>`~\-[\]()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function formatSavedTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes === 1) {
    return '1 minute ago';
  }

  return `${minutes} minutes ago`;
}

function buildMarkdown(draft: ArticleDraft) {
  return `# ${draft.title.trim()}\n\n${draft.dek.trim()}\n\n${draft.label.trim()}\n\n${draft.author.trim()} ${draft.handle.trim()}\n\n${draft.body.trim()}\n`;
}

function normalizeDrafts(value: unknown): ArticleDraft[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is ArticleDraft => Boolean(item && typeof item === 'object' && 'title' in item && 'body' in item))
      .map((item) => ({
        ...initialDraft,
        ...item,
        updatedAt: item.updatedAt || new Date().toISOString(),
      }));
  }

  if (value && typeof value === 'object' && 'sections' in value) {
    return [fromLegacyDraft(value as LegacyDraft)];
  }

  if (value && typeof value === 'object' && 'title' in value && 'body' in value) {
    return [{ ...initialDraft, ...(value as ArticleDraft) }];
  }

  return [initialDraft];
}

function selectPreviewText(draft: ArticleDraft) {
  const firstParagraph = draft.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .find((paragraph) => paragraph && !paragraph.startsWith('#'));

  return firstParagraph || draft.dek;
}

function ToolbarButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-50"
    >
      {children}
    </button>
  );
}

export default function ArticleCreator() {
  const [drafts, setDrafts] = useState<ArticleDraft[]>([initialDraft]);
  const [activeDraftId, setActiveDraftId] = useState(initialDraft.id);
  const [activeTab, setActiveTab] = useState<ArticleStatus>('draft');
  const [copied, setCopied] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published'>('idle');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) || window.localStorage.getItem(legacyStorageKey);

    if (stored) {
      try {
        const nextDrafts = normalizeDrafts(JSON.parse(stored));
        setDrafts(nextDrafts);
        setActiveDraftId(nextDrafts[0]?.id || initialDraft.id);
      } catch {
        setDrafts([initialDraft]);
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(drafts));
  }, [drafts, loaded]);

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) || drafts[0] || initialDraft;
  const filteredDrafts = drafts.filter((draft) => draft.status === activeTab);
  const markdown = useMemo(() => buildMarkdown(activeDraft), [activeDraft]);
  const json = useMemo(() => JSON.stringify(activeDraft, null, 2), [activeDraft]);
  const wordCount = useMemo(() => countWords(`${activeDraft.title} ${activeDraft.dek} ${activeDraft.body}`), [activeDraft]);

  function updateActiveDraft(patch: Partial<ArticleDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === activeDraft.id ? { ...draft, ...patch, updatedAt: new Date().toISOString() } : draft,
      ),
    );
  }

  function createNewDraft() {
    const nextDraft: ArticleDraft = {
      ...initialDraft,
      body: '',
      dek: 'A short description of the article.',
      id: createDraftId(),
      label: 'Draft',
      slug: 'new-article',
      title: 'Untitled Article',
      updatedAt: new Date().toISOString(),
    };

    setDrafts((current) => [nextDraft, ...current]);
    setActiveDraftId(nextDraft.id);
    setActiveTab('draft');
  }

  async function publishActiveDraft() {
    setPublishError(null);
    setPublishState('publishing');

    try {
      const response = await fetch('/api/console/articles', {
        body: JSON.stringify({
          author: activeDraft.author,
          body: activeDraft.body,
          coverDirection: activeDraft.coverDirection,
          dek: activeDraft.dek,
          handle: activeDraft.handle,
          id: activeDraft.id,
          label: activeDraft.label,
          slug: activeDraft.slug,
          title: activeDraft.title,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = (await response.json().catch(() => null)) as { article?: ArticleRecord; message?: string } | null;

      if (!response.ok || !payload?.article) {
        throw new Error(payload?.message || 'Publish failed.');
      }

      const published = payload.article;
      setDrafts((current) =>
        current.map((draft) =>
          draft.id === activeDraft.id
            ? {
                ...draft,
                author: published.author,
                body: published.body,
                coverDirection: published.coverDirection,
                dek: published.dek,
                handle: published.handle,
                label: published.label,
                publishedAt: published.publishedAt ?? undefined,
                slug: published.slug,
                status: published.status,
                title: published.title,
                updatedAt: published.updatedAt,
              }
            : draft,
        ),
      );
      setActiveTab('published');
      setPublishState('published');
      window.setTimeout(() => setPublishState('idle'), 2200);
    } catch (error) {
      setPublishState('idle');
      setPublishError(error instanceof Error ? error.message : 'Publish failed.');
    }
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  function setBody(nextBody: string) {
    updateActiveDraft({ body: nextBody });
  }

  function applyInlineMarkdown(prefix: string, suffix = prefix, fallback = 'text') {
    const textarea = bodyRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = activeDraft.body.slice(start, end) || fallback;
    const nextBody = `${activeDraft.body.slice(0, start)}${prefix}${selected}${suffix}${activeDraft.body.slice(end)}`;
    setBody(nextBody);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function insertBlock(value: string) {
    const textarea = bodyRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const prefix = start > 0 && !activeDraft.body.slice(0, start).endsWith('\n') ? '\n\n' : '';
    const nextBody = `${activeDraft.body.slice(0, start)}${prefix}${value}${activeDraft.body.slice(start)}`;
    setBody(nextBody);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length + value.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="grid min-h-[calc(100vh-4.5rem)] border-t border-neutral-800 lg:grid-cols-[20rem_1fr]">
      <aside className="border-b border-neutral-800 bg-black lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-neutral-50">Articles</h2>
          <button
            type="button"
            onClick={createNewDraft}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-neutral-900 hover:text-neutral-50"
            aria-label="Create article"
            title="Create article"
          >
            <Edit3 size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 border-b border-neutral-800 px-5">
          {(['draft', 'published'] as ArticleStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveTab(status)}
              className={`relative h-12 text-sm font-semibold capitalize transition-colors ${
                activeTab === status ? 'text-neutral-50' : 'text-neutral-500 hover:text-neutral-200'
              }`}
            >
              {status === 'draft' ? 'Drafts' : 'Published'}
              {activeTab === status ? (
                <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-sky-400" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="divide-y divide-neutral-900">
          {filteredDrafts.length ? (
            filteredDrafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => setActiveDraftId(draft.id)}
                className={`w-full border-r-2 px-5 py-4 text-left transition-colors ${
                  draft.id === activeDraft.id
                    ? 'border-sky-400 bg-[#1b1c20]'
                    : 'border-transparent hover:bg-neutral-950'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-sm bg-violet-700 px-2 py-1 text-xs font-bold text-violet-50">
                    {draft.status === 'draft' ? 'Draft' : 'Live'}
                  </span>
                  <MoreHorizontal size={17} className="text-neutral-600" aria-hidden="true" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-base font-semibold text-neutral-100">{draft.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">{draft.dek}</p>
              </button>
            ))
          ) : (
            <div className="px-5 py-10 text-sm text-neutral-600">No {activeTab} articles yet.</div>
          )}
        </div>
      </aside>

      <section className="min-w-0 bg-[#050505]">
        <div className="sticky top-[4.3rem] z-20 border-b border-neutral-800 bg-black/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-sm bg-violet-700 px-2 py-1 text-xs font-bold text-violet-50">
                {activeDraft.status === 'draft' ? 'Draft' : 'Published'}
              </span>
              <span className="truncate text-sm text-neutral-500">Last saved {formatSavedTime(activeDraft.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copy(markdown, 'Markdown')}
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold text-sky-400 transition-colors hover:bg-sky-400/10"
              >
                <Clipboard size={15} aria-hidden="true" />
                Markdown
              </button>
              <button
                type="button"
                onClick={publishActiveDraft}
                disabled={publishState === 'publishing'}
                className="inline-flex h-10 items-center justify-center rounded-full bg-sky-400 px-5 text-sm font-bold text-white transition-colors hover:bg-sky-300"
              >
                {publishState === 'publishing' ? 'Publishing' : publishState === 'published' ? 'Published' : 'Publish'}
              </button>
              <button
                type="button"
                onClick={() => copy(json, 'JSON')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-50"
                aria-label="Copy JSON"
                title="Copy JSON"
              >
                <FileJson size={17} aria-hidden="true" />
              </button>
              <Expand size={18} className="hidden text-neutral-400 sm:block" aria-hidden="true" />
            </div>
          </div>

          <div className="flex min-h-12 items-center gap-1 overflow-x-auto border-t border-neutral-900 px-3 sm:px-5">
            <ToolbarButton label="Bold" onClick={() => applyInlineMarkdown('**', '**', 'bold text')}>
              <Bold size={18} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Italic" onClick={() => applyInlineMarkdown('*', '*', 'italic text')}>
              <Italic size={18} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Strikethrough" onClick={() => applyInlineMarkdown('~~', '~~', 'struck text')}>
              <Strikethrough size={18} aria-hidden="true" />
            </ToolbarButton>
            <span className="mx-2 h-6 w-px bg-neutral-800" aria-hidden="true" />
            <ToolbarButton label="Quote" onClick={() => insertBlock('> Quote text\n\n')}>
              <Quote size={18} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Bulleted list" onClick={() => insertBlock('- First point\n- Second point\n\n')}>
              <List size={18} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Numbered list" onClick={() => insertBlock('1. First point\n2. Second point\n\n')}>
              <ListOrdered size={18} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Link" onClick={() => applyInlineMarkdown('[', '](https://)', 'link text')}>
              <LinkIcon size={18} aria-hidden="true" />
            </ToolbarButton>
            <span className="mx-2 h-6 w-px bg-neutral-800" aria-hidden="true" />
            <span className="ml-auto whitespace-nowrap text-sm text-neutral-500">{wordCount} words</span>
            {copied ? <span className="whitespace-nowrap text-xs font-semibold text-emerald-200">Copied {copied}</span> : null}
            {publishError ? <span className="whitespace-nowrap text-xs font-semibold text-red-200">{publishError}</span> : null}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-10">
          <div className="rounded-lg border border-neutral-800 bg-[#202329]">
            <div className="grid min-h-64 place-items-center p-6 text-center">
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/24 text-neutral-400">
                  <ImagePlus size={24} aria-hidden="true" />
                </div>
                <p className="mt-5 text-sm font-medium text-neutral-500">
                  We recommend an image with a 5:2 aspect ratio for best results.
                </p>
                <textarea
                  value={activeDraft.coverDirection}
                  onChange={(event) => updateActiveDraft({ coverDirection: event.target.value })}
                  className="mt-5 min-h-16 w-full max-w-xl resize-none rounded-md border border-neutral-700 bg-black/24 p-3 text-center text-sm leading-6 text-neutral-300 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-500"
                  placeholder="Cover direction"
                />
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-3xl py-14">
            <input
              value={activeDraft.title}
              onChange={(event) => updateActiveDraft({ title: event.target.value })}
              className="w-full border-0 bg-transparent text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-50 outline-none placeholder:text-neutral-700 md:text-6xl"
              placeholder="Article title"
            />

            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-neutral-800 text-sm font-bold text-neutral-200">
                  S
                </div>
                <div className="min-w-0">
                  <input
                    value={activeDraft.author}
                    onChange={(event) => updateActiveDraft({ author: event.target.value })}
                    className="h-6 w-full border-0 bg-transparent text-sm font-bold text-neutral-100 outline-none"
                    placeholder="Author"
                  />
                  <input
                    value={activeDraft.handle}
                    onChange={(event) => updateActiveDraft({ handle: event.target.value })}
                    className="h-6 w-full border-0 bg-transparent text-sm text-neutral-500 outline-none"
                    placeholder="@handle"
                  />
                </div>
              </div>
              <input
                value={activeDraft.label}
                onChange={(event) => updateActiveDraft({ label: event.target.value })}
                className="h-10 rounded-md border border-neutral-800 bg-black/24 px-3 font-mono text-xs uppercase tracking-[0.14em] text-neutral-500 outline-none focus:border-neutral-600"
                placeholder="Label"
              />
            </div>

            <textarea
              value={activeDraft.dek}
              onChange={(event) => updateActiveDraft({ dek: event.target.value })}
              className="mt-8 min-h-20 w-full resize-y border-0 bg-transparent text-xl font-medium leading-8 text-neutral-200 outline-none placeholder:text-neutral-700"
              placeholder="Short article description"
            />

            <textarea
              ref={bodyRef}
              value={activeDraft.body}
              onChange={(event) => setBody(event.target.value)}
              className="mt-8 min-h-[34rem] w-full resize-y border-0 border-t border-neutral-800 bg-transparent pt-8 font-sans text-lg leading-8 text-neutral-200 outline-none placeholder:text-neutral-700"
              placeholder="Write in Markdown..."
              spellCheck
            />

            <section className="mt-14 border-t border-neutral-800 pt-12">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600">Preview</p>
              <article className="mt-8 rounded-lg border border-neutral-900 bg-black px-5 py-8 sm:px-10">
                <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-50">
                  {activeDraft.title}
                </h2>
                <div className="mt-7 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-800 text-sm font-bold text-neutral-200">
                    S
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-100">{activeDraft.author}</p>
                    <p className="text-sm text-neutral-500">{activeDraft.handle}</p>
                  </div>
                </div>
                <p className="mt-7 text-lg leading-8 text-neutral-200">{activeDraft.dek}</p>
                <div className="mt-9 border-t border-neutral-800 pt-9">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ children, ...props }) => (
                        <a className="text-sky-400 underline-offset-4 hover:underline" {...props}>
                          {children}
                        </a>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="my-6 border-l-2 border-neutral-600 pl-5 text-neutral-300">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children }) => (
                        <code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-sm text-neutral-100">
                          {children}
                        </code>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mt-10 text-2xl font-semibold tracking-[-0.02em] text-neutral-50 first:mt-0">
                          {children}
                        </h2>
                      ),
                      li: ({ children }) => <li className="pl-1">{children}</li>,
                      ol: ({ children }) => (
                        <ol className="my-5 list-decimal space-y-2 pl-6 text-base leading-8 text-neutral-300">
                          {children}
                        </ol>
                      ),
                      p: ({ children }) => <p className="mt-5 text-base leading-8 text-neutral-300 first:mt-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-neutral-50">{children}</strong>,
                      ul: ({ children }) => (
                        <ul className="my-5 list-disc space-y-2 pl-6 text-base leading-8 text-neutral-300">
                          {children}
                        </ul>
                      ),
                    }}
                  >
                    {activeDraft.body}
                  </ReactMarkdown>
                </div>
              </article>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
