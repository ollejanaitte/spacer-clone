APOLLO_STL_SERIALIZER_SELECTION_VERDICT: FROZEN
APOLLO_STL_BINARY_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_STL_MANIFEST_VERDICT: FROZEN
APOLLO_STL_QUALITY_GATE_VERDICT: FROZEN_FOR_POC
APOLLO_STL_STEP7_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS
RECOMMENDED_NEXT_STEP: STEP8_PERSISTENCE_ELECTRON_DESIGN

# 10. STL出力設計

## 1. 目的

本書は、ApolloVisualizationModel または共通 geometry parameter から、Binary STL と companion Apollo JSON を安全に出力するための実装前設計を固定する。  
本Stepでは production code を追加せず、serializer 選定、unit/axis/origin 契約、browser/Electron 保存境界、品質 gate を先に凍結する。

## 2. 判定と前提

- `CONFIRMED`: `frontend/src/liner/exports/linerFrameStl.ts` は `@jscad/modeling` と `@jscad/stl-serializer` を既に使用している。
- `CONFIRMED`: `frontend/node_modules/@jscad/stl-serializer/README.md` は `serialize({binary: true}, geometry)` と `new Blob(rawData)` を明示している。
- `CONFIRMED`: `frontend/node_modules/@jscad/stl-serializer/index.js` は binary default を持ち、`serializeBinary()` と `serializeText()` を切り替えている。
- `CONFIRMED`: current repo には browser text download precedent と Electron save dialog precedent が存在する。
- `PROVISIONAL`: local TypeScript declaration `frontend/src/types/jscad-stl-serializer.d.ts` は binary return type を十分に表現していないため、実装時に adapter type を追加する。
- `NON_BLOCKING_FOR_IMPLEMENTATION`: non-manifold の完全検査は PoC gate に含めず、representative external import と duplicate/zero-area チェックを先行する。

## 3. current implementation evidence

参照パス:

- `frontend/src/liner/exports/linerFrameStl.ts`
- `frontend/node_modules/@jscad/stl-serializer/README.md`
- `frontend/node_modules/@jscad/stl-serializer/index.js`
- `frontend/node_modules/@jscad/stl-serializer/tests/binary.test.js`
- `frontend/src/types/jscad-stl-serializer.d.ts`
- `frontend/src/App.tsx`
- `frontend/src/desktop/projectFileDialog.ts`
- `desktop/electron/dialogIpc.ts`
- `desktop/electron/preload.ts`
- `desktop/electron/ipcChannels.ts`

確認事項:

- `linerFrameStl.ts`
  - current precedent は ASCII STL 出力である。
  - member を cylinder 化し、geometry が空なら空 ASCII STL を返す。
- `@jscad/stl-serializer`
  - local README は binary 出力が blobable array になると記載。
  - local `index.js` は `binary: true` を default にしている。
  - local `tests/binary.test.js` は 80 byte header、4 byte triangle count、残り body chunk の存在を確認している。
- `App.tsx` / `projectFileDialog.ts`
  - browser download は `Blob` + `URL.createObjectURL()` precedent。
- `dialogIpc.ts` / `preload.ts`
  - Electron save は renderer から preload bridge を経由して main の save dialog と `fs.writeFile()` に流れる。

## 4. serializer 比較

| 候補 | 現状依存 | Binary STL | current repo precedent | browser/Electron | testability | 判定 |
|---|---|---|---|---|---|---|
| JSCAD STL serializer | 既存 | 可 | あり | 可 | 高 | `SELECTED` |
| Three.js STLExporter 追加 | なし | 追加検証必要 | なし | 可 | 中 | `REJECTED_PACKAGE_ADDITION` |
| 独自 Binary STL writer | 追加依存不要 | 可 | なし | 可 | 中 | `FALLBACK_ONLY` |
| existing LINER exporter 再利用 | 既存 | 現状 ASCII | 一部あり | 可 | 高 | `PARTIAL_ONLY` |

### 4.1 最終選定

第一候補:

- `@jscad/stl-serializer` を継続使用する
- `binary: true` を明示指定する
- renderer/export 境界で `BlobPart[]` または `ArrayBufferLike[]` を扱う adapter を置く

理由:

- package 追加不要
- local node_modules で binary behavior を確認済み
- current LINER precedent と整合
- browser の Blob 保存と Electron の binary write の両方に流用しやすい

