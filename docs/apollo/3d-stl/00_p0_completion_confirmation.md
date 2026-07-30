APOLLO_3D_P0_VERDICT: COMPLETE_WITH_GAPS
APOLLO_3D_IMPLEMENTATION_ENTRY: GO_WITH_CONDITIONS
APOLLO_P0_EVIDENCE_VERDICT: COMPLETE_WITH_GAPS
APOLLO_P0_SCOPE_GUARD_VERDICT: PASS
RECOMMENDED_NEXT_STEP: STEP1_VISUALIZATION_CONTRACT_FREEZE

# Apollo Phase 1 3D表示・STL出力 Step 0 P0調査完了確認

## 1. 目的

- 本文書は、Apollo Phase 1 の 3D表示および STL出力について、既存 P0 調査が Step 1 の入口として再利用可能かを確認するための Step 0 完了確認である。
- 本文書は新規実装の許可ではなく、現行リポジトリ実装と既存資料を優先した設計入口の確認である。

## 2. 判定サマリ

- `CONFIRMED`: 既存 `Viewer3D` と fallback 2D は Apollo Unit 2 で再利用実績がある。
- `CONFIRMED`: `frontend/src/liner/exports/linerFrameStl.ts` に ASCII STL 生成資産がある。
- `CONFIRMED`: 解析シミュレーション本体、solver、numeric authority は今回の対象外である。
- `PROVISIONAL`: Apollo 固有の 3D/STL Step 0 成果物は既存 docs に見当たらず、本書がその欠落を補う入口文書となる。
- `PROVISIONAL`: Step 1 では Apollo 正本と Three.js/STL の責務分離を先に凍結する必要がある。

## 3. 調査済み範囲

- 実装:
  - `frontend/src/apollo/ApolloPhase1Shell.tsx`
  - `frontend/src/apollo/unit2Draft.ts`
  - `frontend/src/apollo/selection.ts`
  - `frontend/src/apollo/validationNavigator.ts`
  - `frontend/src/viewer/*`
  - `frontend/src/liner/exports/linerFrameStl.ts`
  - `frontend/src/bridgeDefinition/*`
  - `frontend/src/types.ts`
  - `desktop/electron/*`
- 既存資料:
  - `docs/frame/viewer/09_3d_view_spec.md`
  - `docs/apollo/phase1-orchestration/unit2/00_scope/unit2_scope_freeze.md`
  - `docs/apollo/phase1-orchestration/unit2/final_phase1_nn_unit2_report.md`
  - `docs/apollo/phase1-orchestration/unit3/00_scope/unit3_scope_freeze.md`
  - `docs/apollo/step1/03_existing_capability/existing_capability_inventory.md`
  - `docs/apollo/step1/03_existing_capability/existing_capability_matrix.csv`
  - `docs/apollo/step1/06_architecture/architecture_decisions.md`
  - `docs/apollo/post-ea-01/phase1_gate/phase1_scope_matrix.csv`
  - `docs/apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/*`

## 4. current repository implementation 優先の原則

- `CONFIRMED`: Apollo の現行実装上の正本は `ProjectModel` と、必要に応じて `project.apolloPhase1Unit2` sidecar である。`frontend/src/types.ts`
- `CONFIRMED`: `BridgeDefinition` は upstream design intent を表す legacy intermediate model であり、Apollo SoR そのものではない。`frontend/src/bridgeDefinition/types.ts`
- `CONFIRMED`: `Viewer3D` は `ProjectModel` を読み取り、Three.js scene を毎回再構築する可視化層であり、正本更新の責務を持たない。`frontend/src/viewer/SceneBuilder.ts`

## 5. 既存 3D viewer の状態

