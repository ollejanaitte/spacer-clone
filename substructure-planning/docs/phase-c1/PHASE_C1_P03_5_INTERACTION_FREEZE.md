# Phase C1 P03.5 操作体系（Interaction Design）Freeze

## 1. 基本マウス操作

### 1.1 3D ビューポート

既存の非Apollo（LINER/frame model）向け OrbitControls バインドを採用：
`frontend/src/viewer/threeUtils.ts` の `resolveOrbitControlsBindings(false)` を基準とする。

| 操作 | 3D ビューポート | 備考 |
|------|----------------|------|
| 左クリック | **選択**（support/部材ピッキング） | Raycaster で Object3D を判定 |
| ドラッグ | **Orbit（回転）** | LEFT=ROTATE |
| マウスホイール | **Zoom（Dolly）** | MIDDLE=DOLLY |
| 中ドラッグ | **Zoom** | 既存と同一 |
| 右ドラッグ | **Pan（移動）** | RIGHT=PAN |
| ダブルクリック | **Fit Selection** | 選択対象にカメラフォーカス |
| Shift + 左クリック | 複数選択のトグル追加 | supportId に基づく |
| Ctrl/Cmd + 左クリック | 複数選択のトグル追加 | 同上 |
| ESC | 選択解除 | 全ビュー選択をクリア |

### 1.2 2D 平面プレビュー

| 操作 | 2D 平面 | 備考 |
|------|---------|------|
| 左クリック | **選択**（DrawingPrimitive 判定） | stableId → supportId 逆引き |
| Drag | **Pan** | 左ドラッグで移動 |
| マウスホイール | **Zoom** | カーソル中心に拡大/縮小 |
| 右クリック | **コンテキストメニュー** | 選択対象に応じて切替 |
| ダブルクリック | **中心に表示** | 選択対象を画面中央へ |
| Shift + 左クリック | 複数選択トグル | |
| ESC | 選択解除 | |

### 1.3 LINER 平面図

| 操作 | LINER 平面図 | 備考 |
|------|-------------|------|
| 左クリック | **選択**（下部工 Overlay 判定） | supportId 同期 |
| ドラッグ | Pan（既存） | 既存 LINER 操作を維持 |
| ホイール | Zoom（既存） | |
| 右クリック | コンテキストメニュー（下部工上のみ） | 他領域は既存挙動 |

### 1.4 部材ツリー

| 操作 | 部材ツリー | 備考 |
|------|-----------|------|
| 左クリック | **選択** | supportId をコンテキストへ |
| Ctrl/Cmd + 左クリック | 複数選択 | |
| 右クリック | コンテキストメニュー | |
| ダブルクリック | Fit Selection（3D） | |

### 1.5 プロパティパネル

| 操作 | プロパティパネル |
|------|-----------------|
| クリック | 数値フィールドにフォーカス |
| Enter | 値確定（commit） |
| Tab | 次のフィールドへ移動 |
| ESC | 入力キャンセル（元の値に戻す） |
| ドラッグ（数値） | spinner 増減（微調整） |

---

## 2. 選択ルール

### 2.1 選択状態の定義

```
選択状態は supportId をキーとして、全ビューで共有する。

interface SelectionState {
  selectedSupportIds: string[];      // 複数選択対応
  primarySupportId: string | null;   // 主選択（プロパティ表示対象）
  hoveredSupportId: string | null;   // ホバー（非選択ハイライト）
}
```

### 2.2 選択同期

```
supportId を唯一の同期キーとする。

各ビューの選択 → SelectionState 更新 → 全ビューに反映

例:
  - 3D で P1 Object3D クリック
    → Object3D.userData.supportId = "P1" を取得
    → SelectionState.selectedSupportIds = ["P1"]
    → primarySupportId = "P1"
    → Tree で P1 フォーカス
    → 2D で P1 ハイライト
    → Property で P1 パラメータ表示
    → LINER 平面図で P1 ハイライト（可能な場合）
```

### 2.3 選択タイプ

| タイプ | 動作 | 対象 |
|--------|------|------|
| 単一選択 | 1つの support を選択 | 全ビュー |
| 複数選択 | Shift/Ctrl クリックで追加 | 全ビュー |
| 主選択 | primarySupportId のプロパティ表示 | プロパティパネル |
| 選択解除 | ESC または空領域クリック | 全ビュー |

### 2.4 選択ハイライト

