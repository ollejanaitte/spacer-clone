# AP-DX-01 — Local Implementation Report

**Task:** AP-DX-01 設計エンティティ契約  
**Phase:** F — Implementation complete (Block 3 verification passed)
**Date:** 2026-08-01  
**Baseline SHA:** `178768871545ab36aaea019916a492a051373496`  
**Branch:** `feat/ap-dx-01-design-entity-contracts`
**Final SHA:** `0e92130a9dabb2594f294225f990ab59327bf00b`
**PR:** https://github.com/ollejanaitte/spacer-clone/pull/244
**Numeric design authorization:** NOT_GRANTED
**Schema version decision:** NO bump — remain `0.1.0` additive backward-compatible
**Migration decision:** NO migration required

## 1. Executive summary

AP-DX-01 extends `BridgeSuperstructureDesignDocument` (BSDD) at schema version `0.1.0` with an optional top-level `structuralDesignModel` container and 11 design entity types (`MainGirder`, `GirderSectionSegment`, `RcDeck`, `Haunch`, `CrossBeam`, `SwayBracing`, `LateralBracing`, `BraceMember`, `Stiffener`, `Splice`, `DeckAnchorage`). TypeScript types, Zod runtime schema, JSON Schema artifact, parser/mapper, semantic validator, and contract tests are aligned. Non-composite governance is fail-closed (`compositeAction: false`, `compositeShearConnector` forbidden, `DeckAnchorage` independent). No Apollo UI, 3D viewer, backend, IF3, or numeric design logic changes.

