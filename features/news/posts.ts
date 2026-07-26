import { hermesVersion } from '@/features/hermes-version';
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
    slug: 'introducing-glorya',
    title: 'Introducing Glorya',
    dek: 'Solace’s second instrument: humanitarian capital only when need is verified and the path can carry help. Designed and evaluating — not live.',
    label: 'News 003',
    date: '2026-07-26',
    tint: 'teal',
    body: `Solace builds instruments for decisions under uncertainty. Hermes tests that loop in markets. Today we are publishing the design of the second instrument: [Glorya](/glorya).

Glorya is for humanitarian capital. It does not fund a place because a map is tragic or a headline is loud. It asks whether need is verified and severe enough, and whether capital can actually become help on the ground — a partner who can deliver, access to the people in need, a regime stable enough for aid to land and stick, and a timing window that is still open.

Hermes asks whether markets can carry a trade. Glorya asks whether the path to the field can carry an intervention. The method is the same: gates before money moves, evidence over story, stand down when the chain is broken. The domain is different.

## What Glorya is — and is not

**What it is.** An instrument that evaluates need and path before capital moves. Most evaluations should end in no allocation. Standing down is first-class, not a failure mode. When Glorya does move capital someday, each disbursement will seal a public row the way Hermes seals decisions: before outcomes are known, with a record that can be checked.

**What it is not.** It is not live. There are no active allocations. There are no sealed Glorya ledger rows. There are no impact claims. The evaluated places on the public field are a **design layer** — real coordinates and careful notes so the process can be seen and argued with, not offers, transfers, or proof that anyone was helped.

Anything not yet checkable is labeled that way on purpose. The standard from the [technical brief](/brief) still holds: claims that can be checked, published when they can be checked.

## The revenue gate

Live Glorya capital waits on a hard condition: Solace must reach **$1M cumulative revenue** before the instrument can move money. Until that gate clears, Glorya stays dormant by design — presence and process, not theater.

You can read the public conditions on the [gate board](/gates#glorya). We update a row when something actually changes.

## What you can see today

- The [Glorya instrument page](/glorya): process scoreboard (evaluated needs, standing-down rate, **zero** active and completed allocations), empty ledger until first disbursement, and the evaluated-need field.
- The same honesty rule as Hermes: mechanism stays private when it would let someone front-run the work; process and restraint stay public.
- In the [Observatory](/observatory), Glorya appears as an instrument under evaluation — status, state, and activity — without inventing live missions.

## Why this exists before capital does

Instruments should be designed in public before they spend. Publishing Glorya early forces the hard questions while the cost of being wrong is still only design work: what counts as need, what counts as a path, when stand-down is the only honest answer, and how a future ledger will look when the first real disbursement seals the first real row.

Markets fund the work. Markets are not the whole aim. Glorya is the first non-market instrument on the same loop Solace is building for — disciplined, checkable decisions wherever timing, resource allocation, and uncertainty matter, and outcomes can be verified against reality.

## What this announcement does not say

It does not claim impact. It does not name live partners. It does not open a donation rail. It does not put customer or donor capital into Glorya. Founder capital and Hermes remain the live arena today.

When the revenue gate clears and the first disbursement is ready, the empty ledger will stop being empty — and that first row will matter more than this article.

Glorya is designed. Glorya is evaluating. The map is not the money. The path has to hold.`,
  },
  {
    slug: 'the-decision-ledger',
    title: 'The Decision Ledger',
    dek: 'Every Hermes decision now gets a public row before its outcome is known: sealed, chained, and checkable.',
    label: 'News 002',
    date: '2026-07-07',
    tint: 'cream',
    body: `Today we're publishing the Hermes Decision Ledger: a public record where every decision Hermes makes gets a row before its outcome is known. It is live now at [solace.fyi/trust](/trust).

The problem it answers is old. Anyone can post winners after the fact. Screenshots appear when trades go well and vanish when they don't. The only defense a reader has is a record that exists *before* the outcome does. So that is what the ledger is.

## The rules

**Sealed first.** A row is created the moment Hermes decides: a posture change, a path taken, a stand-down. The outcome column is empty because the outcome doesn't exist yet. Nothing is written after the fact.

**Everything counts.** Waits and no-trade decisions get rows. Losses and drawdowns get rows. Nothing is deleted; the database itself refuses. Rows physically cannot be deleted or edited once sealed.

**Named at close.** While a position is open, the ledger shows that capital is committed and how the open exposure is doing, but not the instrument. Symbol and side are revealed when the path closes, printed next to the realized result. You can hold the record accountable without being able to front-run the system.

**Mechanism stays private.** Entries, exits, position sizes, and thresholds never appear. The ledger proves discipline, not the recipe.

## Verifiable by math, not by promise

A rule that says "we don't edit history" is still a promise, and promises are what the ledger exists to replace. So the ledger's integrity is checkable:

Every row carries a SHA-256 hash computed when it is sealed, chained to the hash of the row before it. Editing any historical row — a word, a timestamp, a number — changes its hash and breaks every row after it. A short public script, published at [solace.fyi/verify-ledger.mjs](/verify-ledger.mjs), recomputes the entire chain from the [public ledger data](/api/hermes/decision-ledger), so "the record was never touched" is a claim you can test rather than trust.

## What the ledger is not

As of this writing (July 2026), the capital at risk is the founder's own, and no customer funds are managed. If that ever changes, the ledger and the [technical brief](/brief) will say so before it does. The sample is young, and the page says so on its face: the ledger is a record, not a claim, and it contains no performance claims. It will fill at the speed Hermes decides, which, by design, is slower than you'd think. Standing down is a decision too, and it gets a row.

The record is public from its first row. It starts now, at [solace.fyi/trust](/trust).`,
  },
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

Most market systems try to predict where price is going. Hermes asks a different question: whether the field between here and there can carry price at all. We call this the liquidity path, and it is the core abstraction of the instrument: a destination matters less than the terrain on the way to it.

Between every signal and every order sits a gate with three conditions. The structure has to be worth evaluating. The regime has to be behaving in character. The timing has to confirm. Capital moves only when all three agree — and most hours, they don't. Execution is gated, not continuous, and standing down is treated as a position the system takes often.

## What is live today

${hermesVersion.label} operates on founder capital only. No outside capital is at risk while access opens in stages. Approved users will fund Hermes by depositing directly into Solace, with capital becoming eligible for allocation only after account, identity, settlement, treasury, and risk checks clear.

Risk is governed in layers: posture, sizing that scales with the depth of the field, hard drawdown guards, and kill switches that halt the system entirely. Money movement stays separate from signal generation.

## What you can check

Solace publishes no performance claims, and this announcement makes none. What we publish instead is what can be verified: a [technical brief](/brief) that is versioned in public, [research notes](/research) on the framework Hermes runs on, and a [public decision ledger](/trust) where every Hermes decision is recorded before its outcome is known: wins, losses, and waits alike.

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
