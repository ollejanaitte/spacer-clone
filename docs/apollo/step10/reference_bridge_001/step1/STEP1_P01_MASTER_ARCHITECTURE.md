# STEP 1-P01 — MASTER_ARCHITECTURE（最終ゴールまでの全体構成）

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（Design Freeze 対象）
> **前提:** 既存 `ARCHITECTURE.md`・`system_ownership_matrix.csv`（OWN-001..019）・Phase 6-0 契約を正本として拡張

## 1. 全体アーキテクチャ

```
                    ┌────────────────────────────────────────────────────────┐
                    │                    UI (Phase 9)                         │
                    │  ApolloPhase1Shell + Guided + 全画面 / ボタン / ダイアログ │
                    └───┬──────────────────────┬──────────────────────┬──────┘
                        │ import/export        │ 操作                  │ 表示
                 ┌──────▼───────┐       ┌──────▼──────────────────────▼──────┐
                 │ Common Bridge │       │ GeometrySnapshot ───► 3D / Drawing /│
                 │ Data Model    │       │ Report / Quantity / Export           │
                 │ (persistence) │       │ (全 consumer が snapshot を読むのみ)  │
                 └───┬───────────┘       └────────────────────────────────────┘
                     │ 入力契約 (Phase 5 frozen)
            ┌────────▼──────────┐
            │ Geometry Input    │  extraction only (no geometry calc)
            │ Adapter           │
            └────────┬──────────┘
                     ▼
            ┌─────────────────┐   station/offset→XYZ 等は全て LINER
            │ Apollo Geometry │◄────────── Alignment Connector ──► LINER (Single Source of Alignment)
            │ Engine (6-1..6-2)│    GeometrySnapshot 生成 (Single Source of Bridge Geometry)
            └────────┬─────────┘
                     ▼
      ┌──────────────┼───────────────┬──────────────────┐
      ▼              ▼               ▼                  ▼
 Structural     Analyzer (backend)  Design Engine   Export/3D/Drawing/Substructure
 Model          (frame solver)      (Phase 7/8)     Connectors
      │              │               │
      ▼              ▼               ▼
 Frame/Structural   Results         Design results (照査/断面決定/NG→再設計)
 Model / FEM grid   (reactions,      ↓ traceability
                     forces)         Report / Drawing / Quantity / DXF / STL
```

## 2. Apollo（Align / Analyzer / SuperDesigner / SuperDrawing）との対応

| Apollo | 本システム | 備考 |
|--------|-----------|------|
| Align | LINER（+ Alignment Connector） | 線形・座標計算の単一 source（OWN-001..006） |
| Analyzer | backend/engine フレーム solver + Phase 6-4 解析結合 | 現行は PROJECT_SPECIFIC solver（AN-ID-001） |
| SuperDesigner | Phase 7 設計計算エンジン + Phase 8 自動断面決定 | 未実装（今回 STEP 2 の中心） |
| SuperDrawing | Drawing / Report / Quantity / DXF / STL | 開発系のみ実装、正式出力は NOT_AUTHORIZED |

## 3. 責務境界（既存 OWN に追加）

| ID | 責務 | オーナー | 根拠/実装先 |
|----|------|----------|-------------|
| OWN-020 | 上部工設計入力（設計条件・材料・断面・荷重・組合せ） | Common Bridge Data Model + superstructure-design-document | `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json` |
| OWN-021 | 格子モデル生成（GeometrySnapshot → 解析格子） | Phase 7 Design Engine | backend `bridge_fem_generator.py` 拡張（現行 generic grid → 設計格子） |
| OWN-022 | 荷重モデル・組合せ・係数 | Phase 7 Design Engine | Phase A LM-001..014 / LF-001..010（数値認証後に GRANTED） |
| OWN-023 | 反力・断面力（格子解析） | Analyzer（backend solver） | 現行結果スキーマ + IF3 正規化 |
| OWN-024 | 照査・断面決定・NG→再設計 | Phase 7/8 Design Engine | 設計計算書 traceability |
| OWN-025 | 正式計算書・図面・数量・3D データ出力 | Phase 8 Output | 現行 drawing/report/quantity を正式化（ゲート付き） |
| OWN-026 | 数値認証ゲート（NOT_AUTHORIZED→GRANTED） | Release/Validation layer | Phase A GATE-NR / EA-06 基準 |

## 4. データフロー（一気通貫）

1. **入力**: UI → Common Bridge Data Model（+ 道路線形は LINER から Alignment Connector 経由）
2. **幾何**: Geometry Input Adapter → Geometry Engine → **GeometrySnapshot**（唯一の橋梁 geometry 正）
3. **構造**: Structural Model Connector → 解析モデル → Analyzer（backend）
4. **設計**: 解析結果 + 設計条件 → Design Engine（格子生成→解析→反力/断面力→照査→断面決定）
5. **出力**: 設計結果 → Drawing / Report / Quantity / DXF / STL（全 consumer は snapshot と設計結果を読み、再計算しない）
6. **3D**: 3D Connector が GeometrySnapshot + 設計結果から表示モデルを生成（ProjectModel 直接投影から移行）

## 5. 横断ルール（手戻り防止）

- Single Source of Alignment = LINER。Single Source of Bridge Geometry = GeometrySnapshot。
- GeometrySnapshot は runtime/output モデルであり、persistence 形式ではない（Common Model が persistence）。
- 各 consumer（3D/図面/構造/下部工/出力）は GeometrySnapshot を読み、station→XYZ・offset・skew・elevation を再計算しない。
- 隠れた座標変換・単位変換は全 connector で宣言（coordinate_conversion_matrix 参照）。
- unresolved（HOLD/CONFLICT/HCR/NOT_AVAILABLE）は数値に捏造しない。
- 解析・設計の数値出力は認証ゲート（NOT_AUTHORIZED）を透過しない。
- UI state は ProjectModel/Common Model の canonical state と競合しない（dirty fingerprint・history は現行機構を維持）。