| ビュー | ハイライト方法 |
|--------|---------------|
| 3D | 選択 Mesh の material.emissive を設定（例: #3366ff） |
| 2D | SVG fill/stroke 色変更 + 太線 |
| LINER | DrawingPrimitive の style 上書き |
| Tree | 行背景色変更 + フォーカス |

### 2.5 双方向同期の必須要件

```
同一 supportId が全ビューで同一対象を指すこと。

検証:
  - 3D Object3D.userData.supportId === Tree node key
  - 2D DrawingPrimitive.stableId → supportId逆引き成立
  - LINER Overlay primitive → supportId逆引き成立
  - Property panel の対象 support
```
---

## 3. 編集操作

### 3.1 許可する編集操作

| 操作 | 許可 | 方式 | Source of Truth への影響 |
|------|------|------|--------------------------|
| プロパティ寸法変更 | YES | 数値入力 | Substructure Model 更新 |
| station 変更 | YES | 数値入力 | Substructure placement 更新 |
| offset 変更 | YES | 数値入力 | 同上 |
| skew 変更 | YES | 数値入力 | 同上 |
| support 追加 | YES | ツールバー/メニュー | Model に追加 |
| support 削除 | YES | コンテキストメニュー | Model から削除 |
| support 複製 | YES | コンテキストメニュー | Model に複製追加 |
| サンプル生成 | YES | ダイアログ | Model 置換 |
| 再配置 | YES | 「再配置」ボタン | placement 再計算 |
| 自動配置 | YES | 「LINERから取得」 | placement 再計算 |

### 3.2 直接ドラッグ編集の評価

| 操作 | 採用 | 判断理由 |
|------|------|---------|
| 2D ドラッグ直接移動 | **FUTURE** | P02 の station/offset 正本と整合しづらい。数値入力で一致させる |
| 3D ドラッグ直接移動 | **FUTURE** | Source of Truth（LINER算出XYZ）を破壊する恐れ |
| 3D gizmo 回転 | **FUTURE** | skew は数値入力が正本。gizmo は精度低下の恐れ |
| 杭1本単位 手動ドラッグ | **FUTURE** | 杭配置はパラメトリック（本数/間隔）。手動ドラッグは配置規則と衝突 |

**方針：** Phase C1 では直接ドラッグ編集は採用しない。全て数値入力＋パラメトリック生成で編集する。ドラッグ直接編集は将来（Phase D 以降）の課題。

---

## 4. スナップ

### 4.1 スナップ対象の分類

| スナップ対象 | 分類 | 備考 |
|-------------|------|------|
| LINER 測点（station） | **C1必須** | PRIMARY 配置の基本 |
| support 位置 | C1必須 | 既存 support の中心 |
| 橋軸（longitudinal） | C1必須 | 配置の基準線 |
| 中心線（centerline） | C1必須 | 線形中心 |
| 杭中心 | **将来対応** | 杭配置はパラメトリック |
| グリッド | 将来対応 | 任意グリッド |
| フーチング中心 | 将来対応 | 選択精度向上 |
| 基準線 | 将来対応 | ユーザー定義線 |

### 4.2 スナップ方針

標準配置が「LINER線形＋測点＋Offset」であるため、スナップは **station 入力の補助** として機能する。

```
SECONDARY 方式（平面図から選択）で使用:
  - クリック位置 → stationAtPoint() で station/offset 逆算
  - 最近傍 station にスナップ（任意）
  - 中心線上にスナップ（offset=0 にする）

直接ドラッグ編集がないため、通常の数値入力ではスナップは不要。
```

---

## 5. ビューワ操作

### 5.1 3D ビューワ

| 操作 | 機能 | 実装 |
|------|------|------|
| Orbit | 回転 | LEFT ドラッグ |
| Pan | 移動 | RIGHT ドラッグ |
| Zoom | 拡大縮小 | ホイール / MIDDLE ドラッグ |
| Fit All | 全表示 | ツールバー / Home / ダブルクリック空領域 |
| Fit Selection | 選択表示 | ツールバー / F / ダブルクリック選択物 |
| Top | 上面視 | ツールバー / プリセット |
| Front | 正面視 | ツールバー |
| Side | 側面視 | ツールバー |
| Isometric | 等角視 | ツールバー / デフォルト |
| Reset View | 初期視点 | ツールバー |

### 5.2 2D ビューワ

