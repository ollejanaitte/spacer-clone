# SPACER CLONE — Reference Business 001 仕様 (Lane S / S-1)

- 作成日時: 2026-08-16 (JST)
- 担当branch: `lane-s/reference-business-001`
- 参照リポジトリ: `~/Projects/site-context-prototype` (読み取りのみ)
- 上位文書: [parallel-lanes-wave0-readiness.md](parallel-lanes-wave0-readiness.md) (Lane S 担当範囲)
- 関連: [phase-a-persistence-automation-plan.md](phase-a-persistence-automation-plan.md) (Persistence Contract)
- 本稿の位置づけ: Reference Business 001 (最終受入サンプル) の**正式仕様**。
  Wave 1 (S-1〜S-3) で確定し、以後の Lane S 作業 (S-4 橋梁配置〜S-12) の固定基準とする。

> **Authority:** OPERATIONAL / LANE S
> **Status:** DECIDED (Wave 1)
> **範囲:** 最終完成像・受入条件の固定。橋梁詳細設計値などは Wave 1 では作り込まず、
> 各 S-4 以降の作業で本仕様へ具体化する。

---

## 1. 目的

Reference Business 001 は、SPACER CLONE の**最終 Acceptance Sample** である。

単なるデモデータではなく、システム全体が

1. 完成版サンプル業務を開く
2. 国土地理院実地形を見る
3. 道路線形を確認・編集する
4. 橋梁配置を確認する
5. 上部工・下部工を確認する
6. 構造解析結果を見る
7. 統合3D / CIMを見る
8. 保存
9. 終了
10. 再起動
11. 再読込
12. 同じ業務状態を復元

まで一貫して達成できることを、実業務相当のデータで機械的・反復的に受け入れるための
**本番相当のサンプル業務**である。

Reference Business 001 は「実地形」「道路」「橋梁」「上部工」「下部工」「解析」「CIM」
の全領域をカバーし、FROZEN 境界 (NOT_AUTHORIZED / HOLD / DEFER) を守りながら
完結する。実業務フローを代表するため、架空の合成地形・無根拠な設計値は使わない。

## 2. ユーザー想定

| 項目 | 想定 |
|---|---|
| 主たるユーザー | 道路・橋梁設計技術者 (SPACER CLONE の受け入れ判定者) |
| 副次的なユーザー | 開発者・検証者 (E2E / 回帰 / 受入判定) |
| 実施する操作 | サンプル選択 → 現況地形確認 → 道路線形確認・編集 → 橋梁配置確認 → 上部工・下部工確認 → 解析実行 → 統合3D → 保存 → 終了 → 再起動 → 再読込 → 状態復元 |
| 期待する時間 | 1回の受入確認で完結できる一連の操作 (10〜20分で主要操作を追えることを目安とする) |
| 要求スキル | 道路・橋梁の実務知識 (操作自体の学習コストは低く保つ) |

Tutorial Sample との区別は [reference-business-001-tutorial-samples.md](reference-business-001-tutorial-samples.md) を参照。

## 3. 対象地域

**岐阜県郡上市八幡 (Gujo Hachiman, Gifu)** — 長良川沿いの山間盆地。

| 項目 | 値 |
|---|---|
| 正式地点名 | 岐阜県郡上市八幡 |
| 検索文字列 | `郡上市八幡` / `岐阜県郡上市八幡町` |
| 中心座標 (WGS84) | 北緯 35.7512° / 東経 136.9567° |
| 中心座標 (EPSG:6674) | X = 86,522.4 m / Y = -27,181.2 m (pyproj実測) |
| 選択理由 | 盆地+長良川+山稜 (標高500〜1200m級) の起伏が明瞭。3D地形の見栄えが良く、道路+橋梁の配置検討に適する。DEM5A取得が安定 (全36タイル HTTP 200 実測) |

正式 Baseline の詳細は [reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md) (S-2) を参照。

## 4. terrain

| 項目 | 確定内容 |
|---|---|
| CRS | JGD2011 平面直角 第7系 (**EPSG:6674**)・T.P.・単位 m |
| 出典 | 国土地理院 標高タイル **DEM5A** (`dem5a_png`・航空レーザ5m・ZL15) |
| フォールバック | DEM5B (`dem5b_png`) → DEM10B (`dem_png`) |
| 取得範囲 | 約 5km × 5km (rect・軸平行)・中心は上記 |
| タイル | ZL15 `x=28847-28852 × y=12892-12897` の 36枚 (全タイル HTTP 200 実測) |
| セルサイズ | 5 m (既定)・約 1000×1000 セル |
| 標高帯 | 約 200〜1200 m (盆地→山稜) |
| ライセンス | 地理院タイル PDL1.0 (出典「国土地理院」明示・規約 fail-closed) |
| 格納形式 (将来) | SCT1 相当の heightfield / TerrainDocument (`modules.terrain.data`) |
| 決定性 | `{level:"semantic", criterion:"tolerance-m", excludes:[]}` (site-context 既定に準拠) |