- `CONFIRMED`: `frontend/src/viewer/Viewer3D.tsx` は Three.js ベースの 3D line-model viewer を提供し、WebGL 初期化失敗時は `Fallback2DViewport` に切り替える。
- `CONFIRMED`: `ApolloPhase1Shell` は既存 `Viewer3D` を非 numeric projection として再利用している。`frontend/src/apollo/ApolloPhase1Shell.tsx`
- `CONFIRMED`: Unit 2 scope freeze では「既存 `Viewer3D` / fallback 2D path の再利用」が明示されている。`docs/apollo/phase1-orchestration/unit2/00_scope/unit2_scope_freeze.md`
- `CONFIRMED`: Unit 2 final report では viewer reuse、selection synchronization、fallback 2D viewport が完了証跡として記録されている。`docs/apollo/phase1-orchestration/unit2/final_phase1_nn_unit2_report.md`
- `CONFIRMED`: `docs/frame/viewer/09_3d_view_spec.md` は MVP 3D line-model display を定義しており、solid cross-section display は対象外に置いている。

## 6. STL 関連既存資産

- `CONFIRMED`: `frontend/src/liner/exports/linerFrameStl.ts` は `ProjectModel` の member 端点から円柱を生成し、ASCII STL を出力する。
- `CONFIRMED`: 現行 STL 資産は LINER/Frame 側の export asset であり、Apollo 固有の authoritative export contract ではない。
- `PROVISIONAL`: Apollo 向け STL は技術的に `FEASIBLE_WITH_GAPS` だが、現行資産だけでは bridge solid truth、unit policy、manifest policy、quality gate が未凍結である。

## 7. 主な不足データ

- `MISSING`: girder/deck/bearing/pier/abutment を solid 化するための authoritative bridge geometry ownership
- `MISSING`: Apollo 専用 STL export contract、manifest、Binary STL policy
- `MISSING`: visualization model の schemaVersion、座標系、単位系、export inclusion rule
- `PROVISIONAL`: `BridgeDefinition` の span/girder/deck/support 情報は候補だが、Apollo SoR への昇格は未決定
- `DEFERRED`: GLB 等の将来 export は今回の Step 0 対象外

## 8. Step 1 へ進む条件

- `CONFIRMED`: 3D viewer の本実装開始前に、Apollo 正本と Three.js/STL の責務境界を derived read-only contract として Freeze する。
- `CONFIRMED`: `Three.js Mesh -> Apollo正本`、`STL -> Apollo正本` の逆流を禁止する。
- `PROVISIONAL`: bridge geometry が不足する項目は Step 2 で authoritative / authoritative_for_poc / sidecar 候補へ明示的に割り当てる。
- `ASSUMED_FOR_POC`: display length は `m`、STL export length は `mm`、座標系は `X=橋軸方向, Y=橋軸直角方向, Z=鉛直上向き` を暫定初期値として Step 1 で凍結する。

## 9. 対象外

- `OUT_OF_SCOPE`: 解析シミュレーション、solver、numeric 処理、LINER 計算ロジック変更
- `OUT_OF_SCOPE`: Three.js 表示本実装、STL 出力本実装、Apollo 新規 UI 本実装
- `OUT_OF_SCOPE`: package 追加、lockfile 変更、backend 変更、production code への PoC 実装

## 10. P0 判定ラベル

- 3D表示: `FEASIBLE_WITH_GAPS`
- STL出力: `FEASIBLE_WITH_GAPS`
- 解析シミュレーション: `OUT_OF_SCOPE`
- current data readiness: `PARTIAL`
- PoC readiness: `GO_WITH_CONDITIONS`

## 11. 結論

- `APOLLO_3D_P0_VERDICT: COMPLETE_WITH_GAPS`
- `APOLLO_3D_IMPLEMENTATION_ENTRY: GO_WITH_CONDITIONS`
- `APOLLO_P0_EVIDENCE_VERDICT: COMPLETE_WITH_GAPS`
- `APOLLO_P0_SCOPE_GUARD_VERDICT: PASS`
- `RECOMMENDED_NEXT_STEP: STEP1_VISUALIZATION_CONTRACT_FREEZE`

Step 0 は、Apollo 固有 3D/STL package の完全性ではなく、既存リポジトリ実装に基づく再利用可能性と不足の明文化という観点で完了とする。不足は残るが、責務分離と data ownership を先に Freeze すれば Step 1 へ進行可能である。
