# 03 — Workflow Control Design

## Manual principles adopted (not UI copy)

From user-provided SuperDesigner control-screen extract:

| Legacy cue | Modern mapping (status + badges, not color-only) |
|------------|--------------------------------------------------|
| Black text + blue sides “recommended” | `RECOMMENDED` + primary CTA + aria-label |
| Black text “available” | `AVAILABLE` / `READY` |
| Gray text “impossible” | `BLOCKED` / `NOT_STARTED` with **reason** |
| Process chain with arrows | Dependency graph + ordered cards |

**Rejected:** pixel/color/icon copyright copy; implying formal design approval via green “complete”.

**MANUAL_SOURCE_ACCESS:** `LIMITED_TO_USER_PROVIDED_EXTRACT`

## Workflow steps (frozen IDs)

| ID | Label | Group | Navigation target (existing or new) |
|----|-------|-------|-------------------------------------|
| WF-01 | 道路線形 | geometry | Liner / binding panel |
| WF-02 | 橋梁基本条件 | geometry | BridgeStructureInputPanel |
| WF-03 | 床版・橋面付属物 | geometry | New appurtenance panel |
| WF-04 | 主桁断面 | geometry | Existing section inputs |
| WF-05 | ハンチ | geometry | New haunch panel |
| WF-06 | 添接・フィラー | geometry | New splice panel |
| WF-07 | 荷重 | loads | Load confirmation |
| WF-08 | 構造解析 | analysis | AnalysisDevelopmentProbePanel |
| WF-09 | 候補照査 | analysis | DemandCheckDevelopmentPanel |
| WF-10 | 数量 | outputs | QuantityModelDevelopmentPanel |
| WF-11 | 3D確認 | outputs | Model view + dimension controls |
| WF-12 | 計算書 | outputs | ReportModelDevelopmentPanel |
| WF-13 | 図面 | outputs | Drawing / GA panels |
| WF-14 | 成果品出力 | outputs | OutputIntegrationPanel |
| WF-15 | ユーザー確認 | governance | Checklist (human) |

## Status model

```
NOT_STARTED | AVAILABLE | RECOMMENDED | INCOMPLETE | BLOCKED |
READY | STALE | WARNING | ERROR | COMPLETE | NOT_AUTHORIZED | OUT_OF_SCOPE
```

**Priority (highest wins for primary badge):**
ERROR > BLOCKED > STALE > INCOMPLETE > WARNING > NOT_AUTHORIZED > RECOMMENDED > AVAILABLE > READY > COMPLETE > NOT_STARTED > OUT_OF_SCOPE

**Simultaneous expression:** primary `status` + badges array (e.g. `COMPLETE` + badge `NOT_AUTHORIZED` for development completion without formal grant).

**Derived vs persisted:** step completion criteria and STALE are **recomputed** from current checksums; optional `userAcknowledgedAt` may persist for WF-15 only.

**Manual override:** not allowed to clear ERROR/BLOCKED/STALE; may dismiss non-blocking WARNING.

## Recommended action logic

1. Find first step in order where status ∈ {AVAILABLE, RECOMMENDED, INCOMPLETE, STALE} and not BLOCKED/OUT_OF_SCOPE.
2. Prefer STALE regeneration of upstream producer before downstream exports.
3. Never recommend formal authorization actions.

## State diagrams

See `diagrams/workflow_dependency.mmd` and `diagrams/workflow_state.mmd`.
