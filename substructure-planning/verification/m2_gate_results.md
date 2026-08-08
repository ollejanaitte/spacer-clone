# Phase C1 Milestone 2 統合検証結果（M2 Gate Results）

実施日時: 2026-08-08
対象: Phase C1 Milestone 2（UI/統合） — 下部工 3ペインCAD UI 〜 サンプル生成 〜 Main/LINER 統合 の完走
方法: vitest 全スイート + 専用 E2E（Playwright）+ typecheck + production build + 視覚証跡
正本: substructure-planning/docs/phase-c1/（P00〜P04 Freeze）

## 1. 総括

| カテゴリ | 結果 |
|---|---|
| M2 Gate 全項目 | 23/23 PASS（M2_CI のみ N/A_WITH_REASON） |
| substructure 単体 | 26ファイル / 220テスト PASS |
| 全体リグレッション | 363ファイル / 2841テスト PASS |
| 専用 E2E | substructure-main-entry 2 + substructure-integration 6 PASS |
| 既存 E2E | p1-d05 LINER save/load PASS |
| 型チェック (tsc) | PASS |
| ビルド (vite) | PASS |
| GitHub CI | N/A_WITH_REASON（repo に workflow 未設定） |

## 2. M2 Gate 検証結果

| gate | 検証内容 | 結果 | 根拠 |
|---|---|---|---|
| M2_R3F_VIEWER | R3F 3D ビューア基盤 | PASS | M2-01 substructureViewer3D / threeFactory |
| M2_ALL_C1_TYPES_VISIBLE | 全 C1 形式の3D可視化 | PASS | threeFactory golden tests |
| M2_UI_SHELL | 3ペイン CAD UI シェル | PASS | M2-02 planningShell テスト |
| M2_STRUCTURE_INPUT_FORMS | 構造形式・入力フォーム | PASS | M2-03 inputForms / formModel |
| M2_PILE_UI | FOOTING思想 杭基礎UI | PASS | M2-04 pileLayoutModel / pileLayoutUI |
| M2_REALTIME_2D | 2D即時更新 | PASS | M2-05 realtimeUpdate |
| M2_REALTIME_3D | 3Dリアルタイム更新 | PASS | M2-05 realtimeUpdate |
| M2_3D_DEBOUNCE | 3D 300ms debounce | PASS | M2-05 realtimeUpdate debounce テスト |
| M2_DIMENSION_2D | 2D寸法表示 | PASS | M2-06 dimensionModel / dimensionUI |
| M2_DIMENSION_3D | 3D寸法表示 | PASS | M2-06 dimension 3D layer |
| M2_SELECTION_SYNC | supportId 双方向選択同期 | PASS | M2-07 selectionSync |
| M2_INTERACTION | 選択/キーボード/コンテキストメニュー | PASS | M2-07 interaction |
| M2_UNDO_REDO | Undo/Redo 基盤 | PASS | M2-07 useUndoRedo |
| M2_SAMPLE_GENERATION | 9種サンプル + 組合せ生成 | PASS | M2-08 sampleGenerator / SampleCreationDialog |
| M2_LINER_SAMPLE_GENERATION | LINER支点からの自動生成 | PASS | M2-09C linerHandoff / buildLinerGeneratedSupports |
| M2_MAIN_ENTRY | Main/LINERから下部工画面へ到達 | PASS | M2-09B review タブ入口 + E2E |
| M2_ROUTING | /pro/liner/substructure ルート | PASS | M2-09A route / deep link / reload |
| M2_PROJECT_HANDOFF | project/alignment/support handoff | PASS | M2-09C linerHandoff / App 接続 |
| M2_VISUAL_VERIFICATION | 視覚証跡 | PASS | evidence/m2-01..m2-10a 各PNG |
| M2_E2E | Playwright E2E | PASS | main-entry 2 + integration 6 |
| M2_REGRESSION | 全体リグレッション | PASS | 363ファイル / 2841テスト |
| M2_BUILD | typecheck + vite build | PASS | npm run build 成功 |
| M2_CI | GitHub CI | N/A_WITH_REASON | repo に workflow 未設定のため |

*M2_CI: 対象 repo（ollejanaitte/spacer-clone）は .github/workflows を持たない。
そのため CI 実行は不可能であり、PASS と偽装せず N/A_WITH_REASON として記録する。
全チェックはローカルで実施・記録済み。

## 3. Critical Gate

| Critical Gate | 結果 |
|---|---|
| M2_MAIN_ENTRY | PASS |
| M2_PILE_UI | PASS |
| M2_REALTIME_2D | PASS |
| M2_REALTIME_3D | PASS |
| M2_DIMENSION_2D | PASS |
| M2_SELECTION_SYNC | PASS |
| M2_E2E | PASS |
| M2_REGRESSION | PASS |
| M2_BUILD | PASS |

Critical Gate 全項目 PASS。

## 4. 統合シナリオ（M2-10A）

| シナリオ | 内容 | 結果 |
|---|---|---|
| A | Main/LINER → 下部工 → 単柱橋脚 → station/offset → 2D → 3D → 寸法 → selection | PASS |
| B | 門型橋脚 → parameter編集 → 2D即時 → 3D debounce更新 | PASS |
| C | 場所打ち杭 → footing → 杭径/本数変更 → 3D | PASS |
| D | LINER support → sample自動生成 → supportId同期 | PASS |
| E | Validation FATAL → 3D生成停止 → 修正 → 正常復帰 | PASS |
| F | Undo/Redo → model / 2D / 3D 一致 | PASS |

## 5. 視覚証跡

evidence/ 配下: m2-01〜m2-07（既存）+ m2-08（サンプル生成 UI/2D/3D）
+ m2-09a（ルート/メインエントリ）+ m2-09b（LINER review 入口）
+ m2-09c（LINER handoff 自動生成）+ m2-09d（E2E フロー）+ m2-10a（統合6シーン）

## 6. 判定

- 全必須 Gate が PASS（M2_CI のみ N/A_WITH_REASON として妥当に説明）
- PHASE_C1_MILESTONE2_COMPLETE: YES

## 7. 備考

- M2-10A で単一サンプル生成の不具合（組合せ先頭ではなく指定 kind を生成）を修正済み。
- 他プロジェクト由来の Apollo evidence JSON の dirty 差分は本作業の所有物ではないため不変のまま。
- Phase C1 Milestone 3（下部工設計計算・耐震・配筋・上部工+下部工統合）は未着手。
