# 09 — Test and Verification Plan

Date: 2026-07-14  
Status: 計画文書（監督決定に基づく）  
Authority: `_supervisor_decisions.md`  
Scope constraint: unit/integration/E2E/LibreCAD or DXF parser、fixture 方針、Legacy 回帰、Phase 別テスト観点

---

## 1. 目的

Bridge Modeler V2 のテスト・検証方針を定義する。unit/integration/E2E/LibreCAD-DXF-parser の各レベルで、fixture 方針、Legacy 回帰テスト維持、Phase 別テスト観点を規定する。

## 2. 対象範囲

| 対象 | 説明 |
| --- | --- |
| Unit テスト | 各関数・型・validation の単体テスト |
| Integration テスト | コンポーネント間・adapter 間の結合テスト |
| E2E テスト | ユーザーフロー全体のテスト |
| LibreCAD / DXF parser | DXF ファイルの構造解析テスト |
| Fixture | テスト用データの管理方針 |
| Legacy 回帰 | 既存 Legacy テストの維持 |

## 3. 対象外

| 対象外 | 根拠 |
| --- | --- |
| Legacy テストの変更 | 既存テストは変更しない |
| Backend solver テスト | 既存 solver のテストを再利用 |
| Visual regression | Phase 3 以降で検討 |

## 4. テスト戦略

### 4.1 テストピラミッド

```
        ╱ E2E ╲          ← 少数。主要フローのみ
       ╱────────╲
      ╱ Integration╲      ← 中程度。adapter 連携
     ╱────────────────╲
    ╱     Unit Tests    ╲  ← 多数。各関数・型
   ╱────────────────────────╲
```

### 4.2 各レベルの対象

| レベル | 対象 | 数量目安 |
| --- | --- | --- |
| Unit | 型生成、validation、stable ID、diagnostics | 多数 |
| Integration | Adapter 変換、pipeline step 連携 | 中程度 |
| E2E | 主要ユーザーフロー（alignment → structure → FEM） | 少数 |
| DXF Parser | DXF ファイルの構造解析 | 中程度 |

## 5. Fixture 方針

### 5.1 Fixture 種別

| 種別 | 用途 | 例 |
| --- | --- | --- |
| Minimal fixture | 最小限の有効な V2 document | `bmv2-minimal.json` |
| Full fixture | 全 Phase を含む完全な document | `bmv2-full.json` |
| Legacy fixture | Legacy BridgeProject | 既存 `bridge-*.json` |
| BridgeDefinition fixture | BridgeDefinition (1.0.0) | 既存 fixture |
| Alignment fixture | LINER alignment 参照 | mock alignment data |
| FEM fixture | ProjectModel | 既存 FEM fixture |

### 5.2 Fixture 場所

```
frontend/src/bridgeModelerV2/__fixtures__/
  ├── bmv2-minimal.json
  ├── bmv2-full.json
  ├── alignment-reference.json
  ├── structure-model.json
  └── fem-output.json
```

### 5.3 Fixture ポリシー

| ルール | 内容 |
| --- | --- |
| Versioned | fixture は schemaVersion を含む |
| Self-contained | fixture は外部依存なし |
| Descriptive | fixture 名は内容を表す |
| Minimal | テストに必要な最小限のデータ |
| 既存再利用 | 既存 Legacy fixture は変更せず参照 |

## 6. Legacy 回帰テスト維持

### 6.1 方針

| ルール | 内容 |
| --- | --- |
| 未変更 | Legacy テストは変更しない |
| 実行維持 | `npm test` で Legacy テストが全て通ること |
| 回帰検知 | Legacy テストの失敗は即時報告 |
| 非干渉 | V2 の実装が Legacy テストに影響しない |

### 6.2 対象 Legacy テスト

