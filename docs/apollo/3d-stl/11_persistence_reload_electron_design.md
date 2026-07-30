APOLLO_3D_PERSISTENCE_BOUNDARY_VERDICT: FROZEN
APOLLO_3D_RELOAD_REPRODUCIBILITY_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_STL_BROWSER_SAVE_DESIGN_VERDICT: FROZEN
APOLLO_STL_ELECTRON_SAVE_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_STEP8_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS
RECOMMENDED_NEXT_STEP: FINAL_DESIGN_READINESS_GATE

# 11. 保存・再読込・Electron統合設計

## 1. 目的

本書は、Apollo JSON の保存・再読込後に同一 VisualizationModel を再生成し、browser および Electron から STL と companion JSON を安全に保存するための実装前設計を固定する。  
本Stepでは production code を追加せず、保存責務、reload reproducibility、IPC 境界、multi-file 戦略を凍結する。

## 2. 判定と前提

- `CONFIRMED`: `frontend/src/apollo/importExport.ts` は Apollo sidecar を必須とし、unknown field reject を含む fail-closed import を実装している。
- `CONFIRMED`: `exportApolloProjectToText()` は Apollo sidecar を含む `ProjectModel` envelope を JSON text として保存する。
- `CONFIRMED`: browser には file input / Blob download precedent がある。
- `CONFIRMED`: Electron には preload 経由の `openProjectFile` / `saveProjectFile` bridge がある。
- `PROVISIONAL`: STL と companion JSON の multi-file save は Step 8 実装で新しい save bridge を追加する可能性が高い。
- `NON_BLOCKING_FOR_IMPLEMENTATION`: camera / visibility / selected entity は session-only とし、初回実装で Apollo 正本に保存しない。

## 3. current import/export evidence

参照パス:

- `frontend/src/apollo/importExport.ts`
- `frontend/src/desktop/projectFileDialog.ts`
- `desktop/electron/dialogIpc.ts`
- `desktop/electron/preload.ts`
- `desktop/electron/ipcChannels.ts`
- `frontend/src/apollo/ApolloPhase1Shell.tsx`
- `frontend/src/viewer/Viewer3D.tsx`

確認事項:

- `importApolloProjectFromText()`
  - UTF-8 strict
  - JSON parse strict
  - project envelope 必須
  - `apolloPhase1Unit2` sidecar 必須
  - Apollo sidecar unknown field reject
  - validation error 時 fail-closed
- `exportApolloProjectToText()`
  - Apollo sidecar を含む project JSON を出力
- `projectFileDialog.ts`
  - browser open/save precedent が存在
- `dialogIpc.ts`
  - Electron main process は JSON file dialog と `fs.writeFile(..., "utf8")` のみ持つ
- `ApolloPhase1Shell.tsx`
  - selection、focusKey、validationFocusToken は UI state であり persisted source ではない
- `Viewer3D.tsx`
  - visibility と cameraRequest/cameraSync は component-local state

## 4. persistence ownership

### 4.1 保存責務の分類

| 対象 | 分類 | 方針 | 状態 |
|---|---|---|---|
| node/member/support | Apollo設計正本 | Apollo JSON に保存 | `CONFIRMED` |
| bridge geometry source | Apollo設計正本 or sidecar | Apollo JSON に保存 | `CONFIRMED` |
| PoC default selection | 保存しない | defaults provider で再注入 | `FROZEN` |
| camera | session-only | 保存しない | `FROZEN` |
| visibility | UI state | 任意保存は `DEFERRED` | `FROZEN` |
| background | UI state | 保存しない | `FROZEN` |
| selected entity | UI state | 保存しない | `FROZEN` |
| validation highlight | transient | 保存しない | `FROZEN` |
| STL origin shift | export option | session または export dialog state | `FROZEN` |
| export included groups | export option | session または export dialog state | `FROZEN` |
| generated mesh | 保存禁止 | visualization から再生成 | `FROZEN` |
| generated STL bytes | 保存禁止 | export on demand | `FROZEN` |
| companion manifest | export artifact | Apollo JSON とは別保存 | `FROZEN` |

### 4.2 保存禁止

- Three.js scene object
- label sprite state
- raycaster / hover state
- binary STL bytes
- manifest-internal triangle cache

## 5. reload data flow

```text
Apollo JSON
  -> importApolloProjectFromText()
  -> ProjectModel + apolloPhase1Unit2
  -> derived visualization builder
  -> ApolloVisualizationModel
  -> Viewer scene / STL export builder
```

禁止方向:

```text
Viewer state -> Apollo JSON
STL file -> Apollo JSON
Mesh cache -> Apollo JSON
```

## 6. deterministic reproducibility

### 6.1 定義

```text
同一 Apollo JSON
+ 同一 visualization contract version
+ 同一 PoC assumptions / defaults config
= 同一 ApolloVisualizationModel
= 同一 bounding box
= deterministic STL
```

### 6.2 凍結規則

- source revision を manifest に記録する
- builder は deterministic sort を使う
- PoC defaults version を manifest / builder input に含める
- float normalization は export 時に mm 単位で固定
- schemaVersion mismatch は fail-closed または warning with no export

### 6.3 missing assumptions

- defaults provider version が不一致:
  - viewer 再生成は warning 付きで継続可
  - STL export は `PROVISIONAL`: warning を付けた上で続行可

## 7. browser save design

### 7.1 保存方式

- Apollo JSON: 現行 `saveProjectFile()` / `download` precedent を再利用
- STL: `Blob` + download link
- companion JSON: `Blob` + download link

### 7.2 browser 制約

- browser は save dialog result や cancel を厳密取得しにくい
- そのため browser は `download started` ベースの UX とする
- multi-file save は sequential download とし、ZIP bundle は採用しない

