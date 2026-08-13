# Phase 7.1: Runtime検証（旧LINER / 現Road）

- Phase: 7.1 Road/LINER救出監査
- baseline: d524f6fb8f39e5ce1a2b7e5dd230f162a84f6a35
- 日付: 2026-08-13

## 1. 検証方法

本環境ではheadlessブラウザ（playwright/chromium）の起動が環境制約で失敗するため
（`page.goto`/`browser.launch`がhang）、実UIスクリーンショットは取得不可。
代替として、**実App経由のE2E test**（App.tsxを実際にrender・routing・CRUD・persistenceを駆動）を
旧LINER UIの動作証拠として用いる。

## 2. 旧LINER runtime検証（実App E2E test実行・PASS）

| test | 検証内容 | 結果 |
|---|---|---|
| `App.linerReset.test.tsx` | 実AppでLINER model reset | PASS |
| `App.linerDelete.test.tsx` | 実AppでLINER削除 | PASS |
| `App.linerSaveLoad.test.tsx`（479行） | 実AppでLINER save→load→restore | PASS |
| `App.linerSubstructureEntry.test.tsx` | 実AppでLINER→下部工導線 | PASS |
| `liner/core/__tests__/geometry/station/pipeline` | 計算core | PASS |

→ **旧LINER UIはroute接続・実操作（入力→計算→結果→保存/復元）が成立**（E2E testが実Appを駆動）。

## 3. 旧LINER計算core runtime検証（PASS）

| test | 検証内容 | 結果 |
|---|---|---|
| `clothoid.test.ts` / `coordinate3d.test.ts` | クロソイド・3D座標 | PASS |
| `horizontalCurveGolden.test.ts` / `verticalGolden.test.ts` / `crossSectionGolden.test.ts` | golden比較 | PASS |
| `bridgeLayoutEvaluation.test.ts` / `widthResolution.test.ts` | 橋梁レイアウト・拡幅 | PASS |
| `formalExport.test.ts`（dxf）/ `formalBuilders.test.ts`（drawing） | DXF・正式図面 | PASS |

## 4. 現Road Module runtime検証（PASS）

| test | 検証内容 | 結果 |
|---|---|---|
| `road intermediateResult.test.ts` | 統合per-stationパイプライン | PASS |
| `road roadMesh.test.ts` | 3D道路mesh | PASS |
| `road roadCimGeometry.test.ts` | CIM geometry | PASS |
| `roadUi.test.tsx`（既存） | ページrender・label保存 | PASS（既存CI） |
| `roadVertical.test.tsx`（既存） | 垂直slice（save/restore/.spacerproj） | PASS（既存CI） |

→ **現Road Moduleの計算パイプラインは成立**。ただしUIはview-only（labelのみ編集可）。

## 5. 起動不能ではない（原因調査結果）

- 旧LINER・新Road共に**起動不能ではない**。route・import wiringは完全。
- headless screenshotのみ環境制約（playwright launch hang）で取得不可。
- 起動不能と即断せず、E2E test（実App駆動）をruntime証拠として採用。

## 6. evidenceサマリ

- LINER E2E + core + golden + dxf + drawing tests: **133件PASS**（本監査で再実行）
- 新Road module tests: **PASS**（本監査で再実行）
- headless screenshot: **取得不可**（playwright環境制約・既知の制限として明記）
