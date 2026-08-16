# SPACER CLONE — Wave 0「並列Lane用 branch / worktree 構築・開始前準備」readiness

- 作成日時: 2026-08-16 (JST)
- 対象リポジトリ: `~/Projects/spacer-clone`
- 参照リポジトリ (読み取りのみ): `~/Projects/site-context-prototype`
- 上位計画: [phase-a-persistence-automation-plan.md](phase-a-persistence-automation-plan.md) (Phase A-01 実行計画)

---

## 1. Wave 0 目的

Phase A-01 完了後の最新 `origin/main` を共通基点として、今後 Lane A / B / T / V / U / S を
安全に並列実行できるよう、以下の準備を完了する。

- Lane 別 branch の作成
- Lane 別専用 worktree の作成
- Lane 別 branch の GitHub push
- Lane 別責務・Conflict Ownership・依存関係 (Lane 間 I/F) の確定
- Wave 1 開始条件の文書化
- main 側へ Wave 0 成果文書とファイナルレポートの反映

## 2. 基準 main SHA

- 開始時 (fetch 前): `1840cb66ada4e35035478c0bd3f61a431eac3fbe`
- `git fetch origin` 後 `origin/main`: `1840cb66ada4e35035478c0bd3f61a431eac3fbe`
- local `main` と `origin/main` は一致 (`0 ahead / 0 behind`)
- 参考 SHA (Phase A-01 最終報告) と作業開始時点の最新 `origin/main` は同一 SHA であることを確認

## 3. Phase A-01 確認

- `docs/development/project-persistence-map.md` … Persistence Contract・canonical chain・
  exceptional paths・既知不整合 7 項目・Phase A-01 進入判定を確認
- `docs/development/phase-a-persistence-automation-plan.md` … A-02〜A-08 実装順序・
  Completion Gate (G1〜G14)・既知例外 12 項目・Sol レビュー反映を確認
- `docs/development/README.md` … インデックスに上記 2 文書が登録済みであることを確認
- Phase A-01 完了 commit: `1840cb6` (`docs: SPACER Phase A-01 Phase A 実行計画 ...`)

判定: **Phase A 一気通貫実装へ進める** (blocking issue なし)

## 4. branch / worktree 対応表

| Lane | branch | worktree | 担当予定 | 開始 SHA |
|---|---|---|---|---|
| A | `lane-a/persistence-schema` | `~/Projects/spacer-clone-lane-a` | Lane A-2 〜 Lane A-9 | `1840cb66` |
| B | `lane-b/sitecontext-contract-adapter` | `~/Projects/spacer-clone-lane-b` | Lane B-1 〜 Lane B-7 | `1840cb66` |
| T | `lane-t/sitecontext-terrain-port` | `~/Projects/spacer-clone-lane-t` | Lane T-1 〜 Lane T-8 | `1840cb66` |
| V | `lane-v/unified-3d-viewer` | `~/Projects/spacer-clone-lane-v` | Lane V-1 〜 Lane V-8 | `1840cb66` |
| U | `lane-u/unified-workflow` | `~/Projects/spacer-clone-lane-u` | Lane U-1 〜 Lane U-7 | `1840cb66` |
| S | `lane-s/reference-business-001` | `~/Projects/spacer-clone-lane-s` | Lane S-1 〜 Lane S-12 | `1840cb66` |

## 5. 各 Lane の開始 SHA

6 Lane すべて同一 SHA を確認済み。

```
lane-a: 1840cb66ada4e35035478c0bd3f61a431eac3fbe
lane-b: 1840cb66ada4e35035478c0bd3f61a431eac3fbe
lane-t: 1840cb66ada4e35035478c0bd3f61a431eac3fbe
lane-v: 1840cb66ada4e35035478c0bd3f61a431eac3fbe
lane-u: 1840cb66ada4e35035478c0bd3f61a431eac3fbe
lane-s: 1840cb66ada4e35035478c0bd3f61a431eac3fbe
```

## 6. 各 Lane の Wave 1 範囲

- **Lane A**: A-2 Schema Drift Guard / A-3 Default Project Conformance / A-4 Generic Persistence Roundtrip
- **Lane B**: B-1 SPACER / site-context データ契約再確認 / B-2 Field Mapping Freeze / B-3 Adapter Interface 確定
- **Lane T**: T-1 PORT 対象資産確定 / T-2 CRS / Coordinate Core PORT / T-3 GSI DEM PORT / T-4 Heightfield / SCT1 PORT
  - ※ 国土地理院地形取得はゼロから作らず、site-context-prototype の既存資産を選択 PORT する方針
