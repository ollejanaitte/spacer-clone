# UX-REAUDIT P00 — Preflight / Existing UI & Design Inventory / Freeze

## Baseline（再確認）
- origin/research/liner-r1-planning @ 529a9d445665183c68207781974a85fb412dcd42
- origin/main @ f68cfae（X4系・Step1系は未統合。research側を正規baseline）
- Step1 DESIGN_STATUS: COMPLETE / STEP2_IMPLEMENTATION_READINESS: GO

## 既存 UI / Design Inventory（frontend/src/liner）

### Pages
| Page | 役割 |
|------|------|
| LinerEditPage | 線形編集メイン |
| LinerSetupTabs | セットアップタブ（機能別） |
| LinerFormalDrawingWorkspacePage | 正式図面ワークスペース |
| LinerPreviewPage | プレビュー |
| LinerMappingReviewPage | マッピング確認 |
| LinerListPage / LinerLauncherPage | 一覧・起動 |

### Components（34 TSX）
| グループ | コンポーネント |
|----------|----------------|
| Alignment | AlignmentManager / AlignmentLineManager / HorizontalElementEditor / CurveSamplingControl |
| Vertical | VerticalElementEditor / VerticalProfileChart / VerticalDiagnosticsPanel |
| CrossSection | CrossSectionTemplateEditor / CrossSectionPreview / CrossSlopeIntervalEditor / CrossfallIntervalEditor / WidthChangePointEditor / SuperelevationEditor / CrossSectionDiagnosticsPanel |
| Bridge | BridgeLayoutEditor / BridgeLayoutDiagnosticsPanel / bridgeLayoutSkew.ts |
| Continuity | ContinuityDiagnosticsPanel |
| Haunch | HaunchDefinitionEditor / HaunchResultsPanel / HaunchDiagnosticsPanel |
| Hoso | HosoDefinitionEditor / HosoResultsPanel / HosoDiagnosticsPanel |
| Ldist | LdistJobEditor / LdistResultsPanel / LdistDiagnosticsPanel |
| Station/Plan | LinerStationProfilePanel / PlanElevationTable |
| Export | LinerRoadExportControls |
| 共通 | CompositionAwareInput / SetupTabPlaceholder / LinerGridPreview |
| テスト | CrossSectionPreview.test / LinerGridPreview.test / LinerStationProfilePanel.test / VerticalElementEditor.test |

### 既存の模式図・プレビュー実装（SCHEMATIC_SUPPORT_STATUS: 部分実装）
| コンポーネント | 表示内容 | 図種別 |
|----------------|----------|--------|
| LinerGridPreview | 軸線ポリライン + グリッド（SVG） | PLAN |
| CrossSectionPreview | 横断オフセットライン・横断勾配（SVG） | SECTION |
| VerticalProfileChart | 縦断プロファイル（SVG） | PROFILE |
| PlanElevationTable | 平面・標高テーブル | 表 |
| BridgeLayoutEditor | 橋梁レイアウト編集 | PLAN/MIXED |
| HaunchResultsPanel / HosoResultsPanel | 計算結果 | 表 |

### 既存の模式図カバレッジ判定（UX-P00時点）
| 入力領域 | 模式図あり | 備考 |
|----------|-----------|------|
| Horizontal Alignment | 一部（LinerGridPreview） | 要素単位の強調・フィールド↔図マッピングは未定義 |
| Vertical Geometry | 一部（VerticalProfileChart） | VPI/勾配のフィールド対応は未定義 |
| Cross Section | 一部（CrossSectionPreview） | 入力フィールド↔図強調は未定義 |
| Pier/Span/Girder/Node | 一部（BridgeLayoutEditor） | skew/格点の可視化は未定義 |
| Output/Replay | なし（表のみ） | 比較位置の図示なし |

→ 多くの画面で模式図は「表示のみ」で、**入力フィールド↔図の双方向マッピング・ライブ更新・エラー図示は未実装**。これを UX-P01〜P05 で要件化する。

## 今回のスコープ
- INPUT_UI_INVENTORY / VISUAL_GUIDANCE_MATRIX / SCHEMATIC_DIAGRAM_SPEC /
  FIELD_TO_DIAGRAM_MAPPING / LIVE_PREVIEW_SPEC / ERROR_VISUALIZATION_SPEC /
  UI_LAYOUT_SPEC / UX_NAVIGATION_SPEC / JIP_LINER_UX_MAPPING /
  BACKEND_UI_CONTRACT_MATRIX / STEP2_PLAN_REVISED / STEP3_PLAN_REVISED
- 設計検証用 wireframe / ASCII sketch / SVG prototype は許容（production 実装はしない）

## 非対象（production 実装禁止）
- UI の本格実装 / 大量 SVG・Canvas・Three.js production 実装
- backend 計算ロジック新規実装
- X4-A/B/C/D 破壊的変更
- Step1 凍結数値仕様の根拠なし変更
- JIP-LINER 画面の単純コピー・画像転載前提

## Critical Uncommitted Data
- docs/liner/research/road-structure-ordinance/（untracked, Rule根拠。本Phaseとは独立）

## Reaudit Freeze
- 設計正本: Step1 P01〜P07 + X4-A/B/C/D API
- UX方針: 「入力欄だけでなく、入力対象を理解する模式図/確認図/ライブプレビューを併設」を正式原則化
- preview と確定結果は INPUT PREVIEW / VALIDATED PREVIEW / CALCULATED RESULT で明確分離
