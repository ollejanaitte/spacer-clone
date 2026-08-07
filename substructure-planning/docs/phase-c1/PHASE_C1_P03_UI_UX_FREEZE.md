# Phase C1 P03 下部工 UI/UX・入力画面設計 Freeze

## 1. メイン画面の正式入口

### 1.1 入口位置

メイン画面（App.tsx が表示する workspace）において、既存の LINER / Apollo と同等の独立した入口を設ける。

推奨：**LinerEditPage の "review" タブ内に「下部工計画」セクションを追加**（別画面遷移形式）

```
現状の LinerEditPage タブ:
  line | station | height | vertical | crossSection | utilities | review

Phase C1 の拡張案:
  案A: review タブ内に「下部工計画」セクションを追加
  案B: 新タブ "substructure" を追加
  案C: 完全独立ページ /pro/liner/substructure

決定: 案A（review タブ内） + 案C（独立ページも用意）
  → review タブで簡易3Dプレビュー
  → 「詳細を開く」ボタンで独立ページへ遷移
```

### 1.2 メイン画面入口のモックアップ

```
┌─────────────────────────────────────────────────────────────┐
│  [APP HEADER]                                               │
├─────────────────────────────────────────────────────────────┤
│  ProjectTree │           Viewer3D                          │
│  ┌─────────┐ │  ┌─────────────────────────────────┐        │
│  │ ■ Main  │ │  │                                  │        │
│  │  ├ LINER│ │  │     [3D Bridge Viewport]          │        │
│  │  ├ Apollo│ │  │                                  │        │
│  │  └ ■下部工│ │  │     P1 ── P2 ── A2             │        │
│  │           │ │  │    ╱      ╲      ╲              │        │
│  └─────────┘ │  │   ╱        ╲      ╲             │        │
│              │  │  ■━━━━━━━━━■━━━━━━━■             │        │
│              │  └─────────────────────────────────┘        │
├──────────────┴──────────────────────────────────────────────┤
│  下部工計画: [P1: 単柱矩形橋脚] [A1: 逆T式橋台] [開く▼]    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 ルーティング

```
App.tsx への追加（after line 1217）:

if (linerRouteId === "liner.substructure") {
  if (!linerDraft) return <LinerListPage />;
  return (
    <SubstructurePlanningPage
      draft={linerDraft}
      project={project}
      onDraftChange={commitLinerDraft}
      onClose={closeLiner}
      onBackToSetup={...}
    />
  );
}

新規 Route ID:
  uiPreparation.ts に "liner.substructure" を追加
  → path: "/pro/liner/substructure"
```

---

## 2. 基本画面構成

### 2.1 全体レイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│  [ヘッダー]  下部工計画・3D           [保存] [LINERへ戻る]      │
├──────────┬──────────────────────────────────────┬──────────────┤
│          │                                      │              │
│ 部材ツリー│         3D/2D ビューポート           │  プロパティ   │
│          │                                      │              │
│ □ 全体   │   ┌──────────────────────────────┐   │  形式:       │
│  ├ P1    │   │                              │   │  ○単柱矩形   │
│  │ ├柱   │   │     [Three.js / SVG View]     │   │  ○壁式      │
│  │ ├梁   │   │                              │   │  ○門型      │
│  │ ├基礎  │   │     P1━━━━━━━P2━━━━━━A2     │   │              │
│  │ ├杭   │   │    ╱          ╱              │   │  柱:         │
│  │ └支承  │   │   ■━━━━━━━━━━■━━━━━━■      │   │  幅 2.000m  │
│  ├ P2    │   └──────────────────────────────┘   │  奥行 2.200m│
│  └ A2    │                                      │  高さ 6.000m│
│          │   2D/3D切替: [●3D] [○2D] [○平面図]    │              │
│          │   表示制御: [地盤] [基礎] [杭] [寸法]   │              │
├──────────┴──────────────────────────────────────┴──────────────┤
│  座標表: P1(Sta 45.000, X=450.123, Y=0.000, Z=10.500) ...    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 パネル構成

| パネル | 位置 | 内容 |
|--------|------|------|
| 部材ツリー | 左 | Support 一覧（階層ツリー）、選択/表示/非表示 |
| ビューポート | 中央 | 2D 平面 / 3D / LINER 平面図の切替表示 |
| プロパティ | 右 | 選択中の Support のパラメータ編集 |
| 座標表 | 下部 | 全 Support の station/offset/XYZ/skew 一覧 |

### 2.3 既存 UI との整合

- LINER の `LinerSetupTabs` パターンとは異なる、**3ペインCAD風レイアウト** を採用
- 既存 App.tsx の workspace スタイル（`data-panel-open`/`data-panel-closed`）と互換
- ProjectTree は既存のものをそのまま流用（下部工エントリ追加）

---

## 3. 配置UI

### 3.1 PRIMARY 方式（LINER線形+測点+Offset）

```
┌─ 配置 ─────────────────────────────────────────────────┐
│  方式: [● 線形・測点] [○ 平面図選択] [○ XYZ直接指定]    │
│                                                         │
│  線形: [MAIN          ▼]  512.345m                      │
│  測点: [      45.000] m   ← 数値入力                    │
│  Offset:[       0.000] m   ← 通常 0                     │
│                                                         │
│  斜角: [     90.000] °  (0=直角, 90=並行)              │
│  標高: [●自動 (10.500)] [○手動] [_____] m              │
│                                                         │
│  ── 自動算出（読取専用） ──                              │
│  X: 450.123 m    Y: 0.000 m                             │
│  接線方向: 45.000°  橋軸直角: 315.000°                  │
│                                                         │
│  [LINERから取得]  [平面図で選択]                          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 EXCEPTION 方式（XYZ直接指定）

