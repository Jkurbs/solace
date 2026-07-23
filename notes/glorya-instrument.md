# Glorya — instrument design (visual v0)

**Status:** Designed · evaluating · **not live**  
**Gate:** Inactive until Solace reaches **$1M cumulative revenue**  
**First live seal:** First real disbursement

## What shipped (visual presence)

| Surface | Path |
|---------|------|
| Homepage instrument card | `/#glorya` inside instruments grid |
| Instrument page | `/glorya` |
| Evaluated-need data (illustrative) | `features/glorya/evaluated-needs.ts` |
| Field visual | `app/GloryaNeedField.tsx` |

## Honesty rules

- No fake active allocations
- Scoreboard shows **0** active / completed and **—** calibration
- Ledger table empty until first sealed disbursement
- Evaluated needs are a **design layer** (stand-down is first-class)

## Visual language

- **Page is Solace-neutral** (dark `#0a0a0a`, trust/Hermes-adjacent) — not a purple theme
- **Interactive Three.js globe**: drag to rotate, slow auto-spin, hover markers
- Soft purple only on need markers + thin ledger left edge + optional chip
- Dimmer markers for standing-down
- Globe body is neutral land/ocean; atmosphere barely tinted
- Same Solace restraint as Hermes — presence without noise

## Next (not in this slice)

- Real need-evaluation sources and thresholds
- Regime taxonomy for humanitarian contexts
- Partner verification layer
- Hash-chained Glorya ledger (post-gate)