| テストファイル | 内容 | V2 影響 |
| --- | --- | --- |
| `BridgeWizardState.test.ts` | Wizard 状態管理 | なし |
| `BridgeWizard.test.tsx` | Wizard UI | なし |
| `bridgeValidation.test.ts` | Legacy validation | なし |
| `fromBridgeProject.test.ts` | BridgeProject adapter | なし |
| `fromLinerBridge.test.ts` | LinerBridge adapter | なし |
| `structuralModelGenerator.test.ts` | StructuralModel 生成 | なし |
| Semantic Parity テスト群 | Legacy vs V2 一致性 | Phase 3 以降で追加 |
| `test_bridge_fem_generator.py` | Backend FEM 生成 | なし |

## 7. Unit テスト

### 7.1 Phase 1 Unit Tests

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| RoadAlignmentReference 生成 | 型生成 | LINER alignment 参照の生成 |
| BridgeInterval 生成 | 型生成 | start/end station の保持 |
| Stale detection | sourceRevision 比較 | 変化検知 |
| Station range validation | 入力検証 | start < end |
| Alignment validation | 入力検証 | linerModelId, alignmentId 空でない |

### 7.2 Phase 2 Unit Tests

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| BridgeSupport 生成 | 型生成 | stable ID 生成 |
| BridgeGirder 生成 | 型生成 | stable ID 生成 |
| BridgeCrossGirder 生成 | 型生成 | stable ID 生成 |
| BridgeBearing 生成 | 型生成 | stable ID 生成 |
| BridgeSection 生成 | 型生成 | dimensions |
| BridgeMaterial 生成 | 型生成 | properties |
| Stable ID 一意性 | ID 生成 | 同じ semantics → 同じ ID |
| Stable ID 衝突回避 | ID 生成 | 衝突時 suffix 追加 |
| Supports 最低数 validation | 入力検証 | >= 2 |
| Station 重複 validation | 入力検証 | 重複検知 |

### 7.3 Phase 3 Unit Tests

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| Station set 生成 | Pipeline step | BridgeInterval → stations |
| XYZ 評価 | Pipeline step | LINER → 3D 座標 |
| Node 生成 | Pipeline step | stable ID + 3D 座標 |
| Longitudinal member 生成 | Pipeline step | ガーダー沿い |
| Cross member 生成 | Pipeline step | 横断方向 |
| Support mapping | Pipeline step | BridgeSupport → FEM node |
| Section/material assignment | Pipeline step | reference → FEM property |
| IdCorrespondence 生成 | 対応表 | V2 ID → ProjectModel ID |
| Diagnostics collection | 診断 | 各 step の診断収集 |

### 7.4 Phase 4 Unit Tests

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| DeckSurface 生成 | 型生成 | width, zones |
| DeckZone 生成 | 型生成 | station range, offset |
| TrafficLoadZone 生成 | 型生成 | refs, loadType |
| LoadPath 生成 | 型生成 | distributionMethod, targets |
| Distribution factor 合計 | 計算 | 合計 = 1.0 |
| FEM target 参照 | 参照検証 | ProjectModel に存在 |

### 7.5 Phase 5 Unit Tests

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| DrawingDocument ビルダー | builder | DrawingDocument 生成 |
| Results mapper | mapper | ProjectModel → ResultsMapping |
| DXF adapter | adapter | DrawingDocument → DXF |
| DrawingDocument SVG | preview | SVG 描画 |

## 8. Integration テスト

### 8.1 Adapter Integration

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| BridgeProject → V2 import | adapter chain | Legacy → BridgeDefinition → V2 |
| LinerBridge → V2 import | adapter chain | LINER → BridgeDefinition → V2 |
| BridgeStructureModel → FEM | pipeline | Structure → ProjectModel |
| DrawingDocument → DXF | adapter | IR → DXF file |

### 8.2 Pipeline Integration

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| Phase 1 → Phase 2 handoff | data flow | Alignment → Structure |
| Phase 2 → Phase 3 handoff | data flow | Structure → FEM |
| Phase 3 → Phase 4 handoff | data flow | FEM → Load |
| Phase 4 → Phase 5 handoff | data flow | Load → Drawing |

