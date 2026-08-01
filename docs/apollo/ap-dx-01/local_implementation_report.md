# AP-DX-01 — Local Implementation Report

**Task:** AP-DX-01 設計エンティティ契約  
**Phase:** A — Inventory (completed)  
**Date:** 2026-08-01  
**Baseline SHA:** `178768871545ab36aaea019916a492a051373496`  
**Branch:** `feat/ap-dx-01-design-entity-contracts`  
**Numeric design authorization:** NOT_GRANTED  
**Application code changes in Phase A:** None (docs only)

## 1. Executive summary

Phase A inventory confirms that `BridgeSuperstructureDesignDocument` (BSDD) exists as a production contract at schema version `0.1.0` with aligned TypeScript types, Zod runtime schema, JSON Schema artifact, parser, and semantic validator. The contract covers bridge geometry primitives (`BsddBridge`, `BsddGirderLine`, `BsddDeck`, supports, materials, loads, analysis bindings) but does **not** yet model the AP-DX-01 design entities (`MainGirder`, `GirderSectionSegment`, `RcDeck`, `Haunch`, `CrossBeam`, `SwayBracing`, `LateralBracing`, `BraceMember`, `Stiffener`, `Splice`, `DeckAnchorage`) or a `StructuralDesignModel` container.

Implementation should extend BSDD additively without destructively replacing existing `BsddBridge` / `BsddDeck` / `BsddGirderLine` types. Reusable infrastructure (`UuidString`, `GovernedQuantity`, `Provenance`, `Extensions`, unknown-field store, migration record/registry) is present and should be reused.

| Assessment | Phase A conclusion |
|------------|-------------------|
| Schema version bump | **Likely not required** if new design-model sections are optional and additive within `0.1.0`; **explicit decision required in Phase B** before any registry change |
| Migration | **Likely not required** for additive optional fields at the same version; migration framework exists if a version bump is later approved |
| Blockers | Design entities absent; numeric authority NOT_GRANTED; validator gaps for entity graph rules; PD-001 pre-existing test manifest defect (orthogonal to contract work) |

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

**Phase A recommendation:** Plan for **additive `0.1.0` extension**; record explicit Phase B sign-off before touching `CONTRACT_VERSION_SUPPORT_MATRIX`. Do not bump version in implementation without migration plan presentation (freeze §9).

## 7. Migration assessment

| Scenario | Migration needed? |
|----------|-------------------|
| Optional new sections at `0.1.0` | **No** — empty/absent sections default |
| Minor `0.1.1` with backward-compatible parse | Optional adapter; likely unnecessary |
| Major version or required field additions | **Yes** — use `migration/` registry + `MigrationRecord` |

**Phase A recommendation:** **No migration for initial AP-DX-01** if Phase B confirms additive optional model. Framework is ready if later required.

## 8. Blockers and open questions

### 8.1 Blockers

| ID | Blocker | Severity |
|----|---------|----------|
| B-01 | Required design entities not present in BSDD | **Implementation** — expected; addressed in Phase B–E |
| B-02 | Numeric design authorization NOT_GRANTED | **Governance** — contract may define shapes; must not emit `OK` design checks |
| B-03 | Validator lacks entity-graph integrity rules | **Implementation** — Phase C/D |
| B-04 | PD-001 Apollo test manifest stale (`apolloStlExport.test.ts` missing from manifest) | **Pre-existing** — blocks full frontend green suite; orthogonal to BSDD contract; fix on separate track |

### 8.2 Open questions (do not guess)

| ID | Question |
|----|----------|
| OQ-01 | `DeckAnchorage` — no dedicated `manual_traceability.csv` row (LV-06/07 OPEN_QUESTION) |
| OQ-02 | Use plain `UuidString` vs `StableEntityId` for AP-DX-01 entities |
| OQ-03 | Exact shape of `geometryRefId` / `analysisMemberRefId` placeholders before AP-DX-02 3D binding |
| OQ-04 | Whether `StructuralDesignModel` is top-level sibling or nested under `bridge` |
| OQ-05 | Phase B sign-off on schema version strategy (stay `0.1.0` vs bump) |

## 9. Phase status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Inventory (this document) | **COMPLETED** |
| B | Type/schema design + version decision | PENDING |
| C | TypeScript + Zod + JSON Schema implementation | PENDING |
| D | Validator + parser/mapper updates | PENDING |
| E | Tests + typecheck/lint/build verification | PENDING |
| F | `final_report.txt` implementation completion | PENDING |

## 10. References

- `docs/apollo/ap-dx-01/implementation_freeze.md`
- `docs/apollo/phase1_design_expansion_refreeze/scope_and_architecture_freeze.md`
- `docs/apollo/phase1_design_expansion_refreeze/implementation_sequence.md`
- Baseline commit: `178768871545ab36aaea019916a492a051373496` — `docs(apollo): freeze AP-DX-01 contract implementation scope`
