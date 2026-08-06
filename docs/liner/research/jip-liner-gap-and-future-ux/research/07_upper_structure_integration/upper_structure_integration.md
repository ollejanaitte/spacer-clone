# 上部工・解析・3D連携分析

## 1. 背景

現行 spacer-clone の上部工（Apollo / Frame）設計はローカル進行中ブランチ（`docs/apollo-step10-p2ii-0-truth-gate`）の作業であり、本調査正本（`main@7b07f62`）では Road モジュールのみが完全。ここでは **LINER（道路骨格）側が上部工（主桁・横桁・支承・解析・3D）へ渡すべきデータ** と、現行の接続経路を整理する。

## 2. LINER → 上部工へ渡すべきデータ（= 実設計計算例の入力）

実設計計算例（SRC-005）と JIP-LINER 出力（SRC-004）から、上部工設計に必須のデータを列挙。

| カテゴリ | データ | 相当するJIP/LINER | 現行(本正本) |
|---|---|---|---|
| 主桁G | 主桁支間長・格間長 | LINER格点 / LDIST | LDIST 実装 |
| 主桁位置 | 各主桁の平面配置（曲線・折れ・円弧） | LINER主桁G | 部分（CrossBeam/MeasuredGrid） |
| 格点 | セクション×主桁の交点座標 | LINER横断面 | MeasuredGrid |
| 支承 | 支承位置・荷重の受け渡し | ピア支承 PL | PierDraft.bearingOffsets |
| 床板 | 床板張出し長・橋面高・横断勾配 | LINER横断面 | あり |
| ハンチ | ハンチ天端（腹板高） | HAUNCH | 4 family 実装 |
| 舗装 | 舗装厚 | HOSO | 実装 |
| 縦断/横断 | プロファイル（クラウン・高さ） | LINER | 実装 |

## 3. 現行の接続経路（3D）の事実

- **LINER → Frame モデル**（`headless/createHeadlessLinerFrameProject.ts`, `convertFrameMappingEntities.ts`）で、格点グリッドを ProjectModel（nodes/members）へ変換。
- **3D（STL）**: `exports/linerFrameStl.ts` が ProjectModel の member（nodeI-nodeJ 間の円柱）を STL に変換。
- **図面**: `exports/linerPlanDxf`, `linerProfileDxf` が平面/縦断を DXF。
- **横断面**: 断面は Formal Drawing ワークスペースで出力。

→ つまり現行は **「LINER → 骨組み（格点・部材）→ STL/DXF」** の経路で、上部工の「主桁断面形状・横桁・床板・支承・3Dソリッド」までは本調査正本に無い（= 上部工 Phase2 以降の対象）。

## 3. 3D と解析への接続構想

### 3.1 3D モデルの生成単位

| 対象 | 現行 | 構想 |
|---|---|---|
| 床版（デッキ） | なし | 格点＋横断勾配から**サーフェス**生成 |
| 主桁（I桁/箱桁） | なし | 主桁心線+腹板高+フランジからソリッド |
| 横梁/対傾構 | なし | セクション/格点位置に配置 |
| 支承・ピア | なし | 支承位置→支点表現 |
| 3D表示 | Segment→STL | サーフェス/ソリッドのSTL/DXF |

### 3.2 データの受け渡し境界（IF）

現行 Phase6 の IF3（result ソースの権威・stale 管理）と整合させる。上部工へ渡す最小契約:

```text
RoadAlignmentReference  (alignmentId, start/end station, sourceRevision)
        │  (LINER の中間結果を変換)
        ▼
BridgeStructureGrid      (格点: セクション×主桁 の座標/高さ/曲線)
        │  主桁/横梁/支承の定義を付加（Phase2 上部工）
        ▼
BridgeStructureModel     (nodes/members/ソリッド 3D)
```

### 3.3 3D ビューアとの整合

- `viewer/coordinateTransform.ts` の Y↔Z swap ・ z→-z を上部工（3D）でも維持し、**LINER 3D viewer と同一の座標ポリシー**で描画。
- 図面（DXF）と 3D の整合は正本（mm/m・Y/平面）のポリシーを踏襲。

## 4. レポート（設計計算書）の連携

- LINER の帳票（支間長・格間長・横断間隔長・張出し長・腹板高）を**上部工設計計算書の「基本寸法一覧」形式**に整形（実設計例 SRC-005 の表を参考）。
- カテゴリ別 CSV（grid/ldist/haunch/hoso）を設計書へ組み込み。

## 5. まとめ・次フェーズ

- **現行**: LIN→骨組み（Frame）→ STL/DXF。上部工ソリッド（床板・主桁・支承・3D）は未実装（road側。上部工進行）。
- **要実装**（上部工フェーズ）: 
  1. 主桁 G の円弧/折れ桁定義（LIN側、FX）
  2. セクション×主桁の格点モデル（LIN側、FX）
  3. 床版サーフェス・主桁ソリッド・支承の 3D 生成（上部工）
  4. 実設計例（SRC-005 の支間長/格間長/張出し）をゴールデンにした数値検証（LIN用）
- 3 と上述の 3D 座標系は phase10（上部工）と合わせ、相互干渉しないよう責務を分離。