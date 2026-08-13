# Phase 7.2E: KEEP/RESTORE/ADAPT/MERGE/REWRITE/DEFER最終matrix + Test/Golden + feature flag/rollback + Phase 7.3 WP + Completion Gate

- Phase: 7.2 Road/LINER Rescue 完全設計・Design Freeze
- baseline: 86d4d72e80dd21863c4dcdf77d6f475f7647355b
- 日付: 2026-08-13
- 凍結: D-11（matrix） / D-12（test/golden） / D-13（flag/rollback） / D-14（WP） / D-15（Completion Gate）

## 1. KEEP / RESTORE / ADAPT / MERGE / REWRITE / DEFER 最終matrix（D-11 Freeze）

| 資産 | path | 分類 | 理由 | risk |
|---|---|---|---|---|
| 旧LINER計算kernel | `frontend/src/liner/core/*` | **KEEP** | 新Road計算wrapperが同一コードを消費・テスト済み | LOW |
| 現Road計算wrapper | `frontend/src/next/modules/road/*` | **KEEP** | 正式計算パイプライン（Phase 2-02..12） | LOW |
| Road CIM生成 | `road/roadCimGeometry.ts` | **KEEP** | 正式CIM縦断（Phase 7.3 WP-Iでproduction接続） | MED |
| Bridge downstream契約 | Phase 4/5/7契約 | **KEEP** | 既存完成契約・Analysis staleと整合 | LOW |
| Line Management UI | `liner/components/AlignmentManager.tsx`等 | **RESTORE/ADAPT** | 新Road Moduleへ複製適合 | MED |
| Horizontal Editor | `HorizontalElementEditor.tsx` | **RESTORE/ADAPT** | 実務入力能力の救出 | MED |
| Stationing Editor | `LinerStationProfilePanel.tsx` | **RESTORE/ADAPT** | 同上 | MED |
| Vertical Editor | `VerticalElementEditor.tsx` | **RESTORE/ADAPT** | 同上 | MED |
| Cross Section Editor | `CrossSectionTemplateEditor.tsx` | **RESTORE/ADAPT** | 同上 | MED |
| Width/Widening Editor | `WidthChangePointEditor.tsx` | **RESTORE/ADAPT** | 同上（正本schemaにfield追加） | MED |
| CrossSlope/Superelevation | `CrossfallIntervalEditor.tsx`等 | **RESTORE/ADAPT** | 同上 | MED |
| 旧2D visual | `liner/core/visual/*` | **MERGE** | 現RoadPreviewへ統合（station/major点表示救出） | MED |
| 旧3D表示能力 | `LinerMain3DPage`・`viewer.tsx` | **MERGE** | integratedSceneBuilderへ表示機能ADAPT | MED |
| Save/Load正本一意化 | `roadModuleAdapter`・`linerProjectDraft` | **REWRITE** | roadData正本化（migration） | HIGH |
| legacy migration | `schema/projectLinerMigration.ts`等 | **REWRITE** | 正本schemaへ移行（非破壊・fail-closed） | HIGH |
| 正式図面/DXF | `liner/drawing`・`dxf` | **DEFER** | 成果品系（残存LINERで維持・統合は後続） | LOW |
| Importer（PDF転記） | `liner/importer` | **DEFER** | 独立機能（残存LINERで維持） | LOW |
| backend/rule_engine | `backend/rule_engine` | **DEFER** | frontend正本方針（stub多数・非配線） | MED |

## 2. Test / Golden / Reference（D-12 Freeze）

### 2.1 既存資産の利用

- 旧LINER golden/reference: `core/__tests__/*Golden.test.ts`・`core/verification/`（R1/P02 reference比較）・`drawing/__tests__/*golden` を**そのまま利用**（新実装へ合わせて変更しない）。
- 旧LINER core regression（164ファイル）: 全維持。

### 2.2 新規test（Freeze）

| 対象 | 内容 |
|---|---|
| old→new field mapping | 全field（§2B）のmapping test（単位/符号/座標/nullability） |
| migration | ケース1-10（project.liner/roadInput/両方/新規/失敗/version/欠損） |
| save/load・restart restore | 正本roundtrip・derived再生成 |
| .spacerproj | export/import roundtrip |
| horizontal/stationing/vertical/crossSection/width/crossSlope | 旧LINER kernel（KEEP）と新正本からの導出が一致 |
| 2D preview | 正本→payload→表示（同一データ供給） |
| 3D/Road CIM | mesh/CIMが正本から決定論生成 |
| Bridge handoff | 正本→BridgeLayout（stable ID・station参照） |
| STALE/downstream | Road変更→下流STALE（fingerprint比較） |
| Electron E2E | 入力→計算→結果→保存→restore→.spacerproj |

### 2.3 Golden変更方針（Sol review反映）

- **原則: golden変更禁止**。差異が出た場合expectedを変更せず、実装/adapter/単位/符号を調査。
- **例外**: 既存golden自体の誤り・承認済み仕様変更のみ。変更時は **理由・旧新diff・独立承認** を必須とする。
  重大ならDesign Freeze Violation扱いで判断。

## 3. Feature Flag / Rollback（D-13 Freeze）

