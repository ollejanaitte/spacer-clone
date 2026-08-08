# Phase 6-0 — Apollo Geometry Engine Architecture Freeze

> **Reference Bridge:** RB-S10-001 (Reference Bridge 001)
> **Goal:** freeze Geometry architecture / connector / coordinate / entity contracts
> **BEFORE** any Geometry Engine production implementation. Docs-first; no production
> geometry code in Phase 6-0.

## Status

| PR | Scope | Branch (recommended) | Status |
|----|-------|----------------------|--------|
| PR-1 | Architecture audit + Geometry architecture freeze | `docs/apollo-step10-p6-0-pr1-architecture-freeze` | MERGED (#565) |
| PR-2 | Connector + coordinate + geometry entity freeze | `docs/apollo-step10-p6-0-pr2-connector-coordinate-entity` | MERGED (#566) |
| PR-3 | Reference mapping + validation + backlog + closeout + seal | `docs/apollo-step10-p6-0-pr3-validation-seal` | COMPLETE (#575/#577/closeout) |

## Directory layout

```
phase6/
  README.md
  phase6_0/
    audit/          # existing-architecture audit (P6-0-A)
    architecture/   # architecture + ownership freeze (P6-0-B)
    connectors/     # connector specs (P6-0-C)
    geometry/       # geometry entity contract (P6-0-C)
    coordinates/    # coordinate contracts (P6-0-C)
    mapping/        # Reference Bridge geometry mapping (P6-0-D)
    validation/     # master validator + risk register (P6-0-D)
    backlog/        # Phase 6-1..6-4 implementation backlog (P6-0-D)
    tools/          # validators
    completion/     # per-PR completion reports
    08_phase6_1_handoff.md
```

## Frozen principles (from P6-0-B/C)

- **Single Source of Alignment = LINER** (via Alignment Connector; no reimplementation).
- **Single Source of Bridge Geometry = Apollo Geometry Engine** (GeometrySnapshot to all consumers).
- **Common Bridge Data Model = input data contract** (Phase 5; frozen).
- **No hidden coordinate conversion**; all transforms declared in connector/coordinate contracts.
- **One geometry, many consumers** (Structural / 3D / Drawing / Substructure / Export).

## Completion gates

`PHASE6_0_MASTER_VALIDATION: PASS`, `DUPLICATE_GEOMETRY_RESPONSIBILITY_UNRESOLVED: 0`,
`HIDDEN_COORDINATE_TRANSFORM_UNRESOLVED: 0`,
`REFERENCE_BRIDGE_GEOMETRY_MAPPING: PASS|PASS_WITH_HUMAN_TRACK`,
`PHASE6_0_PR_CHAIN: PASS`, `PHASE6_0_FINAL_REPORT: PASS`.

## Constraints (unchanged)

`STANDARD_PROFILE: H29_REFERENCE`, `R7_COMPLIANCE: NOT_VERIFIED`,
`NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`, `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED`,
`FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION`.

Phase 6-1 production implementation must NOT start automatically. Await explicit
user instruction.
