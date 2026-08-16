# SPACER CLONE — Canonical Workflow (Lane U Wave 1)

- 作成日時: 2026-08-16 (JST)
- 対象リポジトリ: `~/Projects/spacer-clone-lane-u` (branch: `lane-u/unified-workflow`)
- 開始時 SHA: `31a111362ec39f31f74a40f4dd59e2e002a49035`
- 上位文書: [project-persistence-map.md](project-persistence-map.md) / [phase-a-persistence-automation-plan.md](phase-a-persistence-automation-plan.md) / [parallel-lanes-wave0-readiness.md](parallel-lanes-wave0-readiness.md)
- 参照リポジトリ (読み取りのみ): `~/Projects/site-context-prototype`
- 本稿の位置づけ: ユーザーが SPACER CLONE だけで「新規Project → 現況/Site Context → 道路 → 橋梁配置 → 上部工 → 下部工 → 構造解析 → 統合3D → 成果物 → 保存/再読込」まで迷わず進めるための**業務フローの正式定義**。

---

## 1. Canonical Workflow とは

SPACER CLONE の一連の橋梁設計業務を、Project 単位で順序付けた正式なフローである。

- 各 step は「同一 SPACER Project」を引き継ぐ。各業務が別々の一時データを持つのではなく、
  最終的に同一 Project のデータへ書き戻すことを前提とする。
- 自由遷移も許容するが、ガイド順は本稿の順序を正とする。
- step の「接続状態」は三値で管理する。
  - `connected`: 既存の実画面・route への入口が確定している
  - `partial`: 入口はあるが、Workflow 上は未完全接続 (modal 限定 / flag 依存 / 後続統合待ち)
  - `pending`: 入口が未実装・未接続 (次 Wave / 該当 Lane 待ち)
- 既存の `platform/workspace/sections.ts` (overview / road / superstructure / substructure / analysis / main3d / deliverables / data) と
  `platform/workflow/guidedNavigation.ts` (GUIDED_WORKFLOW) は、この Canonical Workflow の Design Platform 上での既存実装とみなす。
  Wave 1 では既存 routing を壊さず、新規 step (現況・地理情報) を最小追加する。

## 2. 正式な業務フロー (10 step)

```
1. 新規Project / Project選択
2. 現況・地理情報 (Site Context)
3. 道路線形 / 道路設計
4. 橋梁配置 / 支間割
5. 上部工設計
6. 下部工設計
7. 構造解析
8. 統合3D / CIM
9. 成果物 / Export
10. 保存 / Close / Reopen
```

各 step の詳細は §3 を参照。

## 3. 各 step の定義

### Step 1: 新規Project / Project選択

| 項目 | 内容 |
|---|---|
| user goal | 新規業務 (Project) を作成、または既存 Project を開いて作業を続ける |
| screen / route | Lobby `/` → Pro `/pro/platform` (Design Platform Home) → 業務一覧 `/pro/platform/businesses`。App Shell (`/pro`) では空 Project 状態 (`empty-model-state`) の new / open / sample |
| input | 業務名・業務件番・設計段階 (BusinessProject)。または in-memory ProjectModel (`createEmptyProject`) / project.json |
| output | 作業対象の Project が確定し、以降の step が同一 Project を引き継ぐ |
| Project上の引継ぎ対象 | `project.id` / `project.name` / 設計段階。runtime では App.tsx の `project` state が唯一の現在 Project |
| 完了判定 | 空でない作業対象 Project が選択されている (`isEmptyProject` が false) |
| 次step | 2. 現況・地理情報 |
| 戻り先 | — (入口) |
| owner Lane / subsystem | Lane U (入口) / Lane A (persistence) / Design Platform |
| 未接続箇所 | なし |

### Step 2: 現況・地理情報 (Site Context)