```
┌─ 配置（XYZ直接指定） ────────────────────────────────────┐
│  方式: [○ 線形・測点] [○ 平面図選択] [● XYZ直接指定]      │
│                                                           │
│  X: [    450.123] m                                       │
│  Y: [      0.000] m                                       │
│  Z: [     10.500] m                                       │
│                                                           │
│  方位角: [     45.000] °                                  │
│  斜角:   [     90.000] °                                  │
│                                                           │
│  ⚠ この配置は LINER 線形と関連付けられていません           │
│  [→ LINER線形に関連付ける]                                 │
└───────────────────────────────────────────────────────────┘
```

### 3.3 degree ↔ radian 変換

- **表示**: すべて degree（°）で統一
- **保存**: radian（LINER 既存に統一）
- **変換**: UI 層で `degree → rad * Math.PI / 180` を実施

---

## 4. C1 構造形式セレクタ

### 4.1 形式選択UI

```
┌─ 橋脚形式 ───────────────────────────────────────────────┐
│  [● 単柱矩形橋脚]  [○ 壁式橋脚]  [○ 門型橋脚]            │
│  [-] RCラーメン式（将来対応）                              │
│  [-] 中空式橋脚（将来対応）                                │
└──────────────────────────────────────────────────────────┘

┌─ 橋台形式 ───────────────────────────────────────────────┐
│  [● 逆T式橋台]  [○ ラーメン式橋台]                       │
│  [-] 重力式橋台（将来対応）                                │
│  [-] 箱式橋台（将来対応）                                  │
└──────────────────────────────────────────────────────────┘

┌─ 基礎形式 ───────────────────────────────────────────────┐
│  [○ 直接基礎]  [● 場所打ち杭基礎]  [○ 鋼管杭基礎]        │
│  [-] ケーソン基礎（将来対応）                              │
└──────────────────────────────────────────────────────────┘
```

### 4.2 形式選択ルール

| UI 状態 | 表示 | 選択可否 |
|---------|------|---------|
| C1_IMPLEMENT | 通常表示 | 選択可能 |
| FUTURE | グレーアウト + 「将来対応」 | 選択不可 |
| OUT_OF_SCOPE | 非表示 | - |

形式選択により、表示するパラメータ入力欄が動的に切り替わる。

---

## 5. 入力パネル詳細設計

### 5.1 単柱矩形橋脚 入力パネル

```
┌─ 柱パラメータ ──────────────────────────────────────────┐
│  柱幅（橋軸直角方向）: [  2.000] m  (0.5〜8.0)          │
│  柱奥行（橋軸方向）:   [  2.200] m  (0.5〜8.0)          │
│  柱高:                [  6.000] m  (1.0〜30.0)          │
├─ キャップ（張出梁） ──────────────────────────────────────┤
│  キャップ幅（橋軸方向）: [  1.600] m                      │
│  キャップ奥行:          [  7.500] m                      │
│  キャップ高:            [  1.600] m                      │
│  左張出:                [  0.000] m                      │
│  右張出:                [  0.000] m                      │
└─────────────────────────────────────────────────────────┘
```

