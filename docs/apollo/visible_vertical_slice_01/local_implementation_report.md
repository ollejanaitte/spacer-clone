# Visible Vertical Slice 01 — Local Implementation Report

**Task:** AP-DX Visible Vertical Slice 01 — bridge structure input → StructuralDesignModel workflow  
**Phase:** B — Bridge structure workflow (Block B complete)  
**Date:** 2026-08-01  
**Branch:** `feat/ap-dx-visible-vertical-slice-01`  
**BSDD schema version:** `0.1.0` (no bump)  
**Migration:** None  
**Numeric design authorization:** NOT_GRANTED  

## 1. Executive summary

Block B delivers the first **user-driven** bridge structure workflow inside the existing Apollo Phase 1 shell:

1. Minimal **橋梁構造入力** panel with all required dimensional fields and nullable input state.
2. **構造を生成** generates a validating `BridgeSuperstructureDesignDocument` sidecar (`apolloBsdd`) with `structuralDesignModel`.
3. Entities: `MainGirder`, `RcDeck`, `CrossBeam` with deterministic stable UUIDs, `nonCompositeAssertion.compositeAction=false`, and `designStatus: NOT_AUTHORIZED` (never OK/NG).
4. Approximate geometry quantities (m³ / m² / counts) with `NOT_AUTHORIZED` / `INCOMPLETE` status — no mass from unit weight.
5. Save/reload round-trip via Apollo import/export and dirty fingerprint extension.

Block C (3D binding + pick panel) remains deferred.

| Assessment | Block B conclusion |
|------------|-------------------|
| BSDD schema bump | **NO** |
| New dependencies | **NO** |
| Backend / IF3 | **NO** |
| Apollo shell redesign | **NO** — panel added to basics + list editor |
| Block B verdict | **PASS** |

## 2. Commands run

```bash
cd /home/masaharu/Projects/spacer-clone/frontend && npm run typecheck
cd /home/masaharu/Projects/spacer-clone/frontend && npm test -- src/apollo
cd /home/masaharu/Projects/spacer-clone && git diff --check
```

| Command | Result |
|---------|--------|
| `npm run typecheck` | PASS |
| `npm test -- src/apollo` | 28 files, 189 tests PASS |
| `git diff --check` | (run at commit) |

## 3. Files changed (Block B)

### New

| Path | Role |
|------|------|
| `frontend/src/apollo/bridgeStructure/types.ts` | Input draft type, field definitions, quantity types |
| `frontend/src/apollo/bridgeStructure/stableIds.ts` | Deterministic UUID from SHA-256 seed |
| `frontend/src/apollo/bridgeStructure/validation.ts` | Input validation + persistence strictness |
| `frontend/src/apollo/bridgeStructure/quantities.ts` | Geometry-only approximate quantities |
| `frontend/src/apollo/bridgeStructure/generateBsdd.ts` | BSDD + SDM generation from input |
| `frontend/src/apollo/bridgeStructure/projectBsdd.ts` | Hydrate / serialize / fingerprint helpers |
| `frontend/src/apollo/bridgeStructure/index.ts` | Public barrel |
| `frontend/src/apollo/components/BridgeStructureInputPanel.tsx` | UI panel |
| `frontend/src/apollo/__tests__/bridgeStructureWorkflow.test.ts` | Generation + stable ID tests |

### Modified

| Path | Role |
|------|------|
| `frontend/src/types.ts` | `apolloBsdd`, `apolloBridgeStructureInput` on `ProjectModel` |
| `frontend/src/apollo/importExport.ts` | BSDD + input sidecar import/export |
| `frontend/src/apollo/dirtyFingerprint.ts` | Fingerprint includes BSDD binding subset |
| `frontend/src/apollo/ApolloPhase1Shell.tsx` | Panel in basics screen + list editor |
| `frontend/src/apollo/__tests__/importExport.test.ts` | BSDD round-trip + invalid import |
| `frontend/src/apollo/__tests__/apolloSuite.test.ts` | Test manifest |

## 4. Implementation design (Block B)

### 4.1 Project sidecar fields

