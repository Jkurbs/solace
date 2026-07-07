import type { PlateTint } from '@/lib/note-plate';

export type NewsPost = {
  slug: string;
  title: string;
  dek: string;
  label: string;
  /** ISO date, used for ordering and display. */
  date: string;
  tint: PlateTint;
  body: string;
};

// Newest first. News is announcements — what shipped, what changed, what is
// now checkable. Mechanism and status only; never performance.
export const newsPosts: NewsPost[] = [
  {
    slug: 'introducing-hermes',
    title: 'Introducing Hermes',
    dek: 'Our first instrument is live in beta: a capital allocation engine for markets under uncertainty.',
    label: 'News 001',
    date: '2026-07-02',
    tint: 'gold',
    body: `Solace exists to build instruments for decision-making under uncertainty. Today the first one is live.

Hermes is a capital allocation engine for markets. It reads liquidity distribution, timing, and regime character across multiple timeframes, and decides when capital should move, when it should wait, and when it should be preserved. It is running now, in beta, on founder capital.

## What Hermes is

Most market systems try to predict where price is going. Hermes asks a different question: whether the field between here and there can carry price at all. We call this the liquidity path, and it is the core abstraction of the instrument — a destination matters less than the terrain on the way to it.

Between every signal and every order sits a gate with three conditions. The structure has to be worth evaluating. The regime has to be behaving in character. The timing has to confirm. Capital moves only when all three agree — and most hours, they don't. Execution is gated, not continuous, and standing down is treated as a position the system takes often.

## What is live today

Hermes Beta v0.1.0 operates on founder capital only. No outside capital is at risk while access opens in stages. Approved users will fund Hermes by depositing directly into Solace, with capital becoming eligible for allocation only after account, identity, settlement, treasury, and risk checks clear.

Risk is governed in layers: posture, sizing that scales with the depth of the field, hard drawdown guards, and kill switches that halt the system entirely. Money movement stays separate from signal generation.

## What you can check

Solace publishes no performance claims, and this announcement makes none. What we publish instead is what can be verified: a [technical brief](/brief) that is versioned in public, [research notes](/research) on the framework Hermes runs on, and a [public decision ledger](/trust) where every Hermes decision is recorded before its outcome is known — wins, losses, and waits alike.

The standard is the one from the brief: claims that can be checked, published when they can be checked. Anything not yet checkable is labeled with its honest status.

## Access

Hermes is being introduced in stages. If you want to be considered as access opens, you can [request access](/hermes#request-access). Every request is reviewed; if selected, Solace reaches out directly.

The first instrument is live. The record starts now.`,
  },
];

export function getNewsPost(slug: string) {
  return newsPosts.find((post) => post.slug === slug) ?? null;
}

export function getLatestNewsPost() {
  return newsPosts[0] ?? null;
}
