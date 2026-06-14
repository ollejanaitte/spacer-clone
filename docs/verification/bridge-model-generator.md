# bridge-model-generator.md（検証資料）

Bridge Project から FEM Model への生成ロジックの最小検証モデルと期待値。

## 1. テストモデル一覧

| 名前 | 概要 | 期待挙動 |
|------|------|----------|
| bridge-simple-2lane | 単径間 2 車線・支間 30m・mesh 10 | 節点 33、橋軸方向部材 30、横断方向部材 32、合計 62 部材、支点 4（両端 2×2）|
| bridge-2span-3girder | 2 径間・主桁 3 本相当・30m+40m | xCount=21, yCount=5 (両端+主桁3), 節点 105, 部材 124, 支点 6 |
| bridge-load-line | 単径間 30m・車線 2・line 1 本・distributed load 12 kN/m | 上記に加え、1 memberLoads |

## 2. 期待値の数式

```
xCount = sum(span.length / unit) + 1
        = total_spans * mesh_division + 1
yCount = y_positions.length  (>= 5)
nodeCount = xCount * yCount
memberCount (x direction) = (xCount-1) * yCount
memberCount (y direction) = xCount * (yCount-1)
total members = x方向 + y方向
supportCount (両端 y のみ) = 2 * (1 + 支間数)
```

### 2.1 単径間 30m, mesh=10, 横断 3 主桁 (yCount=5)

```
xCount = 11
yCount = 5
nodeCount = 55
member x = 10 * 5 = 50
member y = 11 * 4 = 44
total    = 94
support = 4 (両端 y=0, y=4)
```

## 3. 検証項目

### 3.1 自動テスト

- `backend/tests/test_bridge_fem_generator.py`:
  - 単径間モデル → 期待節点数 / 部材数
  - 2 径間モデル → 期待節点数 / 部材数
  - 荷重ライン付きモデル → memberLoads 生成
  - span.length=0 → BridgeFemGenerationError
  - mesh_division=0 → BridgeFemGenerationError
  - 重複節点が発生しないこと
  - 孤立節点がないこと
  - 要素長が 0 でないこと
  - 必ず支点が生成されること

- `backend/tests/test_bridge_api.py`:
  - POST /bridge 正常系
  - GET /bridge/{id}
  - PUT /bridge/{id}
  - DELETE /bridge/{id}
  - 不在 ID → 404
  - 不正スキーマ → 400
  - POST /fem/generate 正常系・異常系

- `backend/tests/test_bridge_validation.py`:
  - JSON Schema レベルでのバリデーション

### 3.2 手計算

最も単純な例:

```
支間 10m, mesh_division=2, yCount=3
xCount = 3, yCount=3
nodeCount = 9
member x = 2*3 = 6
member y = 3*2 = 6
total = 12
support = 4
```

## 4. 既知の制限 (MVP)

- 道路橋示方書の正式活荷重完全実装はしない
- 衝撃係数は MVP 簡略式: `i = min(0.3, 20 / (50 + L_max))`
- 横断 y_positions は固定ロジック（カスタム本数の主桁は Step1 のレーンから自動算出）
- 厳密な支承条件の選択 UI はなし（両端ピン＋中間ローラの最小構成）
- 曲線橋は非対応（直線のみ）
- 動的解析・応答スペクトル解析の自動連携は未実装

## 5. 次フェーズ候補

- 任意 y 座標の主桁追加 UI
- 道路橋示方書 i 式の正式対応（L だけでなく種別・活荷重区分）
- 活荷重の載荷パターン生成（車両・群集・トラック）
- 影響線解析との自動連携
- 橋脚 / 基礎 / 支承条件の詳細 UI
- 任意のラインに対する分布荷重・移動荷重のフル対応
