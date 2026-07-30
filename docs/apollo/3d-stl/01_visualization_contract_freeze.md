APOLLO_3D_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_COORDINATE_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_UNIT_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_STL_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_VISUALIZATION_SOR_SEPARATION_VERDICT: PASS
RECOMMENDED_NEXT_STEP: STEP2_DATA_OWNERSHIP_FREEZE

# Apollo Phase 1 3D/STL 派生データ契約 Freeze

## 1. 目的

- 本文書は、Apollo の設計正本を Three.js 表示および STL 出力から分離する、読み取り専用の派生 Visualization Contract を Freeze する。
- 本文書は本実装ではなく、責務境界、schema、座標・単位、selection/validation/export の接続点を設計正本として固定する。

## 2. 正本との境界

- `CONFIRMED`: current Apollo SoR は `ProjectModel` と、必要に応じて `project.apolloPhase1Unit2` sidecar である。`frontend/src/types.ts`
- `CONFIRMED`: `BridgeDefinition` は upstream design intent を表す legacy intermediate model であり、Apollo SoR ではない。`frontend/src/bridgeDefinition/types.ts`
- `CONFIRMED`: `Viewer3D` は `ProjectModel` を読み取り、scene を再構築する派生表示層である。`frontend/src/viewer/SceneBuilder.ts`
- `FROZEN`: Visualization Contract は derived read-only とし、Three.js object、STL、将来 GLB を authoritative source にしない。

## 3. データフロー

```text
Apollo設計正本
  ProjectModel
  project.apolloPhase1Unit2
  必要に応じたBridgeDefinition由来データ
        ↓ 読み取り専用変換
仮称 ApolloVisualizationModel
        ├─ Three.js表示
        ├─ 選択・属性表示
        ├─ Validation強調
        └─ STL/将来GLB出力
```

禁止方向:

```text
Three.js Mesh -> Apollo設計正本
STL -> Apollo設計正本
GLB -> Apollo設計正本
Viewer UI state -> 設計計算データ
```

## 4. contract 一覧

- `仮称 ApolloVisualizationModel`
- `仮称 ApolloVisualizationElement`
- `仮称 ApolloVisualizationGeometry`
- `仮称 ApolloVisualizationUnits`
- `仮称 ApolloVisualizationCoordinateSystem`
- `仮称 ApolloVisualizationValidationState`
- `仮称 ApolloStlExportOptions`
- `仮称 ApolloExportManifest`

## 5. schemaVersion / source revision

- `FROZEN`: `ApolloVisualizationModel.schemaVersion` は文字列型を採用する。
- `PROVISIONAL`: 初期値は `"1.0.0"` とする。
- `FROZEN`: `sourceRevision` は `ProjectModel.project.updatedAt`、アプリ内 revision、または commit/保存時点の revision token を受け取れる nullable field とする。
- `FROZEN`: `sourceFingerprint` は deterministic generation のため optional field として保持可能にするが、初期実装では必須にしない。

## 6. 座標系

- `FROZEN`: Visualization model の基準座標は model-space とする。
- `PROVISIONAL`: axis convention は `X=橋軸方向, Y=橋軸直角方向, Z=鉛直上向き` を採用する。
- `CONFIRMED`: 既存 viewer は display coordinate policy や axis swap を持つが、それは view 表示上の変換であり、Visualization Contract の SoR ではない。`frontend/src/viewer/coordinateTransform.ts`
- `FROZEN`: local origin shift は export option とし、Visualization SoR に常時 baked-in しない。

## 7. 単位系

- `FROZEN`: visualization display の length unit は `m` を基本とする。
- `PROVISIONAL`: STL export の length unit は `mm` を採用する。
- `FROZEN`: unit conversion は Visualization builder に責務を置き、Three.js mesh や STL serializer 内に散在させない。
- `FROZEN`: source units は `ProjectModel.units.length` を読み取り、Visualization Contract 側では normalized display unit を明示する。

## 8. 原点

