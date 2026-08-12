# First-principles copy — product communication

**Status:** Canonical rule for messaging, UI copy, and product communication.  
**Audience:** Anyone writing or reviewing user-facing words.  
**Companion:** `notes/five-step-algorithm.md` (structure) · `notes/user-experience-empathy.md` (feeling).  
**Last updated:** 2026-08-12

---

## Premise

First-principles communication strips corporate abstraction, marketing fluff, and ambiguity. The job is **high signal-to-noise**: the maximum actionable truth in the minimum number of syllables.

This is compatible with deep empathy. Empathy forbids making the user feel rejected or foolish. It does **not** require soft adjectives, slogans, or talking down. Honesty is care. Precision is respect.

Speak like a careful person who knows the mechanism — not like a status API, and not like a billboard.

---

## 1. Acronyms seriously suck — ban jargon and insider speak

Avoid internal acronyms, tech buzzwords, and vague industry jargon unless a regular person already knows them.

If a new visitor needs a glossary to understand a button, nav title, or feature description, the copy is broken. Use plain, literal words for what things **are**. Do not invent proprietary names for ordinary objects.

**Broken (insider or ornamental):** Observatory, Anchor, Gates, Era I, posture, Brier, liquidity path, instruments, domains are earned.

**Literal (say the thing):** Public decision record. Daily hash published outside our servers. Conditions that must clear before we take outside capital. What Hermes is doing right now. How often predictions were wrong. Software that decides whether to put money to work.

Keep product names (Solace, Hermes, Oracle, Glorya) — they are proper nouns. Do not make the visitor learn a second vocabulary around them.

Nav labels and button labels are the strictest test. If the word only makes sense after reading the brief, it does not belong in the header.

---

## 2. Maximize signal-to-noise — delete 50% of the words

Communication should deliver the maximum amount of actionable truth in the minimum number of syllables.

Delete pleasantries, marketing fluff, filler, and theatrical punctuation.

| Instead of | Write |
|---|---|
| We are delighted to help you easily configure your automated notification preferences below. | Email notifications: On / Off. |
| Tools that make smart choices when nobody knows what happens next. | Software that decides when to put capital to work — and when to wait. |
| Three special programs built to keep people calm during scary moments. | Three systems. Hermes is live. The other two are earlier. |
| Independent research company building instruments that help capital, and eventually other domains, make better decisions under uncertainty. | We build software that decides under uncertainty. It starts with capital. |
| [ Check Any Choice Receipt ] | Open the public record |

If a sentence can lose a word without losing function, delete the word. If a paragraph exists to create atmosphere, delete the paragraph.

Talking down (“computer tools,” “crazy times,” “good choices”) is also noise. A careful adult does not need the mechanism baby-talked. Literal and short is kinder than cute.

---

## 3. Concrete metrics over subjective adjectives

Never tell users something is “blazing fast,” “institutional grade,” “ultra-secure,” “smart,” or “driven purely by facts.” State the raw facts. Let the user draw the conclusion.

| Instead of | Write |
|---|---|
| Ultra-low latency execution engine | Sub-5ms order execution *(only if true and measured)* |
| Advanced risk controls | Hard 2% max drawdown circuit breaker *(only if that is the actual rule)* |
| Smart Robot Tools For Crazy Times | Hermes has sealed *N* decisions. Last seal: *time*. Sample is young (*n=…*). |
| Driven purely by facts, not hype or guesses | Decisions are written down before the outcome. You can check the chain. |
| Capital that decides for itself | Hermes reads market structure and either allocates, sizes, exits, or stands down. Founder capital only. |

Do not invent a metric to sound concrete. If the sample is young, say the sample is young. If Glorya has moved $0, say $0. If simulation is not real money, say that in the same sentence as the invitation.

---

## 4. Radical directness — say exactly what it is

Name and explain things by their irreducible function, not marketing euphemisms.

Position the product by **mechanism and value exchange**. What data goes in. What decision comes out. What the user can do. What they cannot do yet.

Avoid high-level abstraction: empowering, reimagining, observatory-as-poetry, “tools for hard choices about money, truth, and help.”

**Direct:**

- Hermes is software that decides whether to allocate capital, how much, and when to exit.
- Every decision is sealed on a public chain before the trade moves.
- You cannot invest yet. You can watch the live record, or run a simulation with fake money that follows the same decisions.
- Glorya does not move money until Solace has $1M cumulative revenue. Until then it is a design, not a fund.

A new user should know the mechanical outcome **before** they click.

---

## 5. Errors and status — state the cause and the fix

Never ship “Oops! Something went wrong.” or “Request could not be submitted.”

Every error and waiting state must state:

1. Exactly what failed (or what is in progress).
2. Why — the constraint that was hit.
3. The exact action that unblocks it.

This is the same rule as empathy’s “never make the user feel rejected when the system is tired.” Infrastructure failures (rate limit, SMTP, bridge lag) are **our** failures. Name them. Do not translate them into identity (“you’re not allowed,” “we couldn’t start”).

**Broken:** We could not start the sign-in flow.  
**Direct:** Too many sign-in emails from this address in 10 minutes. Wait 10 minutes or write hello@solace.fyi.

**Broken:** Request could not be submitted.  
**Direct:** The request did not reach us (network or server error). Try again. If it repeats, email hello@solace.fyi with your name.

---

## Litmus before shipping any copy

1. **Is this strictly true?** Does it promise only what the system deterministically delivers?
2. **Can a sentence or word be removed without losing functional meaning?** If yes, delete it.
3. **Would a new user understand the exact mechanical outcome before clicking?** If no, make it more literal.

Also check empathy: after the cut, does a careful person still feel carefully treated — especially in empty, waiting, Simulation, and error states?

---

## Voice constraints for Solace

- **One claim per surface.** Homepage does not also need to sell Oracle, Glorya, the brief, and the founder mythology.
- **Simulation, young sample, founder capital, illustrative** — say these next to the number they qualify. Honesty is the differentiator; hiding it in a footnote is marketing.
- **Do not compete with two dialects.** Institutional brief-voice and oversimplified home-voice on the same site feels like two products. Prefer the brief’s literalness, cut to homepage length.
- **Buttons are verbs with objects.** “Open the public record.” “Run a simulation.” “Request capital access.” Not “Meet Hermes,” “Experience Hermes,” “Look at the Live Scoreboard.”
