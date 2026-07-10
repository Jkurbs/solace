# Card issuance — decided, gated, not announced

Decision (July 2026): a Solace spend card is worth building **only after** outside
capital is live and trusted. Deliberately NOT in the public brief yet — naming it
would declare a domain before it's earned and invite neobank categorization.
This note preserves the drafted gate so it can enter the brief verbatim when a
card becomes a real plan.

## Drafted gate condition (for a future brief version's Horizon board)

> **Account liquidity — spend-enabled — Not begun.** Card issuance requires:
> outside capital live and operating cleanly for a sustained period, a licensed
> banking/BaaS partner in place, and settlement rails proven under real account
> activity — not just founder capital. Spend authority will only ever draw
> against settled, available balance; a card can never spend against an open
> Hermes position or unrealized PnL. This gate exists so the card, if it ships,
> is a consequence of trust already earned, not a tool used to accelerate it.

## Build choice (when the gate clears)

Stripe Issuing, comprehensive program management tier (Stripe's bank partners +
compliance), paired with Stripe Treasury for account-attached cards. Requires
Custom connected accounts and Stripe sales eligibility review. Consumer cards
carry Reg E / EFTA obligations even through Stripe — real compliance surface,
part of why the gate exists. Engineering lift is small once approved (virtual
cards near-instant), so there is no reason to build early.