| 操作 | 機能 |
|------|------|
| Pan | 左ドラッグ |
| Zoom | ホイール |
| Fit | 全図形表示 |
| Center Selection | 選択を中央へ |
| Grid ON/OFF | グリッド表示切替 |
| Dimension ON/OFF | 寸法表示切替 |

### 5.3 既存操作との整合

- 3D は既存の非Apolloバインド（LEFT=ROTATE, RIGHT=PAN）を採用
- LINER 平面図は既存 LINER 操作を一切変更しない
- ショートカットは既存 LINER/Apollo と衝突しないものを選定

---

## 6. 右クリックメニュー

### 6.1 コンテキストメニュー（support 選択時）

```
┌─ [P1] ─────────────────────────────┐
│  プロパティ表示                     │
│  中央表示（2D）                    │
│  Fit Selection（3D）               │
│  ──────────────────────────────   │
│  コピー          Ctrl+C            │
│  複製            Ctrl+D            │
│  削除            Delete            │
│  ──────────────────────────────   │
│  寸法表示                          │
│  サンプル生成                      │
│  LINER位置へジャンプ               │
│  3Dで表示 / 2Dで表示               │
└────────────────────────────────────┘
```

### 6.2 コンテキストメニュー（空領域クリック時）

```
┌─ 操作 ─────────────────────────────┐
│  サンプル生成                      │
│  LINER支点から生成                  │
│  ──────────────────────────────   │
│  Fit All          Home            │
│  表示: 地盤 [✓] 基礎 [✓] 杭 [✓]  │
└────────────────────────────────────┘
```

### 6.3 選択対象によるメニュー切替

| 対象 | メニュー内容 |
|------|-------------|
| support 選択時 | プロパティ/中央表示/Fit/コピー/複製/削除/寸法/LINERジャンプ |
| 部材（柱/梁/基礎）選択時 | プロパティ/寸法表示/Fit |
| 空領域 | サンプル生成/表示制御/Fit All |
| LINER Overlay 上 | LINER位置へジャンプ/選択同期 |

---

## 7. キーボードショートカット

### 7.1 ショートカット一覧

| ショートカット | 機能 | 衝突確認 |
|--------------|------|---------|
| Ctrl/Cmd + C | コピー | ブラウザ標準（OK） |
| Ctrl/Cmd + V | ペースト | ブラウザ標準（OK） |
| Ctrl/Cmd + D | 複製（support） | ブラウザ標準なし（OK） |
| Ctrl/Cmd + Z | Undo | ブラウザ標準（OK） |
| Ctrl/Cmd + Y | Redo | ブラウザ標準（OK） |
| Shift + Ctrl + Z | Redo | ブラウザ標準（OK） |
| Delete / Backspace | 選択 support 削除 | 入力フィールド内は例外 |
| ESC | 選択解除 / キャンセル | OK |
| F | Fit Selection | OK |
| Home | Fit All | ブラウザでページ先頭（要 preventDefault） |
| 1 | Top 視点 | OK |
| 2 | Front 視点 | OK |
| 3 | Side 視点 | OK |
| 0 / 5 | Isometric 視点 | OK |
| Ctrl/Cmd + S | 保存 | ブラウザ標準（Electron で保存） |

### 7.2 入力フィールド内の例外

- 数値入力フィールド内では Delete/Backspace/ESC は通常のテキスト編集として動作
- ショートカットは入力フィールドにフォーカスがある場合は無効化（標準ブラウザ挙動に従う）

---

## 8. Undo / Redo

### 8.1 Undo/Redo 履歴対象イベント

| イベント | 履歴対象 | 履歴の粒度 |
|---------|---------|-----------|
| 数値変更（寸法） | YES | 1フィールド確定ごと |
| support 追加 | YES | 追加操作1回 |
| support 削除 | YES | 削除操作1回 |
| support 複製 | YES | 複製操作1回 |
| station 変更 | YES | 1回の変更 |
| offset 変更 | YES | 1回の変更 |
| skew 変更 | YES | 1回の変更 |
| サンプル生成 | YES | 生成操作1回 |
| 表示切替（地盤ON/OFF等） | NO | 表示は履歴対象外 |
| 選択変更 | NO | 選択は履歴対象外 |
| LINER 線形変更 | NO | LINER 側で管理 |

### 8.2 Undo/Redo 仕様

