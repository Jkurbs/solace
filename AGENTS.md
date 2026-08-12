# Solace — agent instructions

## User experience stance (required)

User-facing work (site, dashboard, onboarding, capital, sign-in, Hermes account surfaces) must follow three canonical notes. They do not compete: **empathy is the feeling, the algorithm is the structure, first-principles copy is the words.**

| Job | Canonical note |
|-----|----------------|
| Feeling under the click | **`notes/user-experience-empathy.md`** |
| Whether the screen/field/step should exist | **`notes/five-step-algorithm.md`** |
| What the words say | **`notes/first-principles-copy.md`** |

**North star:** *This product should make a careful person feel carefully treated.*

In short:

- Design for the feeling under the click, not only the task.
- Question every requirement; delete screens, fields, and nav before polishing them.
- Never make the user feel rejected when the system is tired (rate limits, SMTP, lag).
- One fear, one answer per screen — especially unfunded / waiting states.
- Honesty is care (Simulation, illustrative narrative, young sample). High signal, no slogans, no talking-down.
- Speak like a careful person who knows the mechanism — not a status API, not a billboard.
- Prefer empty and waiting states done well over full-portfolio chrome.
- Automate defaults last. Do not optimize a flow that should not exist.

Before shipping user-facing UI or copy:

1. State the emotional job of the screen in one sentence (empathy).
2. Name who required each remaining control, and what you deleted (algorithm).
3. Run the copy litmus: strictly true? any word removable? mechanical outcome obvious before click?