### 5.2 門型橋脚 入力パネル

```
┌─ 門型橋脚パラメータ ─────────────────────────────────────┐
│  柱本数: [2]（固定）                                      │
├─ 柱1 ─────────────────────────────────────────────────────┤
│  柱幅（橋軸直角方向）: [  1.500] m                        │
│  柱奥行（橋軸方向）:   [  1.500] m                        │
│  柱高:                [  6.000] m                        │
│  柱位置オフセット:     [ -3.000] m（中心からの距離）      │
├─ 柱2 ─────────────────────────────────────────────────────┤
│  柱幅（橋軸直角方向）: [  1.500] m                        │
│  柱奥行（橋軸方向）:   [  1.500] m                        │
│  柱高:                [  6.000] m                        │
│  柱位置オフセット:     [  3.000] m（中心からの距離）      │
├─ 横梁 ─────────────────────────────────────────────────────┤
│  梁幅（橋軸方向）: [  1.500] m                            │
│  梁高:            [  1.500] m                            │
│  梁長:            [  8.000] m（柱間＋張出）               │
└─────────────────────────────────────────────────────────┘
```

### 5.3 逆T式橋台 入力パネル

```
┌─ 橋台パラメータ ─────────────────────────────────────────┐
│  壁高:          [  5.500] m                              │
│  壁厚:          [  0.800] m                              │
│  壁幅（橋軸直角）: [ 11.000] m                            │
│  天端高:        [  8.000] m                              │
├─ 翼壁 ────────────────────────────────────────────────────┤
│  左翼壁長:      [  4.000] m                              │
│  左翼壁高:      [  5.500] m                              │
│  左翼壁厚:      [  0.500] m                              │
│  右翼壁長:      [  4.000] m                              │
│  右翼壁高:      [  5.500] m                              │
│  右翼壁厚:      [  0.500] m                              │
└─────────────────────────────────────────────────────────┘
```

### 5.4 場所打ち杭 入力パネル（JIP系FOOTING思想）

```
┌─ フーチング ──────────────────────────────────────┬─ 平面図プレビュー ─┐
│  幅（橋軸直角方向）: [  8.000] m                  │                     │
│  長（橋軸方向）:     [  6.000] m                  │   ┌───────────┐    │
│  厚さ:              [  1.800] m                  │   │  ┼  ┼    ┼  ┼│    │
│  天端高:            [  0.000] m                  │   │           │    │
├─ 杭 ────────────────────────────────────────────┤   │  ┼  ┼    ┼  ┼│    │
│  杭種: [場所打ち杭 ▼]                            │   └───────────┘    │
│  杭径: [  1.200] m                              │   ← 8.000m →      │
│  杭長: [ 20.000] m                              │                     │
│  X方向本数: [2]  Y方向本数: [2]                 │   杭位置+番号表示   │
│  X方向間隔: [3.000] m  Y方向間隔: [3.000] m     │   寸法線+端距離    │
│  端距離X: [1.500] m  端距離Y: [1.500] m          │                     │
├─ 杭座標一覧 ────────────────────────────────────┤                     │
│  No │ X(m)  │ Y(m)  │ Z(m)                      │                     │
│  01 │ -1.50 │ -1.50 │ -9.000                    │                     │
│  02 │  1.50 │ -1.50 │ -9.000                    │                     │
│  03 │ -1.50 │  1.50 │ -9.000                    │                     │
│  04 │  1.50 │  1.50 │ -9.000                    │                     │
└─────────────────────────────────────────────────┴─────────────────────┘
```

---

## 6. サンプル自動生成UI

### 6.1 新規作成ダイアログ

```
┌─ 下部工 新規作成 ──────────────────────────────────────┐
│                                                         │
│  [● 空のプロジェクトから開始]                             │
│  [○ サンプルから開始]                                     │
│                                                         │
│  サンプル選択:                                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ○ 逆T式橋台（A1）                                │    │
│  │ ○ ラーメン式橋台（A1）                            │    │
│  │ ○ 単柱矩形橋脚（P1）                              │    │
│  │ ○ 壁式橋脚（P1）                                  │    │
│  │ ● 門型橋脚（P1）                                  │    │
│  │ ○ 2径間連続（P1 + A1 + A2）                      │    │
│  │ ○ LINER支点から生成                               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [キャンセル]  [作成]                                    │
└─────────────────────────────────────────────────────────┘
```

