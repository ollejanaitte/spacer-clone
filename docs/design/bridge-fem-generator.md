# bridge-fem-generator.md

Bridge Domain Model (意味的モデル) から既存 `project.schema.json` (FEMモデル) への変換仕様。

## 1. 全体フロー

```
BridgeProject
  ├── CrossSection → 横断 y 座標列
  ├── Spans        → 橋軸 x 座標列
  ├── BridgeLine   → そのまま保持 (FEM ノードとの紐付けは将来拡張)
  ├── BridgeLoad   → NodalLoad / MemberLoad への変換
  └── GenerationSettings → 既存 Material / Section の再利用
```

## 2. 座標生成

### 2.1 横断 y_positions

`CrossSection` から以下の手順で y 座標を計算する。中央を y=0 とする左右対称配置。

```
half_lane_total = lane_count * lane_width / 2
y_left  = -(half_lane_total + median_width/2 + sidewalk_width + barrier_width)
y_right = +half_lane_total + median_width/2 + sidewalk_width + barrier_width
```

`y_positions` は次の点列（重複除去）:

1. y_left（高欄外端）
2. y_left + barrier_width（車道境界 / 歩道端）— 歩道内側端
3. -half_lane_total - median_width/2（車線外端）
4. -median_width/2（中央分離帯端）
5. +median_width/2（中央分離帯端）
6. +half_lane_total + median_width/2（車線外端）
7. y_right - barrier_width（歩道端）
8. y_right（高欄外端）

`lane_count` が多い場合は 1 と 8 の間に主桁位置として均等配置された車線中心線を加える。
最終的に「左端・主桁候補・中央・主桁候補・右端」の少なくとも 5 点以上を持つ。

### 2.2 橋軸 x_positions

```pseudo
x_positions = [0.0]
x = 0
for span in spans:
    for i in 1..mesh_division:
        x_positions.append(x + span.length * i / mesh_division)
    x += span.length
```

末端は橋長 = sum(spans.length) になる。

## 3. 節点生成

```pseudo
for xi, x in enumerate(x_positions):
  for yi, y in enumerate(y_positions):
    node_id = f"N_BC_{xi:03d}_{yi:03d}"   # 衝突回避用プレフィックス
    nodes.append({ id, x, y, z: 0 })
```

節点 ID は重複禁止 (yi, xi で一意)。

## 4. 部材生成

### 4.1 橋軸方向 (x 方向)

同じ yi の xi 連続節点を接続する。

```pseudo
for yi in 0..yCount-1:
  for xi in 0..xCount-2:
    members.append(Member(nodeI, nodeJ, materialId, sectionId))
```

### 4.2 横断方向 (y 方向)

同じ xi の yi 連続節点を接続する。

```pseudo
for xi in 0..xCount-1:
  for yi in 0..yCount-2:
    members.append(Member(nodeI, nodeJ, materialId, sectionId))
```

## 5. 支点生成

単純橋としての最小実装:

```
x = 0.0            (左端橋台)
x = 橋長           (右端橋台)
各中間支点 x = 支間境界
```

各 x 位置で両端の y を持つ節点（端から 1 番目の主桁位置）に対し:

- 左端 (x=0): uy, uz, rx, ry, rz (鉛直・回転拘束、x 方向は自由)
- 中間支点: uz, rx, ry, rz (鉛直・回転拘束)
- 右端 (x=橋長): uy, uz, rx, ry, rz

MVP では両端 y_position を採用（=端から 1 番目の主桁位置）。
「両端 y を持つ節点」とは `yi == 0` および `yi == yCount-1` の節点。

## 6. 荷重変換

| BridgeLoad.type | 変換先 | メモ |
|-----|-----|-----|
| self_weight | nodal load (-Z 方向) | 全節点に `magnitude / nodeCount` を一律適用（MVP: g=9.81 で換算） |
| distributed | memberLoads | line_id で指定されたライン近傍の x 範囲要素に `magnitude` kN/m |
| vehicle | nodalLoads | line_id 上の代表節点 1 点に `magnitude` kN |

MVP では 道路橋示方書の正式活荷重計算は対象外。
メタ情報として `bridgeLoadNotes` を project 内に保持し、後続で本格対応する。

## 7. 制約（必須検証）

```
- 節点重複禁止 (全節点 ID 一意)
- 孤立節点禁止 (全節点が最低 1 部材の端点)
- 要素長 > 0 (微小距離は除外)
- 支点ゼロ禁止
- span.length > 0
- mesh_division >= 1
- lane_width > 0
```

検証失敗時は `BridgeFemGenerationError` を発生させ、HTTP 400 で返却。

## 8. 出力

- `project: { id, name, ... }`
- `units` 既存に準拠
- `nodes, materials, sections, members, supports`
- `loadCases, nodalLoads, memberLoads`
- `analysisSettings` (既存 default)
- `bridgeMeta: { ... BridgeProject の抜粋 ... }` （任意、レビュー用）

## 9. 既存解析エンジンとの連携

生成された `project` データは `backend.engine.parse_model` で構文解析可能であり、
そのまま `run_analysis / run_eigen_analysis` へ渡せる。FEM エンジンへの改変はゼロ。
