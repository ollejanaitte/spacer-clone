# STEP-1 P04 — Output / Drawing / Report Design（凍結）

Status: FROZEN（Step2実装の正本）

## 1. Purpose
backend 計算結果（X4-D / Vertical / Rule / Bridge Geometry）から、
道路線形計算書・座標表・縦断表・確認図・DXF・帳票を一貫して出力する
Output / Drawing / Report の契約と、frontend/backend 責務境界を確定する。

## 2. Scope
- 出力種別（表・図面・帳票・DXF・CSV）
- 出力項目一覧（P03 までに生成される値）
- 丸め・表示精度・単位規約
- frontend / backend 責務境界
- Report・Drawing・DXF の生成フロー

## 3. Non-scope
- 3D 表示（Step3）
- 印刷レイアウトの最終調整（UI 側）
- 既存 frontend 出力系の破壊的変更（backend から生成する新経路を追加）

## 4. 既存正本（再利用）
- frontend/src/liner/exports/（roadReport / roadCsvExport / linerPlanDxf /
  linerProfileDxf / haunchReportExport / hosoReportExport / ldistReportExport）
- frontend/src/liner/drawing/（builders / tables / sheet / renderers / print / dxf）
- frontend/src/liner/dxf/（mapper / serializer / presets）
- X2 DRAWING_REPORT_INTERFACE.md
- backend/rule_engine/models.py（RuleResult 等）

## 5. 出力種別と項目（凍結）

### 5.1 表（Table）
| 表 | 項目 | source |
|----|------|--------|
| 線形要素表 | 種別(S/R/A)・測点範囲・長さL・半径R・緩和パラメータA | X4-A/B |
| 主要点座標表 | BP/KA/KE/BC/EC/EBC/EP の station・X・Y・Z・R・A・L | X4-B + P01 vertical |
| 測点座標表 | 20m毎測点の station・X・Y・Z・heading・curvature | X4-D + P01 |
| 縦断表 | station・計画高Z・縦断勾配・縦断曲率 | P01 |
| 横断勾配表 | station・左右横断勾配・拡幅量 | P02 + X4-C |
| 道路端座標表 | left/right edge XYZ | X4-C/D |
| Pier座標表 / Girder座標表 / Node座標表 | P03 参照 | P03 |
| 格点間距離表・張出し長表 | P03 参照 | P03 |

### 5.2 図面（Drawing / DXF）
| 図面 | 内容 |
|------|------|
| 平面線形図 | 中心線・要素境界・主要点・道路端 |
| 縦断図 | 計画高・勾配区間・縦断曲線 |
| 横断図 | 幅員構成・横断勾配 |
| Pier確認図 / Span確認図 | P03 結果の投影 |
| 座標テーブル図 | 測点・主要点・格点 |

- 既存 frontend の `linerPlanDxf` / `linerProfileDxf` を拡張 or backend 生成経路を新設
- DXF バージョン・レイヤ規約は既存 dxf/ の presets を正本

### 5.3 帳票（Report）
- HTML 計算書（roadReport 既存の形式を正本）
- CSV 一括出力（roadCsvExport）
- 出力は「入力 → 計算 → チェック → 帳票 → 図面」を一本のパイプラインで接続

## 6. 丸め・表示精度・単位（凍結）
| 項目 | 単位 | 表示精度 | 備考 |
|------|------|----------|------|
| station | m | 3桁（0.001） | 測点表記は表示層で変換 |
| X / Y | m | 3桁 | 内部float64, 表示のみ丸め |
| Z (計画高) | m | 3桁 | 表示のみ丸め |
| grade | % | 3桁 | 内部ratio |
| curvature | 1/m | 6桁 | 内部値 |
| R | m | 表示は1/Rから再計算 | curvature↔R変換 |
| 距離（格点間・張出し） | m | 3桁 | P03 |
| 角度（heading・skew） | rad/deg | 4桁 | 単位は context で指定 |

原則: 内部計算値は丸めない。丸めは出力層（formatter）のみ。
rounding を backend で行う場合と frontend で行う場合を分離し、DXF/帳票/CSV で同じ
formatter を共有（`backend/rule_engine/output/format.py` を新設想定）。

## 7. frontend / backend 責務境界
- backend: 計算・検証・値の供給（純粋データ、整形前の数値 + 表示用フォーマッタ）
- frontend: レイアウト・描画・印刷・ユーザー操作（既存 drawing/dxf を拡張）
- 境界: 「backend は計算結果と整形規約を返し、frontend はそれを表示/印刷する」
  backend は HTML/DXF を直接生成してもよいが、数値計算は backend 一元（重複禁止）

## 8. 生成フロー
```
backend計算 (X4-D + P01 vertical + P02 rules + P03 bridge)
   │  RoadGeometryResult / VerticalResult / RuleResult / BridgeGeometryResult
   ▼
backend/rule_engine/output/
   ├─ format.py      … 丸め・単位・表示精度
   ├─ tables.py      … 表データ組み立て
   ├─ reports.py     … 帳票（HTML/CSV）
   └─ dxf.py         … DXF 生成（既存frontend方式と互換）
   │
   ▼
frontend（表示・印刷・確認図）or 直接ファイル出力
```

## 9. バリデーション
- 出力対象の測点・値の範囲チェック（NaN/inf 検出）
- 帳票・DXF 生成時の readback（DXF 再読込で座標一致）テストを Step2 で
- 出力値と内部計算値の分離（replay で使用、P06）

## 10. Test strategy / Golden Master
- format: 丸め・単位の hand-computed オラクル
- tables: 各表の列・行・値が RoadGeometryResult と一致
- DXF: 既存 dxf テストと互換（readback）
- Report: HTML に値が正しく埋まる
- Golden Master: SRC-008 サンプル道路線形計算例・SRC-004 LINER計算書の
  表記（X/Y/R/A/L の桁数）と一致（P06 replay と接続）

## 11. Traceability
- SRC-001 JIP-LINERマニュアル（帳票・確認図・Plot viewer）
- SRC-004 サンプルLINER計算書（出力表の形式）
- SRC-008 サンプル道路線形計算例
- frontend/src/liner/exports・drawing・dxf（既存正本）
- X2 DRAWING_REPORT_INTERFACE.md

## 12. Acceptance criteria（Step2用）
- [ ] backend/rule_engine/output/ が全表・帳票・DXF を生成
- [ ] 丸め・精度規約が全出力で一致
- [ ] DXF readback 一致
- [ ] 実計算書（SRC-004/008）との数値表記一致（replay）
- [ ] X4-D 系に退行なし