### 6.2 LINER支点から自動生成

- LINER の PierResult[] を読み取り、各支点に対応する下部工を自動生成
- 形式はデフォルト（単柱矩形 + 場所打ち杭）で仮設定、後から変更可能
- station/skew は LINER 値から自動設定

---

## 7. リアルタイム編集

### 7.1 更新フロー

```
数値入力
  → 300ms debounce
    → Substructure Model 更新
      → SupportPlacementEngine 再実行（station/offset/skew 変更時のみ）
      → 3D Geometry Generator 再実行
        → SceneGroup 置換（Three.js シーン更新）
      → 2D Plan Projection 再実行
        → プレビュー DrawingDocument 更新
        → SVG 再レンダリング
      → 寸法値再計算
      → 座標表更新
```

### 7.2 性能対策

| 対策 | 内容 |
|------|------|
| debounce | 300ms（数値入力完了を待つ） |
| 変更検知 | 前回値と異なる場合のみ再実行 |
| 差分更新 | 全再生成ではなく変更 Support のみ再計算 |
| 3D 非同期 | 重い再生成は requestAnimationFrame で遅延 |
| 2D 優先 | 2D 投影は軽量なため常に即時更新 |

---

## 8. 2D平面プレビュー

### 8.1 プレビュー内容

```
         ← 橋軸方向 (X) →
    ┌─────────────────────────────┐
    │                             │
    │   P1                        │
    │   ┌─────────────────┐      │  ← フーチング外形
    │   │  ┼  ┼    ┼  ┼  │      │     (8.0×6.0m)
    │   │                 │      │
    │   │     ■━━━━■      │      │  ← 柱断面 (2.0×2.2m)
    │   │     ┃    ┃      │      │
    │   │     ■━━━━■      │      │
    │   │  ┼  ┼    ┼  ┼  │      │
    │   └─────────────────┘      │
    │                             │
    │   ← 8.000m →              │
    │   ← 2.000m →← 2.000m →   │  ← 杭間隔
    └─────────────────────────────┘
         ← 橋軸直角方向 (Y) →
```

### 8.2 表示要素

| 要素 | 描画 | 色 |
|------|------|-----|
| フーチング外形 | 矩形（実線） | #b09050 |
| 柱/壁断面 | 矩形（塗り潰し） | #8a8ac8 |
| キャップ/梁 | 矩形（塗り潰し） | #7aa07a |
| 杭位置 | 十字マーカー | #a08040 |
| 杭番号 | テキスト | - |
| 支承位置 | 小矩形 | #7a9ad0 |
| 中心マーク | 十字線 | 赤 |
| 寸法線 | 矢印+数値 | #333 |
| supportId | ラベル | - |
| skew角度 | 弧+角度値 | #666 |

### 8.3 LINER 平面図との共通化

2D プレビューは LINER DrawingDocument の `DrawingPrimitive[]` と同じ型を使用。
そのため、LINER 平面図 Overlay とプレビューで **同一の投影関数** を共有可能。

```typescript
// 共通関数 → 2D プレビューにも Overlay にも使用
function generateSubstructurePlanPrimitives(
  substructureData: SubstructureModel,
  placements: SupportPlacement[],
): DrawingPrimitive[] {
  // ...
}
```

---

## 9. Three.js 3D プレビュー

### 9.1 ビューア機能

| 機能 | 実装方針 |
|------|---------|
| Orbit/Pan/Zoom | 既存 OrbitControls を流用 |
| 選択ハイライト | 選択 Support の Mesh 色変更 + エミッシブ |
| 上部工統合表示 | ApolloSolidGeometryParameter に下部工を追加 |
| 地盤表示 ON/OFF | SceneGroup visibility 切替 |
| 基礎表示 ON/OFF | 同上 |
| 杭表示 ON/OFF | 同上 |
| 寸法表示 ON/OFF | Sprite ラベル表示切替 |
| fit to selection | 選択 Object3D にカメラフォーカス |
| 標準視点 | front(X), side(Y), top(Z), iso のプリセット |