- `FROZEN`: source origin は source model の global/model origin を尊重する。
- `PROVISIONAL`: export option として `none | modelBoundingBoxMin | explicitPoint` の local origin shift を許可する。
- `FROZEN`: origin shift を source `ProjectModel` や `BridgeDefinition` に逆書きしない。

## 9. entity mapping

- `FROZEN`: 各 visualization element は source entity type と source entity ID を必須とする。
- `FROZEN`: `displayLabel` は source label 優先、未設定時は source ID fallback とする。
- `FROZEN`: `visibilityGroup` は `nodes | members | supports | loads | labels | bridge-solids | validation | export-only` を基本集合とする。
- `FROZEN`: `selectionKey` は Apollo shell selection と 1:1 で突き合わせ可能な stable key を持つ。
- `FROZEN`: `validationTargetKey` は Apollo validation issue の entityType/entityId と突き合わせ可能な stable key を持つ。

## 10. geometry mapping

| Geometry | 必須パラメータ | source ID 対応 | 表示用途 | STL対象 | missing data fallback |
|---|---|---|---|---|---|
| `Point` | `position` | node 等 | node marker, anchor | no | skip with warning |
| `Line` | `start`, `end` | member 等 | line-model member | no | skip with warning |
| `Cylinder` | `start`, `end`, `radius` | member/support/bearing | line-model thickness or simple solid | yes | fallback to `Line` |
| `Box` | `center`, `size`, `rotation?` | support/pier/abutment/deck block | simple volumetric block | yes | fallback to `LabelAnchor` |
| `SimpleISectionExtrusion` | `path`, `depth`, `flangeWidth`, `flangeThickness`, `webThickness` | girder | simple girder solid | yes | fallback to `Cylinder` or `Line` |
| `Plate` | `polygon`, `thickness`, `normal?` | deck/plate/stiffener | deck or plate solid | yes | fallback to `Box` |
| `SupportBlock` | `position`, `size`, `supportRole` | support/bearing | support emphasis | yes | fallback to `Point` |
| `Group` | `children[]`, `groupRole` | span/girder set | visibility and export grouping | no | empty group allowed |
| `LabelAnchor` | `position`, `text` | any | label/annotation | no | omit label only |

## 11. validation mapping

- `CONFIRMED`: Apollo validation issue は `entityType`, `entityId`, `path` を持つ。`frontend/src/apollo/validationNavigator.ts`
- `FROZEN`: Visualization element は `validationState = none | warning | error` を持てる。
- `FROZEN`: validation overlay は source issue list から derived 生成し、Visualization Contract に optional projection として持たせる。
- `FROZEN`: validation 表示の色・opacity など style は hint であり source authority ではない。

## 12. selection mapping

- `CONFIRMED`: Apollo selection は `kind + id` の stable pair を持つ。`frontend/src/apollo/selection.ts`
- `FROZEN`: `selectionKey` は `node:{id}`, `member:{id}`, `support:{id}`, `material:{id}`, `bridge:{kind}:{id}` のような deterministic string とする。
- `FROZEN`: 3D 選択結果は Apollo selection state に投影できるが、ProjectModel 自体の構造データを書き換えない。

## 13. export mapping

- `FROZEN`: `exportable` flag は geometry 単位または element 単位で保持できる。
- `FROZEN`: `stlInclusionGroup` は `always | visible-only | bridge-solids | supports | diagnostics` を基本候補とする。
- `FROZEN`: STL は non-authoritative export artifact とし、Apollo design SoR に戻さない。
- `PROVISIONAL`: companion JSON manifest を `ApolloExportManifest` として同時出力可能にする。

## 14. persistence 禁止事項

- `FROZEN`: Three.js `Mesh`, `Group`, material, camera state を `ProjectModel` や `apolloPhase1Unit2` に保存しない。
- `FROZEN`: STL バイナリ、GLB、export option を Apollo design SoR に混入させない。
- `FROZEN`: camera、background、visibility、drawer open state は UI state であり Visualization SoR ではない。

## 15. unsupported / missing handling

