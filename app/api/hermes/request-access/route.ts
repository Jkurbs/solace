import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  await request.formData().catch(() => null);

  return NextResponse.redirect(new URL('/dashboard', request.url), 303);
}
