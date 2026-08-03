# Workflow Registry (WF-01..WF-15)

Frozen IDs and order. Change requires a P0 design refreeze
(`docs/apollo/step4_scope_design_refreeze/03_workflow_control_design.md`).
Implementation: `frontend/src/apollo/workflow/registry.ts` +
`capabilityRegistry.ts`. Shape guard: `assertWorkflowRegistryShape()`.

## Steps

| ID | Label | Group | Prerequisites | Capability | Primary action | Completion criterion |
|----|-------|-------|---------------|------------|----------------|----------------------|
| WF-01 | 道路線形 | geometry | – | PLANNED (Step 4-E) | open-step | alignment binding 成立 (Step 4-E) |
| WF-02 | 橋梁基本条件 | geometry | WF-01 | IMPLEMENTED | generate-structure | 入力 valid + 構造生成 current |
| WF-03 | 床版・橋面付属物 | geometry | WF-02 | PLANNED (Step 4-B) | none | 付属物 canonical input (Step 4-B) |
| WF-04 | 主桁断面 | geometry | WF-02 | IMPLEMENTED | generate-structure | 断面入力 valid + 構造生成 current |
| WF-05 | ハンチ | geometry | WF-04 | PLANNED (Step 4-B) | none | ハンチ canonical input (Step 4-B) |
| WF-06 | 添接・フィラー | geometry | WF-04 | PLANNED (Step 4-D) | none | 添接 canonical input (Step 4-D) |
| WF-07 | 荷重 | loads | WF-03, WF-05, WF-06 | PARTIAL | open-step | 荷重 input valid + 構造生成 current |
| WF-08 | 構造解析 | analysis | WF-07 | PARTIAL | run-analysis | current 入力に対する解析結果あり |
| WF-09 | 候補照査 | analysis | WF-08 | PARTIAL | open-step | current 解析結果に基づく候補照査あり |
| WF-10 | 数量 | outputs | WF-03, WF-04, WF-05, WF-06 | IMPLEMENTED | regenerate | quantity model current |
| WF-11 | 3D確認 | outputs | WF-08 | IMPLEMENTED | review-3d | 3D build ok (dimension 別) |
| WF-12 | 計算書 | outputs | WF-10 | IMPLEMENTED | regenerate | report model current |
| WF-13 | 図面 | outputs | WF-10 | IMPLEMENTED | regenerate | drawing set current + sheets>=7 |
| WF-14 | 成果品出力 | outputs | WF-12, WF-13 | IMPLEMENTED | export | integrated outputs current + PASS |
| WF-15 | ユーザー確認 | governance | WF-14 | IMPLEMENTED | open-checklist | human acknowledgment (checksum bound) |

## Dependency edges (frozen)

```
WF-01 -> WF-02 -> {WF-03, WF-04}
WF-04 -> {WF-05, WF-06}
{WF-03, WF-05, WF-06} -> WF-07 -> WF-08 -> WF-09
{WF-03, WF-04, WF-05, WF-06} -> WF-10 -> {WF-12, WF-13}
WF-08 -> WF-11
{WF-12, WF-13} -> WF-14 -> WF-15
```

Guard: `assertNoDependencyCycles()` + `assertEdgesMatchRegistry()`.

## Capability registry

`WORKFLOW_CAPABILITIES` (15 keys):

| Key | Status | Implemented in |
|-----|--------|----------------|
| alignment-binding | PLANNED | Step 4-E |
| appurtenance-input | PLANNED | Step 4-B |
| haunch-input | PLANNED | Step 4-B |
| splice-input | PLANNED | Step 4-D |
| load-confirmation | PARTIAL | – |
| analysis | PARTIAL | – |
| demand-check | PARTIAL | – |
| bridge-structure-input | IMPLEMENTED | – |
| section-input | IMPLEMENTED | – |
| quantity-model | IMPLEMENTED | – |
| model-view | IMPLEMENTED | – |
| report-model | IMPLEMENTED | – |
| drawing-set | IMPLEMENTED | – |
| output-integration | IMPLEMENTED | – |
| user-acknowledgment | IMPLEMENTED | – |

`gatingGuard` for alignment-binding is `PENDING_FUTURE_STEP` while
`BINDING_PREREQUISITE_GUARD = "PENDING_STEP_4E"` in `dependencies.ts`, which
excludes the PLANNED WF-01 from **active** prerequisites so downstream steps are
not unconditionally blocked.
