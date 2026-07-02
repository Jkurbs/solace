import 'server-only';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import type { ArticlePublishInput, ArticleRecord } from './types';

type ArticleRow = Database['public']['Tables']['solace_articles']['Row'];

function now() {
  return new Date().toISOString();
}

function articleFromRow(row: ArticleRow): ArticleRecord {
  return {
    author: row.author,
    body: row.body,
    coverDirection: row.cover_direction,
    createdAt: row.created_at,
    dek: row.dek,
    handle: row.handle,
    id: row.id,
    label: row.label,
    publishedAt: row.published_at,
    slug: row.slug,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function cleanInput(input: ArticlePublishInput): ArticlePublishInput {
  return {
    author: input.author.trim() || 'Solace Research',
    body: input.body.trim(),
    coverDirection: input.coverDirection?.trim() ?? '',
    dek: input.dek.trim(),
    handle: input.handle?.trim() || '@solacefyi',
    id: input.id.trim(),
    label: input.label?.trim() ?? '',
    slug: input.slug.trim(),
    title: input.title.trim(),
  };
}

export function validateArticlePublishInput(input: unknown): ArticlePublishInput | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Record<string, unknown>;

  if (
    typeof record.id !== 'string' ||
    typeof record.slug !== 'string' ||
    typeof record.title !== 'string' ||
    typeof record.dek !== 'string' ||
    typeof record.body !== 'string' ||
    typeof record.author !== 'string'
  ) {
    return null;
  }

  const normalized = cleanInput({
    author: record.author,
    body: record.body,
    coverDirection: typeof record.coverDirection === 'string' ? record.coverDirection : '',
    dek: record.dek,
    handle: typeof record.handle === 'string' ? record.handle : '@solacefyi',
    id: record.id,
    label: typeof record.label === 'string' ? record.label : '',
    slug: record.slug,
    title: record.title,
  });

  if (!normalized.id || !normalized.slug || !normalized.title || !normalized.dek || !normalized.body) {
    return null;
  }

  return normalized;
}

export async function publishArticle(input: ArticlePublishInput) {
  if (!isSupabaseDataClientConfigured()) {
    throw new Error('Supabase is not configured for article publishing.');
  }

  const article = cleanInput(input);
  const timestamp = now();
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from('solace_articles')
    .upsert(
      {
        author: article.author,
        body: article.body,
        cover_direction: article.coverDirection ?? '',
        dek: article.dek,
        handle: article.handle ?? '@solacefyi',
        id: article.id,
        label: article.label ?? '',
        published_at: timestamp,
        slug: article.slug,
        status: 'published',
        title: article.title,
        updated_at: timestamp,
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Article publish failed.');
  }

  return articleFromRow(data as ArticleRow);
}

export async function listPublishedArticles() {
  if (!isSupabaseDataClientConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('solace_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.warn('[articles] Supabase articles unavailable.', error.message);
      return [];
    }

    return ((data ?? []) as ArticleRow[]).map(articleFromRow);
  } catch (error) {
    console.warn('[articles] Supabase article list failed.', error);
    return [];
  }
}

export async function getLatestPublishedArticle() {
  const articles = await listPublishedArticles();

  return articles[0] ?? null;
}
