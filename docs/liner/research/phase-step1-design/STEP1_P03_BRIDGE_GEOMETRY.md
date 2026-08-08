# STEP-1 P03 — Bridge Geometry Design（凍結）

Status: FROZEN（Step2実装の正本）

## 1. Purpose
道路線形（X4-A/B/C/D）を正本として、橋梁幾何（Pier / Span / Girder / Node /
格点 / support / skew / 座標変換 / 格点間距離 / 張出し長）を決定論的に生成する
Bridge Geometry の契約を確定する。Step2 で production 実装する。

## 2. Scope
- Pier（支点・ピア・支承位置）モデル
- Span（スパン・支間）モデル
- Girder（主桁・桁線）モデル
- Node / 格点（主桁格点座標）
- support / skew（交角・斜角）
- 座標変換（橋軸座標系⇔グローバル座標系）
- 格点間距離・張出し長
- Road Geometry → Bridge Geometry のデータフロー契約

## 3. Non-scope（本設計で実装しない）
- 構造解析（断面力・たわみ等）
- 橋梁設計ルール（道示II/IIIの基準値照査）
- 下部工（substructure）・Reference Bridge（別lane）
- 上部工 UI / 3D（Step3）
- 曲線橋の全自動配置（曲率追従は Step2 で直線/緩やか曲線前提。詳細は DEFERRED）

## 4. 既存正本（再利用）
- `backend/rule_engine/crosssection/adapters.py` の `RoadBridgeResult`（読み取り専用ペイロード）
  - centerline_xyz / tangent / normal / left-right edge / width / crossfall / section_points
- X1-8 ROAD_TO_BRIDGE_KNOWLEDGE_FLOW（ACL/STATION/COORDINATE/PROFILE/CROSSFALL/WIDTH/SKEW）
- JIP-LINER データ構造（SRC-001）: PIER DATA (K系), SPAN DATA (S系), 主桁G系

## 5. Entity / データモデル（Step2 実装想定）

### Pier（支点）
```
Pier {
  pier_id: string;            // 例 "K10"
  station: number;            // 橋軸測点（道路 station と同一空間）
  alignment_id: string;
  skew_angle_deg: number;     // 交角（= 斜角の余角との定義を明示）
  support_points: [Vec3];     // 格点位置（支承）グローバル座標
  source: "pier-data" | "rule-derived" | "explicit";
}
```
- 交角（skew）定義: 橋軸線（alignment tangent）と支承ラインのなす角。
  X1-8 では「交角→斜角 BEARING」と伝達。符号規約を Step2 冒頭で固定（右回り正など）。
- 支承点は「station + 横断オフセット」からグローバルXYZ を X4-D で算出。

### Span
```
Span {
  span_id: string;            // 例 "S1"
  start_pier_id: string;
  end_pier_id: string;
  start_station: number;
  end_station: number;
  span_length: number;        // 支間長（橋軸方向、station差と等価）
}
```
- 連続スパンは pier 順に station が単調増加であることを validation。

### Girder
```
Girder {
  girder_id: string;          // 例 "G301"
  line_side: "left"|"right"|"center";
  transverse_offset_m: number;  // 中心線からの横断オフセット
  spans: [span_id];
  nodes: [Node];
}
```

### Node（格点）
```
Node {
  node_id: string;            // 例 "G301-K10"
  girder_id: string;
  pier_id: string;            // どの支点上の格点か
  station: number;
  offset_m: number;           // 横断オフセット
  xyz: Vec3;                  // グローバル座標（X4-D で算出）
  z_plan: number;             // 計画高（縦断+舗装/床版構成、P01 vertical 統合）
}
```
- 格点間距離 = 隣接 Node（同 girder, 隣接 pier）のグローバル距離 もしくは
  橋軸方向 station 差（縦断がある場合は3次元距離）。
- 張出し長 = girder の最外 Node から cross section road edge までの横断距離
  （= 道路幅員 - 橋梁桁範囲の横断差）。

