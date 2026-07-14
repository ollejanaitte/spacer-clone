# 道路 vs 骨組み 責務分離

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`  
**根拠**: A4_product_boundary.md (Stage 5)

---

## 境界表

| # | 項目 | 道路設計側の正本候補 | 骨組み側の正本候補 | 現行重複 | 判定 |
|---|------|---------------------|---------------------|----------|------|
| 1 | 線形 | LINER `LinearAlignment` | ABSENT | なし | LINER 側に正本 |
| 2 | 測点 | LINER `StationTableResult` | ABSENT | なし | LINER 側に正本 |
| 3 | 縦断・横断 | LINER `ProfileSegmentResult` 等 | ABSENT | なし | LINER 側に正本 |
| 4 | 橋台・橋脚幾何 | LINER `PierResult` / BD `BridgeDefinitionSupport` | Engine `Support` (DOF のみ) | **重複** | 幾何は LINER/BD 側 |
| 5 | 支線幾何 | LINER `GirderLineMaster` / BD `BridgeDefinitionGirder` | ABSENT (BW `BridgeLine` あり) | **重複** | LINER 側に正本 |
| 6 | 支承力学条件 | BD `BridgeDefinitionSupport.kind` | Engine `Support` (DOF boolean) | **変換** | BD=設計意図, Engine=決定値 |
| 7 | 支間 | BD `BridgeDefinitionSpan` / BW `Span` | Engine `Span` (length のみ) | **3重** | LINER/BW が正本 |
| 8 | 主桁・横桁幾何 | BD `BridgeDefinitionGirder` 等 | ABSENT | なし | BD/LINER 側に正本 |
| 9 | FEM節点・部材 | ABSENT | Engine `Node`/`Member` | なし | Engine 側に正本 |
| 10 | 材料・断面 | BD 参照 ID のみ | Engine `Material`/`Section` (実値) | **変換** | Engine 側が実値 |
| 11 | ばね | ABSENT | ABSENT | なし | 現行コードに実装なし |
| 12 | 床版・舗装・ハンチ | BD `BridgeDefinitionDeck` | ABSENT | なし | BD 側 |
| 13 | 車道・歩道範囲 | LINER / BW `CrossSection` | ABSENT | **重複** | LINER/BW 側 |
| 14 | 固定荷重 | BD `BridgeDefinitionLoad` | Engine `NodalLoad`/`MemberLoad` | **変換** | BD=設計意図, Engine=離散化 |
| 15 | 活荷重 | BD `BridgeDefinitionLoad` | Engine `NodalLoad`/`MemberLoad` | **重複** | 同上 |
| 16 | 荷重ケース | BD 参照 ID のみ | Engine `LoadCase` | **変換** | Engine 側が正本 |
| 17 | 荷重組合せ | ABSENT | ABSENT | なし | 現行コードに実装なし |
| 18 | 解析条件 | BD `generationSettings` | Engine `AnalysisSettings` | なし | 別々の概念 |
| 19 | 解析結果 | ABSENT | Engine `analysisResults` | なし | Engine 側に正本 |

---

## 重複一覧

| 項目 | 重複内容 |
|------|----------|
| ④ 橋台・橋脚幾何 | BD と LINER が別型で同一概念 |
| ⑤ 支線幾何 | BD と BW が別型で同一概念 |
| ⑦ 支間 | BD / BW / Engine の3重 |
| ⑩ 材料・断面 | BD は参照 ID、Engine は実値 |
| ⑬ 車道・歩道 | BW `CrossSection` / LINER `CrossSectionTemplateDraft` |
| ⑭⑮ 荷重 | BD と BW が別型で同一概念 |

---

## 転送経路

| 経路 | 処理 | 場所 |
|------|------|------|
| BD → FEM | `structuralModelGenerator.ts:198` | frontend |
| BW → FEM (legacy) | `bridge_fem_generator.py:136` | backend |
| LINER → BD | `fromLinerBridge.ts:87` | frontend |
| BW → BD | `fromBridgeProject.ts:82` | frontend |

---

## 現行混在状態

1. **BridgeProject (backend)**: `CrossSection`（幾何）+ `BridgeLoad`（力学）が同一 dataclass
2. **BridgeDefinition**: `deck`（幾何）+ `loads`（力学）+ `generationSettings`（mesh）が同一 interface
3. **ProjectModel**: nodes/members（幾何）+ loadCases/nodalLoads（力学）が完全混在（FEM専用のため許容）
4. **LinerDomainDraftVNext**: 純粋幾何。力学要素なし
