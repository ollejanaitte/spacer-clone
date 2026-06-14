# bridge-model-wizard.md

## 1. 機能目的

初心者ユーザでも SPACER のような表入力型にいきなり向き合うことなく、橋梁の意味的情報（道路条件・支間・衝撃係数・走行ライン・荷重）から**3次元骨組FEMモデル**をウィザード形式で自動生成できるようにする。

従来の SPACER との対比:

- SPACER: 節点テーブル・部材テーブルに数値を直接入力する「表入力型」。
- 本機能: 「橋の概念」を意味的に入力し、内部で節点・部材・支点・荷重へ変換する。

設計思想:

- **UI** は意味入力 (semantic)。
- **FEMモデル生成** は数値変換 (numerical)。
- **解析エンジン** は既存実装を再利用。

## 2. 6 ステップ構成

| Step | 名称 | 主入力 | 目的 |
|------|------|--------|------|
| 1 | 道路条件 | 車線数・車線幅・中央分離帯・歩道・高欄 | 橋梁の横断構成と主桁候補 y 座標を確定する |
| 2 | 支間設定 | 支間数・各支間長・offset | 橋軸方向 x 座標を確定する |
| 3 | 衝撃係数 | 自動/手動・係数値 | 荷重増幅係数を確定する |
| 4 | ライン設定 3D | クリック 2 点でライン追加 | 荷重・走行・参照ラインを記録する |
| 5 | 荷重設定 | 荷重タイプ・対象ライン・値・方向 | 荷重ケース別の荷重を定義する |
| 6 | FEMモデル生成 | mesh_division | 既存の project.json 形式を生成する |

## 3. 画面遷移

```
[Start]
   ↓
[Step1 RoadCondition] →(Next)→
[Step2 SpanSetting]   →(Next)→
[Step3 ImpactFactor]  →(Next)→
[Step4 LineSetting3D] →(Next)→
[Step5 LoadSetting]   →(Next)→
[Step6 ModelGeneration] →(Generate)→ [Viewer / Send to Analysis]
```

任意ステップから戻れる。

## 4. 入力項目（ステップ別）

### Step 1 道路条件
- `lane_count` (int, 1〜6)
- `lane_width` (m, >0)
- `median_width` (m, >=0)
- `sidewalk_width` (m, >=0)
- `barrier_width` (m, >=0)

### Step 2 支間設定
- `spans[]` (1 以上)
  - `index` (1〜N)
  - `length` (m, >0)
  - `offset` (m, >=0)

### Step 3 衝撃係数
- `auto` (bool)
- `value` (number, 0.0〜1.0)
- `formula` (任意、表示用)

### Step 4 ライン設定
- モード: view / draw_line / select / delete
- `BridgeLine`:
  - `id`, `type` (traffic/load/reference), `name`
  - `points`: [[x,y,z], [x,y,z]]（MVPは 2 点の直線）

### Step 5 荷重設定
- `BridgeLoad`:
  - `id`, `type` (self_weight/distributed/vehicle), `name`
  - `magnitude`, `direction` (X/Y/Z/-X/-Y/-Z)
  - `line_id` (任意)

### Step 6 FEMモデル生成
- `mesh_division` (int, >=1)
- `mesh_density` (coarse/standard/fine)

## 5. バリデーション

- Step 1: 0 以下の寸法禁止、合計幅 0 禁止
- Step 2: 支間長 > 0、支間数 1 以上
- Step 3: 自動 ON のとき value は算出のみ、表示
- Step 4: ラインは 2 点必要、同一ライン上の重複禁止
- Step 5: 対象 line_id が存在すること
- Step 6: mesh_division >= 1

## 6. エラー表示

- 各入力欄の下にインラインエラー（赤）
- サイドバー下部に集約エラーメッセージ
- API 失敗時はトーストで通知

## 7. 初心者向け UX 方針

- 道路条件入力時に即時プレビュー（横断構成）をサイドバーに表示
- 支間追加・削除は +/- ボタンで操作
- 3D は OrbitControls による視点操作、ダブルクリックでフィット
- 「次へ」はバリデーション通過後のみ活性化
- 専門用語は補助テキストでフォロー

## 8. 既存アプリへの統合方針

- メイン Toolbar に「橋梁モデル作成」ボタンを追加
- 起動すると別モーダル（フルスクリーン）で BridgeWizard を表示
- 生成された project.json は通常の project ステートへ流し込み、既存解析がそのまま走る
- 既存の `project` / `nodes` / `members` ... のセクションは破壊しない