```typescript
apolloBsdd?: BridgeSuperstructureDesignDocument;          // AP-DX-01 @ 0.1.0
apolloBridgeStructureInput?: ApolloBridgeStructureInputDraft; // schema 1.0.0
```

Input fields (all `number | null`, never coerced to 0):

- spanLength, bridgeLength, width, girderCount, girderSpacing, girderDepth
- topFlangeWidth, topFlangeThickness, bottomFlangeWidth, bottomFlangeThickness
- webThickness, deckThickness, crossBeamSpacing

### 4.2 Generation rules

- **Stable IDs:** `stableUuidFromSeed("apollo-vvs01:{projectId}:{entityKind}:{key}")` — regeneration preserves entity IDs.
- **Spans:** `spanCount = max(1, round(bridgeLength / spanLength))`, equal span lengths summing to bridge length.
- **Girder lines:** `girderCount` lines with symmetric offsets from centerline at `girderSpacing`.
- **Cross-beams:** `floor(bridgeLength / crossBeamSpacing) + 1` entities; `geometryRef` anchors to containing `spanId`.
- **Governed quantities:** user numerics as `PENDING` with values; deck/material unit weights `UNKNOWN` with `null` value.
- **Design status:** all SDM entities `NOT_AUTHORIZED`; `adoptionStatus: PENDING`; no OK/NG/WARNING/ERROR.
- **Non-composite:** `nonCompositeAssertion.compositeAction=false` on model; `compositeAction: false` on girders/decks.
- **Validation:** `validateBridgeSuperstructureDesignDocument` before attach; import re-parses via `parseBridgeSuperstructureDesignDocumentValue`.

### 4.3 UI integration

- `BridgeStructureInputPanel` in guided **基本情報** screen and list-mode editor column.
- `data-testid="apollo-bridge-structure-panel"`, `apollo-generate-structure`, per-field `apollo-bridge-input-*`.
- Quantity table shows `NOT_AUTHORIZED` / `INCOMPLETE`; SDM summary lists entity counts and statuses.

### 4.4 Persistence

- Export: `serializeApolloBsddForPersistence` → unit-2 serialize → project JSON.
- Import: strict input validation → unit-2 hydrate → BSDD hydrate (fail-closed on invalid BSDD).
- Dirty fingerprint: `apolloBsddBinding` subset (model IDs, geometry refs, design statuses, input draft).

## 5. Risks carried into Block C

| Risk | Severity | Notes |
|------|----------|-------|
| Cross-beam `geometryRef` uses span anchor, not transverse station | Medium | Block C binding resolver must document span-index convention |
| No 3D solid ↔ entity binding yet | Expected | Visualization builder unchanged; Block C scope |
| Unit-2 topology vs generated girder count may diverge | Medium | Sample 200 m bridge still uses unit-2 topology; structure input is parallel state |
| Quantity formulas are simplified geometry | Low | Explicitly NOT_AUTHORIZED; no structural authority |
| Dual panel in basics + list mode | Low | Same component; acceptable for Block B minimal slice |

## 6. Block C preview (not implemented)

- Extend `ApolloSolidGeometryParameter` with `designEntityId` / `designEntityKind`
- `designEntityBinding.ts` resolver + stale/unbound warnings
- `apollo-design-entity-panel` on 3D pick
- Extend `ApolloVisualizationRenderer` `userData`

## 7. Verdict fields

| Field | Verdict |
|-------|---------|
| VVS_01_BLOCK_B_IMPLEMENTATION_VERDICT | PASS |
| VVS_01_SCHEMA_VERSION_DECISION | REMAIN_0_1_0 |
| VVS_01_MIGRATION_DECISION | NONE_REQUIRED |
| VVS_01_NUMERIC_AUTHORIZATION | NOT_GRANTED |
| VVS_01_OVERALL_BLOCK_B_VERDICT | PASS — ready for Block C |

## 8. References

- `docs/apollo/ap-dx-01/local_implementation_report.md`
- `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`
- Block A inventory in prior revision of this report (architecture baseline unchanged)