| Assessment | Final conclusion |
|------------|------------------|
| Schema version bump | **NO** — additive optional `structuralDesignModel` at `0.1.0` |
| Migration | **NO** — absent section defaults; existing fixtures remain valid |
| Non-composite governance | **PASS** — validator + schema + tests enforce fail-closed posture |
| Blockers remaining | B-02 numeric authority NOT_GRANTED (governance, expected); B-04 PD-001 resolved on main (#243) |
| AP-DX-01 implementation | **COMPLETE** — Phases A–F; Block 3 verification bundle PASS |

## 2. Target files

### 2.1 Primary (listed in implementation freeze)

| Path | Role | Phase A status |
|------|------|----------------|
| `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts` | Domain types + `validateBridgeSuperstructureDesignDocument` | Exists; no design entities |
| `frontend/src/contracts/runtime/schemas/bridgeSuperstructureDesignDocument.ts` | Zod structural schema | Exists; mirrors current types |
| `frontend/src/contracts/runtime/parsers.ts` | `parseBridgeSuperstructureDesignDocumentValue` | Exists |
| `frontend/src/contracts/__tests__/bridgeSuperstructureDesignDocument.test.ts` | Contract tests | Exists; partial coverage vs freeze §11 |

### 2.2 Supporting infrastructure (reuse, do not duplicate)

| Path | Role |
|------|------|
| `frontend/src/contracts/contractVersionRegistry.ts` | Schema ID/version matrix |
| `frontend/src/contracts/governedQuantity.ts` | Numeric adoption boundary |
| `frontend/src/contracts/provenance.ts` | Actor/tool provenance |
| `frontend/src/contracts/extensions.ts` | Namespaced extensions |
| `frontend/src/contracts/uuid.ts` | UUID format + generation |
| `frontend/src/contracts/stableEntityId.ts` | Namespace + UUID stable ID (optional pattern) |
| `frontend/src/contracts/unknownFieldStore.ts` | Unknown field retention contract |
| `frontend/src/contracts/migrationRecord.ts` | Migration audit record |
| `frontend/src/contracts/migration/` | Migration registry + step execution |
| `frontend/src/contracts/runtime/domainMappers.ts` | `mapBridgeSuperstructureDesignDocumentValue` |
| `frontend/src/contracts/runtime/schemas/commonEnvelope.ts` | Envelope with `unknownFieldStoreRef` / `migrationProvenanceRef` |
| `frontend/src/contracts/index.ts` | Public export barrel |
| `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json` | Checked-in JSON Schema |

### 2.3 Related non-target (out of AP-DX-01 scope)

- Apollo UI (`frontend/src/apollo/`)
- 3D viewer (`frontend/src/viewer/`)
- Backend / IF3
- `docs/apollo/step1/07_validation/reference_bridge_input.json` (planning draft only; negative-test reference)

## 3. Current BSDD contract structure

### 3.1 Schema identity

| Field | Value |
|-------|-------|
| `schemaId` | `spacer.contracts.bridge-superstructure-design-document` |
| `schemaVersion` | `0.1.0` |
| `documentKind` | `bridge-superstructure-design` |
| Registry constant | `BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_VERSION` |
| JSON Schema `$id` slug | `bridge-superstructure-design-document` |
| Shared contract family version | `0.1.0` (`SHARED_CONTRACT_VERSION`) |

### 3.2 Top-level document shape (implemented)

```
BridgeSuperstructureDesignDocument
├── envelope (schemaId, schemaVersion, documentId, documentKind, revisionId,
│             contentChecksum, provenance)
├── lifecycleStatus
├── coordinateContexts[]
├── unitContext
├── projectContext
├── bridge (BsddBridge)
│   ├── spans[] (BsddSpan)
│   ├── girderLines[] (BsddGirderLine)
│   ├── deck (BsddDeck — deckKind: "rc_non_composite")
│   └── supports[] (BsddSupport)
├── materialDefinitions[]
├── loadCases[]
├── analysisBindings[]
├── phase1ScopeAssertion (superstructureKind: plate_girder_rc_slab_non_composite)
└── optional: roadImportProvenance, validationStatus, exportAuthorityRef,
              extensions, unknownFieldStoreRef, migrationProvenanceRef
```

### 3.3 AP-DX-01 required entities (not implemented)

Per `implementation_freeze.md` §4 and `implementation_sequence.md` AP-DX-01:

| Entity | In BSDD today | Notes |
|--------|---------------|-------|
| `MainGirder` | No | `BsddGirderLine` is geometry-line primitive, not full design entity |
| `GirderSectionSegment` | No | |
| `RcDeck` | Partial | `BsddDeck` has thickness/width/unitWeight only |
| `Haunch` | No | |
| `CrossBeam` | No | |
| `SwayBracing` | No | |
| `LateralBracing` | No | |
| `BraceMember` | No | |
| `Stiffener` | No | |
| `Splice` | No | |
| `DeckAnchorage` | No | Policy frozen in refreeze §3.1; no TypeScript type |

Each required entity must eventually carry: stable ID, revision, provenance/source reference, geometry reference, analysis mapping placeholder, design status, adoption status, extensions/unknown boundary.

### 3.4 Non-composite signals (partial)

| Signal | Current state |
|--------|---------------|
| `BsddDeck.deckKind = "rc_non_composite"` | Implemented |
| `phase1ScopeAssertion.superstructureKind = "plate_girder_rc_slab_non_composite"` | Implemented |
| `compositeAction` field | Not present on BSDD |
| `compositeShearConnector` prohibition | Not in BSDD validator (Apollo `phase1ScopeGuard` rejects composite deck at UI scope layer) |
| `DeckAnchorage` independence | Not modeled |

## 4. Artifact inventory

### 4.1 TypeScript types

- **Location:** `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`
- **Exports:** `BridgeSuperstructureDesignDocument`, `BsddBridge`, `BsddDeck`, `BsddGirderLine`, `BsddSpan`, `BsddSupport`, `BsddMaterialDefinition`, `BsddLoad`, `BsddLoadCase`, `BsddAnalysisBinding`, `BsddPhase1ScopeAssertion`, lifecycle/validation status unions
- **Validator:** `validateBridgeSuperstructureDesignDocument(document, path?, options?)` — checks schema ID/kind, UUIDs, governed quantities, coordinate/unit contexts, provenance, extensions, analysis bindings, phase1 scope quantities
- **Gaps vs AP-DX-01 freeze §10:** no duplicate-ID scan, no dangling cross-entity reference scan, no composite-connector rejection, no design-status / adoption-status consistency rules

### 4.2 JSON Schema (runtime Zod)

- **Location:** `frontend/src/contracts/runtime/schemas/bridgeSuperstructureDesignDocument.ts`
- **Pattern:** `createCommonEnvelopeSchema` + `.extend({...})` with `z.strictObject` sub-schemas
- **Inference type:** `BridgeSuperstructureDesignDocumentValue`
- **Metadata:** `contractVersion: 0.1.0`
- **Strictness:** Unknown top-level keys are rejected at structural parse (fail-closed)

### 4.3 JSON Schema (checked-in artifact)

- **Location:** `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json`
- **Generated from:** Zod via `contracts:schema:generate` (per Phase C verification)
- **Includes:** `unknownFieldStoreRef`, `migrationProvenanceRef`, `extensions` in envelope

### 4.4 Parser

- **Location:** `frontend/src/contracts/runtime/parsers.ts`
- **Function:** `parseBridgeSuperstructureDesignDocumentValue(value, path?)`
- **Pipeline:** Zod structural parse → `mapBridgeSuperstructureDesignDocumentValue` → `validateBridgeSuperstructureDesignDocument` semantic validation
- **Unknown fields:** Not silently dropped; strict schema rejects unrecognized keys unless routed through `unknownFieldStoreRef` workflow

### 4.5 Validator

- **Semantic:** `validateBridgeSuperstructureDesignDocument` in `bridgeSuperstructureDesignDocument.ts`
- **Version gate:** `validateSupportedContractVersion` via `contractVersionRegistry.ts`
- **Numeric gate:** `validateGovernedQuantity` with default `TargetStandardStatus.NOT_SELECTED`

### 4.6 Fixtures and tests

| Artifact | Purpose |
|----------|---------|
| `createMinimalDraftDocument()` in test file | Inline production-shaped fixture (all quantities non-adopted, null values) |
| `docs/apollo/step1/07_validation/reference_bridge_input.json` | Planning draft (`0.0.0-design-draft`); **rejected** by parser (negative test) |
| No committed JSON golden fixture for production `0.1.0` BSDD | Gap — consider adding in implementation phase |

**Existing tests** (`bridgeSuperstructureDesignDocument.test.ts`):

- Minimal DRAFT validation with non-adopted null quantities — PASS path
- ADOPTED quantity rejected when Target Standard NOT_SELECTED
- PLACEHOLDER not treated as ADOPTED
- Invalid schemaId / schemaVersion / documentId rejection
- Analysis binding IF3 metadata valid/invalid
- `exportAuthorityRef` JSON round-trip (validate only, not full parse round-trip assert)
- `parseBridgeSuperstructureDesignDocumentValue` JSON round-trip — one test
- Planning draft rejection
- No golden numeric displacement/force fixtures

**Missing tests** (required by freeze §11, not yet present):

- Duplicate entity ID rejection
- Dangling reference rejection
- Unknown / placeholder field retention through parse → serialize → parse
- `compositeShearConnector` / composite connector rejection
- `DeckAnchorage` non-composite independence
- Design-status `NOT_AUTHORIZED` fail-closed (no input-only `OK`)
- Stable ID persistence across round-trip for new entities

### 4.7 Unknown field retention

| Mechanism | Status |
|-----------|--------|
| `extensions` (namespaced vendor keys) | On envelope; validated by `validateExtensions` |
| `unknownFieldStoreRef` → `UnknownFieldStore` document | Envelope fields present; separate contract at `unknownFieldStore.ts` |
| Zod `strictObject` on BSDD | Unknown keys at BSDD root fail structural parse |
| Parser silent discard | **Not performed** — structural rejection or explicit unknown-store path |

### 4.8 Migration framework

| Component | Location | Relevance to AP-DX-01 |
|-----------|----------|----------------------|
| `MigrationRecord` | `migrationRecord.ts` | Audit trail for version transitions |
| `createMigrationRegistry` | `migration/index` | Step registration + execution |
| Tests | `migration/__tests__/migrationFramework.test.ts`, `persistence/__tests__/migrationIntegration.test.ts` | Framework proven on other contracts |
| `migrationProvenanceRef` on envelope | `commonEnvelope.ts` | Available on BSDD TypeScript type |

No BSDD-specific migration steps exist today. Not needed if Phase B confirms additive `0.1.0` extension.

### 4.9 Stable ID rules

| Rule (freeze §8) | Current BSDD behavior |
|------------------|----------------------|
| UUID format | `UuidString` + `isValidUuid` / `parseUuid` in `uuid.ts`; used on `documentId`, span/girder/deck/support IDs |
| Entity ID immutable across save/reload | Convention only; no entity registry validator |
| Array index as persistent ID | Not used in BSDD (explicit UUIDs + `index` field separate) |
| Duplicate ID → validator error | **Not implemented** for bridge subgraph |
| Dangling reference → validator error | **Not implemented** (span support refs not cross-checked) |
| Geometry/analysis refs nullable placeholder | Partial — `materialRefId` / `sectionIntentRefId` nullable on `BsddGirderLine` |
| `StableEntityId` (namespace + kind) | Exists as separate contract; BSDD uses plain `UuidString` today |

### 4.10 Numeric authority rules

| Rule | Implementation |
|------|----------------|
| `GovernedQuantity.value` may be `null` | Yes |
| Adoption statuses | `PENDING`, `PLACEHOLDER`, `UNKNOWN`, `ADOPTED` |
| `ADOPTED` requires numeric authority context | `validateGovernedQuantity` + `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD` when `TargetStandardStatus.NOT_SELECTED` |
| No implicit 0 or guessed values | Enforced by null + non-ADOPTED statuses in tests |
| Design check `NOT_AUTHORIZED` | Specified in freeze §5; **not** a BSDD field yet (DesignCheckModel layer) |
| Input-only `OK` prohibition | Governance rule for future design-status fields |

### 4.11 Backward compatibility requirements

1. **Do not destructively replace** `BsddBridge`, `BsddDeck`, `BsddGirderLine`, `BsddMaterialDefinition`, `BsddAnalysisBinding` (freeze §3).
2. **Existing test fixture** `createMinimalDraftDocument()` must remain valid after AP-DX-01 changes.
3. **Schema version `0.1.0`** documents without new optional sections must continue to parse.
4. **Contract version registry** must list supported versions; do not bump without explicit Phase B approval and migration plan.
5. **Planning draft** `reference_bridge_input.json` must remain rejected (non-regression of negative test).
6. **Strict parse** — do not loosen to accept unknown top-level keys without unknown-field-store workflow.

## 5. Change candidates (Phase B+)

Ordered by dependency; exact file splits to be confirmed in Phase B design.

### 5.1 New types and collections

- Add `StructuralDesignModel` (or equivalent) container on `BridgeSuperstructureDesignDocument` with entity arrays/maps for all §4 entities.
- Per-entity interfaces with: `entityId: UuidString`, `revisionId`, `provenance`, `geometryRefId`, `analysisMemberRefId`, `designStatus`, `adoptionStatus`, `extensions?`.
- Shared enums: `DesignCheckStatus` (`NOT_AUTHORIZED` | `INCOMPLETE` | `READY` | `STALE` | `OK` | `NG` | `WARNING` | `ERROR`), `EntityAdoptionStatus` (reuse or alias governed patterns).
- `DeckAnchorage` with explicit non-composite semantics; `compositeShearConnector` type forbidden at schema level.
- `compositeAction: false` literal on relevant entities or model-level assertion.

### 5.2 Schema / parser / mapper alignment

- Extend Zod schema in `runtime/schemas/bridgeSuperstructureDesignDocument.ts` (new sections optional, `.min(0)` arrays).
- Extend `mapBridgeSuperstructureDesignDocumentValue` for new subtrees (avoid `as unknown` casts for new sections).
- Regenerate `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json`.

### 5.3 Validator extensions

- UUID format checks on all new entity IDs.
- Document-wide duplicate ID registry across entity collections.
- Cross-reference integrity (geometry refs, material refs, girder refs).
- Non-composite rules: reject `compositeShearConnector`, enforce `compositeAction === false` where present.
- Design status fail-closed: disallow `OK` when inputs are `NOT_AUTHORIZED` / `INCOMPLETE`.
- Revision positivity and provenance presence per entity.

### 5.4 Tests

- Extend `bridgeSuperstructureDesignDocument.test.ts` per freeze §11.
- Optional: add `docs/apollo/ap-dx-01/fixtures/minimal_structural_design_model.json` (production `0.1.0` shape).

### 5.5 Export barrel

- Export new types from `frontend/src/contracts/index.ts`.

## 6. Version bump assessment

| Scenario | Bump needed? |
|----------|--------------|
| Add optional `structuralDesignModel` + entity arrays; existing fields unchanged | **Probably no** — stays within `0.1.0` additive contract |
| Rename or retype existing `BsddDeck` / `BsddGirderLine` fields | **Yes** — breaking |
| Require new fields on existing documents | **Yes** — breaking |
| Change `deckKind` enum or `phase1ScopeAssertion` literals | **Yes** — breaking |

**Phase B decision (§10.17):** **No version bump** — additive optional `structuralDesignModel` at `0.1.0`. Do not modify `CONTRACT_VERSION_SUPPORT_MATRIX`.

## 7. Migration assessment

| Scenario | Migration needed? |
|----------|-------------------|
| Optional new sections at `0.1.0` | **No** — empty/absent sections default |
| Minor `0.1.1` with backward-compatible parse | Optional adapter; likely unnecessary |
| Major version or required field additions | **Yes** — use `migration/` registry + `MigrationRecord` |

**Phase B decision (§10.18):** **No migration** for AP-DX-01. Framework remains available if a future version bump is approved.

## 8. Blockers and open questions

### 8.1 Blockers

| ID | Blocker | Severity |
|----|---------|----------|
| B-01 | Required design entities not present in BSDD | **RESOLVED** — Phase C–E |
| B-02 | Numeric design authorization NOT_GRANTED | **Governance** — contract may define shapes; must not emit `OK` design checks |
| B-03 | Validator lacks entity-graph integrity rules | **RESOLVED** — Phase E |
| B-04 | PD-001 Apollo test manifest stale | **RESOLVED on main** (#243); orthogonal to BSDD contract |

### 8.2 Open questions

| ID | Question | Phase B resolution |
|----|----------|-------------------|
| OQ-01 | `DeckAnchorage` — no dedicated `manual_traceability.csv` row (LV-06/07 OPEN_QUESTION) | **Unchanged** — governance/traceability; does not block contract design |
| OQ-02 | Use plain `UuidString` vs `StableEntityId` for AP-DX-01 entities | **Resolved** — plain `UuidString` per-entity `*Id` fields (§10.12) |
| OQ-03 | Exact shape of `geometryRefId` / `analysisMemberRefId` placeholders before AP-DX-02 3D binding | **Resolved** — `DesignGeometryReference` / `DesignAnalysisMemberMapping` (§10.7–§10.8) |
| OQ-04 | Whether `StructuralDesignModel` is top-level sibling or nested under `bridge` | **Resolved** — optional top-level sibling (§10.1) |
| OQ-05 | Phase B sign-off on schema version strategy (stay `0.1.0` vs bump) | **Resolved** — stay `0.1.0`; no migration (§10.17–§10.18) |

## 9. Phase status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Inventory | **COMPLETED** |
| B | Type/schema design + version decision (§10) | **COMPLETED** |
| C | TypeScript contract types | **COMPLETED** |
| D | Zod schema + JSON Schema artifact | **COMPLETED** |
| E | Parser, mapper, semantic validator | **COMPLETED** |
| F | Contract tests + verification bundle | **COMPLETED** |

## 12. Implementation commits (Phases C–F)

| SHA | Message |
|-----|---------|
| `ac794d2` | docs(apollo): record AP-DX-01 contract inventory |
| `19a02bf` | docs(apollo): finalize AP-DX-01 implementation design |
| `cc16504` | feat(apollo): add AP-DX-01 design entity contract types |
| `a804c38` | feat(apollo): extend BSDD schema for design entities |
| `832ab10` | feat(apollo): validate AP-DX-01 entity references and governance |
| `3c031f8` | test(apollo): cover AP-DX-01 design entity contracts |
| `ff5c421` | fix(apollo): pass validator path argument in AP-DX-01 fail-closed test |
| `b1b4938` | docs(apollo): finalize AP-DX-01 implementation report (pre-normalization) |
| `b9f21e2` | docs(apollo): finalize AP-DX-01 implementation report (structure correction) |
| `0e92130` | docs(apollo): finalize AP-DX-01 implementation report (verdict normalization) |

History note: branch retains full phase commit history; corrective commit `ff5c421` was
required because rebase/history rewrite was prohibited under repository agent rules.

## 13. Files modified (implementation scope)

| Path | Role |
|------|------|
| `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts` | Types + semantic validator |
| `frontend/src/contracts/index.ts` | Export barrel |
| `frontend/src/contracts/runtime/domainMappers.ts` | structuralDesignModel mapper |
| `frontend/src/contracts/runtime/schemas/bridgeSuperstructureDesignDocument.ts` | Zod schema |
| `frontend/src/contracts/__tests__/bridgeSuperstructureDesignDocument.test.ts` | Contract tests |
| `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json` | JSON Schema artifact |
| `docs/apollo/ap-dx-01/local_implementation_report.md` | This report |
| `final_report.txt` | Canonical verification record |

**Out of scope (unchanged):** Apollo UI, 3D viewer, backend, IF3, numeric design formulas.

## 14. Non-composite governance confirmation

| Rule | Enforcement |
|------|-------------|
| `SdmNonCompositeAssertion.compositeAction` | Literal `false` required when `structuralDesignModel` present |
| `compositeShearConnector` / `slabGirderConnector` | Rejected at schema (strictObject) and validator (`BSDD_COMPOSITE_CONNECTOR_FORBIDDEN`) |
| `DeckAnchorage` independence | Separate entity; `anchorageRole` non-composite enum only; no `compositeAction` field |
| `NOT_AUTHORIZED` fail-closed | Default design status; `OK` rejected without numeric authority (`BSDD_DESIGN_STATUS_NOT_AUTHORIZED_FAIL_CLOSED`) |
| `BsddDeck.deckKind` | Remains `"rc_non_composite"`; `phase1ScopeAssertion` unchanged |

## 15. Block 3 — Phase F verification bundle (2026-08-01 JST)

| Field | AP-DX-01-F-01-BSDD-TESTS |
|-------|--------------------------|
| TEST_ID | AP-DX-01-F-01-BSDD-TESTS |
| COMMAND | `cd frontend && npm run test -- src/contracts/__tests__/bridgeSuperstructureDesignDocument.test.ts src/contracts/runtime/__tests__/contractJsonSchema.test.ts` |
| START_TIME | 2026-08-01 21:44:42 JST |
| END_TIME | 2026-08-01 21:44:43 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | 2/2 contract test files (35/35 tests) |
| EVIDENCE | Vitest v4.1.8: Test Files 2 passed; Tests 35 passed; Duration 916ms |
| ACTION | Proceed to AP-DX-01-F-02-TYPECHECK |

| Field | AP-DX-01-F-02-TYPECHECK |
|-------|---------------------------|
| TEST_ID | AP-DX-01-F-02-TYPECHECK |
| COMMAND | `cd frontend && npm run typecheck` |
| START_TIME | 2026-08-01 21:45:24 JST |
| END_TIME | 2026-08-01 21:45:38 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | Full frontend TypeScript project (`tsc -b --pretty false`) |
| EVIDENCE | No diagnostic output; exit 0 |
| ACTION | Proceed to AP-DX-01-F-03-LINT |

| Field | AP-DX-01-F-03-LINT |
|-------|----------------------|
| TEST_ID | AP-DX-01-F-03-LINT |
| COMMAND | `cd frontend && npm run lint` |
| START_TIME | 2026-08-01 21:45:38 JST |
| END_TIME | 2026-08-01 21:45:52 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | tsc -b + source hygiene + Japanese-string audit |
| EVIDENCE | Frontend source hygiene check passed; exit 0 |
| ACTION | Proceed to AP-DX-01-F-04-BUILD |

| Field | AP-DX-01-F-04-BUILD |
|-------|---------------------|
| TEST_ID | AP-DX-01-F-04-BUILD |
| COMMAND | `cd frontend && npm run build` |
| START_TIME | 2026-08-01 21:45:52 JST |
| END_TIME | 2026-08-01 21:46:16 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | Production build (`tsc -b && vite build`); dist/ artifacts |
| EVIDENCE | Vite v7.3.5: 3926 modules transformed; built in 9.94s; chunk size warning informational |
| ACTION | Proceed to AP-DX-01-F-05-GIT-DIFF-CHECK |

| Field | AP-DX-01-F-05-GIT-DIFF-CHECK |
|-------|--------------------------------|
| TEST_ID | AP-DX-01-F-05-GIT-DIFF-CHECK |
| COMMAND | `git diff --check` |
| START_TIME | 2026-08-01 21:46:16 JST |
| END_TIME | 2026-08-01 21:46:16 JST |
| EXIT_CODE | 0 |
| RESULT | PASS |
| FAILURE_CLASS | N/A |
| AFFECTED_SCOPE | Working tree whitespace |
| EVIDENCE | No trailing-whitespace or conflict-marker violations |
| ACTION | Block 3 verification bundle complete |

## 16. AP-DX-01 verdict fields

| Field | Verdict |
|-------|---------|
| AP_DX_01_PHASE_A_INVENTORY_VERDICT | PASS |
| AP_DX_01_PHASE_B_DESIGN_VERDICT | PASS |
| AP_DX_01_PHASE_C_TYPES_VERDICT | PASS |
| AP_DX_01_PHASE_D_SCHEMA_VERDICT | PASS |
| AP_DX_01_PHASE_E_PARSER_MAPPER_VALIDATOR_VERDICT | PASS |
| AP_DX_01_BLOCK_2_TEST_VERDICT | PASS |
| AP_DX_01_BLOCK_3_VERIFICATION_VERDICT | PASS |
| AP_DX_01_SCHEMA_VERSION_DECISION | REMAIN_0_1_0_ADDITIVE_BACKWARD_COMPATIBLE |
| AP_DX_01_MIGRATION_DECISION | NONE_REQUIRED |
| AP_DX_01_NON_COMPOSITE_GOVERNANCE_VERDICT | PASS |
| AP_DX_01_CONTRACT_COMPLETENESS | COMPLETE |
| AP_DX_01_IMPLEMENTATION_VERDICT | PASS |
| AP_DX_01_NUMERIC_AUTHORIZATION | NOT_GRANTED |
| AP_DX_01_OVERALL_VERDICT | PASS — ready for PR review |

## 10. Phase B — Implementation design (COMPLETED)

Phase B records definitive contract design decisions for AP-DX-01. No application code was modified. Implementation phases C–E may proceed under these decisions.

### 10.1 Container placement and document shape

**Decision:** Add an optional top-level `structuralDesignModel?: StructuralDesignModel` on `BridgeSuperstructureDesignDocument`, as a sibling of `bridge`, `materialDefinitions`, `loadCases`, and `analysisBindings` — aligned with `scope_and_architecture_freeze.md` §5.1 (`StructuralDesignModel` is not nested under `BsddBridge`).

```
BridgeSuperstructureDesignDocument
├── … (existing envelope, bridge, materials, loads, analysisBindings — unchanged)
└── structuralDesignModel?: StructuralDesignModel   ← NEW (optional)
```

- Absent `structuralDesignModel` → document remains valid at `0.1.0` (backward compatible).
- Present `structuralDesignModel` → must satisfy non-composite assertion and entity rules below.
- `bridge` (`BsddBridge` geometry primitives) is **not** replaced; design entities reference geometry via `geometryRef` (§10.7).

### 10.2 Entity type names

Canonical entity kind literals (freeze §4) and matching TypeScript interface names:

| Entity kind (`entityKind` literal) | TypeScript interface | Stable ID field |
|-----------------------------------|----------------------|-----------------|
| `MainGirder` | `MainGirder` | `mainGirderId` |
| `GirderSectionSegment` | `GirderSectionSegment` | `girderSectionSegmentId` |
| `RcDeck` | `RcDeck` | `rcDeckId` |
| `Haunch` | `Haunch` | `haunchId` |
| `CrossBeam` | `CrossBeam` | `crossBeamId` |
| `SwayBracing` | `SwayBracing` | `swayBracingId` |
| `LateralBracing` | `LateralBracing` | `lateralBracingId` |
| `BraceMember` | `BraceMember` | `braceMemberId` |
| `Stiffener` | `Stiffener` | `stiffenerId` |
| `Splice` | `Splice` | `spliceId` |
| `DeckAnchorage` | `DeckAnchorage` | `deckAnchorageId` |

**Out of scope for AP-DX-01:** `EndCrossBeam`, `SupportCrossBeam`, `Bearing` (listed in refreeze §5.3 architecture sketch only; not in `implementation_freeze.md` §4).

`StructuralDesignModel` container fields (all arrays, `.min(0)`):

```typescript
interface StructuralDesignModel {
  readonly modelId: UuidString;
  readonly nonCompositeAssertion: SdmNonCompositeAssertion;
  readonly mainGirders: readonly MainGirder[];
  readonly girderSectionSegments: readonly GirderSectionSegment[];
  readonly rcDecks: readonly RcDeck[];
  readonly haunches: readonly Haunch[];
  readonly crossBeams: readonly CrossBeam[];
  readonly swayBracings: readonly SwayBracing[];
  readonly lateralBracings: readonly LateralBracing[];
  readonly braceMembers: readonly BraceMember[];
  readonly stiffeners: readonly Stiffener[];
  readonly splices: readonly Splice[];
  readonly deckAnchorages: readonly DeckAnchorage[];
}
```

Each entity carries `readonly entityKind: "<KindLiteral>"` as a discriminant for validator consistency checks.

### 10.3 Common metadata type

**Decision:** Introduce `DesignEntityMetadata` as the shared per-entity metadata block. Entity interfaces extend or embed this shape (composition in TypeScript; same field set in JSON).

```typescript
interface DesignEntityMetadata {
  readonly entityRevisionId: number;           // positive integer; entity-scoped revision
  readonly provenance: Provenance;             // required — actor/tool audit trail
  readonly sourceRef?: DocumentReference | null; // optional external source document
  readonly geometryRef: DesignGeometryReference;
  readonly analysisMapping: DesignAnalysisMemberMapping;
  readonly designStatus: DesignEntityDesignStatus;
  readonly adoptionStatus: DesignEntityAdoptionStatus;
  readonly extensions?: Extensions;
}
```

Per-entity interface pattern:

```typescript
interface MainGirder extends DesignEntityMetadata {
  readonly entityKind: "MainGirder";
  readonly mainGirderId: UuidString;
  readonly girderLineRefId: UuidString | null; // link to BsddGirderLine when bound
  // entity-specific fields added in Phase C (material refs, segment refs, etc.)
}
```

Entity-specific reference and quantity fields are added on each interface; shared metadata fields are not duplicated with alternate names.

### 10.4 Design status model

**Type name:** `DesignEntityDesignStatus`

**Values (freeze §5, exact literals):**

| Value | Semantics |
|-------|-----------|
| `NOT_AUTHORIZED` | Default for AP-DX-01 — numeric/design-check authority not granted |
| `INCOMPLETE` | Entity definition structurally present but insufficient for check |
| `READY` | Inputs complete enough to run a future check (still not `OK` without authority) |
| `STALE` | Upstream inputs changed since last evaluation |
| `OK` | Check passed — **forbidden as input-only default** while `NOT_GRANTED` |
| `NG` | Check failed |
| `WARNING` | Check passed with warnings |
| `ERROR` | Check could not complete |

**Export:** `DESIGN_ENTITY_DESIGN_STATUSES` const array + union type (mirror `GOVERNED_QUANTITY_ADOPTION_STATUSES` pattern).

**Validator rules (Phase D):**

1. `designStatus` is **required** on every design entity (not nullable).
2. New entities / documents without explicit override default to `NOT_AUTHORIZED`.
3. Reject `designStatus: "OK"` when `TargetStandardStatus.NOT_SELECTED` (same numeric gate posture as `GovernedQuantity`).
4. Reject `designStatus: "OK"` when `adoptionStatus` is not `ADOPTED`.
5. Reject `designStatus: "OK"` when any governed quantity on the entity is non-`ADOPTED` with non-null value claimed as authoritative.
6. Parser/serializer must not infer or upgrade status from presence of input fields alone (fail-closed).

### 10.5 Adoption status model

**Type name:** `DesignEntityAdoptionStatus`

**Decision:** Type alias to existing `GovernedQuantityAdoptionStatus`:

```typescript
export type DesignEntityAdoptionStatus = GovernedQuantityAdoptionStatus;
// PENDING | PLACEHOLDER | UNKNOWN | ADOPTED
```

Reuse `GOVERNED_QUANTITY_ADOPTION_STATUSES` and `isGovernedQuantityAdoptionStatus` — no parallel enum.

**Semantics at entity level:**

| Value | Meaning |
|-------|---------|
| `PENDING` | Entity slot reserved; definition not started |
| `PLACEHOLDER` | Stub definition for layout/traceability only |
| `UNKNOWN` | Definition state explicitly unknown |
| `ADOPTED` | Entity definition adopted for downstream use |

**Validator rules:** `adoptionStatus` required; `ADOPTED` at entity level does not bypass numeric `GovernedQuantity` ADOPTED gates on individual quantities.

### 10.6 Revision type

**Decision:** Entity-scoped revision uses plain positive integer `entityRevisionId: number` on each entity via `DesignEntityMetadata`.

| Field | Scope | Type | Rules |
|-------|-------|------|-------|
| `revisionId` | Document envelope | `number` (existing) | Unchanged |
| `entityRevisionId` | Per design entity | `number` | Positive integer (`> 0`); monotonic per entity on save is convention; validator checks format only in AP-DX-01 |

Do **not** reuse branded `RevisionId` on entities (document revision namespace is separate). Do **not** use array index as revision.

### 10.7 Geometry reference shape

**Type name:** `DesignGeometryReference`

```typescript
interface DesignGeometryReference {
  readonly geometryRefId: UuidString | null;
  readonly bindingStatus: "unbound" | "bound" | "stale";
}
```

| Field | Nullability | Semantics |
|-------|-------------|-----------|
| `geometryRefId` | `null` allowed | **Valid placeholder** — no geometry binding yet (pre AP-DX-02) |
| `geometryRefId` | non-null | Must be valid UUID **and** resolve to an ID in the document geometry-anchor registry (§10.14) |
| `bindingStatus` | required | `unbound` when `geometryRefId` is `null`; `bound` when ref resolves; `stale` when upstream geometry changed |

**Geometry-anchor registry (AP-DX-01):** IDs from existing `bridge` primitives — `spanId`, `girderLineId`, `deckId`, `supportId`. AP-DX-02 may extend the registry; dangling non-null refs are validator errors.

### 10.8 Analysis mapping placeholder shape

**Type name:** `DesignAnalysisMemberMapping`

```typescript
interface DesignAnalysisMemberMapping {
  readonly analysisMemberRefId: UuidString | null;
  readonly bindingStatus: "unbound" | "bound" | "stale";
  readonly analysisBindingId?: UuidString | null;
}
```

| Field | Nullability | Semantics |
|-------|-------------|-----------|
| `analysisMemberRefId` | `null` allowed | Valid placeholder before analysis model exists |
| `analysisMemberRefId` | non-null | Must resolve in analysis-member registry (empty until analysis entities exist; non-null dangling ref → error) |
| `analysisBindingId` | optional / `null` | When set, must match a `bindingId` in `analysisBindings[]` |
| `bindingStatus` | required | Same binding lifecycle as geometry |

### 10.9 Provenance / source boundary

| Concern | Location | Required? | Type |
|---------|----------|-----------|------|
| Document audit | `envelope.provenance` | Yes (existing) | `Provenance` |
| Entity audit | `DesignEntityMetadata.provenance` | **Yes** | `Provenance` — per-entity `createdAt` / `createdBy` / `producer` |
| External lineage | `DesignEntityMetadata.sourceRef` | No | `DocumentReference \| null` — import or upstream doc pointer |

**Rules:**

- `provenance` and `sourceRef` serve different purposes; both may coexist.
- `sourceRef` does not substitute for `provenance` (provenance always required on entities).
- Reuse existing `validateProvenance` and `validateDocumentReference`; no duplicate provenance types.
- Document-level `roadImportProvenance` remains separate and unchanged.

### 10.10 Nullability boundaries

| Category | Field / pattern | Nullable? | Notes |
|----------|-----------------|-----------|-------|
| Identity | `*Id` (entity stable IDs) | **No** | Valid UUID required |
| Revision | `entityRevisionId` | **No** | Positive integer |
| Status | `designStatus`, `adoptionStatus` | **No** | Required enums |
| Audit | `provenance` | **No** | Required object |
| Audit | `sourceRef` | **Yes** (optional field) | Absent or explicit `null` |
| References | `geometryRef.geometryRefId` | **Yes** (`null` = unbound) | Non-null → must resolve |
| References | `analysisMapping.analysisMemberRefId` | **Yes** (`null` = unbound) | Non-null → must resolve |
| References | Entity cross-refs (`girderLineRefId`, `materialRefId`, etc.) | **Yes** unless entity-specific rule says otherwise | Non-null → dangling check |
| Quantities | `GovernedQuantity.value` | **Yes** | `null` = not entered / not adopted |
| Quantities | `GovernedQuantity.adoptionStatus` | **No** | Required |
| Extensions | `extensions` | Optional field | When absent, no extensions |
| Container | `structuralDesignModel` | Optional top-level | Absent = valid legacy document |

**Prohibited:** Coercing `null` quantities to `0`; coercing absent optional sections to empty objects with defaulted statuses.

### 10.11 Unknown retention boundary

| Layer | Mechanism | Rule |
|-------|-----------|------|
| Document | `unknownFieldStoreRef` → `UnknownFieldStore` | Unchanged — external store for out-of-schema payloads |
| Document | `extensions` on envelope | Unchanged |
| Entity | `extensions` on `DesignEntityMetadata` | Namespaced vendor keys only (`validateExtensions`) |
| Parse | Zod `strictObject` on entities | Unknown keys on entity objects → structural parse error |
| Parse | Parser | **No silent discard** — fail closed or route through unknown-field-store workflow |

**Prohibited:** Promoting unknown keys to first-class fields without schema change. Unknown connector kinds must not be normalized into `DeckAnchorage` or composite types.

### 10.12 Stable ID rule

**Decision (OQ-02):** Use plain `UuidString` with per-entity `*Id` field names — **not** `StableEntityId` (namespace/kind composite). Matches existing BSDD convention (`spanId`, `girderLineId`, `deckId`).

| Rule | Enforcement |
|------|-------------|
| Format | RFC-4122 UUID string via `isValidUuid` / `parseUuid` |
| Immutability | ID must not change across save/reload (convention + persistence layer) |
| No index IDs | Array `index` fields may exist for ordering but are not persistent identifiers |
| Global uniqueness | All `*Id` values across `bridge` and `structuralDesignModel` share one document-wide ID space |
| `entityKind` + `*Id` | Validator confirms kind literal matches collection membership |

### 10.13 Duplicate ID detection strategy

**When:** Semantic validation (`validateBridgeSuperstructureDesignDocument`), Phase D.

**Algorithm:**

1. Build `Map<string, { kind: string; path: string }>`.
2. Register every stable ID from:
   - `bridge.spans[].spanId`
   - `bridge.girderLines[].girderLineId`
   - `bridge.deck.deckId`
   - `bridge.supports[].supportId`
   - `bridge.bridgeId`
   - All `structuralDesignModel.*[].*Id` fields per §10.2 table
   - `structuralDesignModel.modelId`
   - `materialDefinitions[].materialId`
   - `loadCases[].loadCaseId`, `loads[].loadId`
   - `analysisBindings[].bindingId`
3. On collision (same UUID string, two registrations): emit `BSDD_DUPLICATE_ENTITY_ID` error listing both paths.
4. Empty / malformed UUIDs are caught by format validation before duplicate scan.

### 10.14 Dangling reference detection strategy

**When:** Semantic validation, after ID registry is built (§10.13).

**Reference fields to check (non-exhaustive; Phase C adds entity-specific refs):**

| Referrer | Target registry |
|----------|-----------------|
| `geometryRef.geometryRefId` | Geometry-anchor IDs (§10.7) |
| `analysisMapping.analysisMemberRefId` | Analysis-member IDs (empty until future analysis entities; non-null must resolve or error) |
| `analysisMapping.analysisBindingId` | `analysisBindings[].bindingId` |
| `girderLineRefId` | `bridge.girderLines[].girderLineId` |
| `materialRefId` | `materialDefinitions[].materialId` |
| Entity cross-refs (parent girder, segment chain, brace attachments) | Corresponding entity `*Id` collections |

**Rule:** `null` reference → **skip** dangling check (valid unbound placeholder). Non-null → must resolve or emit `BSDD_DANGLING_REFERENCE` with referrer path and target ID.

### 10.15 Composite connector rejection strategy

**Container assertion (required when `structuralDesignModel` present):**

```typescript
interface SdmNonCompositeAssertion {
  readonly compositeAction: false; // literal false only
}
```

**Schema level (Phase C Zod):**

- Do not define `compositeShearConnector`, `slabGirderConnector`, or `compositeAction: true` anywhere in BSDD schema.
- `RcDeck` and `MainGirder` may include optional `compositeAction?: false` literal only (no `true`).

**Validator level (Phase D):**

1. Reject `structuralDesignModel.nonCompositeAssertion.compositeAction !== false`.
2. Reject any object under `structuralDesignModel` containing key `compositeShearConnector` (deep key scan for structural parse survivors).
3. Reject `extensions` keys matching `*/compositeShearConnector` or `*/slabGirderConnector` on entities.
4. Reject unknown `connectorKind` extension values that map to composite shear semantics (fail closed; retain in `unknownFieldStore` if routed, never promote).
5. `BsddDeck.deckKind` must remain `"rc_non_composite"`; `phase1ScopeAssertion.superstructureKind` unchanged.

### 10.16 DeckAnchorage independence rule

`DeckAnchorage` models slab-to-girder anchorage **independent of composite action**:

| Rule | Detail |
|------|--------|
| Separate entity type | `DeckAnchorage` is its own collection; not a subtype of connector or bracing |
| Role enum | `anchorageRole: "slab_to_girder"` \| `"uplift_restraint"` \| `"other_non_composite"` — **no** `"composite_shear"` / `"stud_shear_connector"` |
| Default design status | `designStatus: "NOT_AUTHORIZED"` until standard adoption |
| No composite fields | Must not include `compositeAction`, `shearConnectorCount`, or `connectorPitch` as first-class fields in AP-DX-01 |
| Reference independence | `deckAnchorageId` is distinct from any forbidden connector ID space; refs use explicit `girderRefId` / `rcDeckRefId` |
| Validator | Reject `DeckAnchorage` with `anchorageRole` implying composite shear; reject cross-entity type confusion with `BraceMember` |

### 10.17 Schema version decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Bump `schemaVersion`? | **NO — remain `0.1.0`** | New `structuralDesignModel` is optional; no existing field retyped or removed |
| Update `CONTRACT_VERSION_SUPPORT_MATRIX`? | **NO** | No new version to register |
| Regenerate JSON Schema artifact? | **YES** (Phase C) | Same `v0.1` path; additive properties only |
| Breaking changes? | **None** | `createMinimalDraftDocument()` remains valid without `structuralDesignModel` |

**Chosen path:** Additive backward-compatible extension within **`0.1.0`**.

### 10.18 Migration decision

| Question | Decision | Rationale |
|----------|----------|-----------|
| Migration steps required? | **NO** | Absent `structuralDesignModel` is the default for existing documents |
| `migrationProvenanceRef` on new docs? | Optional / unchanged | Only needed for future version transitions |
| Migration framework | Available but unused for AP-DX-01 | Per `migration/` registry if a future bump is approved |

### 10.19 Phase B sign-off

| Criterion | Status |
|-----------|--------|
| Entity types named | **DECIDED** (§10.2) |
| Common metadata | **DECIDED** (`DesignEntityMetadata`, §10.3) |
| Design / adoption status | **DECIDED** (§10.4–§10.5) |
| Revision | **DECIDED** (`entityRevisionId`, §10.6) |
| Geometry / analysis placeholders | **DECIDED** (§10.7–§10.8) |
| Provenance boundary | **DECIDED** (§10.9) |
| Nullability / unknown | **DECIDED** (§10.10–§10.11) |
| Stable ID + integrity strategies | **DECIDED** (§10.12–§10.14) |
| Non-composite / DeckAnchorage | **DECIDED** (§10.15–§10.16) |
| Schema version / migration | **DECIDED — no bump, no migration** (§10.17–§10.18) |
| Application code modified in Phase B | **None** |

**Proceed to Phase C:** YES.

## 11. References

- `docs/apollo/ap-dx-01/implementation_freeze.md`
- `docs/apollo/phase1_design_expansion_refreeze/scope_and_architecture_freeze.md`
- `docs/apollo/phase1_design_expansion_refreeze/implementation_sequence.md`
- Baseline commit: `178768871545ab36aaea019916a492a051373496` — `docs(apollo): freeze AP-DX-01 contract implementation scope`