### 9.2 既存 Viewer3D との関係

```
独立した Three.js ビューポートを下部工画面内に持つ。
既存 Viewer3D は main 画面用として維持。

下部工画面の 3D ビューポート:
  - 既存 ThreeViewport を直接流用せず、簡易版を新規作成
  - 理由: Viewer3D は frame model / Apollo など多機能。下部工画面では不要な依存を避ける。
  - 代替: @react-three/fiber の Canvas を使用（drei の OrbitControls）

使用ライブラリ:
  - three ^0.184.0（main に合わせる）
  - @react-three/fiber Canvas
  - @react-three/drei OrbitControls
```

---

## 10. 寸法表示

### 10.1 表示モード

| モード | 表示内容 | 用途 |
|--------|---------|------|
| OFF | 寸法非表示 | クリーン表示 |
| 主要寸法（デフォルト） | 全体寸法 + support中心間距離 | 全体把握 |
| 選択部材 | 選択中の部材寸法のみ | 詳細確認 |
| 全寸法 | 全要素の寸法線 | チェック時 |

### 10.2 2D 寸法表示対象

- フーチング 長さ × 幅
- 柱/壁 幅 × 奥行
- 杭 X/Y 方向間隔 + 端距離
- キャップ/梁 長さ
- 左右張出量
- Support 中心間距離

### 10.3 3D 寸法表示方針

- 常時表示は最小限（全体サイズ）
- 選択時のみ詳細寸法ラベルを表示
- ラベルは Sprite テキストで常に正面を向く
- ラベル衝突回避は既存 `labelCollisionAvoidance.ts` を流用

---

## 11. 選択同期

### 11.1 同期範囲

```
入力パネル ←→ 部材ツリー ←→ 2D平面 ←→ 3D ←→ LINER平面図

例:
  1. ユーザーが 3D で P1 をクリック
  2. 全ビューで P1 がハイライト
  3. 部材ツリーで P1 がフォーカス
  4. プロパティパネルに P1 のパラメータ表示
  5. LINER 平面図でも P1 がハイライト（可能な場合）
```

### 11.2 実装方式

```typescript
// React context または zustand store で選択状態を管理
interface SubstructureSelectionState {
  selectedSupportId: string | null;
  selectedComponentId: string | null;   // 柱/梁/フーチングなど
  hoveredSupportId: string | null;      // ホバー用
}

// 3D Object3D.userData.supportId に supportId を設定
// 2D DrawingPrimitive の stableId から supportId を逆引き
// 入力パネルは selectedSupportId に応じて表示切替
```

---

## 12. UI 画面遷移図（ASCII）

```
=== メイン画面（App.tsx） ===

[ProjectTree]            [Viewer3D]
  ├ LINER setup ─────────→ 線形編集
  ├ LINER drawings ─────→ 平面図
  ├ Apollo ─────────────→ 上部工設計
  └ ■下部工計画 ───────→ [下部工メイン画面]


=== 下部工メイン画面 ===
┌──────────────────────────────────────────────────────┐
│  下部工計画・3D                                      │
├──────────┬───────────────────────────┬───────────────┤
│ 部材ツリー│    [3D Viewport]          │  プロパティ    │
│  □ 全体   │                           │              │
│   ├ P1   │   2D/3D切替               │  形式選択     │
│   ├ P2   │   [表示制御] [プリセット]   │  パラメータ   │
│   └ A1   │                           │              │
│          │   座標表                   │              │
├──────────┴───────────────────────────┴───────────────┤
│  [新規] [サンプル] [保存] [LINER平面図で確認] [戻る]    │
└──────────────────────────────────────────────────────┘


=== サンプル新規作成ダイアログ ===
┌────────────────────────────────────┐
│  新規作成                           │
│  [● 空] [○ サンプル]               │
│  ┌─ サンプル選択 ──────────────┐   │
│  │ ○ 逆T式橋台                  │   │
│  │ ○ 単柱矩形橋脚               │   │
│  │ ● 門型橋脚                   │   │
│  │ ○ 2径間連続                 │   │
│  │ ○ LINERから生成              │   │
│  └─────────────────────────────┘   │
│  [キャンセル] [作成]               │
└────────────────────────────────────┘


=== LINER 平面図 Overlay 確認 ===
┌──────────────────────────────────────┐
│  LINER 平面図（DrawingDocument）      │
│                                      │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   │  ======線形======            │   │
│   │  [P1]━━━━━━[P2]━━━━━━[A2]  │   │
│   │   ■━■      ■━■      ■━■    │   │
│   │   ┃ ┃      ┃ ┃      ┃ ┃    │   │ ← 下部工 Overlay
│   │   ■━■      ■━■      ■━■    │   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
│  表示レイヤ: [●線形] [●測点] [●下部工] │
└──────────────────────────────────────┘
```

