APOLLO_3D_STEP4_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_STEP5_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_STEP6_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_STL_STEP7_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_STEP8_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_STEP4_TO_STEP8_TRACEABILITY_VERDICT: PASS
APOLLO_3D_STEP4_TO_STEP8_SCOPE_GUARD_VERDICT: PASS
APOLLO_3D_STEP4_TO_STEP8_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS
APOLLO_3D_PRODUCTION_IMPLEMENTATION_VERDICT: NOT_STARTED
RECOMMENDED_NEXT_STEP: IMPLEMENTATION_PR_1_CONTRACT_TYPES_AND_DERIVED_BUILDER
OVERALL_VERDICT: COMPLETE_WITH_GAPS

# 12. Step 4〜Step 8 Design Readiness Gate

## 1. 目的

本書は、Step 4〜Step 8 の設計成果が Step 0〜Step 3 と矛盾せず、複数の安全な Implementation PR を直ちに開始できる状態かを最終監査する。

## 2. 統合監査結果

- `PASS`: Step 0〜Step 3 の derived/read-only 方針と整合
- `PASS`: Step 4 PoC-A は line-model viewer の範囲に限定され、SoR を汚染しない
- `PASS`: Step 5 は selection 正本を Apollo UI に固定し、viewer selection を derived に維持
- `PASS`: Step 6 は BridgeDefinition の位置情報と PoC defaults provider を分離
- `PASS`: Step 7 は package 追加なしで Binary STL 契約を定義
- `PASS`: Step 8 は Apollo JSON persistence と export artifact を分離

## 3. 責務境界の再確認

```text
Apollo設計正本
  ProjectModel
  project.apolloPhase1Unit2
  BridgeDefinition or future sidecar
        ↓ read-only projection
ApolloVisualizationModel
        ├─ PoC-A line model
        ├─ selection / validation highlight
        ├─ PoC-B simple solids
        ├─ Binary STL export
        └─ browser / Electron save flow
```

禁止方向:

- Three.js mesh -> Apollo設計正本
- STL -> Apollo設計正本
- camera/visibility/session state -> Apollo設計正本

## 4. 主要整合判定

| 観点 | 判定 | 根拠 |
|---|---|---|
| Visualization Contract 整合 | `PASS` | `01_visualization_contract_freeze.md` と Step 4〜8 が derived model 前提を維持 |
| Data Ownership 整合 | `PASS` | `02_data_ownership_freeze.md` と Step 6 defaults provider 境界が一致 |
| PoC-A / PoC-B 境界 | `PASS` | line-model と solid-model の責務を分離 |
| selection / validation ownership | `PASS` | Step 5 で正本 owner を UI state に固定 |
| display / STL 共通 geometry params | `PASS` | Step 6 と Step 7 が共通 parameter source を前提 |
| unit / axis / origin | `PASS` | X longitudinal / Y transverse / Z up、display m / export mm で一貫 |
| persistence / derived separation | `PASS` | Step 8 で generated mesh/STL bytes 保存禁止 |
| Electron security boundary | `PASS` | renderer 直 filesystem access を禁止 |

## 5. blocking / non-blocking

### 5.1 BLOCKING_FOR_IMPLEMENTATION

- duplicate source IDs が unresolved のまま実装に入ること
- VisualizationModel builder が deterministic sort を持たないこと
- Binary STL save を text-only path に無理に流すこと

### 5.2 NON_BLOCKING_FOR_IMPLEMENTATION

- bracing 正式 SoR 不在
- bearing 寸法の PoC 仮定
- camera/visibility persistence の deferred
- non-manifold 完全検査の deferred

## 6. 実装PR再確定

### Implementation PR-1

- 目的: contract types + derived builder
- exact scope:
  - visualization types
  - line-model builder
  - solid geometry parameter builder skeleton
- forbidden scope:
  - viewer UI sync
  - export save flow
- dependency: none
- tests:
  - contract schema
  - deterministic mapping
  - coordinate/unit conversion
- completion gate:
  - derived model が docs 契約と一致

### Implementation PR-2

- 目的: PoC-A line model viewer
- exact scope:
  - node/member/support/label
  - camera preset
  - fit / rebuild lifecycle
- forbidden scope:
  - solid geometry
  - STL export
- dependency: PR-1

### Implementation PR-3

- 目的: selection + validation integration
- exact scope:
  - table -> 3D
  - 3D -> table
  - validation highlight
- forbidden scope:
  - persistence schema change
- dependency: PR-2

### Implementation PR-4

- 目的: simple bridge solids
- exact scope:
  - girder
  - cross beam
  - bracing
  - deck
  - bearing
  - markers
- forbidden scope:
  - SoR schema change without separate freeze
- dependency: PR-1

### Implementation PR-5

- 目的: Binary STL + manifest
- exact scope:
  - JSCAD binary export
  - manifest builder
  - quality checks
- forbidden scope:
  - Electron persistence changes beyond export path
- dependency: PR-4

### Implementation PR-6

- 目的: browser / Electron save + reload integration
- exact scope:
  - binary save bridge
  - sequential STL + manifest save
  - Apollo reload reproducibility hooks
- forbidden scope:
  - import fail-closed 緩和
- dependency: PR-5

### Implementation PR-7

- 目的: integration tests + performance + docs + completion
- exact scope:
  - regression tests
  - completion gate update
  - final docs
- forbidden scope:
  - unrelated viewer/Electron feature
- dependency: PR-2〜PR-6

## 7. 実装開始条件

- Step 0〜Step 8 docs が `origin/main` に存在
- README が正式入口として更新済み
- traceability matrix が作成済み
- final completion gate が参照可能
- production 実装はまだ `NOT_STARTED`

## 8. 結論

- `APOLLO_3D_STEP4_TO_STEP8_TRACEABILITY_VERDICT: PASS`
- `APOLLO_3D_STEP4_TO_STEP8_SCOPE_GUARD_VERDICT: PASS`
- `APOLLO_3D_STEP4_TO_STEP8_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS`
- `APOLLO_3D_PRODUCTION_IMPLEMENTATION_VERDICT: NOT_STARTED`

Step 4〜Step 8 は、PoC 仮定値を残しつつも、実装不足や資料不足を明示した状態で Implementation PR-1 を安全に開始できる。
