# Solace / Hermes — Deep Empathy UX Approach

**Status:** Canonical product stance for user-facing surfaces (especially the Hermes dashboard).  
**Audience:** Anyone designing, writing copy for, or implementing Solace user experience.  
**Last updated:** 2026-07-23

---

## North star

> *This product should make a careful person feel carefully treated.*

If a screen would make a tired, slightly uncertain user wonder whether *they* messed up — it is not done.

Hermes is not a brokerage app. People who get here have already done something unusual: they asked for access, waited, and trusted a small team with something close to money and reputation. Every screen either **honors that** or quietly taxes it.

Deep empathy means designing for the **feeling under the click**, not only the task.

---

## Who is sitting in the dashboard

Not a day trader hunting charts. More often:

- Someone who **applied carefully** and is slightly nervous they “passed”
- Someone who **doesn’t fully understand** pool units, NAV, treasury, settlement
- Someone for whom **Simulation** is both a relief and a question (“is this real enough?”)
- Someone who will **blame themselves** when the product is unclear (“did I miss a step?”)
- Someone who may never open Contract, BugOps, or the public ledger — but **will feel** if the product is honest

They are not optimizing portfolio UI. They are answering:

> *Am I safe here? Do these people know what they’re doing? What am I supposed to do next? Will I look foolish if I get this wrong?*

---

## Emotional map of the journey

| Moment | Outer task | Inner state | Empathy failure (risk) | Empathy success |
|--------|------------|-------------|------------------------|-----------------|
| **Waiting for access** | Applied | Hope + doubt | Silence feels like rejection | “We received you. Here’s what happens next.” |
| **Sign-in** | Magic link | Fragile trust | Rate limit → “we couldn’t start” feels like *you’re not allowed* | Clear, calm: “too many emails, wait / contact us” — never “failed” as identity |
| **First dashboard** | Orient | Overwhelm | Full terminal of Pending / — / Illustrative | One human sentence + one next step |
| **Onboarding** | Forms | “I already told you this” | Long form that re-asks without care | “We prefilled what you shared. Confirm and continue.” |
| **Zero capital** | Empty account | Am I stuck? | IN REVIEW, six steps, funding instructions pending | “You’re approved. Setup’s done. Add capital when ready.” |
| **Deposit** | Move money (even sim) | Gravity | Sandbox / Live rail / Simulation mixed | Steady: “Simulation capital — no real money moves.” |
| **After deposit** | Wait for equity | Did it work? | Silence or wrong numbers | “Received. Hermes will reflect this after routing / mark.” |
| **First loss / wait** | See WAIT / red | Fear | Performance theater without context | Process-first: waiting is competence, not failure |
| **Bug / confusion** | Report | Vulnerability | Hidden “Report a bug” | Easy, non-shaming path |

Empathy is not softer marketing. It’s **removing false alarms** and **naming the true next step**.

---

## Principles (non-negotiable)

### 1. Never make the user feel rejected when the system is tired

Rate limits, SMTP, bridge lag, NAV pending — those are **our** failures.  
Copy must never sound like *your account is wrong*.

### 2. One fear, one answer per screen

Unfunded dashboard fear: *What now?*  
Answer: one paragraph, one button. Everything else is secondary.

### 3. Respect the gravity of capital — even simulated

“Add simulation capital” is not a game. Use calm, precise language. No casino green. No hype on empty state.

### 4. Honesty is care

Illustrative narrative, young sample, founder capital, mechanism private — these protect the user from **false intimacy with performance**. Empathy includes refusing to sell a story we can’t stand behind.

### 5. Progress should feel cumulative, not bureaucratic

They already applied. Don’t re-interrogate. Prefill, confirm, thank, advance.

### 6. Waiting is a first-class experience

Settlement, treasury, NAV, stand-down — waiting is where trust is won or lost.  
Explain **what’s happening**, **what’s not wrong**, and **what happens next**. No dead “Pending” without a human sentence.

### 7. Speak like a careful person, not a status API

Prefer:

- “You’re approved. Setup is complete.”
- “No capital yet — Hermes stays still until you add some.”
- “We’re holding funding until settlement clears. You don’t need to do anything.”

Avoid:

- IN REVIEW (when they’re approved)
- FUNDABLE / WAITING_SETTLEMENT in the main chrome
- “We could not start the sign-in flow” without why

### 8. Leave room for dignity

“Account ending 8212”, auto-refresh 5s, Contract inspector — fine for operators, cold for users.  
A name, a quiet badge, a clear path beat ops chrome on first-run.