---

## 13. UI 状態・Validation

### 13.1 状態表示

```typescript
type InputState =
  | "valid"          // 正常値（緑枠 or 通常表示）
  | "warning"        // 警告値（黄色枠＋⚠アイコン）
  | "error"          // エラー値（赤枠＋✗アイコン）
  | "readonly"       // 読取専用値（グレー背景、編集不可）
  | "auto"           // 自動計算値（薄青背景）
  | "unsupported"    // 未対応（グレーアウト）
  | "future";        // 将来対応（グレーアウト＋「将来対応」ラベル）
```

### 13.2 数値入力時のフィードバック

| 状態 | 表示 | 保存可否 |
|------|------|---------|
| valid | 通常 | 可 |
| warning (P02 WARNING) | 黄色枠 + ⚠ + tooltip | 可 |
| error (P02 FATAL) | 赤枠 + ✗ + エラーメッセージ | 不可 |
| 未入力 | 空欄 + 薄字 placeholder | 不可 |
| 範囲外 | 赤枠 + 「範囲: 0.5〜8.0」 | 不可 |

### 13.3 全体バリデーション表示

```typescript
interface ValidationSummary {
  totalErrors: number;
  totalWarnings: number;
  supports: {
    supportId: string;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  }[];
  isSaveable: boolean;  // totalErrors === 0
}
```

画面下部のステータスバーに常時表示：
```
[● 正常] | ⚠ 警告: 2 | ✗ エラー: 0 | 保存可能
```

---

## 14. レスポンシブ／デスクトップ方針

| 項目 | 方針 |
|------|------|
| 対象 | デスクトップ（1280×720 以上） |
| レイアウト | 3ペイン（左+中央+右）+ 下部ステータスバー |
| パネルサイズ | ドラッグによるリサイズ可能（splitter） |
| パネル開閉 | 左/右パネルは折りたたみ可能 |
| スクロール | プロパティパネルは縦スクロール |
| Electron 想定 | メニューバー + ウィンドウタイトル対応 |
| 画面サイズ | 1920×1080 を基準設計 |

---

## 15. 新規ファイル・変更ファイル見積もり

### 15.1 新規ファイル

| # | ファイルパス | 内容 |
|---|-------------|------|
| 1 | `frontend/src/substructure/pages/SubstructurePlanningPage.tsx` | メインページ |
| 2 | `frontend/src/substructure/components/SubstructureTreePanel.tsx` | 部材ツリー |
| 3 | `frontend/src/substructure/components/SubstructurePropertyPanel.tsx` | プロパティ編集 |
| 4 | `frontend/src/substructure/components/PierInputForm.tsx` | 橋脚入力（単柱/壁式） |
| 5 | `frontend/src/substructure/components/PortalPierInputForm.tsx` | 門型橋脚入力 |
| 6 | `frontend/src/substructure/components/AbutmentInputForm.tsx` | 橋台入力 |
| 7 | `frontend/src/substructure/components/FoundationInputForm.tsx` | 基礎入力 |
| 8 | `frontend/src/substructure/components/PileInputPanel.tsx` | 杭入力（平面図付き） |
| 9 | `frontend/src/substructure/components/SubstructurePlanPreview.tsx` | 2D平面プレビュー（SVG） |
| 10 | `frontend/src/substructure/components/Substructure3DPreview.tsx` | 3Dプレビュー（R3F） |
| 11 | `frontend/src/substructure/components/CoordinateTable.tsx` | 座標表 |
| 12 | `frontend/src/substructure/components/SampleCreationDialog.tsx` | サンプル作成ダイアログ |
| 13 | `frontend/src/substructure/hooks/useSubstructureSelection.ts` | 選択同期フック |
| 14 | `frontend/src/substructure/hooks/useSubstructureRealtimeUpdate.ts` | リアルタイム更新フック |
| 15 | `frontend/src/substructure/state.ts` | 選択状態管理（zustand or context） |

