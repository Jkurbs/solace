import { NextResponse } from 'next/server';

import { hasConsoleAccess } from '@/features/solace-console/access';
import { updateSocialDraftWorkflow } from '@/features/social-observatory/store';
import type { SocialDraftAction } from '@/features/social-observatory/types';

const actions = new Set<SocialDraftAction>(['APPROVE', 'REJECT', 'SAVE', 'REQUEST_REVISION', 'REQUEST_PUBLISH']);

function isSocialDraftAction(value: unknown): value is SocialDraftAction {
  return typeof value === 'string' && actions.has(value as SocialDraftAction);
}

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const draftId = formData?.get('draftId');
  const action = formData?.get('action');
  const revisionRequest = formData?.get('revisionRequest');
  const redirectUrl = new URL('/console/social-observatory', request.url);

  if (typeof draftId !== 'string' || !isSocialDraftAction(action)) {
    redirectUrl.searchParams.set('draft', 'invalid');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const updatedDraft = await updateSocialDraftWorkflow(
    draftId,
    action,
    typeof revisionRequest === 'string' ? revisionRequest : undefined,
  );

  redirectUrl.searchParams.set('draft', updatedDraft ? 'updated' : 'missing');

  return NextResponse.redirect(redirectUrl, 303);
}