## 9. E2E テスト

### 9.1 主要フロー

| テスト | フロー | 検証内容 |
| --- | --- | --- |
| E2E-01: Alignment → Structure | 選択 → 入力 → 3D preview | 全体フロー |
| E2E-02: Structure → FEM | 入力 → pipeline → Viewer | FEM 生成 |
| E2E-03: FEM → Drawing | results → builder → preview | 描図生成 |
| E2E-04: DXF Export | builder → DXF → download | DXF 出力 |
| E2E-05: Feature flag off | `VITE_BRIDGE_MODELER_V2=false` | ルート非表示 |

### 9.2 E2E テスト環境

| 項目 | 方針 |
| --- | --- |
| フレームワーク | 既存 E2E フレームワークに従う |
| ブラウザ | Headless Chromium |
| データ | Fixture を使用 |
| Mock | LINER pipeline, backend solver |

## 10. LibreCAD / DXF Parser テスト（P5）

### 10.1 DXF Parser テスト

| テスト | 対象 | 検証内容 |
| --- | --- | --- |
| DXF parse 正常系 | DXF file → DrawingDocument | 正常変換 |
| DXF parse 異常系 | 不正 DXF file | エラー処理 |
| Layer 構造 | DXF layers | 層構造の正確性 |
| Entity 抽出 | DXF entities | LINE, ARC, TEXT 等 |
| Roundtrip | DrawingDocument → DXF → DrawingDocument | 一貫性 |

### 10.2 LibreCAD 対応

| 項目 | 方針 |
| --- | --- |
| 対応バージョン | LibreCAD 2.2.x |
| DXF version | DXF 2018 |
| 検証方法 | LibreCAD での DXF 読み込み確認 |
| 既知の制限 | 特定 entity type の非対応をドキュメント化 |

## 11. テスト観点マトリクス（Phase 別）

| Phase | Unit | Integration | E2E | DXF Parser | 手動確認 |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | 型生成、validation | LINER 連携 | alignment 選択フロー | — | 3D preview |
| Phase 2 | 型生成、stable ID、validation | adapter 連携 | structure 入力フロー | — | 3D structure preview |
| Phase 3 | pipeline step、diagnostics | pipeline 全体 | FEM generation フロー | — | Viewer 確認 |
| Phase 4 | 型生成、distribution | load → FEM | load 設定フロー | — | distribution 確認 |
| Phase 5 | builder、adapter | DrawingDocument → DXF | 描図 → DXF フロー | DXF parse | DXF file 確認 |

## 12. テスト自動化

| 項目 | 方針 |
| --- | --- |
| 実行 | `npm test` で全テスト実行 |
| CI | CI パイプラインに統合 |
| カバレッジ | Phase 2 以降でカバレッジ計測 |
| レポート | テスト結果レポート生成 |

## 13. 手動確認

| 確認項目 | Phase | 内容 |
| --- | --- | --- |
| 3D preview | Phase 1-2 | alignment/structure の 3D 表示 |
| Viewer | Phase 3 | FEM 結果の 3D 表示 |
| DXF file | Phase 5 | DXF ファイルの LibreCAD 読み込み |
| Legacy Wizard | 全 Phase | Legacy が変更されていないこと |

## 14. 完了条件

1. 全 Phase の unit テストが存在し通ること
2. Adapter integration テストが存在し通ること
3. 主要フローの E2E テストが存在し通ること
4. DXF parser テストが Phase 5 で存在し通ること
5. Legacy 回帰テストが全て通ること
6. Fixture が versioned で self-contained であること

## 15. Fixture 1-15 詳細

### Fixture 1: 直線単径間 2 主桁

