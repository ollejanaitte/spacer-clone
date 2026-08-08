# UX-REAUDIT P05 — Output / Drawing / Project Replay Visual Guidance（凍結）

Status: FROZEN

## 1. Screen
- Screen ID: `O-OUTPUT`
- 既存: LinerFormalDrawingWorkspacePage（平面線形図/縦断線形図/横断図）+ DrawingDocumentSvg + printFormalDrawing + PlanElevationTable + LinerPreviewPage
- Purpose: 計算結果の確認・帳票・図面・DXF 出力と、Project Replay の比較を視覚的に行う

## 2. 既存正本（再利用）
- `LinerFormalDrawingWorkspacePage.tsx`（正式図面ワークスペース、Sheet 切替・印刷）
- `DrawingDocumentSvg` / `printFormalDrawing`
- `PlanElevationTable.tsx`（測点・計画高・勾配テーブル）
- `LinerPreviewPage.tsx`
- `exports/`（roadReport / roadCsvExport / linerPlanDxf / linerProfileDxf）
- STEP1 P04 Output / P06 Replay

## 3. 出力画面と模式図要件（VISUAL_GUIDANCE_MATRIX の O-OUTPUT 部）

| 出力項目 | 図種別 | 図中表示 | 強調 | 更新 |
|----------|--------|----------|------|------|
| 線形要素表 | 表 + PLAN | 要素一覧 | 選択行↔図中要素 | 計算後 |
| 主要点座標表 | 表 + PLAN | BP/KA/KE/BC/EC/EBC/EP | 選択行↔主要点マーカー | 計算後 |
| 測点座標表 | 表 | station/X/Y/Z | 選択行↔測点マーカー | 計算後 |
| 縦断表 | 表 + PROFILE | station/Z/grade | 選択行↔縦断点 | 計算後 |
| 横断勾配表 | 表 + SECTION | 左右勾配 | 選択行↔断面 | 計算後 |
| 道路端座標表 | 表 + PLAN | edge | 選択行↔edgeマーカー | 計算後 |
| Pier/Girder/Node 座標表 | 表 + PLAN | P03 結果 | 選択行↔図中要素 | 計算後 |
| 確認図 | PLAN/PROFILE/SECTION | 正式図面 | Sheet 表示 | 計算後 |
| DXF | 図面 | 出力ファイル | — | 出力時 |
| 計算書（HTML/CSV） | 帳票 | 値 | — | 出力時 |

## 4. 表↔図 連動（双方向）
- 表の行を選択 → 図中の対応要素を強調（ハイライト + スクロール）
- 図の要素をクリック → 表の対応行を選択
- 例: 主要点座標表で BC 行選択 → 平面図の BC マーカーを強調

## 5. 確認図仕様
- 平面線形図: 中心線 + 要素境界 + 主要点 + 道路端 + 測点目盛（既存正式図面を再利用）
- 縦断線形図: 計画高 + 勾配 + 縦断曲線 + 測点（既存を再利用）
- 横断図: 幅員 + 勾配 + 道路端（既存を再利用）
- Sheet: A0〜A4・向き（既存 drawing/sheet を再利用）
- プレビュー → 印刷 → DXF の順で確認

## 6. Project Replay の視覚化
- Screen ID: `O-REPLAY`（Step2 P06 の replay 結果表示）
- 表: 実資料値 vs 計算値 vs 差 vs 判定（PASS/KNOWN/DEFERRED/FAIL）
- 図: 比較対象位置（station・主要点・X/Y/Z）を図中に両方マーカーで表示
- 選択行 → 図中で「実資料値」と「計算値」を異なる色で表示
- tolerance 超過行は赤、KNOW/DEFERRED は黄で行と図を強調

## 7. ERROR / WARNING 図示（出力画面）
- 出力不能（NaN/inf・図面化エラー）→ 図面領域にエラーメッセージ + 該当値の位置を図示
- Rule 照査警告（curve-length・clearance 等）→ 帳票・図面両方に警告
- replay の FAIL → 図中に diff 位置を明示

## 8. UI LAYOUT（O-OUTPUT）
- 左: 出力種別ナビゲーション（要素表/座標表/縦断表/確認図/DXF/計算書/Replay）
- 中央: 表 or 図面 or 帳票（タブ切替）
- 下部: 表↔図のリンク表示（選択状態を同期）

## 9. レスポンシブ / Accessibility
- 図面はスクロール・ズーム対応。表は横スクロール
- 色とマーカー形状の併用（色覚対応）
- 印刷は既存 printFormalDrawing を再利用

## 10. Backend/API 接続
- 計算: Step2 backend（X4-D + vertical + rules + bridge）
- 出力: Step2 output（format/tables/reports/dxf）
- Replay: Step2 replay_runner + fixtures
- 既存 frontend exports と接続（backend 生成 or frontend 生成の責務境界は STEP1 P04 に従う）

## 11. Acceptance Criteria
- [ ] 表↔図の双方向選択連動
- [ ] 主要点・測点・edge・pier/girder/node が図中で確認可能
- [ ] replay 比較が図中で可視化（実値 vs 計算値）
- [ ] 印刷・DXF・帳票出力が既存と互換
- [ ] X4-D・Step1 に退行なし

## 12. Traceability
- STEP1 P04 Output / P06 Replay
- LinerFormalDrawingWorkspacePage / DrawingDocumentSvg / PlanElevationTable / exports
- JIP-LINER: 帳票ビューア・Plot viewer・確認図・座標テーブル（視覚思想の再設計）
