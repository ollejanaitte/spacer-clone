# Adapter 境界

> **Phase:** P4
> **方針:** 各専門 domain と共通 BridgeProject モデルの変換・検証は **BridgeProject Adapter**、
> domain model と正式/Mock 計算 engine の境界は **Calculation Adapter**。
> 責任を混同しない。

## 1. 責任の分離

| Adapter | 責務 | 変換対象 | 禁止事項 |
|---------|------|----------|----------|
| **BridgeProject Adapter** | domain ↔ 共通 BridgeProject モデルの変換・検証 | ①`domainDraft`↔CBDM.alignments / RDD / ②`GeometrySnapshot`↔CBDM.bridgeGeometry / BSDD / ③`Support`↔BridgeProject.sharedFacts | 設計計算をしない。数値を算出しない。 |
| **Calculation Adapter（既存 A-01）** | domain model ↔ 計算 engine の境界 | `Support` → `CalculationAdapterInput` → Test/Mock Engine → `CalculationAdapterResult` | データ流入経路としては使わない。data は先に BridgeProject/support-interface 経由で `Support` へ。 |
| **support-interface（既存）** | ②→③ の superstructure データ境界 | `support-interface.json` → `SuperstructureInput`/`BearingSeat[]`/`SupportReactions` | 将来 BridgeProject の sharedFacts.supports/reactions がこれを置き換える（移行後も契約維持） |

**決定:** A-01 Calculation Adapter は design-engine 契約であり、データ流入 adapter ではない。
将来 BridgeProject Adapter が `Support[]` を直接生成して A-01 をバイパスする二重責任を
許さない。流入は「source → BridgeProject Adapter → Support model」の一本化を目指す。

## 2. BridgeProject Adapter 一覧（Phase 3 実装予定）

### (1) Alignment → BridgeProject Adapter
- 入力: ① `LinerDomainDraft`（または RDD + extension）
- 出力: CBDM `alignments`（station/XYZ/azimuth/grade/crossfall の ResolvedValue）+
  `references.roadDesign` / `references.commonModel`
- 既存資産: `linerDomainDraftRoadDesignMapper.ts`（→RDD）、
  `apollo/geometry/alignmentConnector.ts`（単一線形 source）
- 未実装: CBDM alignments への数値書き出し（現状は RDD extension に閉じる）

### (2) Superstructure ↔ BridgeProject Adapter
- ②→BP: `GeometrySnapshot` / BSDD → CBDM `bridgeGeometry`（spans/supports/girders）+
  BridgeProject `sharedFacts.supports`
- BP→②: CBDM → `GeometryEngineInput`。**既存 `CommonModelGeometryInputAdapter` を拡張**し、
  spanLengths/bridgeLength/girderOffsets 等の数値幾何を渡す（現状は ID+state のみ）
- 既存資産: `geometry/geometryInputAdapter.ts`、`generateBsdd.ts`、`bridgeStructure/projectBsdd.ts`

### (3) Substructure ↔ BridgeProject Adapter
- BP→③: BridgeProject `sharedFacts.supports`（station/skew/elevation/transverse axis）
  → ③ `Support[]`。実線形配置は `SupportPlacementEngine` を実行時 host に配線
- ③→BP: ③ `SubstructureProject` → `references.substructure` + section status
- 既存資産: `substructure/planning/linerHandoff.ts`、`SupportPlacementEngine.ts`
- 未実装: 実行時 host の直線プレースホルダ置換（`buildHostCoordinates`）

## 3. 反力経路

- 正本: BFAD + `frame-analysis-result-resource`（supportReaction, kN）
- ②→BP: 解析結果（認証後）を BridgeProject `sharedFacts.reactions` へ反映
- BP→③: reactions を `SupportReactions`（caseKind 分類）へ変換
- 語彙: `loadCaseId`（frame）↔ `caseKind`（support-interface）の mapper を BridgeProject Adapter に実装
- **未認証時は NOT_AUTHORIZED のまま渡し、③は fail-closed**

## 4. 二重 adapter の防止（D1 の解決）

- データ流入: `support-interface.json`（現行）→ 将来は BridgeProject Adapter が一本化
- 設計計算: A-01 Calculation Adapter（不変）
- **原則: 同一データを2つの adapter で Support[] に変換しない。**
  変換は「source → BridgeProject Adapter → Support model」の1経路のみ。

## 5. 検証方法

- Adapter は純関数化し、golden fixture で round-trip test
- CBDM↔domain の既存 parity: `semanticParity/generatedModelParity.ts`、`phase5/tools/*`
- 契約検証: `validateBridgeProject` / 各 contract validator
