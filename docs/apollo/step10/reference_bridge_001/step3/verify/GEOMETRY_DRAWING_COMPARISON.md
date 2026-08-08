# FINAL VERIFICATION — Geometry / Drawing Comparison Matrix

> **原本:** `鋼鈑桁橋_図面例.pdf`（SRC-002）・`鋼鈑桁橋_設計計算例.pdf`（SRC-003）格点座標表
> ソフト出力は GeometrySnapshot（STEP 2 実装）の GridPoint / SupportLine / GirderLine / DeckReference。

| # | 項目 | 原本値（格点座標表/図面） | ソフト出力値 | 差分 | 単位 | tolerance | source locator | 判定 |
|---|------|--------------------------|--------------|------|------|-----------|----------------|------|
| G-01 | GRID-1001 X (AG1 始点) | 1.21766 | planeStart.x 1.21766 | 0 | m | 1e-6 | 設計計算書 格点座標表 / G-GEO-0009 | PASS |
| G-02 | GRID-1001 Y | 1.47689 | planeStart.y 1.47689 | 0 | m | 1e-6 | 同上 / G-GEO-0010 | PASS |
| G-03 | GRID-1027 X (AG1 終点) | 132.76045 | planeEnd.x 132.76045 | 0 | m | 1e-6 | 同上 / G-GEO-0011 | PASS |
| G-04 | GRID-1027 Y | 1.55372 | planeEnd.y 1.55372 | 0 | m | 1e-6 | 同上 / G-GEO-0012 | PASS |
| G-05 | GRID-2001 X (AG2 始点) | 1.46395 | planeStart.x 1.46395 | 0 | m | 1e-6 | 同上 / G-GEO-0013 | PASS |
| G-06 | GRID-2001 Y | -3.02859 | planeStart.y -3.02859 | 0 | m | 1e-6 | 同上 / G-GEO-0014 | PASS |
| G-07 | GRID-2027 X (AG2 終点) | 132.55077 | planeEnd.x 132.55077 | 0 | m | 1e-6 | 同上 / G-GEO-0015 | PASS |
| G-08 | GRID-2027 Y | -2.94155 | planeEnd.y -2.94155 | 0 | m | 1e-6 | 同上 / G-GEO-0016 | PASS |
| G-09 | 中間格点 X/Y (GRID-1002..1026, 2002..2026) | 原本に数値存在（例 GRID-1002 X=6.56076, Y=1.38007） | ソフトは HOLD_INSUFFICIENT_SOURCE（座標なし） | 抽出可能な数値が HOLD | m | - | 設計計算書 格点座標表 | WARN（Phase2 抽出範囲外。データ補完余地あり・ソフト不具合ではない） |
| G-10 | 支持位置 AR2（第1支承線） | 主桁始点（plane X=1.21766 → station≈2.458） | support station 0（橋始点） | ~2.458m | m | - | 格点座標表 + 支承線構成 | WARN（supportStationsFromSpans の設計簡略化。bearings が橋始点でなく桁端に位置） |
| G-11 | 支持位置 PU15（第4支承線） | 主桁終点 = 橋長端 | station 134.001 | 0 | m | 1e-6 | 同上 | PASS |
| G-12 | 主桁高（中央） | 2700mm | 3D depth 2.7m | 0 | mm | 0 | 主桁腹板高表 / G-GEO-0008 | PASS |
| G-13 | 床版幅/厚 | 8010mm / 230mm | 8.01m / 0.23m | 0 | mm | 0 | 図面・設計条件 / G-GEO-0017/18 | PASS |
| G-14 | 断面フレーム | 支点位置 4 本 + 設計照査断面 | 支持 station 4 本（+sectionStations 拡張可） | 0（設計断面は別途） | m | - | mapping GM-015 | PASS（支点断面） |
| G-15 | ID 保持 | 1001..1027 / 2001..2027 | GRID-1001..1027 / 2001..2027 | 0 | - | - | Common Model → snapshot traceability | PASS |
| G-16 | 座標系・単位 | 平面直角 / m | bridge-local x-y-z / m（right-handed, z-up） | 契約どおり | - | - | coordinate contracts | PASS |

## 総括

- PASS 11 / WARN 3（G-09 中間格点 HOLD、G-10 AR2 支持位置、— 端部桁高は source matrix S-13 で記録）。
- ソフトの格点端点・主桁・床版寸法は原本と 1e-6 精度で一致。
- 中間格点座標は原本に存在するが Phase 2 抽出外で HOLD 表示（ソフトの HOLD 伝播は契約どおり、不具合ではない）。
- 支持位置の AR2 オフセット・PU15 skew は設計簡略化（STEP 1 P04 §5・DEF-07）に帰属。