Wave 1 の扱い: 実地形 baseline として**利用条件を固定**する。terrain の production 実装は変更しない
(Lane T / B が PORT・統合を担当)。実データ取得・保存は該当 Lane の成果が揃った後に実施する。

## 5. road

| 項目 | 確定内容 |
|---|---|
| 種別 | 山岳道路 (2車線・道路予備設計相当) |
| 概略延長 | 約 2.5 km |
| 起終点 | 郡上市八幡盆地内・長良川を横断する路線 (詳細は S-3 道路線形Sample) |
| 平面線形 | 直線・クロソイド・円弧の複合 (既存 `RoadReferenceSample` 形式) |
| 縦断線形 | 縦断勾配・凸型/凹型縦断曲線 (既存 `VerticalElement` 形式) |
| 横断条件 | 2車線 + 路肩 (既存 `CrossSectionTemplateDraft` 形式) |
| 幅員 | 車道 3.0m×2 + 路肩 (標準約 9.0m 幅) |
| 橋梁候補区間 | 長良川横断部 (詳細は S-4 で確定) |
| データ形式 | `RoadReferenceSample` / `LinerDomainDraftVNext` (既存 road モジュール契約に準拠) |

道路設計機能は Lane S 内で再実装しない。既存の road 線形エンジン / sample 形式を利用する。

## 6. bridge

| 項目 | 確定内容 |
|---|---|
| 橋梁区間 | 長良川横断区間 (S-4 で支間割・橋梁形式を確定) |
| 橋梁形式 | 連続桁 (仮定・S-4 で確定) |
| 支間割 | S-4 で確定 (Wave 1 では固定しない) |
| 配置ルール | `BridgeLayoutDocument` (既存 bridgeLayout モジュール契約)・A1/A2/P1.. 支持点方式 |
| 既存連携 | Reference Mountain と同じ「空Project → fixture import」方式を踏襲する |

## 7. superstructure

| 項目 | 確定内容 |
|---|---|
| 主桁形式 | 鋼 or PC 連続桁 (S-4 以降で確定) |
| 断面 | declared section / material (既存 `SuperstructureDocument` 契約) |
| 支承 | FIXED / MOVABLE (既存 Bearing 契約) |
| 生成 | `generateSuperstructureFromLayout` を fixture 組立で利用 |

## 8. bearings

- FIXED / MOVABLE の組合せを橋梁配置から生成 (既存 superstructure / bearing 契約)。
- 詳細配置は S-4 以降で確定。

## 9. substructure

| 項目 | 確定内容 |
|---|---|
| 形式 | 橋台 (A1/A2) + 橋脚 (P1..) の線形配置 (既存 `SubstructureDocument` 契約) |
| 生成 | `generateSubstructureFromLayout` を fixture 組立で利用 |
| 3-pane / pile grid | 既存 substructure モジュールの枠組みを利用 |

## 10. analysis

| 項目 | 確定内容 |
|---|---|
| 対象 | 上部工フレーム解析 (dead load 等) |
| 自動組立 | FEM Model を既存パイプラインで自動生成 |
| solver | declared section で SUCCEEDED |
| IF3 | authoritative・source binding |
| 結果 | Reaction / N-Q-M / T / Deformed |
| 数値基準 | Phase 12 AcceptanceGate の oracle 方式に準拠 (Reference Business 001 固有の oracle は S-4 以降で固定) |

## 11. integrated 3D / CIM

| 項目 | 確定内容 |
|---|---|
| 統合3D | terrain + road + bridge + superstructure + substructure の統合シーン |
| CIM | Road CIM / 上部工・下部工 3D / GLB export |
| Layer | Lane V の Layer Contract に依存 (Wave 1 では要求を文書化のみ) |
| 視点 | 全景 / 橋梁区間 / 路面追従 / 谷俯瞰 等の camera preset を用意 |

## 12. Save / Load / Reopen

| 項目 | 確定内容 |
|---|---|
| 保存形式 | `.spacerproj` (spacerproj-json-v1)・project.json (canonical) |
| 保存タイミング | Auto Save (dirty 検知) + 明示 Save |
| 終了 → 再起動 | Electron restart 後 restoreFromPersistence で復元 |
| 再読込 | サンプル選択 → Project load → 同一状態復元 |
| 決定性 | canonical checksum 一致・可変メタデータは決定論判定から除外 |
| 契約 | [phase-a-persistence-automation-plan.md](phase-a-persistence-automation-plan.md) §4 Persistence Contract に従う |

## 13. expected outputs

