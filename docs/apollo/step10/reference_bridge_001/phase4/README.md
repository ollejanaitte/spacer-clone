# Phase 4 — Reference Bridge 001 Golden Construction

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001)
> **Predecessor:** Phase 3 Input Golden (`../phase3/`)
> **From:** Phase 2-II candidates + Phase 3 Input Golden
> **To:** Phase 4 Model / Analysis / Design / Report / Drawing Golden layers

## Objective

Promote Phase 2-II candidate records into formal Golden layers following the
Phase 3 promotion contract, mirroring its record schema, review registers,
validator, and manifest conventions.

## Golden Layers

| Layer | Domain(s) | Phase 4 PR |
|-------|-----------|------------|
| Model Golden | geometry, structural_model | PR-1 |
| Analysis Golden | analysis | PR-2 |
| Design Golden | design, adopted_design | PR-2 |
| Report Golden | report | PR-3 |
| Drawing Golden | drawing | PR-3 |
| Validation & closeout | all | PR-4 |

## Constraints

- `STANDARD_PROFILE: H29_REFERENCE`
- `R7_COMPLIANCE: NOT_VERIFIED`
- `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`
- `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED`
- `FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION`
- No production code changes
- No PDF/image originals committed
- No recalculation

## Build & Validate

```bash
python tools/build_phase4_golden.py
python tools/validate_phase4_golden.py
```

See `validation/golden_manifest.csv` for artifact integrity hashes.