---

## Design from care, not from the data model

The data model thinks:

`AWAITING_DEPOSIT` → activation steps → identity → treasury → NAV → LIVE_EQUITY`

The human thinks:

`Am I in?` → `What do you need from me?` → `Did my money (or sim) land?` → `Is Hermes doing something sensible?` → `Can I leave if I want?`

Every surface should map to **those** questions first. Field sources, contract versions, and 5s refresh second.

---

## Example: unfunded home (post-onboarding)

**User state:** approved, onboarded, capital intent on file, zero deposit, simulation.

**What they might feel:**  
“I did everything right. Why does this still feel unfinished and slightly alarming?”

**What empathy answers:**

> You’re in.  
> Hermes is ready in simulation mode.  
> Nothing is wrong; there’s just no capital yet.  
> When you’re ready, add simulation capital (your intent is shown).  
> Identity verification can wait unless you prefer to do it now.

**Shape:**

```
┌─────────────────────────────────────────┐
│  Hermes · Simulation                    │
│  Welcome, [name]                        │
│                                         │
│  Setup complete                         │
│  Next: add capital so Hermes can run    │
│                                         │
│  Intent on file: $…                     │
│  [ Add simulation capital ]             │
│                                         │
│  Optional: Verify identity              │
└─────────────────────────────────────────┘
```

Not a wall of metrics. Not “IN REVIEW.” Not Contract in the chrome.

---

## How we work when taking this seriously

1. **Write the emotional job of the screen before the layout**  
   e.g. Unfunded home: *reassure + one next action*
2. **Read every string aloud** as if the user is slightly anxious
3. **Cut anything that raises a question we won’t answer on that page**
4. **Prefer fewer states with better copy** over more badges
5. **Test empty and waiting states harder than the full portfolio** — that’s where most beta users live longest

---

## Priority UX work derived from this stance

| Priority | Change | Why (empathy) |
|----------|--------|----------------|
| P0 | Guided empty home when awaiting deposit | One clear next step; no false “stuck” feeling |
| P0 | Honest activation copy (not IN REVIEW / fake funding queue) | Stop false alarms |
| P0 | Quiet unfunded layout (hide noise metrics) | Reduce overwhelm |
| P1 | Capital success → dashboard continuity | Close the loop; “did it work?” |
| P1 | Consistent Simulation language | No mixed Live/Sandbox/sim signals |
| P1 | Sign-in errors that name infrastructure, not the user | Rate limits ≠ rejection |
| P1 | Waiting states with human sentences | Trust during settlement / NAV / stand-down |

---

## Dashboard chapters (implemented)

The Hermes dashboard is **chapter-based**: the layout changes character by lifecycle, not only by filling “Pending” into one eternal terminal.

| Chapter | Resolve when | Emotional job |
|---------|----------------|---------------|
| `arrival` | Profile setup incomplete (review + intent) | Welcome + finish setup |
| `identity` | Profile done, identity not `VERIFIED` | Identity required before capital — calm, non-optional |
| `ready` | Identity verified, no capital yet | Reassure + one next action (add capital) |
| `funding` | Settlement / treasury / NAV pending | You did not break it; capital in flight |
| `live` | Funded, Hermes active | Money first, honest process second |
| `standing_down` | Funded, status WAIT | Waiting is competence |

**Identity is required** for the real product — not optional. Deposits (including simulation) stay closed until `identityVerification.status === 'VERIFIED'` (`isSetupIncomplete` + money-movement API).

Implementation:

- `features/hermes-dashboard/setup.ts` — profile + identity gates
- `features/hermes-dashboard/chapters.ts` — resolve + pipeline copy
- `features/hermes-dashboard/dashboard-client.tsx` — chapter layouts

---

## Related surfaces

- User dashboard: `app/dashboard/*`, `features/hermes-dashboard/*`
- Access / sign-in: `app/dashboard/DashboardAccessGate.tsx`, `app/api/dashboard/access/route.ts`
- Public trust (process-first honesty): `app/trust/*`
- Operator console is **not** the empathy bar for end users — do not copy ops chrome into user home

---

## For agents and implementers

When changing any **user-facing** Solace/Hermes UI or copy:

1. Read this document first.
2. State the emotional job of the screen in one sentence.
3. Prefer reassurance + one next action over more data.
4. Never surface infrastructure failure as user rejection.
5. Keep Simulation / illustrative / young-sample honesty intact — honesty is care.
