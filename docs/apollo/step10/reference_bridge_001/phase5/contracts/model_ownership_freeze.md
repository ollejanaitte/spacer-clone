# Model Ownership Freeze — Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 PR P5-4

## Ownership assignments

| Concept | Canonical owner | Location |
|---------|-----------------|----------|
| Canonical JSON Schema | contract pipeline (zod runtime) | `schemas/contracts/v0.1/common-bridge-data-model.schema.json` (generated from `frontend/src/contracts/runtime/schemas/commonBridgeDataModel.ts`) |
| Canonical TypeScript types | `frontend/src/contracts/commonBridgeDataModel.ts` (re-export of runtime z.infer) | `frontend/src/contracts/commonBridgeDataModel.ts` |
| Serialization / canonicalization / round-trip / fingerprint | STEP 10 phase5 Python library | `docs/apollo/step10/reference_bridge_001/phase5/tools/common_model.py` |
| Golden adapter (Golden -> Common) | STEP 10 phase5 tooling | `docs/apollo/step10/reference_bridge_001/phase5/tools/build_common_model_fixture.py` + `cbdm_mapping.py` |
| Reference fixture (RB-S10-001) | STEP 10 phase5 tooling (generated, not hand-edited) | `docs/apollo/step10/reference_bridge_001/phase5/fixtures/` |
| LINER interface boundary | `frontend/src/liner/**` (existing owners) | adapter required; no ownership change |
| SPACER / frame model interface boundary | `backend/engine/model.py`, `frontend/src/types.ts` (existing owners) | adapter required; no ownership change |
| Substructure interface boundary | `schemas/substructure/**`, `substructure-planning/**` (existing owners) | adapter required; no ownership change |
| Apollo design interface boundary | `frontend/src/bridgeDefinition/**`, `frontend/src/apollo/**` (existing owners) | adapter required; no ownership change |
| Report / drawing interface boundary | `frontend/src/apollo/report/**`, `frontend/src/apollo/drawing/**` (existing owners) | CBDM report/drawingSpecification layers are specification containers, not renderers |

## Rules

1. **Single owner per concept.** No duplicate ownership: a concept must have exactly
   one canonical owner listed above. Duplicate model ownership is forbidden.
2. The CBDM contract does not claim ownership of LINER/SPACER/substructure/Apollo
   runtime models; it references them via adapters.
3. The Reference fixture is **generated** by the adapter; hand-editing the fixture
   is disallowed (regenerate via the adapter instead).
4. Changes to the canonical schema/types must go through the contract pipeline
   (zod runtime -> JSON Schema -> drift test) and be recorded in the artifact
   manifest.
5. No new dependency is introduced; the Python adapter uses the stdlib +
   already-available `jsonschema` (Python) and existing frontend zod.
