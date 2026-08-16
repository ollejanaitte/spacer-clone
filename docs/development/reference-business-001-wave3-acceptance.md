# SPACER — Reference Business 001 Wave 3 Acceptance Report (S-12)

- 作成日時: 2026-08-17 07:1x (JST)
- 担当 Lane: S（Wave 3）
- 対象リポジトリ: `~/Projects/spacer-clone-lane-s`（branch: `lane-s/reference-business-001`）
- 基準 main SHA: `24f24ef`（A/B/T/V/U 統合後）
- 上位文書: [reference-business-001-acceptance-scenario.md](reference-business-001-acceptance-scenario.md) /
  [reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md)

> **Authority:** OPERATIONAL
> **Status:** ACCEPTED（Wave 3 S-12）

---

## 1. Acceptance チェックリスト結果

| # | 項目 | 結果 | 検証 |
|---|---|---|---|
| 1 | Site Context 正常 | PASS | metadata.siteContextCoordinateContexts / SourceDatasets 格納 |
| 2 | real/accepted Terrain | PASS | Gujo fixture 資産化・extractTerrainDocument |
| 3 | EPSG:6674 | PASS | JGD2011 平面直角 第7系・coordinateContext |
| 4 | Road alignment | PASS | RB001-ROAD-1・2,450m |
| 5 | Bridge arrangement | PASS | RB001-BRIDGE-1 |
| 6 | 6 spans × 50m | PASS | A1+P1..P5+A2@STA.1200-1500 |
| 7 | Superstructure | PASS | RB001-SUPER-1（CONTINUOUS・2主桁） |
| 8 | Bearings | PASS | bearingSupportRelation 7支点×2主桁 |
| 9 | Substructure | PASS | RB001-SUB-1（A1/P1..P5/A2） |
| 10 | Analysis input/results | PASS | RB001-ANL-1・NOT_RUN（fail-closed、架空結果なし） |
| 11 | Integrated 3D | PASS | Lane V realScene 全6層統合 |
| 12 | layer alignment | PASS | EPSG:6674 単一フレーム・bounds 整合 |
| 13 | Save | PASS | serializeProject（PDC canonical） |
| 14 | Close | PASS | project 廃棄相当 |
| 15 | Reopen | PASS | deserializeProject 再構成 |
| 16 | Terrain復元 | PASS | IndexedDB store から loadTerrainElevation |
| 17 | Analysis data復元 | PASS | NOT_RUN 状態維持 |
| 18 | 3D再構築 | PASS | realScene は毎回導出・非保存 |
| 19 | Project context維持 | PASS | projectId / name 不変 |
| 20 | no data loss | PASS | 全 module slot roundtrip |
| 21 | no console critical error | PASS | 純ロジック・build PASS |

## 2. テスト

- `frontend/src/liner/samples/reference-business-001/__tests__/acceptance.test.ts`（11件）
- 全 RB001 test 46件 + test:fast 468files/3460tests PASS / typecheck PASS

## 3. 判定

**Reference Business 001 Wave 3 Acceptance PASS。**
新規/既存 Project → Site Context → Gujo Terrain → Road → Bridge → Superstructure →
Bearings → Substructure → Analysis → Integrated 3D → Save → Close → Reopen の
一連が成立し、Project context が維持される。UI 初期状態に依存せず明示 fixture から開始。
Analysis は既存 engine の fail-closed（girder section 未宣言 → NOT_AVAILABLE）を維持し、
架空の解析結果を作らない。