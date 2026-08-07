# SOURCE_LAYER_MAP — 資料層構造マップ

## 層構造

```
Layer 1: 設計基準・法令
  DOC-X0-0145 道路構造令の解説と運用（標準）
  DOC-X0-0066〜0070 道路橋示方書Ⅰ〜Ⅴ（標準・OCR要）

Layer 2: 市販ソフトマニュアル
  DOC-X0-0035 JIP-LINER（ソフトウェアマニュアル）
  DOC-X0-0091 APOLLO SuperDesigner（ソフトウェアマニュアル）

Layer 3: 実案件サンプル（道路）
  DOC-X0-0143 サンプル_道路線形計算例（実案件計算書）
  DOC-X0-0144 サンプル_道路設計図（実案件図面）

Layer 4: 実案件サンプル（橋梁）
  DOC-X0-0001 鋼鈑桁橋_設計計算例（実案件計算書）
  DOC-X0-0002 鋼鈑桁橋_図面例（実案件図面）

Layer 5: Apollo Phase 2-II（main read-only）
  candidates/geometry/structural_model/load/analysis/design/adopted_design/report/drawing
  contracts/source_to_candidate/id_and_entity/normalization/candidate_layer/schema/enums

Layer 6: 既存調査成果物
  Phase X0: 147 assets inventory
  Phase X1: 58 rules, 22+12+14 mappings, 21 candidates
  Phase X1.5: 13 evidence sources, 12 evidence chains
```

## 参照関係

```
Layer 1 → Layer 2（基準がソフト機能を規定）
Layer 1 → Layer 3（基準が実案件の設計値を規定）
Layer 3 → Layer 4（道路線形が橋梁設計条件を決める）
Layer 2 → Layer 3（LINERが線形計算を実行）
Layer 4 → Layer 5（橋梁データがApollo Candidateへ変換）
Layer 1 ∩ Layer 5 → Layer 6（基準・実案件・Candidateの検証）
```