```
履歴単位:
  - 1 操作 = 1 コミット（数値確定 or 構造操作）
  - debounce 中の連続入力は 1 つの履歴エントリにまとめる

debounce 入力の履歴まとめ方:
  - 数値入力開始 → 一時状態
  - 300ms debounce 後確定 → 履歴エントリ追加
  - 連続して同じフィールドを編集しても、確定ごとに履歴エントリ

Undo 後の反映:
  - Single source of truth（Substructure Model）を復元
  - 2D / 3D / 寸法を再生成
  - LINER 同期（可能な場合）

Redo:
  - Undo 後に再適用

Selection 状態の扱い:
  - Undo で削除された support が選択中なら選択解除
  - Undo/Redo で追加された support は選択状態を維持（あれば）

project save との関係:
  - Undo/Redo はメモリ上の Model のみ変更
  - Save は明示的（Ctrl+S）にのみ実行
  - Save 後も Undo 履歴は保持（最新 Save 時点へ戻る機能は将来）
```

---

## 9. リアルタイム更新

### 9.1 更新フロー

```
User Action
  → State 更新（Substructure Model）
  → Validation（P02 の FATAL/WARNING 判定）
    → FATAL あり → 更新停止 + エラー表示（fail-closed）
    → FATAL なし → 継続
  → Placement 再計算（station/offset/skew 変更時のみ）
  → 2D 再生成
  → 3D 再生成
  → 寸法再計算
  → LINER 同期（Overlay 更新）
  → Selection 維持（supportId が存在すれば）
```

### 9.2 即時 vs debounce

| 更新対象 | 方式 | 理由 |
|---------|------|------|
| 2D 投影 | **即時** | 軽量、Constant feedback に重要 |
| 3D 再生成 | **debounce（300ms）** | 重い、連続入力で過剰再生成を防ぐ |
| 寸法 | 即時 | 2D と同様 |
| 座標表 | 即時 | 軽量 |

### 9.3 重い 3D 再生成の扱い

```
- 3D は debounce で頻度制御
- 再生成は requestAnimationFrame でスケジュール
- 再生成中は前回シーンを維持（ちらつき防止）
- 杭が多数（>50本）の場合はインスタンシングを検討
```

### 9.4 Validation Error 時の扱い

| 状態 | 3D/2D 更新 | 表示 | 保存 |
|------|-----------|------|------|
| Valid | 更新継続 | 正常 | 可 |
| Warning | 更新継続 | 黄色⚠ | 可 |
| FATAL | **更新停止** | 赤✗ + エラーメッセージ | **不可** |

---

## 10. 寸法操作

### 10.1 寸法4モード

| モード | ツールバー | 右クリック | 表示内容 |
|--------|-----------|-----------|---------|
| OFF | 表示しない | 選択可 | 寸法非表示 |
| 主要寸法（デフォルト） | 表示 | 選択可 | 全体寸法 + support中心間距離 |
| 選択部材 | 表示 | 選択可 | 選択中の部材寸法のみ |
| 全寸法 | 表示 | 選択可 | 全要素の寸法線 |

### 10.2 寸法更新ルール

```
選択部材モード:
  - 選択 support 変更時 → 寸法ラベルを更新
  - 選択解除時 → 主要寸法モードに戻る

2D/3D 共通ルール:
  - 寸法ラベルは同一の寸法計算関数から生成
  - 2D は SVG <text>、3D は Sprite ラベル

ラベル重なり時:
  - 既存 labelCollisionAvoidance.ts を流用
  - 重なるラベルは間引き（優先度順）
```

---

## 11. 2D・3D・LINER・プロパティ同期マトリクス

### 11.1 イベント→更新対象マトリクス

| イベント | Selection | State | 2D | 3D | LINER | Property |
|---------|-----------|-------|----|----|-------|----------|
| LINER で P1 選択 | P1 | - | P1 ハイライト | P1 ハイライト | （発生元） | P1 表示 |
| 2D で P1 選択 | P1 | - | 発生元 | P1 ハイライト | P1 ハイライト | P1 表示 |
| 3D で P1 選択 | P1 | - | P1 ハイライト | 発生元 | P1 ハイライト | P1 表示 |
| Tree で P1 選択 | P1 | - | P1 ハイライト | P1 ハイライト | P1 ハイライト | P1 表示 |
| Property で P1 編集 | P1 | Model 更新 | 再生成 | 再生成 | Overlay 更新 | 発生元 |
| station 変更 | 維持 | placement 更新 | 再生成 | 再配置 | Overlay 更新 | 値更新 |
| offset 変更 | 維持 | placement 更新 | 再生成 | 再配置 | Overlay 更新 | 値更新 |
| skew 変更 | 維持 | placement 更新 | 再生成 | 再生成 | Overlay 更新 | 値更新 |
| support 削除 | 解除 | Model 削除 | 再生成 | 再生成 | Overlay 更新 | 空 |
| support 追加 | 新規選択 | Model 追加 | 再生成 | 再生成 | Overlay 更新 | 新規表示 |

