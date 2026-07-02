import { NextResponse } from 'next/server';

import { publishArticle, validateArticlePublishInput } from '@/features/articles/store';
import { hasConsoleAccess } from '@/features/solace-console/access';

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const article = validateArticlePublishInput(payload);

  if (!article) {
    return NextResponse.json({ message: 'Invalid article payload.' }, { status: 400 });
  }

  try {
    const publishedArticle = await publishArticle(article);

    return NextResponse.json({ article: publishedArticle });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Article publish failed.';

    return NextResponse.json({ message }, { status: 500 });
  }
}