- `FROZEN`: unsupported element は `unsupportedReason` を持つ placeholder element または warning entry として扱う。
- `FROZEN`: missing geometry data は fail-open ではなく、`fallbackGeometry` または omitted-with-warning とする。
- `FROZEN`: viewer 内ハードコードで不足 geometry を隠蔽しない。PoC default を使う場合は Step 2 ownership 表へ明記する。

## 16. deterministic rule

- `FROZEN`: 同一 sourceRevision と同一 export option に対して、Visualization builder は stable ordering を返す。
- `FROZEN`: element ID, group order, child order, label order は deterministic sort rule を持つ。
- `FROZEN`: serialization が必要な場合、JSON canonicalization 可能な plain data structure のみを対象にする。

## 17. 互換性方針

- `FROZEN`: `schemaVersion` major 変更時は breaking change とする。
- `FROZEN`: minor 追加は additive field のみ許可する。
- `FROZEN`: existing source model が bridge solid 情報を持たない場合でも、line-model subset は生成できるよう後方互換を持つ。

## 18. 将来 GLB 対応境界

- `DEFERRED`: GLB exporter は `ApolloVisualizationModel` を読む下流 consumer として追加可能にする。
- `FROZEN`: GLB 導入時も SoR 分離、unit/axis policy、non-authoritative export policy は変更しない。

## 19. TypeScript 風 contract 例

```ts
type ApolloVisualizationModel = {
  schemaVersion: "1.0.0"; // 仮称
  sourceRevision?: string | null;
  units: ApolloVisualizationUnits;
  coordinateSystem: ApolloVisualizationCoordinateSystem;
  elements: ApolloVisualizationElement[];
  validationSummary?: {
    warnings: number;
    errors: number;
  };
};

type ApolloVisualizationUnits = {
  displayLength: "m"; // 仮称
  exportLength: "mm"; // 仮称
};

type ApolloVisualizationCoordinateSystem = {
  axisConvention: "x-bridge-axis-y-transverse-z-up"; // 仮称
  originPolicy: "model-space";
};

type ApolloVisualizationElement = {
  id: string;
  elementKind: string;
  sourceEntityType: string;
  sourceEntityId: string;
  displayLabel?: string;
  visibilityGroup: string;
  selectionKey?: string;
  validationTargetKey?: string;
  geometry: ApolloVisualizationGeometry;
  styleHint?: Record<string, unknown>;
  exportable: boolean;
  stlInclusionGroup?: string;
  validationState?: ApolloVisualizationValidationState;
  unsupportedReason?: string;
};

type ApolloVisualizationGeometry =
  | { type: "Point"; position: [number, number, number] }
  | { type: "Line"; start: [number, number, number]; end: [number, number, number] }
  | { type: "Cylinder"; start: [number, number, number]; end: [number, number, number]; radius: number }
  | { type: "Box"; center: [number, number, number]; size: [number, number, number] }
  | { type: "SimpleISectionExtrusion"; path: Array<[number, number, number]>; depth: number; flangeWidth: number; flangeThickness: number; webThickness: number }
  | { type: "Plate"; polygon: Array<[number, number, number]>; thickness: number }
  | { type: "SupportBlock"; position: [number, number, number]; size: [number, number, number]; supportRole: string }
  | { type: "Group"; children: string[]; groupRole: string }
  | { type: "LabelAnchor"; position: [number, number, number]; text: string };

type ApolloVisualizationValidationState = "none" | "warning" | "error";

type ApolloStlExportOptions = {
  binary: true;
  originShift: "none" | "modelBoundingBoxMin" | "explicitPoint";
  visibleOnly?: boolean;
};

type ApolloExportManifest = {
  schemaVersion: "1.0.0"; // 仮称
  sourceRevision?: string | null;
  exportKind: "stl";
  units: "mm";
  includedElementIds: string[];
};
```

## 20. Freeze 判定

- `APOLLO_3D_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_3D_COORDINATE_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_3D_UNIT_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_STL_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_VISUALIZATION_SOR_SEPARATION_VERDICT: PASS`
- `RECOMMENDED_NEXT_STEP: STEP2_DATA_OWNERSHIP_FREEZE`