### 4.2 fallback

- もし runtime で serializer binary output の型差異が実装障害になる場合:
  - geometry triangulation は JSCAD のまま維持
  - Binary STL writer の薄い adapter を repo 内追加する
  - 新規 package は追加しない

## 5. selected architecture

```text
ApolloVisualizationModel / ApolloSolidGeometryParameters[]
        ├─ ThreeSceneBuilder
        └─ ApolloStlExportBuilder
              ├─ JSCAD geometry adapter
              ├─ Binary STL serializer
              ├─ Export manifest builder
              └─ Browser/Electron save boundary
```

責務分離:

- display mesh: viewer only
- STL triangles: export only
- source entity ID / dimensions / visibility group: shared derived model
- save path / file dialog: browser or Electron

## 6. Binary STL 正式仕様

### 6.1 凍結事項

- format: `Binary STL`
- debug option: `ASCII STL` は `DEFERRED`
- unit: `mm`
- source unit: `m`
- axes: `X longitudinal / Y transverse / Z up`
- origin: `model-space`
- optional origin shift: `export option`
- normal generation: serializer または export adapter で deterministic に生成
- triangle ordering: geometry parameter の deterministic order に従う
- multiple closed solids: 1 STL に連結して出力
- visibility inclusion: visible-only option は export option として分離
- labels / markers / helper objects: 除外
- nodes / temporary pick spheres: 除外
- unsupported geometry: warning 付き skip
- empty export: fail-closed

### 6.2 MIME と拡張子

- suggested extension: `.stl`
- browser MIME: `model/stl`
- binary blob content-type: `application/sla` または `model/stl`

実装判断:

- JSCAD の `mimeType` は `application/sla`
- user-facing save は `.stl` を優先し、browser Blob type は `model/stl` を採用してよい

## 7. unit / axis / origin

### 7.1 変換規則

```text
display / source length = m
STL export length = mm
mm = round(m * 1000, exportPrecision)
```

### 7.2 origin policy

- default: model-space origin を維持
- option: local origin shift
  - `none`
  - `min-bounds`
  - `user-specified`

PoC 初期値:

- `originShift = none`

### 7.3 deterministic coordinate rule

- source entities を `kind -> station -> offset -> sourceEntityId` で sort
- geometry parameter builder が sort 結果を固定
- float normalization は `mm` 変換後に `Math.round()` ベースで固定

## 8. inclusion / exclusion

| 対象 | 出力 | 理由 |
|---|---|---|
| main girders | 含む | 主体形状 |
| cross beams | 含む | 主体形状 |
| bracing | 含む | 主体形状 |
| deck | 含む | 主体形状 |
| bearings | 含む | PoC 位置確認 |
| pier / abutment markers | 既定では除外 | locator であり製造形状でない |
| labels | 除外 | annotation only |
| node/member/support symbols | 除外 | viewer only |
| grid / axes / helpers | 除外 | viewer only |

visible-only option:

- `false` を default
- `true` の場合は visibility group と hidden state から export inclusion を導出
- hidden でも `export-only forced include` は導入しない

## 9. companion JSON

推奨ファイル名:

- `bridge-model.apollo.json`

### 9.1 含める内容

```ts
type ApolloExportManifest = {
  schemaVersion: "1.0.0";
  exportKind: "apollo-3d-stl";
  projectId: string;
  projectName: string;
  exportTimestamp: string;
  sourceRevision: string;
  sourceSchemaVersions: {
    project: string;
    apolloPhase1Unit2?: string;
    bridgeDefinition?: string;
    visualizationContract: string;
  };
  axisConvention: "x-longitudinal-y-transverse-z-up";
  sourceUnit: "m";
  exportUnit: "mm";
  originShift: "none" | "min-bounds" | "user-specified";
  includedGroups: string[];
  excludedGroups: string[];
  entityCount: number;
  triangleCount: number;
  boundingBoxMm: {
    min: [number, number, number];
    max: [number, number, number];
  };
  assumptions: string[];
  warnings: string[];
  sourceEntityIds: string[];
};
```

### 9.2 設計判断

- Apollo 設計正本全体は複製しない
- manifest は traceability と reproducibility に必要な最小限 metadata に留める
- 理由:
  - security: 不要な設計情報の複製を避ける
  - file size: STL と companion を軽量維持
  - reproducibility: source revision と assumptions で十分追跡可能