| 項目 | 内容 |
| --- | --- |
| ID | FIX-001 |
| 入力データ要約 | 直線 alignment、径間長 30m、2 主桁、2 支承/桁、縦断勾配 0%、横断勾配 0% |
| 期待構造数 | supports: 4, girders: 2, cross girders: 0, bearings: 4, sections: 1, materials: 1 |
| 期待節点数目安 | 2 主桁 × 2 端点 = 4 nodes（FEM 生成時） |
| 期待部材数目安 | 2 主桁 × 1 span = 2 members（FEM 生成時） |
| Diagnostics 期待 | なし（正常） |
| Result | 全 AC 通过、ID 一意 |
| Drawing | preview 存在、DXF entity 数一致 |
| Golden | なし（初期 fixture） |
| 更新ルール | 入力変更時は fixture 再生成、schemaVersion 検証 |

### Fixture 2: 曲線 + 縦断 + 横断

| 項目 | 内容 |
| --- | --- |
| ID | FIX-002 |
| 入力データ要約 | 曲線 alignment（半径 200m）、縦断勾配 2%、横断勾配 4%、3 主桁、30m 径間 |
| 期待構造数 | supports: 6, girders: 3, cross girders: 0, bearings: 6, sections: 1, materials: 1 |
| 期待節点数目安 | 3 主桁 × 2 端点 = 6 nodes + 縦断・横断反映 XYZ |
| 期待部材数目安 | 3 主桁 × 1 span = 3 members |
| Diagnostics 期待 | なし（正常） |
| Result | AC-P3-01 通过、XYZ 座標が縦断・横断勾配を反映 |
| Drawing | 曲線に沿った preview、DXF entity 数一致 |
| Golden | なし（初期 fixture） |
| 更新ルール | alignment 変更時は fixture 再生成 |

### Fixture 3: 斜角支承

| 項目 | 内容 |
| --- | --- |
| ID | FIX-003 |
| 入力データ要約 | 直線 alignment、斜角 15°、2 主桁、20m 径間 |
| 期待構造数 | supports: 4, girders: 2, cross girders: 0, bearings: 4, sections: 1, materials: 1 |
| 期待節点数目安 | 4 nodes（斜角反映） |
| 期待部材数目安 | 2 members |
| Diagnostics 期待 | なし（正常） |
| Result | AC-P2-02 通过、skew angle 正確反映 |
| Drawing | preview で斜角確認 |
| Golden | なし |
| 更新ルール | skew angle 変更時は再生成 |

### Fixture 4: 3 径間連続

| 項目 | 内容 |
| --- | --- |
| ID | FIX-004 |
| 入力データ要約 | 直線 alignment、3 径間（25m + 30m + 25m）、2 主桁、中間支承 2 基 |
| 期待構造数 | supports: 8, girders: 2, cross girders: 0, bearings: 8, sections: 1, materials: 1 |
| 期待節点数目安 | 2 主桁 × 4 支承 = 8 nodes |
| 期待部材数目安 | 2 主桁 × 3 span = 6 members |
| Diagnostics 期待 | なし（正常） |
| Result | 3 径間連続の stable ID 一意、member 方向正しい |
| Drawing | preview で 3 径間確認 |
| Golden | なし |
| 更新ルール | 径間数変更時は再生成 |

### Fixture 5: 始終端 offset 異

| 項目 | 内容 |
| --- | --- |
| ID | FIX-005 |
| 入力データ要約 | 直線 alignment、始端 offset 2.0m、終端 offset 5.0m、2 主桁、30m 径間 |
| 期待構造数 | supports: 4, girders: 2, cross girders: 0, bearings: 4 |
| 期待節点数目安 | 4 nodes、offset が線形補間 |
| 期待部材数目安 | 2 members |
| Diagnostics 期待 | なし（正常） |
| Result | AC-P3-07 通过、始端 ≠ 終端 offset で節点 offset が線形補間 |
| Drawing | offset 変化を反映した preview |
| Golden | なし |
| 更新ルール | offset 値変更時は再生成 |

### Fixture 6: 中央分離帯・歩道・壁高欄

