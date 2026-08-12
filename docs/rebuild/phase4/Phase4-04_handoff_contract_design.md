# Phase 4-04 Support / Span Handoff Contract 設計

## 1. Phase 4-03成果監査（Step A）

### BridgeLayoutDocument（唯一正本）現状
- `bridgeId` / `name` / `schemaVersion`（0.1.0）/ `metadata`
- `roadReference`（moduleId: road / alignmentId / stationReferenceId / coordinatePolicyId）
- `bridgeRange`（startStation / endStation / bridgeLength?）
- `abutments`（A1 / A2: supportId / station / skewAngleRad / placement?）
- `piers`（P1..Pn: supportId / label? / station / skewAngleRad / skewSource? / placement? / metadata?）
- `spans`（spanId / index / startSupportId / endSupportId / startStation / endStation / length）
- `skew`（signConvention: counterclockwise-positive / angleRad）
- `terrainReference` / `existingConditionsReference`
- `validation`（schemaVersion / validatedAt / ok / issues）

### Phase 4-03 成果
- Pier domain: `bridgeLayoutPiers.ts`（listOrderedSupports / addPier / removePier / updatePierStation / updatePierSkew / validatePierConfiguration）
- Span自動生成: `bridgeLayoutSpans.ts`（generateSpans / validateSpanConfiguration / describeSpans）
- Placement: `bridgeLayoutPlacement.ts`（computePierPlacementCandidate / refreshPierPlacements / assembleBridgeLayoutView）
- 3D: `bridgeLayoutScene.ts`（P1..Pn marker / skew指示線 / span label / focusBounds）
- Persistence: Project Data Core経由（Auto Save / restart restore / .spacerproj round-trip 検証済み）

### 既存Handoff候補資産（APADT対象）
- `apollo/contracts/layoutTypes.ts`（BridgeLayoutContract最小骨格: supports/spans）→ 新システムとは別系統（C1連続桁）。手本としての最小情報（support id/station/role・span id/length）を参考に、rebuild側の正式Handoffは新設計。
- `substructure/planning/linerHandoff.ts` / `SupportPlacementEngine` → 旧liner/substructure系。Phase 4-04では再利用せず、rebuild側Handoffを正とする。

## 2. 責任境界（Phase 4-04で決定しないもの）

Support Handoffは「共通Support配置情報」のみを渡す。
下部工側で初めて決定する情報（Phase 6下部工）:
- 橋脚柱形状・柱幅・梁形状・壁式橋脚詳細
- 橋台躯体詳細
- フーチング・杭・基礎形式・基礎寸法・支持層
- 耐震設計・下部工構造計算

Span Handoffは「支間配置情報」のみを渡す。
上部工側で初めて決定する情報（Phase 5上部工）:
- 主桁形式・本数・桁高・床版・横桁・横構
- 支承詳細・合成/非合成設計・上部工断面計算・FEM

※ 設計順序転換（Phase 5-00）: 正式設計順序は
   橋梁配置 → 上部工 → 下部工。
   Span Handoff が Phase 5 上部工の正式入口、
   Support Handoff は共通Support配置情報として
   Phase 5 上部工・Phase 6 下部工の両方から参照される。

## 3. 原則

- `BridgeLayoutDocument` が唯一正本。
- Handoffは **ID/reference + derived snapshot**（正本の二重保持をしない）。
- Handoffは常に現在のdocumentから再生成する（derived data）。
- Road / Terrain / Existing の正本は複製しない（既存原則維持）。
- skew規約: counterclockwise-positive（反時計回り正）を唯一とし、旧資産の別符号規約を混入しない。

## 4. Support Handoff Contract（共通Support配置情報）

### データ構造（derived snapshot・非永続正本）

```ts
export interface SupportHandoffItem {
  supportId: string;
  supportType: "abutment" | "pier";
  label: string;
  station: number;
  position: { domainX: number; domainY: number; elevation: number };
  tangentAzimuthRad: number;
  skewAngleRad: number | null;
  skewSource?: "automatic" | "user";
  terrainElevation: number | null;
  roadReferenceId: string;
  coordinateContextId: string | null;
}

export interface SupportHandoff {
  handoffKind: "support-handoff";
  schemaVersion: string;
  handoffId: string;
  bridgeId: string;
  documentReference: string;   // 正本参照（複製しない）
  generatedAt: string;
  roadReference: RoadReference;
  terrainReference: TerrainReference;
  existingConditionsReference: ExistingConditionsReference;
  coordinateContext: { coordinatePolicyId: string | null; axisConvention: "x-along/y-transverse/z-up"; unitSystem: "metric" };
  skewConvention: "counterclockwise-positive";
  supports: readonly SupportHandoffItem[];   // A1, P1..Pn, A2（station順）
  validation: { ok: boolean; issues: readonly BridgeLayoutIssue[] };
}
```