## 8. Electron save design

### 8.1 renderer / preload / main 責務

- renderer:
  - export request 発行
  - save option collect
  - success / failure / cancel を UI へ反映
- preload:
  - narrow IPC API の expose
- main:
  - save dialog
  - path validation
  - file write
  - write result return

### 8.2 IPC 契約方針

current bridge:

- `saveProjectFile(content: string, suggestedName?: string)`

Step 8 追加候補:

```ts
type SaveBinaryFilePayload = {
  bytes: ArrayBuffer;
  suggestedName: string;
  mimeType: string;
};

type SaveTextFilePayload = {
  content: string;
  suggestedName: string;
};
```

判断:

- JSON 既存 bridge の再利用は Apollo JSON 保存に限定
- STL binary は text-only bridge に無理に流さない
- 新規 IPC は `FROZEN_WITH_PROVISIONAL_ITEMS` として設計対象に含める

### 8.3 security boundary

- renderer は filesystem 直アクセスしない
- preload は narrow API のみ expose
- main は allowed extension を制御
- path sanitization は main 側で実施
- write content type を payload schema で制限

## 9. multi-file strategy

比較:

| 方式 | browser | Electron | 判定 |
|---|---|---|---|
| STL保存後にJSON続けて保存 | 可 | 可 | `SELECTED_FOR_POC` |
| directory選択後に2ファイル保存 | 弱い | 可 | `REJECTED_BROWSER_GAP` |
| ZIP bundle | package/実装追加が重い | 可 | `REJECTED_SCOPE` |
| companion JSON任意 | 可 | 可 | `PROVISIONAL_OPTION` |

PoC 選定:

- 既定:
  - 1. STL を保存
  - 2. companion JSON を続けて保存
- browser:
  - 連続 2 download
- Electron:
  - 連続 2 save dialog

理由:

- package 追加不要
- current save bridge に最も近い
- ファイル責務が明確

## 10. filename policy

- STL default: `${projectId || projectName}-bridge-model.stl`
- companion default: `${projectId || projectName}-bridge-model.apollo.json`
- Apollo JSON default: `project.json` 既存方針維持
- unsafe characters は sanitize
- extension は main process 側で再保証

## 11. migration / version handling

- Apollo JSON import:
  - current fail-closed を維持
- visualization contract version mismatch:
  - viewer は warning
  - export は warning + manifest 記録
- defaults provider version mismatch:
  - manifest warnings

## 12. test matrix

| テスト | 期待結果 | 状態 |
|---|---|---|
| same Apollo JSON reload | same bbox / same entity count | `REQUIRED` |
| schemaVersion mismatch | fail-closed or warning per contract | `REQUIRED` |
| unknown Apollo sidecar field | import reject | `CONFIRMED_PRECEDENT` |
| browser JSON save | download starts | `REQUIRED` |
| browser STL save | Blob download starts | `REQUIRED` |
| Electron JSON save cancel | canceled true | `CONFIRMED_PRECEDENT` |
| Electron STL save cancel | canceled true | `REQUIRED` |
| sequential STL + manifest save | both files generated or cancel reported | `REQUIRED` |
| generated mesh persistence absence | reload on demand only | `REQUIRED` |
| selection / camera not persisted | reload clears session-only state | `REQUIRED` |

## 13. implementation file forecast

想定変更候補:

- `frontend/src/apollo/importExport.ts`
  - source revision / contract metadata helper 追加の可能性
- `frontend/src/desktop/projectFileDialog.ts`
  - binary/text save helper の拡張
- `desktop/electron/dialogIpc.ts`
  - binary save IPC 追加候補
- `desktop/electron/preload.ts`
  - narrow save bridge expose
- `desktop/electron/ipcChannels.ts`
  - channel 追加候補
- `frontend/src/apollo/__tests__/*`
  - reproducibility/save boundary tests

変更禁止:

- import fail-closed policy の緩和
- renderer からの fs 直アクセス
- unrelated Electron security policy changes

## 14. implementation entry gate

- Step 7 manifest schema が確定している
- binary save API の payload schema が fixed
- session-only state と persisted state の境界が fixed
- reload reproducibility contract が fixed

## 15. implementation completion gate

- Apollo JSON の保存/再読込で viewer 再生成が成立
- camera / visibility / selection が Apollo 正本へ混入しない
- browser で STL と manifest の download が成立
- Electron で STL と manifest の save/cancel/error handling が成立
- generated mesh/STL bytes が persisted されない
- same source + same assumptions で deterministic export を再現できる

## 16. unresolved items

| 項目 | 分類 | 内容 | 見直し条件 |
|---|---|---|---|
| binary save IPC exact shape | `PROVISIONAL` | current bridge は text-only | Step 8 implementation PR |
| companion JSON mandatory vs optional | `PROVISIONAL` | PoC では default on | user workflow feedback |
| camera/visibility optional persistence | `DEFERRED` | 初回実装では保存しない | session restore 要求時 |
| multi-file atomicity | `DEFERRED` | 2-step save で開始 | stronger transaction requirement 時 |

## 17. 実装開始判断

- `APOLLO_3D_PERSISTENCE_BOUNDARY_VERDICT: FROZEN`
- `APOLLO_3D_RELOAD_REPRODUCIBILITY_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_STL_BROWSER_SAVE_DESIGN_VERDICT: FROZEN`
- `APOLLO_STL_ELECTRON_SAVE_DESIGN_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_3D_STEP8_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS`

Step 8 は、Apollo 正本保存、derived visualization 再生成、browser/Electron export save を明確に分離した状態で実装開始可能である。