- **Lane V**: V-1 SPACER 既存 3D Viewer 境界監査 / V-2 統合 Layer Contract / mock・fixture による最小描画骨格
- **Lane U**: U-1 Canonical Workflow 確定 / U-2 App Shell 入口設計・最小実装
- **Lane S**: S-1 Reference Business 001 仕様確定 / S-2 郡上市八幡 Baseline / S-3 道路線形 Sample 準備

## 7. Conflict Ownership

| Lane | 優先所有 |
|---|---|
| A | `frontend/src/types.ts`, `schemas/project.schema.json`, `frontend/src/projectMigration.ts`, `frontend/src/data/defaultProject.ts`, canonical serializer / hydrate, canonical Save / Load, canonical validation, Persistence Guard, Phase A Gate |
| B | integration mapping, site-context Adapter, Adapter Contract Test, import/export boundary |
| T | CRS / coordinate primitive, GSI DEM importer, Heightfield / SCT1 PORT, Terrain generation, terrain asset |
| V | unified 3D viewer, viewer layer, viewer regression, viewer coordinate 接続 |
| U | App Shell integration, workflow page, navigation / route, UI state |
| S | sample, fixture, Reference Business 001, Tutorial Sample, Acceptance scenario |

他 Lane から変更要求が出た場合、正本変更は所有 Lane が担当する。

## 8. Shared High-Conflict Files

最低限:

- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `package.json`
- Vitest config
- CI workflow
- docs index

共有ファイルは各 Lane で極力触らない方針。

## 9. Lane 間 I/F

- A → B/T/V/U/S: canonical Project / Persistence Contract, validation boundary, migration rule, Schema Guard
- B → T/V/U/S: field mapping, Adapter interface, site-context → SPACER 変換契約
- T → V/U/S: Terrain interface, CRS / canonical coordinate, 郡上市八幡 Terrain fixture
- V → U/S: Viewer layer interface, Viewer entry
- U → S: canonical workflow, user-visible entry
- S → F: Tutorial Sample, Reference Business 001, Acceptance scenario

## 10. STOP 条件

各 Lane 共通 (Wave 1 用):

- ProjectModel / Schema 変更が必要だが Lane A との調整未完
- Adapter Contract 未確定
- Terrain interface 未確定
- 他 Lane 所有ファイルの大規模変更が必要
- 同じ問題に 15〜20 分以上詰まる
- merge conflict が単純競合ではなく設計競合を示す
- test failure の責任 Lane が判別できない

1 Lane が止まっても、他 Lane まで止めない運用とする。

## 11. Wave 1 Completion Gate

Wave 1 並列実行を開始してよい条件:

- [x] Phase A-01 完了確認
- [x] 最新 main 確定
- [x] 6 Lane branch 作成済み
- [x] 6 Lane worktree 作成済み
- [x] 6 Lane branch GitHub push 済み
- [x] 6 Lane が同一開始 SHA
- [x] Conflict Ownership 確定
- [x] Shared High-Conflict Files 確定
- [x] Lane 間 I/F 確定
- [x] STOP 条件確定
- [x] 各 Lane Wave 1 範囲確定
- [x] site-context PORT 方針確認 (選択 PORT 方針)
- [x] Reference Business 001 基準確認
- [x] main に production 変更なし
- [x] 次の 6 本の Lane 別実行プロンプトを流せる状態

## 12. branch push 結果

| Lane | branch | push 結果 |
|---|---|---|
| A | `lane-a/persistence-schema` | 成功 (upstream 設定済み) |
| B | `lane-b/sitecontext-contract-adapter` | 成功 (upstream 設定済み) |
| T | `lane-t/sitecontext-terrain-port` | 成功 (upstream 設定済み) |
| V | `lane-v/unified-3d-viewer` | 成功 (upstream 設定済み) |
| U | `lane-u/unified-workflow` | 成功 (upstream 設定済み) |
| S | `lane-s/reference-business-001` | 成功 (upstream 設定済み) |

## 13. worktree 確認結果

- 6 worktree すべて current branch が意図した Lane branch
- 6 worktree すべて HEAD = `1840cb66` (同一基準 SHA)
- 6 worktree すべて status クリーン
- worktree path 重複なし

## 14. Wave 1 進入判定

**Wave 1 並列実行へ進める**
