# Observatory — instrument activity board

**Status:** Public v0  
**Route:** `/observatory`  
**Feature module:** `features/observatory/`

## North star

> An instrument continuously interacting with its domain.

The Observatory lets people **observe those interactions**. It does not force every instrument into Hermes’s decision-ledger shape.

**Emotional job:** *I can see what Solace’s instruments are doing, and what is still waiting — without being sold a performance story.*

## Abstraction

| Constant (container) | Variable (per instrument) |
|----------------------|---------------------------|
| Status | Monitoring, Evaluating, Building, … |
| Current state | Coarse domain fields |
| Recent activity | Event kinds and copy |
| Health / freshness | How we know the feed is alive |

**Activity** is the core unit — not “decision.”

Decisions remain a Hermes *kind* of activity. The sealed record lives at
`/observatory/hermes/ledger` (legacy `/trust` redirects there). They are not the Solace-wide schema.

## Route map

| Path | Role |
|------|------|
| `/observatory` | All instruments |
| `/observatory/hermes` | Hermes focus: status, state, activity |
| `/observatory/hermes/ledger` | Hermes decision ledger (sealed chain) |
| `/trust` | Permanent redirect → ledger |
| `/hermes` | Product narrative (not the observatory board) |

## Instruments (v0)

| Instrument | Live? | Sources |
|------------|-------|---------|
| Hermes | Yes | Market read, process ledger rows |
| Oracle | Snapshot | `calibration.ts`, resolved questions |
| Simulation | Hand-marked | `gates/conditions.ts` |
| Glorya | Design layer | `gloryaEvaluatedNeeds` (0 active/completed) |

## Honesty rules

- Never invent LIVE from missing or stale Hermes data
- Glorya active/completed stay **0** until first sealed disbursement
- No instruments, sizes, entries, thresholds, or trade recipes in activity titles
- No PnL theater on Observatory cards
- Do not import or share types with console **Social Observatory**

## Future instruments

Robotics, research, and domains not yet imagined fit the same container:

- Status · State · Activity · Health  
- Free-form activity `kind` strings  
- No requirement to publish a decision ledger

## Later (not v0)

- Append-only `instrument_activity_events` store  
- Bridge emitters for public-safe samples  
- `/observatory/[instrument]` deep pages  
- Frozen public `GET /api/observatory` contract for third parties  
