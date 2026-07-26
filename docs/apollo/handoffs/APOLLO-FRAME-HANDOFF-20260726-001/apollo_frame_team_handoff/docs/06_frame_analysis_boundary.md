# 06 — Frame Analysis Boundary

## 目的

骨組み解析（Analyzer 相当）と前後工程の境界を、**候補**として整理する。最終 API / ファイル仕様は Stage 6 ギャップ分析で確定する。

## 論点一覧

| 論点 | 状態 | 備考 |
|------|------|------|
| 節点 (Node) | CANDIDATE | 格子モデルの節点定義は MAN-002/007 参照要 |
| 部材 (Member) | CANDIDATE | 主桁・横桁・対傾構等 |
| 断面 (Section) | PARTIAL | Section 単体アプリあり。解析用断面プロパティ形式 UNKNOWN |
| 材料 (Material) | PARTIAL | 単位重量・物理定数は READY 候補あり |
| 支点 (Support) | CANDIDATE | 固定・可動支承（Phase 1 前提） |
| 荷重ケース (LoadCase) | CANDIDATE | 活荷重・死荷重等 |
| 荷重組合せ (LoadCombination) | UNKNOWN | 組合せルールは OPEN/JIS 依存 |
| 断面力 (SectionForce) | CANDIDATE | 解析出力 |
| 反力 (Reaction) | CANDIDATE | 解析出力 |
| 変位 (Displacement) | CANDIDATE | たわみ照査に接続 |
| 3 成分 / 6 成分 | UNKNOWN | Analyzer 出力成分は未確認 |
| 格子解析 | Evidence | MAN-002/007 に言及。Phase 1 は静的線形 |

## Analyzer 物理形式

```text
Status: UNKNOWN (not confirmed in manuals)
```

SuperDesigner から Analyzer への入力データ形式はマニュアル上で物理ファイル/API として明示されていない（`features/feature_data_flow.md`）。

## API / ファイル境界候補

`analysis-input/frame_analysis_interface_candidates.csv` に列挙:

- `direction`: APOLLO_TO_FRAME / FRAME_TO_APOLLO / INTERNAL / UNKNOWN
- `status`: CANDIDATE / NOT_CONFIRMED

## 未確定項目（ギャップ分析で扱う）

1. 座標系・単位系の伝播（READY: unit_system 関連あり）
2. 荷重のノード/部材割付ルール
3. 合成断面・非合成のモデル化差
4. 解析結果の断面力変換ロジック（APOLLO 内部）
5. 6 成分応力の要否

## 関連エンティティ

`analysis-input/data_entity_candidates.csv` — Alignment, BridgeGeometry, Node, Member, Section, Material, Support, LoadCase, Load, LoadCombination, AnalysisResult, SectionForce, Reaction, Displacement, DesignCheck, DrawingInput, MaterialQuantity

すべて `status=CANDIDATE` または `NOT_CONFIRMED`。

## 注意

節点剛性・リリース条件・偏心等は OPEN/UNKNOWN に依存する項目がある。READY 69 のみで境界を凍結しない。
