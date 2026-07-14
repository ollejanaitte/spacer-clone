# Stage0–5 事実固定ドキュメント

## 目的

spacer-clone リポジトリの現行事実を Stage 0–5 の調査に基づいて固定する。
設計提案・改善案・「〜すべき」は一切含まない。ソースコード変更も行わない。

## Stage 0–5 範囲

| Stage | 範囲 | 調査結果 |
|-------|------|----------|
| Stage 0 | スコープ境界定義 | IN/OUT-SCOPE定義、リポジトリ構造 |
| Stage 1 | Git基線・品質基線・ドキュメント棚卸し | コミット・依存関係・テスト全件パス |
| Stage 2 | 入口・ルート・画面到達性 | 全28ルート列挙、静的到達確認 |
| Stage 3 | データモデルと保存構造 | ProjectModel/BridgeProject/BridgeDefinition |
| Stage 4 | 道路設計入口・骨組み・座標・ID・責務境界 | LINER/Bridge Wizard/BridgeDefinition経路 |
| Stage 5 | 骨組み解析能力・CONTROL/STATICS/INFLOAD/PRINT/DRAFT | 現行実装の網羅的査定 |

## 現行正本定義

| 正本 | 場所 | 型 |
|------|------|-----|
| **LINER** | `frontend/src/liner/` | 線形・断面・グリッド・中間結果の幾何計算 |
| **BridgeProject** | `backend/engine/bridge_model.py` + `frontend/src/bridge/types.ts` | Bridge Wizard のドメインモデル（legacy） |
| **BridgeDefinition** | `frontend/src/bridgeDefinition/types.ts` | 中間表現（canonical intermediate） |
| **ProjectModel** | `frontend/src/types.ts:158-196` | FEM解析の唯一の正本 |

## 事実宣言

この文書群は現行システムの事実固定であり設計書ではない。
- 設計提案・将来構想・改善案は含まない
- `docs/bridge-modeler-v2/` は将来設計であり現行事実の正本にしない
- 各文書の判定は証拠（path:line）に基づく
- PARTIAL/ABSENT は過大評価しない

## 利用注意

- **設計ではない**: 本ドキュメントは設計書や仕様書ではない。現行事実の記録である。
- **将来docsと混同禁止**: `docs/bridge-modeler-v2/` と本 `docs/scoping/` を混同しないこと。
- **証拠ベース**: 各事実には可能なら `path:line` の証拠を付ける。
- **監督補正**: CONTROL/INFLOAD/PRINT/STATICS 等の判定は過大評価を禁止。

## 文書一覧

| 文書 | 内容 |
|------|------|
| [stage0-3_system_fact.md](./stage0-3_system_fact.md) | Stage 0–3: スコープ境界・Git基線・品質基線・ルート・データモデル |
| [stage4_road_design_scope.md](./stage4_road_design_scope.md) | Stage 4: 道路設計入口・平面線形・測点・縦断横断・橋梁幾何・横断表 |
| [stage5_frame_analysis_scope.md](./stage5_frame_analysis_scope.md) | Stage 5: 骨組み解析能力・CONTROL・STATICS・INFLOAD・PRINT・DRAFT |
| [architecture_current.md](./architecture_current.md) | 現行アーキテクチャ・関係図 |
| [coordinate_convention.md](./coordinate_convention.md) | 座標規約・経路別変換 |
| [id_policy.md](./id_policy.md) | ID生成ポリシー・Viewer index |
| [feature_gap_matrix.md](./feature_gap_matrix.md) | 機能ギャップマトリクス（道路/骨組み） |
| [responsibility_split.md](./responsibility_split.md) | 道路 vs 骨組みの責務分離 |
| [risks_and_unknowns.md](./risks_and_unknowns.md) | リスク・未知事項（P0/P1/P2） |
| [SCOPING_ARTIFACT_INDEX.md](./SCOPING_ARTIFACT_INDEX.md) | 成果物一覧 |
