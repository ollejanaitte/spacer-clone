# 01 — Current Capability Inventory

**Classification legend:**
`IMPLEMENTED_AND_INTEGRATED` | `IMPLEMENTED_PARTIAL` | `DATA_SLOT_ONLY` | `UI_ONLY` | `VISUALIZATION_ASSUMPTION` | `DOCUMENTED_NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | `UNKNOWN_REQUIRES_HUMAN_CONFIRMATION`

**Baseline SHA:** `6676781fb00bc2db00d16422258c621b72a91f9b`
**MANUAL_SOURCE_ACCESS:** `LIMITED_TO_USER_PROVIDED_EXTRACT` (no SuperDesigner PDF copied into repo)

---

## A. Design workflow

| Item | Status | Evidence | Gap |
|------|--------|----------|-----|
| Guided Apollo shell steps | IMPLEMENTED_PARTIAL | `ApolloPhase1Shell.tsx` `StepKey` = start/basics/nodes/members/supportsMaterials/validation | Not SuperDesigner-style engineering workflow; no STALE/checksum-aware step graph |
| Prerequisite / recommended action engine | NOT_IMPLEMENTED | — | No `WorkflowStateModel` |
| Cross-module artifact status UI | IMPLEMENTED_PARTIAL | `OutputIntegrationPanel.tsx`, `outputIntegration.ts` | Deliverable-centric, not design-process workflow |
| Authorization display | IMPLEMENTED_AND_INTEGRATED | Panels + models `NOT_GRANTED` | Must preserve; workflow must not imply formal OK |

---

## B. Bridge deck appurtenances

| Item | Status | Evidence | Gap |
|------|--------|----------|-----|
| Pavement quantity slot | IMPLEMENTED_PARTIAL | `quantityModel.ts` `QTY-PV-VOL` → `NOT_AVAILABLE` without thickness/width | No curb/railing/median inputs |
| Curb / railing / median entities | NOT_IMPLEMENTED | Drawing warning: `pavement/curb/railing: NOT_AVAILABLE` in `drawingModel.ts` | No canonical input fields |
| Appurtenance 3D solids | NOT_IMPLEMENTED | `bridgeStructureSolids.ts` deck/girder/bracing only | — |
| Appurtenance drawings | NOT_IMPLEMENTED | G-01..G-07 have no curb/barrier views | — |

---

## C. RC deck haunch

| Item | Status | Evidence | Gap |
|------|--------|----------|-----|
| BSSD `Haunch` contract | DATA_SLOT_ONLY | `bridgeSuperstructureDesignDocument.ts` `interface Haunch` (`haunchId`, `mainGirderRefId`) | No geometry fields |
| Generation | DATA_SLOT_ONLY | `generateBsdd.ts` always `haunches: []` | Empty array forever |
| Input / UI / quantity / load / drawing / 3D | NOT_IMPLEMENTED | No `haunch*` in `BRIDGE_STRUCTURE_INPUT_FIELD_KEYS` | — |
| Phase1 freeze mention | DOCUMENTED_NOT_IMPLEMENTED | `phase1_design_expansion_refreeze/scope_and_architecture_freeze.md` §2.1 lists ハンチ | Not implemented in Step 1–3 |

---

## D. Splice / filler / bolts

| Item | Status | Evidence | Gap |
|------|--------|----------|-----|
| BSSD `Splice` contract | DATA_SLOT_ONLY | `interface Splice` (`spliceId`, `mainGirderRefId`) | No plates/bolts |
| Generation | DATA_SLOT_ONLY | `generateBsdd.ts` `splices: []` | — |
| Drawing disclosure | IMPLEMENTED_PARTIAL | G-06 labels `SPLICE LOCATIONS NOT PROVIDED` | Fail-closed, no input path |
| Filler / flange/web splice plates / bolt patterns | NOT_IMPLEMENTED | — | — |
| Viz binding count | DATA_SLOT_ONLY | `designEntityBinding.ts` counts `model.splices.length` | Always 0 |

---

## E. Road alignment compatibility

| Item | Status | Evidence | Gap |
|------|--------|----------|-----|
| Ownership decision | DOCUMENTED_NOT_IMPLEMENTED | `step1/.../road_to_apollo_interface.md` DEC-S1-0008: Road is geometric SoR | Transfer package not E2E operational |
| LINER alignment model | IMPLEMENTED_PARTIAL | `frontend/src/liner/schema/types.ts` `alignmentId`, drafts | Separate product surface from Apollo bridge input |
| Apollo `AlignmentBridgeBindingModel` | NOT_IMPLEMENTED | No binding type in Apollo bridgeStructure | Bridge uses local length/width only |
| Station/CRS shared transform | NOT_IMPLEMENTED | Apollo plan X = local station 0..L | No road station binding checksum |

---

## F. 3D dimensions

| Item | Status | Evidence | Gap |
|------|--------|----------|-----|
| Drawing dimensions (2D semantic) | IMPLEMENTED_AND_INTEGRATED | DrawingModel / DrawingSetModel DIMENSION entities | Not 3D overlay |
| Three.js dimension overlay / CSS2D labels | NOT_IMPLEMENTED | No CSS2D/measure tooling under `apollo/visualization` | — |
| 2-point measurement | NOT_IMPLEMENTED | — | — |
| Mesh-derived dimensions as design truth | Explicitly prohibited by Step 3 rules | — | Must remain prohibited |

---

## G. Downstream consumers (Step 1–3)

| Consumer | Status vs R1–R8 |
|----------|-----------------|
| 3D / STL | IMPLEMENTED_AND_INTEGRATED for girders/deck/bracing; no haunch/appurtenance/splice geometry |
| Analysis / demand | IMPLEMENTED_PARTIAL (development probes) |
| Quantity / report / drawings / member schedule / ZIP | IMPLEMENTED_AND_INTEGRATED for Step 3 scope; will need extension for R2–R7 |
| STALE / revision / checksum | IMPLEMENTED_AND_INTEGRATED | Must remain SoR for workflow |

---

## Schema versions (confirmed)

| Model | Version |
|-------|---------|
| ApolloBridgeStructureInputDraft | `1.0.0` |
| DrawingModel | `1.0.0-development` |
| DrawingSetModel | `1.0.0-development` |
| QuantityModel | `1.0.0-development` |
| ReportModel | `1.0.0-development` |
| MemberScheduleModel | `1.0.0-development` |
| LINER project metadata | see `PROJECT_LINER_METADATA_SCHEMA_VERSION` in liner schema |
| BSSD Haunch/Splice | contract present; **empty arrays at generation** |

## PRE-FLIGHT snapshot

```
WORKING_PATH: /home/masaharu/Projects/spacer-clone
REMOTE_URL: https://github.com/ollejanaitte/spacer-clone.git
START_LOCAL_MAIN_SHA: 6676781fb00bc2db00d16422258c621b72a91f9b
START_ORIGIN_MAIN_SHA: 6676781fb00bc2db00d16422258c621b72a91f9b
LOCAL_EQUALS_ORIGIN: YES
WORKTREE_CLEAN: YES
PR308_TO_318_MERGED: YES
PR318_MERGE_SHA: 6676781fb00bc2db00d16422258c621b72a91f9b
MANUAL_SOURCE_ACCESS: LIMITED_TO_USER_PROVIDED_EXTRACT
CURRENT_WORKFLOW_IMPLEMENTATION: IMPLEMENTED_PARTIAL (guided shell only)
CURRENT_HAUNCH_IMPLEMENTATION: DATA_SLOT_ONLY (haunches: [])
CURRENT_SPLICE_IMPLEMENTATION: DATA_SLOT_ONLY (splices: [])
CURRENT_APPURTENANCE_IMPLEMENTATION: NOT_IMPLEMENTED (pavement slot only)
CURRENT_3D_DIMENSION_IMPLEMENTATION: NOT_IMPLEMENTED
```
