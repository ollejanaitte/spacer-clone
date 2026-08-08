# STEP 1-P06 — UI_SCREEN_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（Phase 9 の UI 全画面・全タブ・全ダイアログ）
> **正本:** `frontend/src/App.tsx` ルーティング・`ApolloPhase1Shell.tsx`・`ApolloRouteHost.tsx`・`guided/*`・`i18n/*`（実在 UI）

## 1. ルーティング全体

| Route | 画面 | 現状 | Phase 9 目標 |
|-------|------|------|--------------|
| `/pro` | クラシック Pro シェル（Toolbar/ProjectTree/Viewer3D/PropertyPanel/ResultsPanel/BridgeWizard） | 実装済 | 維持（回帰） |
| `/pro/apollo` | Apollo 上部工シェル（guided + list） | 実装済（6 step guided + list） | 全 Phase 7/8/9 機能へ拡張 |
| `/pro/liner/*` | LINER（setup/preview/mapping-review/drawings/substructure） | 実装済 | 維持 |
| `/pro/compare` | 比較ワークスペース | 実装済 | 維持 |
| `/pro/linear-coordinate` | LinerLauncher | 実装済 | 維持 |
| `/pro/importer/*` | Phase 3.6 importer（6 pages） | 実装済 | 維持 |
| lobby | 公開ランディング/学習 | 実装済 | 維持 |

## 2. Apollo 上部工シェル（`/pro/apollo`）のタブ/パネル

### guided モード（6 steps, G01..G15 スライド）
| Step | 内容 | 画面要素 |
|------|------|----------|
| start | サンプル/新規/開く | サンプル選択、新規、開く |
| sample | 200m 5 径間標準サンプル | サンプル確認 |
| basics | 全設計パネル | GuidedModeShell + WorkflowControlScreen + 各 detail パネル |
| editor | node/member/support/material テーブル | エディタ画面 |
| validation | 検証+保存 | 検証結果・保存 |

### 設計パネル（`apollo/components`）
| Panel | 役割 | 状態 |
|-------|------|------|
| WorkflowControlScreen | WF-01..15 ナビゲータ | 実装済 |
| BridgeStructureInputPanel | 橋梁基本入力（主桁/床版/横構 等） | 実装済 |
| DeckAppurtenanceInputPanel | 付属物入力 | 実装済（道路線形接続は将来） |
| RcDeckHaunchInputPanel | RC 床版ハンチ | 実装済 |
| CrossFrameAttachmentInputPanel | 横構取付（V のみ、逆V/X 計画中） | 部分 |
| PavementMarkingInputPanel | 舗装・区画線 | 実装済 |
| LoadConfirmationDevelopmentPanel | 死荷重確認 | 開発 |
| AnalysisDevelopmentProbePanel | 解析プローブ（backend 接続唯一） | 開発 |
| DemandCheckDevelopmentPanel | 照査候補値 | 開発 |
| QuantityModelDevelopmentPanel | 数量 | 開発 |
| ReportModelDevelopmentPanel | 計算書（正式 PDF 拒否） | 開発 |
| OutputIntegrationPanel | 出力統合 ZIP | 開発 |
| GeneralArrangementPanel / StandardSectionDrawingPanel | GA/標準断面図 | 実装済 |

## 3. Phase 9 で追加する画面（設計確定）

| 新画面 | 用途 | 開設 PR |
|--------|------|---------|
| 設計条件画面 | 道路橋示方書・橋種・支間・縦断・横断条件 | 3-01 |
| 荷重・組合せ画面 | LM/LF 編集・組合せ | 3-01 |
| 格子モデル画面 | 設計格子確認・節点/部材 | 3-01 |
| 解析結果画面 | 反力/断面力表・図 | 3-01 |
| 照査結果画面 | 主桁/床版/床組/支承照査表・判定 | 3-01 |
| 断面決定画面 | auto-size iteration 表示 | 3-01 |
| 計算書プレビュー | 正式計算書（認証後） | 3-01 |
| Project Replay 画面 | Replay 実行・結果・FAIL 分類 | 3-01 |

## 4. ダイアログ一覧（設計確定）

| ダイアログ | 現状 | Phase 9 |
|-----------|------|---------|
| UnsavedChangesGuardDialog | 実装済 | 維持 |
| GuardDialogPortal | 実装済 | 維持 |
| SampleReapplyConfirmDialog | 実装済 | 維持 |
| TechnicalDetails | 実装済 | 維持 |
| 認証バナー（AuthorizationBanner/CompactAuthorizationBadge） | 実装済 | 維持 |
| 数値認証ゲートダイアログ（新規） | 未 | 3-01 |

## 5. 未実装表示の解消方針（Phase 9）

- 構造解析未実装表示（`ApolloPhase1Shell` 1629/2670）→ Phase 7/8 実装後、表示更新
- G15 成果物パッケージ未実装 → 3-01 で実装
- 正式計算書ボタン disabled → 認証ゲート設計に沿って有効化（GRANTED 後）
- 逆V/X 横構計画中 → 2-03/2-16 で対応可否を判断
- WF-06 添接・WF-01 道路線形 binding → P09 で deferred/実装計画を確定
