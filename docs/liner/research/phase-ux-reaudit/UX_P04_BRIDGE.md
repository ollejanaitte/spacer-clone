# UX-REAUDIT P04 — Pier / Span / Girder / Node Visual Guidance（凍結）

Status: FROZEN

## 1. Screen
- Screen ID: `B-BRIDGE`
- 既存: LinerEditPage > BridgeLayoutEditor + BridgeLayoutDiagnosticsPanel + bridgeLayoutSkew.ts
- Purpose: Pier / Span / Girder / Node の入力・編集を橋梁確認図（平面/断面）と対応付けて行う
- 対応設計正本: STEP1 P03 Bridge Geometry

## 2. 既存正本（再利用）
- `BridgeLayoutEditor.tsx`（PierDraft: skewAngleRad/skewMode/skewDegrees/bearingOffset、SpanDraft）
- `bridgeLayoutSkew.ts`（skew 変換）
- `BridgeLayoutDiagnosticsPanel.tsx`
- STEP1 P03（Pier/Span/Girder/Node/skew/格点間距離/張出し長）
- X4-C RoadBridgeResult（Road→Bridge 入力）

## 3. 入力項目と模式図要件（VISUAL_GUIDANCE_MATRIX の B-BRIDGE 部）

| フィールド | 図種別 | 図中表示対象 | 強調 | 更新 |
|------------|--------|--------------|------|------|
| Pier 追加/削除 | PLAN | ピア位置（測点） | ピアマーカー | 選択時 |
| Pier station | PLAN | ピア横断ライン位置 | ピアライン + station ラベル | 入力即時 |
| Pier skew（交角） | PLAN | ピア軸と橋軸の交角 | 角度弧 + 度数ラベル | 入力即時 |
| bearingOffset | PLAN | 支承位置オフセット | 支承マーカー | 入力即時 |
| Span 追加/削除 | PLAN | 支間範囲 | 支間ハイライト + 支間長ラベル | 選択時 |
| Span start/end pier | PLAN | 支間両端ピア | ピア間を結線 | 入力即時 |
| Girder line | PLAN/SECTION | 主桁ライン位置 | 主桁ライン色分け | 入力即時 |
| Girder offset | SECTION | 基準線からの横断オフセット | 主桁マーカー + 寸法線 | 入力即時 |
| Node（格点） | PLAN | 主桁×ピア交点 | 格点マーカー | 計算時 |
| 格点間距離 | PLAN | 隣接格点の結線 | 距離寸法線 | 計算時 |
| 張出し長 | SECTION | 道路端と最外主桁の差 | 張出しハッチ + 寸法線 | 計算時 |

## 4. FIELD → DIAGRAM MAPPING（B-BRIDGE）
| 入力欄 | 図中要素 | 逆引き |
|--------|----------|--------|
| pier station | ピアライン | 図上でピアをドラッグ→測点変更 |
| skew | 交角弧 | 角度ハンドルドラッグ |
| bearingOffset | 支承マーカー | マーカードラッグ |
| span pier 選択 | 支間結線 | ピア間クリックで span 生成 |
| girder offset | 主桁マーカー | マーカードラッグ |

## 5. 模式図仕様（MIXED: PLAN + SECTION）
- 基準線: 道路中心線（X4-D tangent）
- PLAN 図: 中心線 + ピアライン（skew 表示）+ 支間範囲 + 主桁ライン + 格点
- SECTION 図: 基準線と主桁位置（offset）+ 張出し長
- 進行方向: station 増加方向（P01 と同一）
- skew 符号: 橋軸と支承ラインの交角、右回り正（Step1 P03 と同一規約）
- 格点間距離: 隣接 Node の結線に寸法線
- 張出し長: 道路 edge と最外主桁の横断差分をハッチ + 寸法線

## 6. LIVE PREVIEW
- INPUT PREVIEW: pier station / skew / bearingOffset / girder offset の即時反映
- VALIDATED PREVIEW: 範囲チェック（pier が alignment 内、girder が道路幅員内）後
- CALCULATED RESULT: BridgeGeometryResult（node 座標・格点間距離・張出し長）を重ねて表示

## 7. ERROR / WARNING 図示
- FIELD ERROR: skew 範囲外（0〜90）・offset 非有限 → 欄赤枠 + 図中赤
- GEOMETRY ERROR: Pier が alignment 範囲外 / Girder が section 外 / Node 重複 → 図中該当箇所を赤
- 警告: 張出し長超過・格点距離が基準外 → 該当箇所を黄（Rule と連動）
- clearance（桁下空間）警告: Rule X2-R-023 と連動（Step2）

## 8. UI LAYOUT（B-BRIDGE）
- 中央: PLAN 確認図（BridgeLayoutEditor 拡張、SVG）
- 下部: SECTION 図（主桁オフセット・張出し長）
- 左: Pier 一覧・入力（skew/bearingOffset）
- 右: Span 一覧 + Girder 一覧 + BridgeLayoutDiagnosticsPanel

## 9. レスポンシブ / Accessibility
- 広幅: PLAN中央・入力左右。狭幅: タブ切替
- 図の aria-label・キーボード操作（P01 と同一方針）

## 10. Backend/API 接続
- 入力: PierDraft / SpanDraft（frontend）
- 計算: Step2 P03 bridge_geometry（backend）→ BridgeGeometryResult
- 入力: X4-C RoadBridgeResult（road geometry）
- 計算タイミング: 入力 debounce 再計算 + 正式計算

## 11. Acceptance Criteria
- [ ] pier station/skew/bearingOffset/girder offset の即時図反映
- [ ] skew 交角・格点・格点間距離・張出し長の自動図示
- [ ] 範囲外/重複が図とフォーム両方に表示
- [ ] 既存 BridgeLayoutEditor と互換（拡張のみ）
- [ ] Step2 P03 bridge_geometry と数値一致

## 12. Traceability
- STEP1 P03（Bridge Geometry / skew / 格点間距離 / 張出し長）
- BridgeLayoutEditor / bridgeLayoutSkew / RoadBridgeResult
- JIP-LINER: ピア確認図・スパン確認図・格点間距離・張出し長（視覚思想の再設計）
