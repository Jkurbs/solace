# Five-Step Algorithm — UI and product design

**Status:** Canonical product-design rule for Solace and Hermes surfaces.  
**Audience:** Anyone designing, reviewing, or shipping UI.  
**Companion:** `notes/first-principles-copy.md` (words) · `notes/user-experience-empathy.md` (feeling).  
**Last updated:** 2026-08-12

---

## Premise

> *The best part is no part. The best process is no process.*

This is an aggressive deletion framework. It exists to strip friction, kill unnecessary interfaces, and stop the team from polishing flows that should not exist.

It does **not** replace deep empathy. Empathy decides *how a remaining screen should feel*. This algorithm decides *whether the screen, field, or step should exist at all*.

North star still holds: *This product should make a careful person feel carefully treated.*  
A careful person is not carefully treated by extra forms, extra nav, or extra metaphors.

---

## The five steps (in order)

Do not skip ahead. Automating or beautifying a step that should have been deleted is the most common failure.

### 1. Make requirements less dumb

Every UI requirement, modal, or input field must be tied to a **named individual**, not a vague entity like “marketing,” “compliance,” “best practice,” or “what Stripe / Apple / Salesforce does.”

Ask of every screen, field, and mandatory click:

- Who, by name, required this?
- What user problem does it solve *right now*?
- What is the raw input the system actually needs, and what is the computed output?
- If we shipped without it, what concrete harm occurs?

**Solace examples of questions that must be asked:**

- Why does the public homepage need to introduce three instruments before the visitor has a reason to care?
- Why is the primary homepage CTA “Read How It Works” instead of using the live product?
- Why does request-access ask for phone, role, company, country, capital range, objective, *and* a free-text context?
- Why does simulation onboarding offer a risk-profile picker when beta only runs **Balanced**?
- Why are Observatory, Anchor, and Gates first-class nav items for a first-time visitor?

If the answer is “it looks complete,” “other funds do this,” or “we might need it later,” the requirement is dumb. Delete or demote it.

### 2. Delete the part or process

> *If you don’t end up adding back at least 10% of what you deleted, you didn’t delete enough.*

Delete full screens, confirmation dialogues, intermediate pages, filters, and controls. If a decision can be made automatically or inferred from context, remove the control.

The best interface is often **zero UI** — the system just executes the intended outcome.

**Delete before you restyle.** Candidates on this site:

- Intermediate explainers between intent and action (onboarding sheets that restate what the previous page already said).
- Duplicate proof surfaces that tell the same story three ways (homepage record card + Hermes metrics + Observatory scoreboard).
- Nav destinations that are operator artifacts (Anchor, Gates) rather than user jobs.
- Illustrative phone mocks and fake PnL when a live ledger already exists.
- Typewriter / particle / micro-interaction chrome whose only job is atmosphere.
- Fields the review process does not actually use.

When in doubt: hide it. If nobody asks within a real cycle, it is gone.

### 3. Simplify and optimize (only what remains)

> *The most common mistake of a smart engineer is to optimize a thing that should not exist.*

Do not spend time on sleek micro-interactions, responsive form layouts, or faster autocomplete for a checkout / onboarding / settings step that should have died in Step 2.

Only after deletion:

- Tighten typography, hierarchy, and spacing on the irreducible screens.
- Make the one remaining primary action unmistakable.
- Collapse remaining choices into smart defaults (see Step 5 — but do not automate yet).

**Irreducible public surfaces (working hypothesis — challenge this):**

1. What this is (one sentence).
2. Proof it is real (live sealed record).
3. The one thing you can do next (use Hermes in simulation, or request capital access).

Everything else is a leaf, not a trunk.

### 4. Accelerate cycle time

Speed up execution **only after** steps 1–3.

**Interaction speed.** Cut time-to-value. Count clicks from landing to the primary action. A first-time visitor should reach a live Hermes surface in one honest click, not: Home → Hermes → sheet → allocation → dashboard onboarding → risk profile → dashboard.

**Perceived and real latency.** Optimistic UI, background fetch, zero-delay transitions. The UI must not block the user on telemetry, ledger walks, or “restoring session” theatre when a default path can proceed.

Never make waiting look like rejection — that remains an empathy rule. Speed is how you avoid inventing a waiting screen in the first place.

### 5. Automate last

Automation comes strictly last. Automating a broken or unnecessary step just scales waste.

Only then:

- Smart defaults (Balanced, a single sim allocation, country inferred or omitted).
- Prefill from what we already know.
- Background AI / heuristics that remove configuration, not add a “smart” settings page.

If a default covers 90%+ of sessions, do not show the control. Progressive-disclose the rest.

---

## Key UI takeaways

**Reason from physics / core data, not analogy.**  
Do not design a feature a certain way because Stripe, Apple, a hedge-fund site, or a previous Solace mock did it that way. Ask: *what is the raw data in, what is the computed output, and what is the shortest path between them?*

**No feature bloat.**  
Every button, icon, and setting is technical and cognitive debt. If it does not serve 90%+ of sessions, hide it or kill it.

**Zero UI is a valid design.**  
“Experience Hermes” that just opens a funded simulation with Balanced and $50k — no sheet, no profile, no allocation picker — is more first-principles than a beautiful three-step modal.

---

## Order of operations (do not invert)

```
Question the requirement
        ↓
Delete the screen / field / step
        ↓
Simplify what is left
        ↓
Make the remaining path fast
        ↓
Automate defaults so the user never sees the choice
```

Inverting this (automate first, polish first, add a wizard because onboarding “should” exist) is how the site accumulates Observatory + Anchor + Gates + Brief + Research + three instruments + a request form + a sim sheet + a risk picker for a product whose actual job is: **decide, seal, let you watch.**

---

## Litmus before shipping UI

1. **Named owner.** Who required this control, and what breaks if it vanishes today?
2. **Deletion test.** Did we try removing the whole step, not just restyling it?
3. **Core path.** Can a new visitor complete the primary action without learning our mythology (instruments, eras, gates, observatory)?
4. **90% rule.** Does this serve almost every session, or is it operator / later / edge?
5. **Empathy still holds.** After deletion, does the remaining screen still make a careful person feel carefully treated — one fear, one answer, honest about Simulation / young sample / founder capital?
