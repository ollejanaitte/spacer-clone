# UX-REAUDIT P07 — Global UI Layout / Navigation / Responsive / Help（凍結）

Status: FROZEN

## 1. Screen
- Screen ID: `G-LAYOUT`（グローバル）
- 既存: LinerSetupTabs（line/station/height/vertical/crossSection/utilities/review）+ LinerEditPage + LinerFormalDrawingWorkspacePage + LinerPreviewPage
- Purpose: 全体ナビゲーション・画面配置・レスポンシブ・ヘルプの統一仕様

## 2. 既存正本（再利用）
- `LinerSetupTabs.tsx`（7タブ + tablist/tabpanel ARIA）
- `LinerEditPage.tsx` / `LinerFormalDrawingWorkspacePage.tsx` / `LinerPreviewPage.tsx`
- i18n `ja.liner.setupTabs`（ラベル）
- `LinerSetupTabId`（line/station/height/vertical/crossSection/utilities/review）
- UX-P01〜P06 の各画面設計

## 3. ユーザー導線（UX_NAVIGATION_SPEC・凍結）
```
① プロジェクト一覧/新規
   → ② セットアップタブ（line → station → height → vertical → crossSection → utilities）
   → ③ プレビュー（LinerPreviewPage）
   → ④ 正式図面（LinerFormalDrawingWorkspacePage: 平面/縦断/横断）
   → ⑤ 出力（帳票/DXF/CSV）
   → ⑥ Project Replay 確認（O-REPLAY, Step2）
```
- 各タブは入力→図→診断の3領域構成（UX-P01〜P05）
- 上部: グローバルナビ（タブ）+ 進行度インジケータ
- 下部: 診断サマリ（エラー数・警告数、クリックで該当タブへ遷移）

## 4. 画面配置（UI_LAYOUT_SPEC・凍結）
### 広幅（Desktop, ≥1024px）
- 3ペイン: 左ナビ/入力、中央模式図、右詳細入力・診断
- グローバルヘッダ: プロジェクト名・現在タブ・計算状態・保存状態

### 中幅（タブレット, 768〜1023px）
- 2ペイン: 入力 + 図（タブで切替）/ 診断は下部ドロワー

### 狭幅（Mobile, <768px）
- 1ペイン: タブ切替（入力/図/診断）
- 図は常時参照可能な「図をピン留め」機能
- フォームは縦スクロール

## 5. モード分離（凍結）
| モード | 説明 |
|--------|------|
| INPUT | 入力編集（INPUT PREVIEW 図） |
| VALIDATE | バリデーション実行（VALIDATED PREVIEW） |
| CALCULATE | 正式計算（CALCULATED RESULT） |
| REVIEW | 確認図・出力・Replay |

- モード切替は明示（「計算を実行」ボタン等）
- モードに応じて図のバッジ表示（UX-P06 と連動）

## 6. ヘルプ / 初心者説明（凍結）
- 各フィールド: インラインヘルプ（? アイコン → ツールチップ）
- 各画面: 「この画面の目的」ヘッダ説明（1〜2行）
- 設計者用語と初心者説明の併記（例: 「緩和曲線（クロソイド）A: 曲がりを徐々に変化させるパラメータ」）
- 模式図自体がヘルプ（入力値の意味を図で説明）— 本UXの中核
- マニュアルへのリンク（JIP-LINER 思想を踏襲、ただし文言は自前）

## 7. レスポンシブ・アクセシビリティ
- レスポンシブ: 3/2/1 ペイン切替（§4）
- キーボード: タブは arrow キーで移動（既存 tablist 踏襲）
- 図の aria-label・role（既存踏襲）
- 色以外の表現（UX-P06 と同一）
- フォントサイズ・コントラスト（WCAG AA 目安）

## 8. ナビゲーション整合
- エラーがあるタブにバッジ表示（赤: エラー数）
- 診断パネルのエラーをクリック → 該当タブ + 該当フィールドへフォーカス + 図中該当要素を強調
- 保存状態・未保存変更の明示

## 9. 将来タブ（Step3 以降）
- 3D（Step3）: プレビュー→3D表示の導線を追加予定
- Bridge 詳細（P03 の Pier/Span/Girder 入力）は現行「review」タブの BridgeLayoutEditor を拡張 or 専用タブ化（Step3 で確定）

## 10. Acceptance Criteria
- [ ] 導線①〜⑥が一連の操作で完走可能
- [ ] 3/2/1 ペインのレスポンシブ切替
- [ ] 全入力タブに模式図が併設（UX-P01〜P05）
- [ ] エラータブバッジ・エラー→タブ/フィールド遷移
- [ ] インラインヘルプ・初心者説明が全フィールドに付与
- [ ] 既存タブ構成（7タブ）と互換（拡張のみ）

## 11. Traceability
- LinerSetupTabs / LinerEditPage / LinerPreviewPage / LinerFormalDrawingWorkspacePage
- i18n ja.liner.setupTabs
- UX-P01〜P06
- JIP-LINER: プログラム構成（LINER/HAUNCH/HOSO/GDRAW/LDIST/GCROSS/MDVIEWER）の導線思想を再設計
