# UX-REAUDIT P01 — Horizontal Alignment Visual Guidance（凍結）

Status: FROZEN

## 1. Screen
- Screen ID: `H-ALIGN`
- 既存: LinerEditPage > HorizontalElementEditor + LinerGridPreview（PLAN 図は既存）
- Purpose: 水平線形（LINE/ARC/CLOTHOID）の要素追加・編集を、平面模式図と対応付けて行う

## 2. 既存正本（再利用）
- `HorizontalElementEditor.tsx`（入力フィールド: startX/startY/azimuth/length/radius/
  clothoidParameter/startRadius/endRadius/turn）
- `LinerGridPreview.tsx`（SVG 平面グリッド + 軸線ポリライン）
- X4-A Geometry Kernel（R/A/L・turn・tangent/normal/curvature）
- X4-B Alignment Solver（station / offset / 主要点 BP/KA/KE/BC/EC/EBC/EP）

## 3. 入力項目と模式図要件（VISUAL_GUIDANCE_MATRIX の H-ALIGN 部）

| フィールド | 図種別 | 図中表示対象 | 強調 | 更新タイミング |
|------------|--------|--------------|------|----------------|
| 要素種別 straight/arc/clothoid | PLAN | 対象要素線種 | 選択要素太線 | 選択時 |
| startX / startY | PLAN | 要素始点座標 | 始点マーカー + 座標ラベル | 入力即時 |
| azimuth | PLAN | 始点における接線方向 | 方位角矢印 + 角度表記 | 入力即時 |
| length (L) | PLAN | 要素長 | 寸法線（接線方向） | 入力即時 |
| radius (R) | PLAN | 円弧中心・半径 | 中心点 + 半径寸法線 + Rラベル | 入力即時 |
| turn (left/right) | PLAN | 円弧曲がり方向 | 進行方向+旋回矢印（左=時計回り表示） | 入力即時 |
| clothoidParameter (A) | PLAN | クロソイド形状 | A値ラベル + 曲率変化表示 | 入力即時 |
| startRadius / endRadius | PLAN | クロソイド両端曲率 | 両端曲率円表示 | 入力即時 |
| station（測点） | PLAN | station 目盛 | 測点マーカー | 計算時 |
| BP/BC/EC/KA/KE/EBC/EP | PLAN | 主要点 | 主要点マーカー + 記号ラベル | 計算時 |

## 4. FIELD → DIAGRAM MAPPING（H-ALIGN）
| 入力欄 | 図中要素 | 逆引き（図→欄） |
|--------|----------|------------------|
| startX/startY | 始点マーカー | 図の点をクリック→欄へ反映 |
| azimuth | 接線方位矢印 | 矢印ドラッグで方位変更（角度スナップ） |
| length | 要素寸法線 | 寸法線ドラッグで長さ変更 |
| radius | 半径寸法線 | 半径ハンドルで調整 |
| turn | 旋回矢印 | 矢印クリックで左右反転 |
| clothoidParameter | Aラベル | ハンドルで調整 |

## 5. 模式図仕様（PLAN）
- 基準線: 道路中心線（既存 LinerGridPreview の axis polyline を再利用）
- 進行方向: station 増加方向（矢印で明示）
- 左右: station 進行方向に向かって右=正（X4-C と同一規約）
- 座標: グリッド + 軸ラベル（既存グリッド再利用）
- 寸法線: R・A・L は図中で数値ラベル付き寸法線
- 要素選択: クリックで要素ハイライト、対応する編集行をアクティブ化
- 現在編集中フィールドの強調: 該当フィールドの図中対象（Rなら半径線）を強調色

## 6. LIVE PREVIEW
- INPUT PREVIEW: 数値入力に応じて要素形状を即時描画（簡略近似 OK と明示）
- VALIDATED PREVIEW: 入力値の範囲・連続性チェック通過後
- CALCULATED RESULT: X4-B 計算後の主要点・座標・station を重ねて表示
- 連続性（C0/C1/G0/G1）は ContinuityDiagnosticsPanel と連動（不連続点を図示）

## 7. ERROR / WARNING 図示
- FIELD ERROR: 入力欄（R≤0・A≤0・length≤0・azimuth範囲外）赤枠 + 図中の該当寸法を赤
- GEOMETRY ERROR: 要素間不連続・station 範囲外 → 図中の該当接続点を赤
- 警告: 曲線長不足・緩和不足 → 該当要素を黄（Rule Engine X2-R-008/020/021 と連動）

## 8. UI LAYOUT（H-ALIGN）
- 左: 要素リスト（行: 種別・R/A/L・turn）
- 中央: PLAN 模式図（LinerGridPreview 拡張）
- 右: 選択要素の詳細入力（HorizontalElementEditor 拡張）
- 下部: 連続性・主要点診断（ContinuityDiagnosticsPanel）

## 9. レスポンシブ
- 広幅: 3カラム（リスト/図/入力）
- 狭幅: タブ切替（図タブ・入力タブ）。図は常にスワイプで参照可能
- 図は SVG（ピクセル比対応、既存 LinerGridPreview を踏襲）

## 10. Accessibility
- 図に aria-label（既存 LinerGridPreview の canvasLabel 踏襲）
- キーボード: 図内要素は Tab でフォーカス → Enter で選択
- 色以外でも状態を示す（線種・マーカー形状）

## 11. Backend/API 接続
- 入力は frontend LinerDraft（schema/types.ts の HorizontalElementDraft）
- 計算: X4-D RoadGeometryAPI（station→XY/heading/curvature）
- 主要点: X4-B（BP/KA/KE/BC/EC/EBC/EP）
- 連続性: X4-B continuity
- 計算タイミング: 入力変更時の debounce 再計算（frontend 側）

## 12. Acceptance Criteria
- [ ] 要素選択→図中ハイライト→対応行アクティブ化
- [ ] R/A/L/azimuth/turn の入力で図が即時更新
- [ ] 図中クリック/ハンドル→入力欄反映（双方向）
- [ ] 主要点・station・連続性が計算結果として図示
- [ ] FIELD ERROR / GEOMETRY ERROR が図とフォーム両方に表示
- [ ] 既存 X4-A/B に退行なし

## 13. Traceability
- X4-A/B 設計書（STEP1 P00/P01）
- HorizontalElementEditor / LinerGridPreview
- JIP-LINER: ライン設定・要素表・ライン確認図（視覚思想の再設計）
