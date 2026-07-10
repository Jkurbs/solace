# Show HN launch package — Hermes

**When:** Tuesday, July 7, 2026 · 8–10am ET. Clear the next four hours for comments.
**Prerequisite check (morning of):** site up at www.solace.fyi · /news/introducing-hermes 200 · calibration snapshot refreshed · X account has 1–2 posts of history.

---

## Submission

**URL to submit:** `https://solace.fyi/hermes`

**Title (pick one, ≤80 chars):**

> Show HN: Hermes – a capital allocation engine that mostly decides not to trade

Alternates:
- Show HN: A market instrument that publishes its own miscalibration
- Show HN: I'm building a one-person quant research company in public

Do not put credentials in the title. HN dislikes it; the story belongs in the first comment.

---

## First comment (post within a minute of submitting)

Hi HN — I'm Kerby. I spent four years building production systems at Apple; for the past while I've been building Solace solo: an independent research company whose first instrument, Hermes, is a live capital-allocation engine now in beta.

The core idea: most systems try to predict where price goes. Hermes asks whether the liquidity between here and there can carry price at all, and it commits capital only when structure, regime, and timing all agree — which means most of the time it deliberately does nothing. Standing down is treated as a position.

What's public and checkable today: a versioned technical brief (v0.3, with prior versions archived verbatim), the Oracle — a probability engine whose calibration is published even while it's unflattering (currently labeled "overconfident"), and research notes on the framework. What's not public: signals, parameters, and models — that's the work. And to be explicit: Hermes currently runs founder capital only. No outside money is at risk, access opens in stages, and the site makes no performance claims anywhere — the position is that claims should be published when they're checkable, and not before.

Tech, since this is HN: Next.js; the instrument renders are hand-written GLSL (the Hermes card re-evaluates its candidate paths every ~36s from a seeded PRNG); research covers and OG images are generated deterministically from each note's slug.

I'd genuinely value hard questions — especially on the verification commitments in the brief (decision trails, regime log) and whether the honesty apparatus holds up under your skepticism. That's the part I care most about getting right.

---

## The grill — answers to have loaded

1. **"Where are the returns?"**
   There aren't any published, deliberately. A track record short enough to be marketing isn't one. The brief commits to publishing decision trails and calibration when samples are meaningful — the record is the product, and it starts public.

2. **"Is this a fund? Are you registered?"**
   Right now it's founder capital only, so no one else's money is involved. Legal structure for outside capital is being worked through with counsel before deposits open. *(Do not improvise beyond this.)*

3. **"What happens to user funds if you get hit by a bus?"**
   Today: nothing, because there are no user funds. That's why access is staged. See brief §05.

4. **"'Liquidity path' sounds like astrology."**
   The brief discloses architecture, not features, on purpose — evaluate the discipline (gated execution, layered risk, kill switches, stand-down bias) rather than claims I refuse to make.

5. **"One person? Really?"**
   Own it: end-to-end accountability, staged risk, and a public gate board showing how far the bigger ambitions are from being earned. Domains are earned, not declared.

**Comment conduct:** never argue; concede good points ("fair — that's exactly why deposits aren't open"). HN respects concession more than rebuttal. Fast, honest, unflappable.

**If a mod flags it as not-Show-HN-eligible** (access-gated product): politely note what is publicly explorable (interactive explainer, versioned brief + archives, live calibration record, research). Fallback: regular submission of the brief.

---

## Same-day X sequence

1. Personal account, story framing:
   *"I spent four years building production systems at Apple. For the last year I've been building an instrument that decides when NOT to trade. Today it's live in beta."* + link + render clip or gold plate.
2. @solacefyi quote-posts with the formal News 001 framing, linking /news/introducing-hermes.
3. Text the warm list (5–10 people) to reply/repost within the first hour.
4. LinkedIn: same founder-story post, later that day or next.

**Expectations:** X post ~5 likes (fine — it's the anchor URL). HN is the reach lottery; a middling front-page run means thousands of exactly-right visitors. Silence is data, not drawdown.
