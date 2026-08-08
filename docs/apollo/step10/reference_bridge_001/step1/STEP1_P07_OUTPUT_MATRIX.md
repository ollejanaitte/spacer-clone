# STEP 1-P07 — OUTPUT_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（Phase 8/9 出力）
> **正本:** `apollo/{drawing,report,quantity,output,export}`・`backend/app/reports.py`・`liner/dxf`・`3d-stl/10_stl_export_design.md`

## 出力一覧

| 出力 | 入力 | generator | format | unit | precision | file naming | UI trigger |
|------|------|-----------|--------|------|-----------|-------------|-----------|
| 計算書 | 設計結果+照査結果 | `apollo/report` reportModel + reportExport（認証後正式化） | HTML/JSON/PDF | m/kN/kN·m/MPa | 計算書規約（有効桁） | `report-{bridgeId}-{revision}.pdf` | 計算書生成ボタン（GRANTED 後） |
| 図面（GA） | GeometrySnapshot+設計結果 | `apollo/drawing` drawingSetModel（G-01..07）+ drawingSetExport | SVG/DXF/PDF | mm | 図面規約 | `ga-{bridgeId}-{sheet}.dxf` | GA 出力ボタン |
| 標準断面図 | 断面定義 | `apollo/drawing` drawingModel（S-01） | SVG/DXF/PDF | mm | 図面規約 | `sec-{bridgeId}-{S0x}.dxf` | 標準断面出力 |
| 部材表 | member schedule | `apollo/drawing` memberScheduleModel | CSV/JSON | m/kg | 数量規約 | `member-schedule-{bridgeId}.csv` | 出力統合 |
| 数量表 | GeometrySnapshot+断面 | `apollo/quantity` quantityModel + quantityExport | CSV/JSON | m·kg·m³ | 数量規約（basis 明記） | `quantity-{bridgeId}.csv` | 数量出力ボタン |
| 解析結果 CSV | 解析結果 | `backend/app/reports.py` | CSV | m/rad/kN/kN·m | 解析精度 | `reactions-{case}.csv` 等 | 解析結果 CSV ボタン |
| STL | GeometrySnapshot solids | `apollo/export` exportApolloBinaryStl | STL(binary)+.apollo.json | mm | JSCAD | `{bridgeId}.stl` + `.apollo.json` | STL 出力ボタン |
| DXF（図面） | drawing model | `liner/dxf` + drawing export | DXF | mm | 図面規約 | `sheet-{n}.dxf` | 図面 DXF |
| 統合 ZIP | 全 artifact | `apollo/output` outputIntegration | ZIP | — | — | `output-{bridgeId}.zip` | 出力統合ボタン |

## 規則

- 各出力は「入力の checksum + manifest」を持ち、入力と出力の整合を検証（既存 artifactBundle / outputIntegration 踏襲）。
- 正式出力（計算書 PDF・承認図面）は認証ゲート（GRANTED）を透過しない。
- 図面・STL・DXF は GeometrySnapshot 由来（独自 geometry 禁止）。丸め・単位変換は表示/出力層のみ。
- CSV は明示単位列（m/kN/MPa 等）。