| 項目 | 内容 |
|---|---|
| user goal | 対象地の現況・地理情報 (座標系・地形・取得範囲) を設定し、後の道路・橋梁・解析の座標・地形基盤を確立する |
| screen / route | `/pro/site-context` (Lane U Wave 1 新設入口)。site-context-prototype の SituationBanner / SituationHome 相当を PORT 予定 |
| input | 取得元の選択 (地図から取得 (GSI DEM) / 2D図面 / 3Dデータ / 測量データ)。Project の coordinateContext 情報 |
| output | site-context データ (coordinateContexts / terrain / selectionArea / sources / existingConditions)。最終的に Project 側へ Adapter 経由で取り込む |
| Project上の引継ぎ対象 | 現況・地形データ一式 (Lane B mapping: `terrain` モジュール + `metadata`) |
| 完了判定 | Terrain が生成 / 取得され、現況データが確定している |
| 次step | 3. 道路線形 / 道路設計 |
| 戻り先 | 1. 新規Project / App Shell `/pro` |
| owner Lane / subsystem | Lane U (入口・workflow) / Lane B (Adapter Contract) / Lane T (CRS・DEM・Heightfield / SCT1) |
| 未接続箇所 | Site Context 本体画面の PORT (U-3)、GSI DEM 取得 UI (Lane T)、実 Terrain 表示 (Lane V)。Wave 1 は入口と workflow 骨格のみ |

### Step 3: 道路線形 / 道路設計

| 項目 | 内容 |
|---|---|
| user goal | 平面線形・縦断・横断を入力し、道路線形 (road design document) を確定する |
| screen / route | LINER: `/pro/linear-coordinate` (launcher) → `/pro/liner` (list) / `/pro/liner/setup`。JIP-LINER PDF 写経は `/pro/importer` |
| input | 線形入力 (GUI) または JIP-LINER PDF 転記 |
| output | `liner` sidecar (`roadDesignDocument` / `domainDraft`) が Project に反映 |
| Project上の引継ぎ対象 | `project.liner` (serialize 時 RDD 埋め込み / hydrate 時 domainDraft 復元) |
| 完了判定 | 線形 draft が確定し、LINER list で「プロジェクト反映済み」 |
| 次step | 4. 橋梁配置 / 支間割 |
| 戻り先 | 2. 現況・地理情報 / App Shell `/pro` |
| owner Lane / subsystem | 既存 LINER subsystem (Lane U は workflow 上の接続のみ) |
| 未接続箇所 | なし (既存)。site-context の座標・地形と LINER 座標の整合は統合時に確認 |

### Step 4: 橋梁配置 / 支間割

| 項目 | 内容 |
|---|---|
| user goal | 橋梁位置・支間割 (span division) を道路線形上に配置する |
| screen / route | 現状は App Shell (`/pro`) の BridgeWizard (modal, `onOpenBridgeWizard`)。BridgeProject (CBDM) が線形・上部工・下部工を束ねる役割を持つ |
| input | 道路線形・橋梁位置・支間 |
| output | BridgeProject manifest / 上部工・下部工への配置情報 |
| Project上の引継ぎ対象 | BridgeProject / `apolloBridgeProjectSuperstructure` / substructure supports の基盤 |
| 完了判定 | 橋梁配置・支間が確定し、上部工・下部工へ引き渡せる |
| 次step | 5. 上部工設計 |
| 戻り先 | 3. 道路線形 / App Shell `/pro` |
| owner Lane / subsystem | 既存 BridgeWizard / BridgeProject (Lane U は workflow 上の接続のみ) |
| 未接続箇所 | 専用 workflow 画面・一覧ページは未整備 (`partial`)。Workflow ページ上は「配置 (BridgeWizard)」として案内 |

### Step 5: 上部工設計