---

## 12. 誤操作防止

### 12.1 防止対策

| 対策 | 内容 |
|------|------|
| 削除確認 | support 削除時に確認ダイアログ「P1 を削除しますか？」 |
| 未保存変更 | 画面離脱時に「未保存の変更があります」警告 |
| 未対応形式 | FUTURE 形式は編集不可（グレーアウト） |
| read-only 強制 | X/Y/tangent/transverse は編集不可（UI 上 disabled） |
| FATAL 確定禁止 | エラー状態で保存/確定できない |
| supportId 重複禁止 | 重複 ID はバリデーションで検出 + 保存不可 |
| 測点範囲外 | clamp して warning 表示（P02 準拠） |
| XYZ 高度モード警告 | EXCEPTION モード使用時に警告バナー表示 |

### 12.2 操作停止条件

```
以下は操作を続行せず、ユーザーにエラーを明示する:
  - supportId 重複
  - FATAL な数値エラー
  - XYZ 高度モードと PRIMARY 方式の同時指定
```

---

## 13. Freeze 判定

### 13.1 Freeze サマリー

| 項目 | 判定 |
|------|------|
| 基本マウス操作 | **FROZEN**: 3D=既存OrbitControlsバインド、2D=専用 |
| 選択ルール | **FROZEN**: supportId キー、単一/複数/主選択/解除 |
| 編集操作 | **FROZEN**: 数値入力+パラメトリックのみ。直接ドラッグは不可 |
| スナップ | **FROZEN**: station/centerline は C1必須 |
| ビューワ操作 | **FROZEN**: 既存と整合 |
| 右クリックメニュー | **FROZEN**: 対象依存で切替 |
| ショートカット | **FROZEN**: 既存と衝突なし |
| Undo/Redo | **FROZEN**: 1操作=1履歴、debounce まとめ |
| リアルタイム更新 | **FROZEN**: 2D即時/3D debounce(300ms) |
| 寸法操作 | **FROZEN**: 4モード |
| 2D/3D/LINER 同期 | **FROZEN**: マトリクス確定 |
| 誤操作防止 | **FROZEN**: 確認+read-only+FATAL停止 |

### 13.2 最終報告

```
BASE_MAIN_SHA: d36da3e53de36afdc5513d06d893f00d80b6913e
WORKTREE_PATH: /tmp/spacer-clone-phase-c1
FEATURE_BRANCH: feature/phase-c1-3d-liner-integration
WORKTREE_STATUS: clean

SELECTION_READY: YES（supportId キー、単一/複数/主選択/解除）
MULTI_SELECTION_READY: YES（Shift/Ctrl クリック）
EDIT_READY: YES（数値入力+パラメトリックのみ）
DRAG_POLICY_READY: YES（直接ドラッグは FUTURE、数値入力が正本）
SNAP_READY: YES（station/centerline は C1必須）
VIEW_READY: YES（既存バインドと整合）
CONTEXT_MENU_READY: YES（対象依存で切替）
SHORTCUT_READY: YES（既存と衝突なし）
UNDO_REDO_READY: YES（1操作=1履歴）
REALTIME_UPDATE_READY: YES（2D即時/3D debounce 300ms）
DIMENSION_INTERACTION_READY: YES（4モード）
SYNC_READY: YES（イベント×ビュー マトリクス確定）
ERROR_PREVENTION_READY: YES（確認+read-only+FATAL停止）

INTERACTION_MATRIX_READY: YES
SELECTION_SYNC_MATRIX_READY: YES
SHORTCUT_MATRIX_READY: YES
UNDO_REDO_MATRIX_READY: YES

SOURCE_CODE_CHANGED: NO
SCHEMA_CHANGED: NO
UI_CODE_CHANGED: NO
TEST_CODE_CHANGED: NO

UNRESOLVED_BLOCKERS: NONE
PHASE_C1_P03_5_VERDICT: FROZEN
```