### ビルダー
- `buildSupportHandoff(manager, projectId, document)`:
  - Road context解決（正本参照・複製なし）
  - A1/P1..Pn/A2 を station 順に整列
  - 各 support の station→XYZ / elevation / tangent を Road Module正式APIから取得
  - Terrain elevation 参照
  - validation 状態を算出

### validation
- supportId必須・A1/A2/P1..Pn が全て揃っている（missing support reject）
- station finite（NaN/Infinity reject）
- A1 < P1 < … < Pn < A2 順序
- skewAngleRad finite or null・skewConvention = counterclockwise-positive
- roadReference有効 / terrainReference有効/未解決の扱い明確 / existingConditionsReference同様

## 5. Span Handoff Contract（Phase 5上部工へ）

### データ構造（derived snapshot）

```ts
export interface SpanHandoffItem {
  spanId: string;
  index: number;
  startSupportId: string;
  endSupportId: string;
  startStation: number;
  endStation: number;
  spanLength: number;
  startSupportSkew: number | null;
  endSupportSkew: number | null;
}

export interface SpanHandoff {
  handoffKind: "span-handoff";
  schemaVersion: string;
  handoffId: string;
  bridgeId: string;
  documentReference: string;
  generatedAt: string;
  roadReference: RoadReference;
  coordinateContext: { coordinatePolicyId: string | null; axisConvention: "x-along/y-transverse/z-up"; unitSystem: "metric" };
  skewConvention: "counterclockwise-positive";
  spans: readonly SpanHandoffItem[];   // S1..Sn（A1→A2連続）
  validation: { ok: boolean; issues: readonly BridgeLayoutIssue[] };
}
```

### ビルダー
- `buildSpanHandoff(manager, projectId, document)`:
  - `generateSpans(document)` から span を生成（derived）
  - 各 span の start/end support skew を document から参照
  - validation 状態を算出

### validation
- chain切れなし（span[i].endSupportId == span[i+1].startSupportId）
- A1からA2まで連続
- support順序と一致（station昇順）
- spanLength > 0
- ΣspanLength = bridgeLength
- duplicate spanIdなし
- missing support reject
- malformed data fail-closed（throwしない）

## 6. Reference Integrity Gate（Step D）

`runBridgeLayoutIntegrityGate(manager, projectId, document)`:
- resolveBridgeLayoutReferences（Road/Terrain/Existing）
- validateBridgeRangeInput（Range・bridgeLength）
- validatePierConfiguration（順序・範囲・dup）
- validateSpanConfiguration（chain・合計）
- buildSupportHandoff / buildSpanHandoff の validation
- parseBridgeLayoutDocument round-trip
- 総合結果: ok / issues / Phase5 ready / Phase6 ready

## 7. Persistence 方針

- 正本は BridgeLayoutDocument のみ。
- Support/Span Handoff は derived → document に格納しない。
- 保存・再起動・復元後、document から Handoff を再生成し、Integrity Gate で再検証。
- .spacerproj round-trip は document（modules.bridgeLayout）経由で自動維持。

## 8. UI（Step E 最小）

Completion Gate画面に以下を表示:
- Bridge Range / bridgeLength / A1 / P1..Pn / A2 / station / support type / span chain / spanLength / skew
- Road / Terrain / Existing reference状態
- Support Handoff READY / ERROR（共通Support配置情報: Phase 5上部工参照 / Phase 6下部工向け）
- Span Handoff READY / ERROR（Phase 5上部工向け・正式入口）
- Phase 5上部工 readiness / Phase 6下部工 readiness
- Final Validation状態 / 保存状態

## 9. テスト計画

- SupportHandoff: build・validation・missing support・順序・skew・reference
- SpanHandoff: chain・連続性・合計・dup・missing・malformed fail-closed
- Integrity Gate: 全validation合成・Phase 5上部工 ready（Span＋Support成立） / Phase 6下部工 ready（Support成立）判定
- Persistence: save→restart→restore→handoff再生成→再検証 / .spacerproj
- UI: READY/ERROR表示・Completion Gate表示
- 3D: A1/P1..Pn/A2・S1..Sn・skew・統合scene（既存資産再利用）