| 項目 | 内容 |
|---|---|
| user goal | 上部工 (主桁・床版) を設計する |
| screen / route | Apollo: `/pro/apollo` (ApolloRouteHost)。`apolloPhase1Enabled` flag 依存。Apollo workspace / step4a 等は `frontend/src/apollo/` |
| input | 橋梁配置・支間割・断面条件 |
| output | `apolloPhase1Unit2` / `apolloBsdd` / `apolloBridgeProjectSuperstructure` sidecar |
| Project上の引継ぎ対象 | 上記 apollo sidecar 一式 (save/load 時に serialize / hydrate) |
| 完了判定 | 上部工断面・配置が確定し、下部工へ引き渡せる |
| 次step | 6. 下部工設計 |
| 戻り先 | 4. 橋梁配置 / App Shell `/pro` |
| owner Lane / subsystem | 既存 Apollo subsystem (Lane U は workflow 上の接続のみ) |
| 未接続箇所 | `apolloPhase1Enabled` flag が off の環境では入口が隠れる (`partial`)。Workflow ページでは flag 状態を表示 |

### Step 6: 下部工設計

| 項目 | 内容 |
|---|---|
| user goal | 下部工 (橋脚・橋台・基礎) を計画・配置する |
| screen / route | Substructure: `/pro/liner/substructure` (SubstructurePlanningHost)。LINER から supports を引き継ぐ |
| input | LINER piers / 支間から生成される supports、BridgeProject 由来の boundSupports |
| output | 下部工配置 (support) の決定。※ 現行は単独 `substructure-project.json` (AdapterEnvelope) 保存 (正式な例外経路, Phase A §5-3) |
| Project上の引継ぎ対象 | 下部工配置 (ProjectModel 埋め込みは Phase A 既知例外として後続統合待ち) |
| 完了判定 | 下部工配置が確定し、解析に進める |
| 次step | 7. 構造解析 |
| 戻り先 | 5. 上部工設計 / App Shell `/pro` |
| owner Lane / subsystem | 既存 Substructure subsystem (Lane U は workflow 上の接続のみ) |
| 未接続箇所 | 下部工データの ProjectModel (`project.json`) 埋め込みは未整備 (Phase A 既知例外)。Workflow 上は `partial` 扱い |

### Step 7: 構造解析

| 項目 | 内容 |
|---|---|
| user goal | FEM / 構造解析 (静的・固有値・影響線・移動荷重・応答スペクトル・時刻歴) を実行し結果を確認する |
| screen / route | `/pro` (App Shell / FEM workspace)。Toolbar の Validate / Run 系。backend `/api/projects/validate` + analysis API |
| input | ProjectModel (nodes / members / sections / materials / loadCases / analysisSettings) |
| output | `analysisResults` sidecar / in-memory `result` / IF3 結果。CSV / PDF / JSON 出力 |
| Project上の引継ぎ対象 | `analysisResults` (任意 sidecar) |
| 完了判定 | 解析が成功し、結果が表示 / 保存されている |
| 次step | 8. 統合3D / CIM |
| 戻り先 | 6. 下部工設計 / App Shell `/pro` |
| owner Lane / subsystem | 既存 FEM / Analysis subsystem (Lane U は workflow 上の接続のみ) |
| 未接続箇所 | なし (既存) |

### Step 8: 統合3D / CIM

| 項目 | 内容 |
|---|---|
| user goal | 線形・上部工・下部工・地形を統合した 3D モデルで確認する |
| screen / route | `/pro/liner/main3d` (LinerMain3DPage)。App Shell の Viewer3D (`/pro`)。将来は Lane V の Unified 3D Viewer |
| input | ProjectModel + LINER draft / apollo visualization model |
| output | 統合 3D 表示。STL / DXF 出力 |
| Project上の引継ぎ対象 | (表示のみ / 出力用モデル) |
| 完了判定 | 統合モデルが表示され、成果物へ出力できる |
| 次step | 9. 成果物 / Export |
| 戻り先 | 7. 構造解析 / App Shell `/pro` |
| owner Lane / subsystem | 既存 Main3D / Viewer3D (Lane V の Unified 3D Viewer は Wave 1 で統合予定) |
| 未接続箇所 | Lane V の Unified 3D Viewer 入口は Wave 1 未確定 → Workflow ページでは `pending` 相当で案内 (既存 Main3D は connected) |