### 15.2 変更ファイル

| # | ファイルパス | 変更内容 |
|---|-------------|---------|
| 1 | `frontend/src/liner/uiPreparation.ts` | LinerUiRouteId に `"liner.substructure"` 追加 |
| 2 | `frontend/src/App.tsx` | `liner.substructure` ルーティング追加 |

---

## 16. Freeze 判定

### 16.1 Freeze 内容

| 項目 | 判定 |
|------|------|
| メイン画面入口 | **FROZEN**: review タブ + 独立ページ |
| ルーティング | **FROZEN**: `/pro/liner/substructure` |
| 画面構成 | **FROZEN**: 3ペインCAD風レイアウト |
| 配置UI | **FROZEN**: PRIMARY/SECONDARY/EXCEPTION 3方式 |
| 形式セレクタ | **FROZEN**: ラジオボタン + グレーアウト将来対応 |
| 入力パネル | **FROZEN**: 5形式のパラメータ定義確定 |
| 杭入力（JIP思想） | **FROZEN**: 入力+平面図プレビュー同時表示 |
| サンプル生成 | **FROZEN**: 9種のサンプル + LINER生成 |
| リアルタイム更新 | **FROZEN**: 300ms debounce + 差分更新 |
| 2Dプレビュー | **FROZEN**: 共通 DrawingPrimitive 関数使用 |
| 3Dプレビュー | **FROZEN**: R3F Canvas 簡易版（Viewer3D非依存） |
| 寸法表示 | **FROZEN**: 4モード（OFF/主要/選択/全） |
| 選択同期 | **FROZEN**: context/zustand + supportId キー |
| UI状態管理 | **FROZEN**: 7状態（valid/warning/error/readonly/auto/unsupported/future） |

### 16.2 最終報告

```
BASE_MAIN_SHA: d36da3e53de36afdc5513d06d893f00d80b6913e
WORKTREE_PATH: /tmp/spacer-clone-phase-c1
FEATURE_BRANCH: feature/phase-c1-3d-liner-integration
WORKTREE_STATUS: clean

MAIN_ENTRY_READY: YES（review タブ＋/pro/liner/substructure ルート）
MAIN_ROUTING_DESIGN_READY: YES（App.tsx + uiPreparation.ts 拡張）
PROJECT_HANDOFF_READY: YES（linerDraft → SubstructurePlanningPage へ props 渡し）

PLACEMENT_UI_READY: YES（3方式+degree表示+読取専用）
STRUCTURE_SELECTOR_READY: YES（ラジオボタン+グレーアウト+FUTURE表示）
ABUTMENT_UI_READY: YES（逆T式+ラーメン式）
PIER_UI_READY: YES（単柱矩形+壁式）
PORTAL_PIER_UI_READY: YES（2柱別パラメータ+横梁）
FOUNDATION_UI_READY: YES（直接基礎+杭基礎）
PILE_UI_READY: YES（JIP系FOOTING思想+平面図連動）

SAMPLE_GENERATION_UI_READY: YES（9種+LNER支点）
REALTIME_PREVIEW_READY: YES（300ms debounce+差分更新）
PLAN_2D_READY: YES（共通 DrawingPrimitive 関数）
THREE_D_PREVIEW_READY: YES（R3F Canvas 簡易版）
DIMENSION_UI_READY: YES（4モード）
SELECTION_SYNC_READY: YES（supportId キー+context）
LINER_SYNC_UI_READY: YES（Overlay 表示切替+選択同期）

UI_MOCKUP_READY: YES（全画面 ASCII wireframe 含む）
UI_STATE_MODEL_READY: YES（7状態定義）
VALIDATION_UI_READY: YES（P02 FATAL/WARNING 対応）

FILES_EXPECTED_TO_MODIFY: 2（uiPreparation.ts, App.tsx）
FILES_EXPECTED_TO_ADD: 15（components/hooks/state/pages）

SOURCE_CODE_CHANGED: NO
SCHEMA_CHANGED: NO
UI_CODE_CHANGED: NO
TEST_CODE_CHANGED: NO

UNRESOLVED_BLOCKERS: NONE
PHASE_C1_P03_VERDICT: FROZEN
```