APOLLO_3D_IMPLEMENTATION_PLAN_VERDICT: FROZEN
APOLLO_3D_CHANGE_SCOPE_VERDICT: FROZEN
APOLLO_3D_TEST_PLAN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_RISK_GUARD_VERDICT: PASS
APOLLO_3D_GITHUB_PLAN_VERDICT: PASS
APOLLO_3D_STEP0_TO_STEP3_COMPLETION_VERDICT: COMPLETE
RECOMMENDED_NEXT_STEP: IMPLEMENTATION_PR_1_CONTRACT_AND_BUILDER
OVERALL_VERDICT: COMPLETE_WITH_GAPS

# Apollo Phase 1 3D/STL 実装計画・変更範囲 Freeze

## 1. Executive Summary

- Step 0 で P0 調査入口を確定し、Step 1 で derived visualization contract を凍結し、Step 2 で data ownership を凍結した。
- Step 3 では、本実装を始める前に implementation phase、変更範囲、禁止範囲、PR 分割、test plan、risk plan を固定する。
- 本文書は実装開始許可のための設計凍結であり、本実装完了を意味しない。

## 2. Implementation Architecture

```text
ProjectModel / apolloPhase1Unit2 / BridgeDefinition
  -> visualization builder
  -> ApolloVisualizationModel
  -> viewer adapters / selection adapters / validation adapters
  -> STL exporter + companion manifest
```

- `FROZEN`: contract と builder は `frontend/src/apollo/visualization/*` に閉じる。
- `FROZEN`: exporter は `frontend/src/apollo/export/*` に閉じる。
- `FROZEN`: `Viewer3D` 既存責務を壊さず、Apollo 側 adapter を追加する。

## 3. Phase Plan

### Phase A: Visualization Contract実装

- 目的: Step 1 契約の type / builder skeleton / conversion rule をコード化する。
- 変更対象:
  - `frontend/src/apollo/visualization/*`
  - `frontend/src/apollo/__tests__/*`
- 完了条件:
  - contract type 定義
  - builder interface
  - coordinate/unit conversion
  - deterministic ordering tests

### Phase B: PoC-A line model

- 目的: node/member/support/label を ApolloVisualizationModel から line-model 表示する。
- 変更対象:
  - `frontend/src/apollo/visualization/*`
  - `frontend/src/apollo/components/*`
  - `frontend/src/viewer/*`
- 完了条件:
  - node/member/support labels
  - existing viewer integration
  - camera presets
  - read-only selection

### Phase C: Apollo連動

- 目的: table selection、3D selection、Validation Navigator を同期する。
- 完了条件:
  - table selection -> 3D
  - 3D selection -> table focus
  - Validation Navigator -> 3D highlight
  - visibility state は UI-only のまま

### Phase D: PoC-B simple bridge solids

- 目的: girder/cross beam/deck/bearing/pier/abutment の簡易 solid を導入する。
- 完了条件:
  - Step 2 ownership に反しない geometry source
  - missing geometry の warning
  - fallback からの degrade path

### Phase E: STL export

- 目的: Binary STL + companion Apollo JSON manifest を出力する。
- 完了条件:
  - serializer 実装
  - unit conversion `m -> mm`
  - origin policy
  - visible-only option
  - quality tests

### Phase F: Electron・品質・GitHub完了

- 目的: browser download / Electron save dialog / regression / docs completion を固める。
- 完了条件:
  - save dialog
  - browser download
  - Electron smoke
  - performance gate
  - completion gate pass

## 4. File Scope

許容変更候補:

- `frontend/src/apollo/visualization/*`
- `frontend/src/apollo/export/*`
- `frontend/src/apollo/components/*`
- `frontend/src/viewer/*`
- `frontend/src/apollo/__tests__/*`
- `docs/apollo/3d-stl/*`

条件付き変更:

- `frontend/src/apollo/ApolloPhase1Shell.tsx`
  - 理由: selection / validation / export action の adapter 接続
- `frontend/src/apollo/selection.ts`
  - 理由: 3D selection binding 追加時の stable key 整理
- `frontend/src/apollo/validationNavigator.ts`
  - 理由: visualization target key 接続

