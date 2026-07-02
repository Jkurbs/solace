export type ArticleStatus = 'draft' | 'published';

export type ArticleRecord = {
  author: string;
  body: string;
  coverDirection: string;
  createdAt: string;
  dek: string;
  handle: string;
  id: string;
  label: string;
  publishedAt: string | null;
  slug: string;
  status: ArticleStatus;
  title: string;
  updatedAt: string;
};

export type ArticlePublishInput = {
  author: string;
  body: string;
  coverDirection?: string;
  dek: string;
  handle?: string;
  id: string;
  label?: string;
  slug: string;
  title: string;
};