- **feature flag**: `VITE_ROAD_LINER_RESCUE`（Road/LINER救出機能のON/OFF）。OFF時は現Road Module（view-only）を維持。
- **compatibility adapter**: 旧 `readRoadInputs` を残し、正本が無い場合は従来経路で読む。
- **legacy read path**: `project.liner`・`modules.road.data.roadInput` は移行後も読み取り可能（破壊しない）。
- **migration backup**: migration前にlegacy dataを非破壊保持（`_meta`・元データ不変）。
- **rollback procedure**: flag OFFで旧UI経路へ即時復帰可能・migration失敗はfail-closed（正本化しない）。
- 新Editor導入後もProject破壊しない（migration失敗時は旧Project維持）。

## 4. Phase 7.3 Work Packages（D-14 Freeze）

| WP | scope | files（再利用+新規） | deps | rollback | acceptance |
|---|---|---|---|---|---|
| WP-A | Canonical Road Data / SoT / schema / migration | 新 `modules/road/roadDataSchema.ts`・migration（既存projectLinerMigration ADAPT）・`roadModuleAdapter`拡張 | — | flag OFF | SoT確定・migration全ケースtest PASS |
| WP-B | Line Management | 旧 `AlignmentManager`/`AlignmentLineManager`/`offsetLineOrdering`→Road Module | A | flag OFF | line CRUD・centerline保護 |
| WP-C | Horizontal Alignment Editor | 旧 `HorizontalElementEditor`/`geometry`→Road Module | A | flag OFF | 入力→計算→結果 |
| WP-D | Stationing Editor | 旧 `LinerStationProfilePanel`/`station`→Road Module | A | flag OFF | station生成・equation |
| WP-E | Vertical Alignment Editor | 旧 `VerticalElementEditor`/`vertical`→Road Module | A | flag OFF | 縦断入力→評価 |
| WP-F | CrossSection/Width/Widening/Superelevation | 旧 `CrossSectionTemplateEditor`/`WidthChangePointEditor`/`CrossfallIntervalEditor`→Road Module（正本schemaにwidth/crossSlope field追加） | A | flag OFF | 全editor入力 |
| WP-G | Persistence/AutoSave/restore/.spacerproj | `roadModuleAdapter`/`persistence`（正本schema）+ migration統合 | A | flag OFF | restore/roundtrip PASS |
| WP-H | 2D Preview統合 | 旧 `core/visual`+現 `RoadPreviews` | **A,G**（正本+persistence後） | flag OFF | 同一データ供給 |
| WP-I | 3D/Road CIM統合 | `roadMesh`/`roadCimGeometry`+`integratedSceneBuilder` | A,G | flag OFF | mesh/CIM決定論 |
| WP-J | Bridge Layout/downstream/STALE | 正本→BridgeLayout handoff + fingerprint | A,G | flag OFF | downstream STALE |
| WP-K | Golden/Regression/backward compat | 旧golden + 新tests + 旧Project読込 | **A,B,C,D,E,F,G** | flag OFF | golden一致・backward compat |
| WP-L | Electron E2E / Completion Gate | 実App縦断 + negative-path tests | **全WP（DAG順）** | flag OFF | Completion Gate PASS |

- **migration所有はWP-A（schema+migration core）とWP-G（persistence統合）に分離**（重複しない: WP-A=core・WP-G=保存/restore経路）。
- Editor系（B-F）のacceptanceは正本schema（WP-A）依存だが、persistence統合（WP-G）前でも**runtime計算acceptance**は可能。
- H/I/JはG（persistence）に依存（正本が保存されてから表示/下流）。
- K/Lは全WP完了後に実行（DAG順）。
- 各WPのPR境界: `feat/phase7-3-wpX-*`。

## 5. Phase 7.3 Completion Gate（D-15 Freeze）

### 5.1 正常系（happy-path）

| 領域 | 項目 |
|---|---|
| Document | 正本schema PASS・migration全ケース PASS |
| Editor | Line/Horizontal/Stationing/Vertical/CrossSection/Width/CrossSlope 各入力→計算→結果 PASS |
| 計算 | 旧LINER kernel regression PASS（golden一致） |
| Persistence | Auto Save・restart restore・.spacerproj roundtrip PASS |
| 2D/3D | Preview同一データ供給 PASS・Road CIM production表示 PASS |
| downstream | Bridge handoff stable ID PASS・Road変更→STALE PASS |
| Quality | 旧LINER tests全PASS・新tests全PASS・typecheck/lint/build/electron PASS・E2E PASS |
| Rollback | flag OFFで旧経路復帰可能 PASS |

### 5.2 negative-path（Sol review反映・必須）

| 項目 | 検証 |
|---|---|
| migration途中終了 | 正本化されない（atomic・fail-closed） |
| autosave競合 | 競合検出・上書きしない |
| 二つのlegacyが異なる | conflict comparatorがblock |
| checksum正規化 | canonical JSON（sort_keys）で決定論一致 |
| flag ON→編集→OFF→ON | 状態保持・復帰 |
| 旧/未来schema | 非対応fail-closed |
| derived不一致import | 検出・再生成 |
| line削除によるINVALID伝播 | 下流fail-closed |
| 再計算失敗時の旧成果保持 | 旧成果を破壊しない |

- 全項目（正常+negative）PASS時のみPhase 7.3 COMPLETE。1件でもFAILならCOMPLETEとしない。
