# Phase 6-01 Step D: Integrated 3D ＋ UI / Workflow 完全設計（凍結案）

## 1. 目的

Road + Terrain + Existing + Bridge Layout + Superstructure + Substructure + Foundationを
同一座標系で表示する統合Viewerと、既存Planning UIを再利用したワークフローを凍結する。

- baseline: `d700edd707958db28ee6ada9f5d217bf3dced01e`
- 日付: 2026-08-13

## 2. 統合3D（Integrated 3D）

### 2.1 シーン構成（凍結）

| レイヤ | 内容 | 供給元 |
|---|---|---|
| Road | 路面メッシュ | roadMesh.ts（KEEP） |
| Terrain | TIN/tile | terrainViewerBuilder（KEEP） |
| Existing | 現況ソリッド | existingViewerBuilder（KEEP） |
| Bridge Layout | A1/P1..Pn/A2 marker・span | bridgeLayoutScene（KEEP） |
| Superstructure | 主桁/床版/横桁/支承 | superstructureSceneBuilder（Phase 5） |
| **Substructure** | 橋台/橋脚/フーチング/杭 | **新（WP-I）**・既存solid資産 |
| **Foundation** | 基礎/杭 | 同上 |

### 2.2 下部工レイヤ（新・Phase 6-02 WP-I）

- 生成元: SubstructureDocument（canonical）＋配置（SupportPlacementEngine snapshot）
- solid生成: 既存geometryBase / SubstructureSolidGenerator / PierSolidGenerator / FoundationSolidGenerator（KEEP）
- 表示変換: **renderCoordinate（domainToThree）唯一**（既存threeFactoryのY-up swapは新統合では使わない）
- 配置: 既存SupportPlacementEngine（LINER正本）から実frame

### 2.3 ID規則（凍結）
- **entity IDとselection keyを別契約にする**
  - entity ID（mesh名）: `sub-{supportId}` / `sub-{supportId}-pier` 等
  - selection key: `sub:{supportId}`（選択同期）
  - Testはentity IDとselection keyを別assertで検証

| 対象 | ID |
|---|---|
| support | `sub-{supportId}` |
| pier | `sub-{supportId}-pier` |
| abutment | `sub-{supportId}-abutment` |
| footing | `sub-{supportId}-footing` |
| pile | `sub-{supportId}-pile-{n}` |
| selection | `sub:{supportId}`（選択同期） |

### 2.4 表示仕様（凍結）

- visibility: レイヤ別トグル（substructure既定ON）
- focus bounds: 全シーン・選択時は選択supportへ
- camera: 既存presets（top/front/side/iso）+ focus
- local origin: Project Origin基準（renderCoordinate）
- regeneration: SubstructureDocument変更時のみ再生成（決定論）
- viewer cache: key = fingerprint（配置由来）
- reload: restore後に再生成

## 3. UI / Workflow（既存Planning UI再利用）

### 3.1 ユーザー縦断（凍結）

```
Project
  → Bridge Layout確認
  → Superstructure Handoff確認
  → Substructure生成（SubstructureDocument）
  → A1/A2/P1..Pn
  → Abutment / Pier / Foundation設定
  → bearing seats確認
  → Terrain / Existing確認
  → 3D確認
  → Design / Calculation status確認
  → Save
  → restart
  → restore
  → Completion Gate
```

### 3.2 既存Planning UIの再利用

| 資産 | 利用 |
|---|---|
| SubstructurePlanningPage（3ペイン） | KEEP（新module shell内に組み込み） |
| SubstructurePlanningHost | ADAPT（入力: 旧ProjectModel→新PDC/Handoff） |
| SubstructureViewport / viewer3d | KEEP（renderCoordinate統一） |
| forms / undo / tree / status | KEEP |
| samples | KEEP（SUBSTRUCTURE-owned初期形状） |

### 3.3 新UI経路（route移行・凍結）

- 旧route: `/pro/liner/substructure`（旧アプリ・旧ProjectModel）
- 新route: `/app/projects/:id/modules/substructure`（新PDC・SubstructureModuleShellPage）
- **旧UIをそのまま新正本にしない**（新正本=SubstructureDocument・旧Hostは実行層として再利用）
- Phase 6-02では旧route維持（旧機能compatibility）＋新route（新正本）の併存
- 旧Host入力を新PDC由来へADAPT（App.tsx旧経路はcompatibility維持）

### 3.4 UI画面要素（新Shell・Phase 6-02）

- Substructure生成ボタン（Bridge Layout+Handoffから）
- A1/A2/P1..Pn一覧・編集（既存forms）
- bearing seats確認・Terrain/Existing status・3D・Design status・Completion Gate表示

## 4. 既存資産の再利用（Phase 6-02）

| 資産 | 利用 |
|---|---|
| substructureViewer3D / threeFactory | 3D（**ADAPT**・renderCoordinate統一・旧route座標回帰test追加） |
| geometryBase / SolidGenerator | solid生成 |
| PlanProjection | 2D |
| planning UI一式 | 編集UI |
| integratedSceneBuilder | 統合シーン（下部工追加） |
| NextApp / ModuleShellPage | 新route |

## 5. テスト（T6-3D系 / T6-UI系）

- T6-3D-001: 統合シーン（Road+Terrain+Existing+BL+Super+Sub）同一座標
- T6-3D-002: renderCoordinate適用（決定論）
- T6-3D-003: ID規則（sub:{supportId}・selection同期）
- T6-3D-004: reload再生成（fingerprint）
- T6-UI-001: 新route表示（SubstructureModuleShellPage）
- T6-UI-002: 旧route維持（compatibility）
- T6-UI-003: ユーザー縦断（生成→編集→3D→Save→restart→restore）