| Deliverable ID | 成果 | 種別 |
|---|---|---|
| RD-01 | 平面線形/座標/要素表 | 表示 |
| RD-02 | 平面図 | DXF |
| RD-03 | 縦断図 | DXF |
| RD-04 | 横断図 | DXF |
| RD-05 | 道路計算書 | HTML/CSV |
| BL-01 | Bridge Layout | 表示 |
| BL-02 | span/support 表 | CSV |
| SS-01〜05 | 上部工 (入力UI/2D/DXF/Quantity/3D) | 表示+DXF+数量 |
| SB-01〜05 | 下部工 (3-pane/pile grid/座標表/Quantity/2D/3D) | 表示+数量+座標 |
| AN-01〜06 | Solver/IF3/Reaction/N-Q-M/T/Deformed/CSV | 表示+CSV |
| CIM-01〜02 | Integrated 3D / GLB | 表示+GLB |
| SYS-01〜03 | .spacerproj / Auto Save+restart / deliverables | 実ファイル+復元 |

## 14. acceptance scenario

詳細は [reference-business-001-acceptance-scenario.md](reference-business-001-acceptance-scenario.md) を参照。
最終受入シナリオ (13ステップ) を固定する。

1. sample選択
2. Project load
3. terrain表示
4. road表示
5. bridge表示
6. superstructure表示
7. substructure表示
8. analysis結果確認
9. integrated 3D
10. Save
11. Close
12. Reopen
13. 同一状態復元

## 15. Completion Gate

Reference Business 001 が「完成」であるとは、以下を**全て**満たすことをいう。

| # | Gate | 判定 |
|---|---|---|
| G1 | S-1 仕様確定 (本稿) | 本稿 DECIDED |
| G2 | S-2 郡上市八幡 Baseline 確定 | [reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md) |
| G3 | S-3 道路線形 Sample 準備完了 | [reference-business-001-road-sample.md](reference-business-001-road-sample.md) + fixture |
| G4 | 最終受入シナリオの全ステップが操作可能 (road/bridge/superstructure/substructure/analysis/CIM) | S-4〜S-12 |
| G5 | Save → Close → Reopen で同一状態復元 (canonical checksum 一致) | S-7/S-12 |
| G6 | 数値 oracle 適合 (解析・数量・座標) | S-10/S-12 |
| G7 | FROZEN 境界維持 (NOT_AUTHORIZED / HOLD / DEFER・値を発明しない) | 全S |
| G8 | 各 Lane (A/B/T/V/U) の Completion Gate と矛盾しない | 統合時 |
| G9 | `npm run test:full` + typecheck + build PASS (最終Gate) | 最終 |

## 16. 各 Lane から受け取る成果物

Reference Business 001 の完成に必要な Lane 別成果物を固定する。

| Lane | 受け取る成果物 | 依存する Reference Business 部分 |
|---|---|---|
| A | canonical ProjectModel / Persistence Contract・`.spacerproj` roundtrip・Schema Guard・migration | Save / Load / Reopen (G5) |
| B | site-context → SPACER mapping / Adapter・郡上市八幡 import 経路・sample metadata | terrain import (G2) |
| T | terrain baseline (CRS / bounds / GSI DEM / heightfield / SCT1)・郡上市八幡 Terrain fixture・reproducibility | terrain表示 (G2) |
| V | 統合 3D Viewer / Layer Contract / camera / integrated view | integrated 3D / CIM (G4) |
| U | canonical workflow・「Reference Business 001 を開く」入口 (sample 選択導線) | sample選択 → workflow 開始 |
| S | sample 仕様・input・fixture・acceptance scenario・expected result・完成プロジェクト組立 | 全体 |

Lane A/B/T/V/U の成果物が未整備の場合は、該当 Lane への要求として
[reference-business-001-lane-handoffs.md](reference-business-001-lane-handoffs.md) に明記する。

---

## 変更・更新方針

- 本仕様は Lane S の確定基準である。S-4 以降で仕様を具体化する際は、本稿の「最終完成像と受入条件」を
  変えない範囲で更新する。
- 設計値を発明しない。根拠のない値を「正式Baseline」として固定しない。
- 他 Lane 所有の production code・Schema は変更しない (要求事項として文書化のみ)。

## Related Documents

- [reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md) — S-2 郡上市八幡 Baseline
- [reference-business-001-road-sample.md](reference-business-001-road-sample.md) — S-3 道路線形 Sample
- [reference-business-001-acceptance-scenario.md](reference-business-001-acceptance-scenario.md) — 最終受入シナリオ
- [reference-business-001-tutorial-samples.md](reference-business-001-tutorial-samples.md) — Tutorial Sample 区別
- [reference-business-001-lane-handoffs.md](reference-business-001-lane-handoffs.md) — Lane A/B/T/V/U への要求・引渡し