| 項目 | 内容 |
| --- | --- |
| ID | FIX-006 |
| 入力データ要約 | 直線 alignment、中央分離帯幅 1.5m、歩道幅 2.0m、壁高欄高 1.2m、2 主桁、25m 径間 |
| 期待構造数 | supports: 4, girders: 2, cross girders: 0, bearings: 4 |
| 期待節点数目安 | 4 nodes |
| 期待部材数目安 | 2 members |
| Diagnostics 期待 | なし（正常） |
| Result | 中央分離帯が TLZ から除外、歩道・壁高欄が正しく配置 |
| Drawing | preview で中央分離帯・歩道・壁高欄確認 |
| Golden | なし |
| 更新ルール | 幅員変更時は再生成 |

### Fixture 7: TLZ 除外

| 項目 | 内容 |
| --- | --- |
| ID | FIX-007 |
| 入力データ要約 | 直線 alignment、中央分離帯あり、TLZ を設定、2 主桁、30m 径間 |
| 期待構造数 | supports: 4, girders: 2, cross girders: 0, bearings: 4 |
| 期待節点数目安 | 4 nodes |
| 期待部材数目安 | 2 members |
| Diagnostics 期待 | 中央分離帯 TLZ 除外の診断情報 |
| Result | AC-P3-06 通过、中央分離帯が TLZ から除外 |
| Drawing | TLZ から中央分離帯が除外された preview |
| Golden | なし |
| 更新ルール | TLZ 設定変更時は再生成 |

### Fixture 8: LINER revision 変更

| 項目 | 内容 |
| --- | --- |
| ID | FIX-008 |
| 入力データ要約 | LINER alignment 参照、sourceRevision v1 で作成後 v2 に変更 |
| 期待構造数 | supports: 4, girders: 2（v1 時）、v2 変更後に stale |
| 期待節点数目安 | 4 nodes（v1 時） |
| 期待部材数目安 | 2 members（v1 時） |
| Diagnostics 期待 | stale detection warning |
| Result | AC-P1-02 通过、sourceRevision 変更で stale detection 発火 |
| Drawing | stale 時に preview 更新なし |
| Golden | なし |
| 更新ルール | revision 変更時は stale フラグ確認 |

### Fixture 9: 保存再読込

| 項目 | 内容 |
| --- | --- |
| ID | FIX-009 |
| 入力データ要約 | 直線 alignment、2 主桁、20m 径間、全 Phase データ |
| 期待構造数 | supports: 4, girders: 2, cross girders: 2, bearings: 4 |
| 期待節点数目安 | 4 nodes + cross girder nodes |
| 期待部材数目安 | 2 main members + 2 cross members |
| Diagnostics 期待 | なし（正常） |
| Result | AC-P3-02, AC-P5-03 通过、保存→再読込後 stable ID 一致 |
| Drawing | 保存再読込後 preview 一致 |
| Golden | なし |
| 更新ルール | schema 変更時は fixture 再生成 |

### Fixture 10: 再生成 ID 一致

| 項目 | 内容 |
| --- | --- |
| ID | FIX-010 |
| 入力データ要約 | 直線 alignment、2 主桁、20m 径間、同一入力で 2 回生成 |
| 期待構造数 | 2 回目同一: supports: 4, girders: 2 |
| 期待節点数目安 | 4 nodes（同一） |
| 期待部材数目安 | 2 members（同一） |
| Diagnostics 期待 | なし |
| Result | AC-P3-04 通过、再生成同一入力 → 同一 ID |
| Drawing | 2 回 preview 一致 |
| Golden | なし |
| 更新ルール | ID 生成ロジック変更時は再検証 |

### Fixture 11: 不正支承線

