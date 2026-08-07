# STEP 10 — Phase 5: Apollo Common Bridge Data Model Freeze

> **Reference Bridge:** RB-S10-001 (Reference Bridge 001)
> **Goal:** Freeze a Common Bridge Data Model (CBDM) that can store and reload
> Phase 3 Input Golden + Phase 4 Model/Design/Report/Drawing Golden losslessly,
> distinguishing confirmed / human-confirmation / conflict / hold values.

## Status

| PR | Scope | Branch (recommended) | Status |
|----|-------|----------------------|--------|
| P5-1 | Architecture audit + Common Model contract freeze | `docs/apollo-step10-p5-common-model-contract` | CURRENT |
| P5-2 | Canonical schema + types + versioning | `feat/apollo-step10-p5-common-model-schema-types` | pending |
| P5-3 | Golden adapter + Reference fixture + round-trip | `feat/apollo-step10-p5-golden-adapter-fixture` | pending |
| P5-4 | Master validation + compatibility + closeout + seal | `docs/apollo-step10-p5-validation-closeout-seal` | pending |

## Directory layout

```
phase5/
  README.md
  audit/existing_model_inventory.md
  contracts/            # frozen CBDM contract documents
  mapping/              # Golden -> Common layer mapping registers
  tools/                # validators, adapter, fixture builder
  fixtures/             # Reference Bridge 001 Common Model fixture (P5-3)
  validation/           # parity, round-trip, compatibility
  completion/           # per-PR completion reports
  traceability/         # Golden <-> Common traceability (P5-3)
```

## Completion gates

`PHASE5_MASTER_VALIDATION: PASS`, `COMMON_MODEL_ROUNDTRIP_PARITY: PASS`,
`UNEXPLAINED_UNMAPPED_COUNT: 0`, `CONFLICT/HCR/HOLD_PRESERVATION: PASS`,
`BACKWARD_COMPATIBILITY: PASS`, `PHASE5_PR_CHAIN: PASS`, `PHASE5_FINAL_REPORT: PASS`.

## Constraints (unchanged)

`STANDARD_PROFILE: H29_REFERENCE`, `R7_COMPLIANCE: NOT_VERIFIED`,
`NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`, `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED`,
`FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION`.

Phase 6 must NOT start automatically. Await explicit user instruction.