## 6. 座標系・変換
- グローバル: 道路中心線座標（X4-D と同じ。X=N 東向き相当は azimuth 定義に従う）
- 橋軸ローカル: 橋軸方向 u（= alignment tangent 方向）、横断方向 v（= normal 方向）
- 変換: `global = center_global + tangent*u + normal*v + binormal*z`（X4-C point_global と同型）
- 座標変換 rule（X2-R-017 coordinate_transform）は既存のまま、Bridge 用 adapter で橋軸系へ適用

## 7. データフロー（Road → Bridge）
```
RoadGeometryAPI (X4-D)  ──  centerline_xyz / tangent / normal / edge / width
        │
        ▼
backend/rule_engine/bridge_geometry/    (Step2 新規パッケージ)
  pier / span / girder / node model
  build_bridge_geometry(alignment, road_result, pier_config, span_config)
        │
        ▼
BridgeGeometryResult {
  piers: [Pier], spans: [Span], girders: [Girder],
  nodes: [Node], node_distances: [{from,to,distance_m}],
  overhang_lengths: [{girder,overhang_m}],
  coordinate_system: "global"|"bridge-local",
  provenance: {...}
}
```
- 既存 `RoadBridgeResult`（X4-C）は読み取り専用の入力 source として維持。
- 新規 `bridge_geometry/` は RoadBridgeResult を消費して Pier/Span/Girder/Node を生成。

## 8. バリデーション / エラー契約
- pier station が alignment 範囲内
- span が pier 順で単調・非重複
- girder の offset が道路幅員内（超える場合は WARNING、clearance Rule P02 と連携）
- skew 角の範囲（0〜90度、超過は ERROR）
- 未知 config → CONTRACT_ERROR（既存 rule と同型）
- Node 座標は X4-D 評価失敗時 RangeError を伝播

## 9. Numeric tolerance / 丸め
- 内部: float64、比較 ε=1e-6（座標）
- 格点間距離: 表示用 3mm（0.003）丸めは出力層で実施（P04）
- 計画高: mm（0.001）丸めは出力層

## 10. Report / Drawing / 3D 影響
- Report: Pier座標表・Girder座標表・Node座標表・格点間距離表・張出し長表（P04）
- Drawing: Pier確認図・Span確認図・橋梁一般図入力（P04）
- 3D: pier / girder / node の描画用座標ペイロード（P05）

## 11. Test strategy / Golden Master
- unit: pier/spans/girder/node 構築・validation・座標変換
- 直線橋: hand-computed オラクル（offset 一定）
- 交角付き: skew により支承点が横断方向へシフトすることを検証
- 曲線区間: tangent 変化に追従した node 配置（緩やかR）
- Golden Master: サンプル LINER 計算書（SRC-004）の主桁格点座標・格間長・支間長・
  張出し長を Step2 で取り込み比較（現状 UNKNOWN の詳細値は照合後に fixture 化）

## 12. Traceability
- SRC-001 JIP-LINERマニュアル（PIER/SPAN/GIRDER DATA）
- SRC-004 サンプル LINER 計算書（主桁格点・格間長・支間長・張出し長）
- SRC-005 鋼鈑桁橋 設計計算例
- X1-8 ROAD_TO_BRIDGE_KNOWLEDGE_FLOW
- X2 ROAD_BRIDGE_INTERFACE_SPEC.md
- backend/rule_engine/crosssection/adapters.py（RoadBridgeResult）

## 13. Acceptance criteria（Step2用）
- [ ] bridge_geometry/ が RoadBridgeResult から Pier/Span/Girder/Node を生成
- [ ] 格点間距離・張出し長を決定論的に算出
- [ ] skew を含む座標変換が hand-computed と一致
- [ ] SRC-004 実計算書との replay（P06）で照合
- [ ] X4-D / RoadBridgeResult に退行なし
