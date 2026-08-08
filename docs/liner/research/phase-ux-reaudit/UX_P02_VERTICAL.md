# UX-REAUDIT P02 — Vertical Geometry Visual Guidance（凍結）

Status: FROZEN

## 1. Screen
- Screen ID: `V-PROF`
- 既存: LinerEditPage > VerticalElementEditor + VerticalProfileChart（PROFILE 図は既存）
- Purpose: 縦断勾配・VPI・縦断曲線の入力・編集を縦断模式図と対応付けて行う
- 対応設計正本: STEP1 P01 Vertical Geometry（grade / parabolic、VPI 表現）

## 2. 既存正本（再利用）
- `VerticalElementEditor.tsx`（startStation/endStation/startElevation/gradePercent/
  startGradePercent/endGradePercent/curveType）
- `VerticalProfileChart.tsx`（SVG 縦断プロファイル）
- `VerticalDiagnosticsPanel.tsx`
- STEP1 P01（VerticalGeometry / VPI / VCL / test vectors）
- frontend schema `VerticalGradeElementDraft` / `VerticalParabolicElementDraft`

## 3. 入力項目と模式図要件（VISUAL_GUIDANCE_MATRIX の V-PROF 部）

| フィールド | 図種別 | 図中表示対象 | 強調 | 更新タイミング |
|------------|--------|--------------|------|----------------|
| 要素種別 grade/parabolic | PROFILE | 対象縦断要素 | 選択要素太線 | 選択時 |
| startStation / endStation | PROFILE | 要素区間（水平軸） | station 範囲ハイライト | 入力即時 |
| startElevation | PROFILE | 始点標高（垂直軸） | 始点マーカー + 標高ラベル | 入力即時 |
| grade (勾配) | PROFILE | 勾配線の傾き | 勾配矢印 + % ラベル | 入力即時 |
| startGrade / endGrade | PROFILE | 縦断曲線両端勾配 | 両端接線矢印 | 入力即時 |
| curveType (crest/sag) | PROFILE | 曲線の凸凹 | 曲線ハイライト（上に凸/下に凸） | 入力即時 |
| VPI（勾配交点） | PROFILE | VPI 位置 | VPI マーカー + station/標高ラベル | 自動算出 |
| VCL（縦断曲線長） | PROFILE | 曲線区間長 | 曲線区間寸法線 | 自動算出 |
| elevation Z（任意station） | PROFILE | 指定 station の計画高 | 縦断面の点 + 十字カーソル | 入力即時 |

## 4. FIELD → DIAGRAM MAPPING（V-PROF）
| 入力欄 | 図中要素 | 逆引き（図→欄） |
|--------|----------|------------------|
| startStation/endStation | 区間両端の垂直破線 | 破線ドラッグで区間変更 |
| startElevation | 始点マーカー | 始点ドラッグで標高変更 |
| grade/startGrade/endGrade | 接線矢印 | 矢印ドラッグで勾配変更（%スナップ） |
| curveType | 曲線ハイライト | 曲線クリックで type 切替 |
| VPI | VPI マーカー | マーカーを station 上で移動（隣接勾配を再計算） |

## 5. 模式図仕様（PROFILE）
- 基準線: 縦断計画高線（VerticalProfileChart を再利用）
- 水平軸: station（m）、垂直軸: 標高 Z（m）（縦横スケールは別途、ひずみありを明示）
- 進行方向: 左→右 = station 増加（道路進行方向と一致）
- 上り/下り: 勾配矢印で明示（上り=正、Step1 P01 と同一規約）
- 勾配の正負: station 増加方向で標高上昇 = 正
- 縦断曲線: 上に凸（crest）を負・下に凸（sag）を正の縦断曲率で表現（Step1 P01 と同一）
- VPI は parabolic 両端勾配の交点として自動作図

## 6. LIVE PREVIEW
- INPUT PREVIEW: 勾配/標高入力で縦断線を即時再描画
- VALIDATED PREVIEW: 連続性（G0 標高一致）・勾配範囲チェック後
- CALCULATED RESULT: P01 solver の station→Z を重ねて表示（既存 verticalSampling と一致）
- 縦断曲線と勾配区間の境界（VPI・VCL 位置）を自動ラベル

## 7. ERROR / WARNING 図示
- FIELD ERROR: 勾配範囲外・標高非有限 → 入力欄赤枠 + 図中該当線分を赤
- GEOMETRY ERROR: G0 不連続（要素境界で標高不一致）→ 境界点を赤 + 差分量ラベル
- 警告: 勾配が道路構造令の最大縦断勾配超過 → 該当区間を黄（Rule X2-R-011 と連動）
- 縦断曲線長不足 → 曲線区間を黄（X2-R-012 と連動）

## 8. UI LAYOUT（V-PROF）
- 上: PROFILE 模式図（VerticalProfileChart 拡張）
- 下: 要素リスト + 選択要素の詳細入力（VerticalElementEditor 拡張）
- 右: VerticalDiagnosticsPanel（連続性・勾配照査）

## 9. レスポンシブ / Accessibility
- 広幅: 図上・入力下。狭幅: 図タブ・入力タブ切替
- 図の aria-label・キーボードフォーカス対応（P01 と同一方針）

## 10. Backend/API 接続
- 入力: frontend VerticalAlignmentDraft
- 計算: Step2 P01 vertical solver（backend）→ station→Z/grade
- 照査: X2-R-011 longitudinal_grade / X2-R-012 vertical_curve（Rule Engine）
- 計算タイミング: 入力 debounce 再計算 + 計算実行時の正式結果

## 11. Acceptance Criteria
- [ ] grade/parabolic の入力で縦断線が即時更新
- [ ] VPI・VCL・crest/sag が自動図示
- [ ] G0 不連続・勾配超過が図とフォーム両方に表示
- [ ] 任意 station の Z を図上で確認可能
- [ ] 既存 verticalSampling と数値一致

## 12. Traceability
- STEP1 P01（VerticalGeometry / VPI / VCL / test vectors）
- VerticalElementEditor / VerticalProfileChart
- JIP-LINER: 縦断勾配・断面高さデータ（視覚思想の再設計）