## 5. Forbidden Scope

- Solver
- Numeric
- LINER 計算ロジック
- Backend
- unrelated migration
- existing Apollo Unit 3 editing behavior
- current import fail-closed behavior
- unrelated viewer features
- unrelated Electron security policy
- unrelated package upgrades

## 6. PR Plan

### Implementation PR-1: contract + builder skeleton

- 目的: contract/type/builder の最小実装
- 変更対象: `frontend/src/apollo/visualization/*`, tests
- 変更禁止: viewer UI overhaul, exporter, bridge solids
- test: contract unit tests, builder unit tests, coordinate tests
- entry gate: Step 0〜3 docs merged
- completion gate: deterministic mapping pass
- rollback: feature branch revert only
- dependency: none

### Implementation PR-2: PoC-A viewer

- 目的: line-model 表示接続
- 変更対象: Apollo adapter + viewer integration
- 変更禁止: bridge solid geometry
- test: node/member/support mapping, camera preset, fallback checks
- dependency: PR-1

### Implementation PR-3: selection + validation sync

- 目的: 2-way selection と validation highlight
- 変更対象: `ApolloPhase1Shell`, selection, validation adapter
- 変更禁止: export
- test: selection sync tests, validation highlight tests
- dependency: PR-2

### Implementation PR-4: simple bridge solids

- 目的: girder/deck/bearing/pier/abutment の simple solid
- 変更対象: visualization geometry builder
- 変更禁止: SoR 拡張 without ADR
- test: solid dimension tests, missing geometry warnings
- dependency: PR-1, Step 2 ownership

### Implementation PR-5: Binary STL + companion JSON

- 目的: export pipeline
- 変更対象: `frontend/src/apollo/export/*`
- 変更禁止: ProjectModel persistence schema change
- test: STL binary tests, bounding box tests, duplicate/zero-area checks
- dependency: PR-4

### Implementation PR-6: Electron + integration + docs + completion gate

- 目的: integration hardening
- 変更対象: Electron wiring, docs, gate
- 変更禁止: unrelated desktop policy changes
- test: Electron smoke, browser download, Unit 3 regression
- dependency: PR-2 to PR-5

## 7. Test Plan

- contract unit tests
- builder unit tests
- coordinate tests
- unit conversion tests
- deterministic generation tests
- node/member/support mapping tests
- selection sync tests
- validation highlight tests
- solid dimension tests
- STL binary tests
- bounding box tests
- manifold/duplicate/zero-area checks
- save/reload reproducibility
- Electron smoke
- browser download
- Unit 3 regression
- performance thresholds

`PROVISIONAL_THRESHOLD`:

- visualization build: sample bridge 1件あたり 200ms 未満を暫定 gate
- STL export: sample bridge 1件あたり 3s 未満を暫定 gate
- viewer interaction: selection response 100ms 未満を暫定 gate

## 8. Risk Plan

停止条件:

- SoR 不一致で source ownership を説明できない
- axis / unit mismatch により deterministic export が壊れる
- current Unit 3 regression が発生する
- package 追加が必須だが代替策がない

警告条件:

- missing bridge geometry により simple solid が省略される
- viewer state 混入の兆候
- Electron GPU で fallback 2D 依存になる
- performance threshold 超過
- scope creep

## 9. GitHub Plan

- PR は常に `origin/main` から分岐
- docs / implementation PR を混在させない
- squash merge を第一候補とする
- 各 PR で `git diff --check` を必須化
- checks 未設定時はその事実を report に記録する

## 10. Completion Gate

- 詳細 gate は `04_completion_gate.md` を正本とする。
- risk register は `05_risk_register.md`
- test plan 補助は `06_test_plan.md`

## 11. 次の実装工程へ渡す情報

- current authoritative SoR:
  - `ProjectModel`
  - `project.apolloPhase1Unit2`
- provisional intermediate:
  - `BridgeDefinition`
- prohibited reverse flow:
  - mesh/STL/UI state -> design SoR
- implementation first step:
  - `IMPLEMENTATION_PR_1_CONTRACT_AND_BUILDER`