## 10. error / cancel flow

### 10.1 browser

- geometry build failure: toast/log + save 中止
- empty export: file download しない
- cancel: browser download は cancel 明確取得が難しいため fire-and-save 扱い

### 10.2 Electron

- save dialog cancel: `canceled: true`
- file write failure: renderer に error を返す
- manifest write failure:
  - STL 書込み前なら全体失敗
  - STL 書込み後の manifest 失敗は `PROVISIONAL`; Step 8 で multi-file atomicity 方針を固定

## 11. quality gate

### 11.1 PoC 品質 gate

- 80 byte header が存在
- triangle count が body size と一致
- total byte length = `84 + triangleCount * 50`
- finite coordinates only
- non-zero area triangles only
- bounding box が期待寸法内
- unit conversion が `m -> mm`
- visible-only off/on で entity count が deterministic
- empty / invalid model は reject

### 11.2 duplicate / non-manifold 方針

- duplicate triangle:
  - exact vertex tuple の重複を optional diagnostic とする
- non-manifold:
  - 完全保証は `DEFERRED`
  - representative external import と JSCAD triangulation 成功を PoC gate とする

### 11.3 representative external import

- minimum manual check target:
  - common STL viewer で読込可能
  - bounding box / orientation が期待どおり

## 12. performance / memory

- Binary serializer 出力は `BlobPart[]` をそのまま利用し、不必要な文字列変換を避ける
- 巨大配列を JSON stringify しない
- `PROVISIONAL_THRESHOLD`: 1径間 PoC の binary STL が 100MB 未満
- renderer/export の二重 geometry build は避け、共有 geometry parameters から別 builder を呼ぶ

## 13. future GLB boundary

- STL export builder は triangle-only output に限定
- style / material / camera / label は GLB future scope
- GLB 用 metadata は manifest schemaVersion を分ける

## 14. implementation file forecast

想定追加/変更候補:

- `frontend/src/apollo/export/*`
  - STL builder
  - manifest builder
  - binary blob adapter
- `frontend/src/apollo/visualization/*`
  - shared geometry parameter source
- `frontend/src/desktop/*`
  - save helper 拡張は Step 8 で確定
- `frontend/src/apollo/__tests__/*`
  - binary length / bbox / deterministic tests

変更禁止:

- package 追加
- LINER exporter の既存 public behavior 変更
- Apollo import fail-closed policy 変更
- Backend / Solver / Numeric 変更

## 15. implementation entry gate

- Step 6 solid geometry parameter contract が確定している
- Binary serializer adapter の type policy が定義済み
- visible-only option の source state が定義済み
- manifest schema が固定済み
- Step 8 の save boundary 設計と衝突しない

## 16. implementation completion gate

- Binary STL が browser download で生成される
- Binary STL が Electron save path へ書き出せる
- manifest JSON が同時に生成される
- unit/axis/origin contract が docs どおり
- labels / markers / helper が除外される
- invalid / empty model を fail-closed できる
- deterministic export test が通る

## 17. unresolved items

| 項目 | 分類 | 内容 | 見直し条件 |
|---|---|---|---|
| TypeScript binary return typing | `PROVISIONAL` | local d.ts が `string[]` のみ | Step 7 implementation PR-1 |
| non-manifold 完全検査 | `DEFERRED` | PoC gate では外部 reader と簡易診断まで | stricter manufacturing quality が必要になった時 |
| ASCII debug export | `DEFERRED` | 初回実装対象外 | debug 要望発生時 |
| manifest sourceEntityIds full vs summary | `PROVISIONAL` | 初回は full list を許容 | file size 問題発生時 |

## 18. 実装開始判断

- `APOLLO_STL_SERIALIZER_SELECTION_VERDICT: FROZEN`
- `APOLLO_STL_BINARY_CONTRACT_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_STL_MANIFEST_VERDICT: FROZEN`
- `APOLLO_STL_QUALITY_GATE_VERDICT: FROZEN_FOR_POC`
- `APOLLO_STL_STEP7_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS`

Step 7 は、existing JSCAD precedent と local serializer implementation を一次根拠として、package 追加なしで Binary STL と companion manifest を実装開始できる。