### Step 9: 成果物 / Export

| 項目 | 内容 |
|---|---|
| user goal | 図面・帳票・3D 出力 (DXF / STL / CSV / PDF / JSON / 成果物 ZIP) を生成する |
| screen / route | `/pro` の Toolbar Export 群。LINER 図面 (plan/profile/cross-section) は `/pro/liner/drawing*`。Apollo 成果物 ZIP (`apollo/drawing/artifactBundle`) |
| input | 各 step の確定データ |
| output | DXF / STL / CSV / PDF / JSON / 成果物パッケージ |
| Project上の引継ぎ対象 | — (出力物は Project 外) |
| 完了判定 | 必要な成果物が出力されている |
| 次step | 10. 保存 / Close / Reopen |
| 戻り先 | 8. 統合3D / App Shell `/pro` |
| owner Lane / subsystem | 既存 exports / LINER drawing / apollo artifact (Lane U は workflow 上の接続のみ) |
| 未接続箇所 | 成果物一覧画面 (まとめて管理する画面) は未整備 (`partial`) |

### Step 10: 保存 / Close / Reopen

| 項目 | 内容 |
|---|---|
| user goal | Project を保存し、閉じて、後日再読込する |
| screen / route | `/pro` Toolbar Save / Open (project.json, 通常 / apollo 分岐)。`.spacerproj` は next arch。Electron はネイティブ dialog |
| input | serialize チェーン (unit2 → liner) を経た persisted 表現 |
| output | project.json (主形式) / `.spacerproj` |
| Project上の引継ぎ対象 | — (Project 全体を永続化) |
| 完了判定 | Save 成功 (`dirty` が false)。Reopen で同一 Project が復元される |
| 次step | — (終点。Step 1 へ戻り再開) |
| 戻り先 | 1. 新規Project / 業務一覧 |
| owner Lane / subsystem | Lane A (canonical Save / Load / migration) / 既存 desktop / Electron |
| 未接続箇所 | 主経路の公式 Schema validation (Phase A A-05) は Lane A Wave 1 で実施。autosave は無効 (`AUTOSAVE_ENABLED=false`) |

## 4. route / page / component の責務

| 責務 | 内容 | 現状 |
|---|---|---|
| Lobby (`/`) | モード選択 (Learn / Level0 / Pro)。Pro → `/pro/platform` | main.tsx `LobbyApp` |
| Design Platform Home (`/pro/platform`) | 業務から設計 / クイック解析 の入口 | App.tsx dispatch → `DesignPlatformHome` |
| Business Workspace (`/pro/platform/businesses/:id`) | Project 単位のセクション案内・ガイド遷移・保存 | `BusinessWorkspace` (sections / guidedNavigation / toolBindings) |
| App Shell (`/pro`) | FEM / 解析・3D・Project データ編集の実務画面。Toolbar が各入口を集約 | App.tsx `app-shell` / `Toolbar` |
| Site Context 入口 (`/pro/site-context`) | Canonical Workflow 骨格表示 + 現況・地理情報の入口 (Lane U Wave 1) | 新設 (本 Wave) |
| route 解決 | `/pro/*` は App.tsx の pathname 分岐、`/app` は NextApp、それ以外は Lobby | main.tsx / App.tsx |

## 5. 同一 Project を引き継ぐ考え方

- runtime の現在 Project は **App.tsx の `project` state** (`ProjectModel`) が唯一の正。
  新規 Project ストアを作らない。
- 各業務 (LINER / Apollo / Substructure / Analysis) は ProjectModel の sidecar / 配列へ
  commitProject 経由で書き戻す。保存・再読込は canonical save/load (Lane A) に従う。
- `dirty` / `saved` は既存の App.tsx 状態をそのまま活用する。
- Wave 1 では Persistence 本実装を変更しない。UI 側は現在 Project の識別と
  workflow step の表示に留める。
- 新規 workflow ページは独自 Project store を作らず、props (project name / id / isEmpty) を受け取る。

