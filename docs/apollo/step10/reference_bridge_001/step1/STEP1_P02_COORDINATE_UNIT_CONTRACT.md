# STEP 1-P02 — COORDINATE_UNIT_CONTRACT

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本（変更しない）:** `phase6_0/coordinates/*`（6 契約 + conversion matrix 16 変換）・Phase 5 `coordinate_axis_contract.md`
> **本ドキュメントの役割:** 全 Phase（6-2..9）で使う座標・単位の集約インデックス + 解析/設計/3D/出力への適用

## 1. 座標系（集約）

| 座標系 | 軸 | 単位 | 正方向 | 正本 |
|--------|-----|------|--------|------|
| Global Cartesian | X / Y / Z | m | 右手系, +Z up | `coordinates/global_coordinate_contract.md` |
| Bridge-local | x=longitudinal, y=transverse, z=vertical | m | 右手系, y は down-station を見て右正, z up | `coordinates/local_bridge_coordinate_contract.md` |
| Member-local | 要素方向 + 2 軸 | m / rad | LINER LocalFrame（tangent/normal/binormal） | `coordinates/member_local_axis_contract.md` |
| station/offset/elevation | station(m), offset(m), elevation(m) | m | offset 右正, elevation up | `coordinates/station_offset_elevation_contract.md` |
| skew / crossfall | rad / % | rad(display deg 保持) | skew: +Z CCW looking down-station; crossfall 右下正 | `coordinates/skew_crossfall_contract.md` |
| plane-grid（RB-001 格点） | ローカル X/Y | m | 別 context（DUP-030）→ global 変換を 6-2 で定義 | `global_coordinate_contract.md` §5 |

## 2. 単位（集約）

| 量 | 正規単位 | 表示単位 | 備考 |
|----|----------|----------|------|
| 長さ | m | m（図面/STL は mm 表示/出力） | m↔mm は Export Connector の単一ポリシー |
| 角度 | rad | deg | source deg 保持、rad が正規 |
| 力 | kN | kN | backend solver kN |
| モーメント | kN·m | kN·m | |
| 分布荷重 | kN/m | kN/m | |
| 応力 | kN/m²（=kPa） | MPa | 設計照査では MPa（要 conversion 宣言） |
| 単位体積重量 | kN/m³ | kN/m³ | |
| 断面 2 次モーメント | m⁴ | cm⁴（表示可） | |
| 断面係数 | m³ | cm³（表示可） | |

## 3. 適用（Phase 6-2..9）

- **Phase 6-2（Bridge Geometry）**: station/offset/elevation + plane-grid→global 変換を
  GeometrySnapshot の `coordinateSystem`（`source` に由来明記）で宣言。座標変換は
  `coordinate_conversion_matrix.csv` に追加して宣言。
- **Phase 6-3（3D）**: display 変換（Z-up→Y-up 等）は 3D Connector のみ。表示スケール・
  色・camera はモデルに非保存。STL は mm、DXF は mm。
- **Phase 6-4（解析）**: backend は m/kN。結果は IF3 正規化（単位 label は宣言のみ、数値 binding は認証後）。
- **Phase 7（設計）**: 入力は m/kN/MPa で正規化。出力（計算書）は表示規約（有効桁）に従い、
  丸めは表示層のみで実行（計算値は高精度保持）。
- **Phase 8（出力）**: 図面 mm / 数量 m・kg / CSV は明示単位列。

## 4. 丸め・有効桁（表示層の責務）

- 計算は内部高精度（double）。丸め・有効桁は表示/出力層のみ。
- 計算書数値と画面数値の丸め責務を分離（計算書=`unit_tolerance_precision_contract` の規約）。
- Replay/照合は tolerance 付き比較（`GOLDEN_REPLAY_SPEC` に定義）。

## 5. 監査チェック（横断）

- 同じ座標・単位変換を frontend/backend で二重実装しない。
- 隠れた座標変換・単位変換がないこと（全変換は conversion matrix に宣言）。
- 3D/図面/数量が独自 geometry を持たないこと（GeometrySnapshot を唯一の source とする）。
