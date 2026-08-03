# 03 — Current Sample Audit

## Entry points (CODE_CONFIRMED)

| Sample | Function | Auto-generate? |
|--------|----------|----------------|
| Simple single-span | `applySimpleSingleSpanSampleInput` | NO — sets `generatedAt: null` |
| Continuous [30,35,30] | `applyContinuousGirderSampleInput` | NO — sets `generatedAt: null` |
| Clear | `clearBridgeStructureInput` | N/A |

Disclaimer strings mark values as verification-only, not design-adopted.

## SIMPLE_SINGLE_SPAN_SAMPLE_INPUT content (CODE_CONFIRMED)

Filled: span/bridge length 30 m, width 10.5, 4 girders @ 3.0 m, I-section dims, deck 0.22 m, crossBeamSpacing 5.0, stiffenerSpacing 2.5, swayBracingInterval 1, steel/rc unit weights, `lateralBracingEnabled: false`, `upperLateralBracingEnabled: false`, `bridgeSystem: SIMPLE_SINGLE`.

**Not filled by sample apply:**

| Domain | Sample status |
|--------|---------------|
| Appurtenance slots | Remain default `NOT_PROVIDED` from empty draft |
| Haunch girders | Remain default empty/`NOT_PROVIDED` path |
| Pavement thickness/width | No canonical fields — quantity emits NOT_AVAILABLE |
| Road markings | No Apollo canonical model |
| Road alignment binding | WF-01 PLANNED (Step 4-E); sample does not bind LINER |
| Upper/lower lateral | Explicitly disabled flags |

## Apply transaction (CODE_CONFIRMED)

1. User selects sample in shell → `applySimpleSingleSpanSampleInput` / continuous variant  
2. Draft overwritten; `generatedAt = null` → STALE until 「構造を生成」  
3. No automatic BSDD/solid/quantity/load/analysis generation  

Test fixture `fillSimpleSingleBridgeStructureInput` additionally forces appurtenance/haunch `EXPLICIT_NONE` for workflow tests — **not** the same as UI sample apply.

## Editable / save / reload

| Path | Status |
|------|--------|
| Bridge structure panel fields | Editable after sample (CODE_CONFIRMED) |
| Appurtenance / haunch panels | Editable; presence must be decided for WF-03/05 |
| Guided shell steps | Coarse `GuidedStep` only — not 1-theme Workflow slides |
| Persistence | Project save/reload via existing Apollo import/export; checksum STALE rules from Step 4 |

## Gap summary

Sample alone does **not** produce COMPLETE WF-03/05, pavement, markings, laterals, or auto 3D. User must generate structure and decide appurtenance/haunch presence. This is the primary gap vs REQ-S5-001/003.
