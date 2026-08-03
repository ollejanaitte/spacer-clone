# 06 — Load / Quantity Traceability

## Canonical path

```
canonical geometry → section area → volume → quantity item
  → unit weight (USER_PROVIDED_UNVERIFIED)
  → line/segment load → load case → distribution (DEV simplified)
  → analysis input → result → report → drawing/schedule → ZIP
```

## Distribution freeze (Step 4)

- **In scope:** simplified line-load placement at declared transverse offset / longitudinal range; equal share to girders **or** nearest-girder rule (DEC-S4-0010: nearest-girder for curb/railing; equal share for median).
- **Out of scope:** formal transverse distribution, slab analysis, eccentricity code checks.
- Missing formal method → `WARNING` + formal release blocker.

## Splice / filler self-weight

**DEC-S4-0011:** Step 4-D quantity includes plate/bolt steel; **analysis dead load excludes splice assemblies by default** (`quantity-only`) unless user enables optional flag later (Optional O-03). Report must state exclusion.

## Trace table (summary)

| Entity | Quantity category | Load category | Status if incomplete |
|--------|-------------------|---------------|----------------------|
| Left/right curb | APPURTENANCE | DEAD_LINE | NOT_AVAILABLE vol/wt |
| Wall railing L/R | APPURTENANCE | DEAD_LINE | NOT_AVAILABLE |
| Median | APPURTENANCE | DEAD_LINE | EXPLICIT_NONE allowed |
| Optional barrier | APPURTENANCE | DEAD_LINE | optional |
| Haunch per girder | RC_HAUNCH | DEAD_LINE | NOT_PROVIDED → skip |
| Flange/web splice plates | SPLICE_STEEL | (excluded from analysis default) | station required |
| Filler plates | SPLICE_STEEL | excluded default | — |
| Bolt pattern | SPLICE_STEEL approx | excluded | ASSUMED_DEVELOPMENT_ONLY mass optional |

Exact formulas get `formulaId`s in Step 4-B/C implementation; do not invent numeric coefficients here.