| 項目 | 内容 |
| --- | --- |
| ID | FIX-011 |
| 入力データ要約 | 支承線が交差しない不正配置、2 主桁 |
| 期待構造数 | supports: 4（不正）、girders: 2 |
| 期待節点数目安 | 4 nodes |
| 期待部材数目安 | 2 members |
| Diagnostics 期待 | 交差なし diagnostic が発生 |
| Result | AC-P3-09 通过、不正支承線で交差なし diagnostic |
| Drawing | 不正時は preview に警告 |
| Golden | なし |
| 更新ルール | validation ルール変更時は再検証 |

### Fixture 12: ゼロ長候補

| 項目 | 内容 |
| --- | --- |
| ID | FIX-012 |
| 入力データ要約 | 始端と終端がほぼ同一の bridge interval、2 主桁 |
| 期待構造数 | supports: 4, girders: 2 |
| 期待節点数目安 | 4 nodes |
| 期待部材数目安 | 2 members（zero-length） |
| Diagnostics 期待 | zero-length diagnostic が blocking |
| Result | AC-P3-08 通过、zero-length diagnostic blocking |
| Drawing | blocking 時に生成不可 |
| Golden | なし |
| 更新ルール | diagnostic ルール変更時は再検証 |

### Fixture 13: 大規模

| 項目 | 内容 |
| --- | --- |
| ID | FIX-013 |
| 入力データ要約 | 長大 alignment（1000m）、10 径間、3 主桁、cross girder 含む |
| 期待構造数 | supports: 60, girders: 30, cross girders: many, bearings: 60 |
| 期待節点数目安 | 60 nodes + cross girder nodes |
| 期待部材数目安 | 30 main + cross members |
| Diagnostics 期待 | なし（正常） |
| Result | stable ID 一意、パフォーマンス許容範囲内 |
| Drawing | preview 表示可能 |
| Golden | なし |
| 更新ルール | スケール変更時は再検証 |

### Fixture 14: Drawing / DXF Parity

| 項目 | 内容 |
| --- | --- |
| ID | FIX-014 |
| 入力データ要約 | 直線 alignment、2 主桁、20m 径間、FEM 結果あり |
| 期待構造数 | supports: 4, girders: 2 |
| 期待節点数目安 | 4 nodes |
| 期待部材数目安 | 2 members |
| Diagnostics 期待 | なし |
| Result | AC-P5-01 通过、preview と DXF の entity 数・種類・座標一致 |
| Drawing | entity 数一致検証 |
| Golden | なし |
| 更新ルール | DXF 出力ロジック変更時は再検証 |

### Fixture 15: Legacy Wizard 回帰

| 項目 | 内容 |
| --- | --- |
| ID | FIX-015 |
| 入力データ要約 | Legacy BridgeProject fixture（既存）、V2 feature flag on/off |
| 期待構造数 | Legacy のみ（V2 影響なし） |
| 期待節点数目安 | Legacy に準拠 |
| 期待部材数目安 | Legacy に準拠 |
| Diagnostics 期待 | なし |
| Result | AC-P5-04 通过、Legacy BridgeWizard が flag 有無で回帰しない |
| Drawing | Legacy のみ動作確認 |
| Golden | Legacy 既存 fixture |
| 更新ルール | Legacy 変更時は回帰テスト実施 |

## 16. Fixture 更新ルール

| ルール | 内容 |
| --- | --- |
| schema 検証 | 各 fixture 保存時に `schemaVersion` を検証 |
| 再生成トリガー | 入力ロジック変更、ID 生成ロジック変更、validation ルール変更 |
| バックアップ | 更新前に既存 fixture をバックアップ |
| ドキュメント連動 | fixture 変更時は 16_acceptance_criteria_matrix.md を更新 |

## 17. 未決事項

| ID | 内容 | 影響 |
| --- | --- | --- |
| (なし) | テスト方針は監督指示に従い明確 | — |

---

## ADR 転記

| ID | タイトル | 本文書との関連 |
| --- | --- | --- |
| ADR-BMV2-007 | Staged FEM pipeline with diagnostics | §7.3, §8.2 |
| ADR-BMV2-013 | Diagnostics envelope | §7.3, §8.2 |