## 6. Lane 別接続点 (Wave 1 時点)

### Lane B (site-context Adapter Contract)
- **要求**: `/pro/site-context` から Site Context Import を呼ぶ UI 側 Adapter 入口を用意すること。
- **I/F 準拠**: `frontend/src/next/integration/siteContext/adapterContract.ts` (Lane B-3)
  `SiteContextImportAdapter.inspect` / `import`、`SiteContextImportReport`、
  `SiteContextWarning` / `SiteContextUnsupportedField` / `SiteContextImportErrorCode` (SC-ERR-*)。
- **表示要求**: warning / error / unsupported field を UI に可視化する領域を Site Context 画面へ用意すること。
- **状態**: Lane B Wave 1 で contract skeleton 実装済み (実 adapter は B-4)。

### Lane T (Terrain / CRS / DEM)
- **要求**: DEM 取得開始に必要な UI input (範囲選択・CRS 指定) と、
  progress / loading / cancel / error の I/F を Site Context 画面側で定義・受け付けること。
- **状態**: Wave 1 未確定。入口ページでは「地図から取得 (GSI DEM)」を `pending` (次期対応) として表示。

### Lane V (Unified 3D Viewer)
- **要求**: Unified 3D Viewer への route / component 入口と、Project / selection / layer visibility の受渡しを定義すること。
- **状態**: Wave 1 未確定。既存 Main3D (`/pro/liner/main3d`) を connected、Lane V 統合を pending として表示。

### Lane S (Reference Business 001 / Tutorial)
- **要求**: Reference Business 001 を開く導線、Tutorial Sample を開く導線、
  sample から Workflow を開始する入口を用意すること。
- **状態**: Wave 1 未確定 (Lane S 未統合)。入口ページのサンプル領域は pending。

### Lane A (Project context / Persistence)
- **要求**: 主 Save/Load の公式 Schema validation (A-05) と migration guard (A-07) は Lane A Wave 1 で実施。
  Lane U は UI 側で「現在 Project 識別 / dirty / saved」を既存状態から活用するだけ。
- **新規 field 要求**: Wave 1 ではなし (ProjectModel / Schema への変更要求は発生していない)。

## 7. 未接続箇所サマリ (Wave 1 時点)

| step | 状態 | 理由 / 担当 |
|---|---|---|
| 1 新規Project | connected | 既存 Design Platform / empty-model-state |
| 2 現況・地理情報 | **partial (入口のみ)** | 本体 PORT は U-3。DEM は Lane T。実表示は Lane V |
| 3 道路線形 | connected | 既存 LINER |
| 4 橋梁配置 | partial | BridgeWizard (modal) のみ。専用画面は未整備 |
| 5 上部工 | partial | Apollo は flag 依存 |
| 6 下部工 | partial | 単独保存 (AdapterEnvelope)。Project 埋め込みは Phase A 既知例外 |
| 7 構造解析 | connected | 既存 FEM |
| 8 統合3D | partial | 既存 Main3D は connected。Unified Viewer は Lane V 待ち |
| 9 成果物 | partial | 出力は多数あるが一覧画面なし |
| 10 保存/再読込 | connected | 既存 canonical save/load (Lane A) |

## 8. Wave 1 で実装した範囲 (U-1 / U-2)

- U-1: 本稿 (Canonical Workflow 確定)。
- U-2: `/pro/site-context` 入口ページ + Canonical Workflow navigation skeleton
  (`frontend/src/workflow/`) + App Shell Toolbar からの入口 + route 配線。
- U-3 (Site Context 画面 PORT) 以降は実施しない。

## 9. 変更・更新方針

- 本稿は Lane U が所有する。他 Lane の契約変更 (ProjectModel / Schema / Adapter / Terrain / Viewer) が確定したら
  各 step の「未接続箇所」を更新する。
- 本稿の定義とコード (`frontend/src/workflow/canonicalWorkflow.ts`) は同一ソースに保つ。