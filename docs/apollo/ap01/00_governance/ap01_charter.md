# AP-01 Charter — BSDD Production Contract v0.1.0

**Authority:** IMPLEMENTATION GOVERNANCE / AP-01  
**Date:** 2026-07-27  
**Decision:** DEC-AP01-0001  
**Base commit:** TBD (direct-main checkpoint)

## Purpose

AP-01 promotes `BridgeSuperstructureDesignDocument` from Step 1 planning draft to production contract **v0.1.0** with structural-first validation, production envelope shapes, and fail-closed numeric adoption governance.

## Goals

| # | Goal |
|---|------|
| G-01 | Register `spacer.contracts.bridge-superstructure-design-document` @ `0.1.0` |
| G-02 | Implement `GovernedQuantity` with AP-00 adoption guards (NOT_SELECTED fail-closed) |
| G-03 | Reuse production `ContentChecksum` (`hexDigest`) and `Provenance` (ActorRef + ToolProvenance) |
| G-04 | Implement `BsddAnalysisBinding` with AP-11 IF3 metadata validation |
| G-05 | Generate checked-in JSON Schema + semantic metadata; comprehensive Vitest coverage |

## Non-goals

| Non-goal | Rationale |
|----------|-----------|
| Migration / workspace UI | AP-02 / AP-03 |
| Adopted numerics or golden expected values | Forbidden under AP-00 governance |
| Accepting Step 1 design-draft fixtures as production | Fail-closed on version/checksum/provenance |
| Changing `VITE_APOLLO_PHASE1_ENABLED` default | Must remain OFF unless explicitly `"true"` |

## Deliverables

- `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`
- `frontend/src/contracts/governedQuantity.ts`
- `frontend/src/contracts/runtime/schemas/*`
- `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json`
- `docs/apollo/ap01/*` governance artifacts (this tree)

## Success criteria

1. Minimal DRAFT BSDD with PENDING/PLACEHOLDER/UNKNOWN null quantities validates
2. ADOPTED quantity under NOT_SELECTED is rejected
3. Planning draft `reference_bridge_input.json` is not accepted as production
4. Required Vitest suites pass; typecheck + Apollo hygiene PASS
