# UX-REAUDIT P03 — Cross Section / Road Rule Visual Guidance（凍結）

Status: FROZEN

## 1. Screen
- Screen ID: `X-SECT`
- 既存: LinerEditPage > CrossSectionTemplateEditor + CrossSectionPreview + SuperelevationEditor + WidthChangePointEditor + CrossfallIntervalEditor + CrossSlopeIntervalEditor
- Purpose: 幅員構成・横断勾配・片勾配すり付け・拡幅を、横断模式図と対応付けて入力する
- 対応設計正本: STEP1 P02 Road Rules + X4-C Cross Section

## 2. 既存正本（再利用）
- `CrossSectionPreview.tsx`（ロール別色・crossfall・offset を描画、SVG SECTION）
- `CrossSectionTemplateEditor.tsx` / `WidthChangePointEditor.tsx` / `CrossfallIntervalEditor.tsx`
- `SuperelevationEditor.tsx`（片勾配）
- `CrossSectionDiagnosticsPanel.tsx`
- X4-C width / crossfall / pivot / road edge / global XYZ
- STEP1 P02（X2-R-020 widening / X2-R-022 superelevation transition）

## 3. 入力項目と模式図要件（VISUAL_GUIDANCE_MATRIX の X-SECT 部）

| フィールド | 図種別 | 図中表示対象 | 強調 | 更新 |
|------------|--------|--------------|------|------|
| 車線/路肩/中央帯 幅員 width | SECTION | 該当ロールの横断区間 | 区間色（既存 ROLE_COLORS）+ 幅員寸法線 | 入力即時 |
| offset ライン位置 | SECTION | オフセットライン | 選択ライン太線 | 入力即時 |
| crossfall（横断勾配%） | SECTION | 傾斜面と勾配矢印 | 傾斜線 + %ラベル | 入力即時 |
| crown（クラウン） | SECTION | 頂点位置 | クラウンマーカー | 入力即時 |
| pivot（基準軸） | SECTION | 回転軸 | pivot 破線 + ラベル | 入力即時 |
| road edge | SECTION | 道路端 | edge マーカー（既存 edge 色） | 入力即時 |
| section height | SECTION | 断面高さ | 高さ寸法線 | 入力即時 |
| widening（拡幅量） | SECTION | 拡幅区間 | 拡幅分ハッチング | 計算時（Rule） |
| 片勾配すり付け | MIXED(PLAN+SECTION) | すり付け区間の横断勾配遷移 | 勾配遷移カラーバー | 計算時（Rule） |

## 4. FIELD → DIAGRAM MAPPING（X-SECT）
| 入力欄 | 図中要素 | 逆引き |
|--------|----------|--------|
| width（各ロール） | 区間幅 | 区間境界ドラッグで幅変更 |
| crossfall % | 勾配矢印 | 矢印ドラッグで勾配変更 |
| pivot offset | pivot 破線 | 破線ドラッグで移動 |
| crown | クラウンマーカー | マーカードラッグ |
| widening | 拡幅ハッチ | ハンドル調整 |
| すり付け長 | 遷移バー範囲 | 範囲ドラッグ |

## 5. 模式図仕様（SECTION）
- 基準線: 道路中心線（offset 0）。右=正（X4-C と同一）
- 幅員: ロール別色 + 幅員寸法線（既存 CrossSectionPreview を再利用）
- 横断勾配: 傾斜面 + 勾配矢印 + %（右下がりを正、schema の CrossSlopeDraft と同一）
- pivot: 回転軸（CENTERLINE / CUSTOM_OFFSET）を破線表示
- crown: 頂点位置マーカー（幅員中央 or 指定）
- road edge: 左右端点マーカー
- すり付け遷移: 測点方向のカラーバーで横断勾配の遷移を可視化（Step1 P02 と連動）

## 6. LIVE PREVIEW
- INPUT PREVIEW: 幅員・勾配変更で断面即時再描画
- VALIDATED PREVIEW: width≥0・勾配範囲チェック後
- CALCULATED RESULT: X4-C generate_global_section の section_points / road edge XYZ
- すり付け区間: Rule（X2-R-022）の遷移結果を station 列でプレビュー

## 7. ERROR / WARNING 図示
- FIELD ERROR: width<0・crossfall 非有限 → 欄赤枠 + 図中該当区間を赤
- GEOMETRY ERROR: 横断勾配方向不整合（crown と左右勾配の矛盾）→ 図中該当傾斜面を赤
- 警告: 拡幅量・すり付け長が基準未達 → 該当区間を黄（X2-R-020/022 と連動）
- Rule 照査結果（curve-length / clearance）も図中に警告表示

## 8. UI LAYOUT（X-SECT）
- 中央: SECTION 模式図（CrossSectionPreview 拡張）
- 左: オフセットラインリスト（WidthChangePointEditor）
- 右: 横断勾配・pivot 入力（CrossfallIntervalEditor / SuperelevationEditor）
- 下部: すり付け遷移バー + CrossSectionDiagnosticsPanel

## 9. レスポンシブ / Accessibility
- 広幅: 図中央・入力左右。狭幅: タブ切替
- 図の aria-label・キーボード操作（P01 と同一方針）
- 色と線種の併用（色覚対応）

## 10. Backend/API 接続
- 入力: CrossSectionTemplateDraft / WidthChangePointDraft / CrossSlopeIntervalDraft
- 計算: X4-C width/crossfall/geometry/global_xyz
- Rule: X2-R-020 widening / X2-R-022 superelevation transition（Step2 実装）
- 計算タイミング: 入力 debounce 再計算 + 正式計算

## 11. Acceptance Criteria
- [ ] width/crossfall/pivot/crown/edge が図で即時反映
- [ ] widening・すり付け遷移が図で可視化
- [ ] width<0・勾配不整合が図とフォーム両方に表示
- [ ] 既存 CrossSectionPreview と互換（拡張のみ）
- [ ] X4-C に退行なし

## 12. Traceability
- STEP1 P02（widen/curve-length/superelevation transition/clearance）
- X4-C crosssection model（width/crossfall/pivot）
- CrossSectionPreview / CrossSectionTemplateEditor / SuperelevationEditor
- JIP-LINER: 横断勾配・断面高さ設定・標準断面図（視覚思想の再設計）
