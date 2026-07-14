# Crossfall Transition Design

> Status: `REDLINE_REMEDIATION_DESIGN`
> Date: 2026-07-13
> Redline: [redline_ui_and_drawing_remediation_design.md](redline_ui_and_drawing_remediation_design.md)
> Phase: Phase 5 / 第1編補遺
> This chapter defines crossfall within the first chapter boundary.

## 1. 確認済み事実

- 現行 UI は `CrossSlopeDraft` を scalar で扱う `SuperelevationEditor` が `LinerEditPage` に残存する。根拠: `frontend/src/liner/pages/LinerEditPage.tsx:270-275`, `frontend/src/liner/components/SuperelevationEditor.tsx`.
- `CrossSectionTemplateEditor` は `crossSlope.valuePercent` から全 `offsetLines[].elevation` を再計算し、elevation は readonly。根拠: `frontend/src/liner/components/CrossSectionTemplateEditor.tsx:50-58`, `:274-280`.
- 現行式は `crossfallOffset = resolveCrossfallOffset(state, offset)`、`z = profileElevation + crossfallOffset`（template elevation 未加算）。根拠: `frontend/src/liner/core/grid/gridGeneration.ts:125-126`, `frontend/src/liner/core/grid/crossfallResolution.ts:227-242`.
- measured grid 存在時は `generateMeasuredGridPoints()` が優先され、警告 `LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE` を出す（現状 detail は英語）。根拠: `frontend/src/liner/core/pipeline/pipeline.ts:523-531`.
- `zProvenance` は `profileElevation`, `crossfallOffset`, `structuralReferenceOffset`, `sectionDepthOffset`, `girderEccentricity` を持つが、現状 crossfall の state transition 情報は持たない。根拠: `frontend/src/liner/core/mapper/frameModelMapper.ts:282`.
- save 経路では `linerProjectDraft.ts` が draft を保持し、対応テストでも保存互換が確認されている。根拠: `frontend/src/liner/core/persistence/linerProjectDraft.ts:134`, `frontend/src/liner/core/persistence/linerProjectDraft.test.ts:62`.
- `sourceRevision` の現行生成元は `buildIntermediateResult()` 側にあり、revision pipeline の分岐で確定される。根拠: `frontend/src/liner/core/pipeline/pipeline.ts:391`.
- `sourceRevision` には `crossSections` / `verticalAlignment` を含める方針だが、offset elevation は `linerUiAdapter.ts` と `gridGeneration.ts` で扱いを分ける。根拠: `frontend/src/liner/ui/linerUiAdapter.ts:106`, `frontend/src/liner/core/grid/gridGeneration.ts:98`.
- importer 側の cross-section 正規化は `normalizeCrossSections.ts` に集約される。根拠: `frontend/src/liner/import/normalizeCrossSections.ts:14`.

## 2. 提案する型群

### 2.1 mode

```text
CrossfallMode
  | "crown"
  | "one_way_left"
  | "one_way_right"
  | "independent"
  | "flat"
```

### 2.2 state

```text
CrossfallState
  - physicalDistance
  - displayedStation
  - mode
  - leftSlopePercent
  - rightSlopePercent
  - pivotDistance?
  - sourceRevision
  - trace[]
```

### 2.3 interval

```text
CrossfallInterval
  - id
  - startPhysicalDistance
  - endPhysicalDistance
  - startDisplayedStation?
  - endDisplayedStation?
  - mode
  - leftSlopePercent
  - rightSlopePercent
  - pivotDistance?
  - measuredGridPrecedence?
  - sourceRevision
```

### 2.4 fields

次の fields を明示的に正とする。

- `physicalDistance`
- `displayedStation`
- `mode`
- `leftSlopePercent`
- `rightSlopePercent`
- `pivotDistance?`
- `sourceRevision`
- `measuredGridPrecedence?`
- `trace[]`

`crossSections` と `verticalAlignment` は `sourceRevision` の追加対象に含める。

## 3. 現行 runtime 式（確認済み）

`resolveCrossfallOffset` 内部:

```text
relativeOffset = offset - pivotDistance
crossfallDeltaZ = -(slopePercent / 100) * relativeOffset
```

`generateGridPoints` 現状:

```text
z = profileElevation + crossfallDeltaZ
```

template `offsetLine.elevation` は未加算（redline RL-02）。

## 4. 提案アルゴリズム

### 4.1 state resolver

1. 入力点の `physicalDistance` を主キーとして、該当する `CrossfallInterval` を解決する。
2. 解決できない場合は `flat` を既定状態とする。
3. measured grid が存在する場合は、現行では derived crossfall を迂回する実装事実を維持しつつ、将来の継続可否は OD-13 に委ねる。

### 4.2 transition

遷移式は次とする。

```text
t = clamp((s - gapStart) / (gapEnd - gapStart), 0, 1)
leftSlopePercent  = lerp(leftStartSlopePercent,  leftEndSlopePercent,  t)
rightSlopePercent = lerp(rightStartSlopePercent, rightEndSlopePercent, t)
```

- `physicalDistance` を使い、station ではなく model distance で評価する。
- fixed pivot は MVP で対応する。
- overlap は error とする。
- touch は許可する。
- 両端が確定している gap のみ auto で埋める。
- pivot を変更する場合は gap を許可しない。
- zero length は同一状態のみ許可する。
- right-left の 0 通過は許可する。
- width は同距離先行で解決する。
- physicalDistance は source of truth であり、displayed station は表示専用とする。

### 4.3 precedence

| 優先 | 条件 | 動作 |
| --- | --- | --- |
| 1 | `measuredGrid` あり | measured Z を採用；interval crossfall delta は適用しない |
| 2 | `crossSlopeIntervals` あり | interval / transition state |
| 3 | legacy scalar のみ | `buildLegacyScalarState()`（migration） |

**提案:** measured 優先時の diagnostic detail を日本語化する（例: 実測グリッドが有効なため、区間横断勾配による高さ補正は適用されません）。UI warning と整合させる（OD-13）。

parametric interval を crossfall の source of truth とする。template `offsetLines[].elevation` は基準横断形状の source of truth とし、scalar による上書きを禁止する。

### 4.4 Open Decision

| ID | 論点 | 未決理由 | 推奨初期値 |
| --- | --- | --- | --- |
| OD-13 | measured precedence の将来継続 | 現行迂回を維持しつつ正式化の余地を残したい | continue via runtime bypass |

### 4.5 vertical / frame transfer

詳細・日本語 diagnostic 文言は [redline_ui_and_drawing_remediation_design.md](redline_ui_and_drawing_remediation_design.md) §4 を正とする。

```text
z = profileElevation
  + templateRelativeElevation(offset)
  + crossfallDeltaZ
  + structuralReferenceOffset
  + sectionDepthOffset
  + girderEccentricity
```

- `templateRelativeElevation` = resolved `offsetLines[].elevation` at offset（手編集値；scalar 再計算禁止）。
- `crossfallDeltaZ` = pivot 周りの **単一** interval 回転寄与（二重適用禁止）。
- frame 転送では各寄与を `zProvenance` / trace に保持する。

## 5. sourceRevision

`sourceRevision` の追加対象は、runtime 結果を変える crossfall 由来の要素に限る。
少なくとも `mode`, `leftSlopePercent`, `rightSlopePercent`, `pivotDistance`, `measuredGridPrecedence`, `offsetLines.elevation` の解決結果、`crossSections`, `verticalAlignment`, `width` の解決結果は対象に入る。

## 6. 0.3.0 migration

v0.3.0 migration では次を正とする。

- 正: `one_way_right`
- 負: `one_way_left`
- 未設定: `flat`

既存データは scalar から interval へ自動昇格できる。
保存互換のため scalar を一時的に読み込める（**UI からは編集不可**）。
新保存では interval を正とする。
template elevation は scalar からの自動再計算を廃止し、読み込み時のみ migration 補助可。

## 7. path:line 根拠

- `frontend/src/liner/schema/types.ts:212`: 現行 single UI / `CrossSlopeDraft` の根拠
- `frontend/src/liner/core/grid/gridGeneration.ts:32`: `applyCrossSlope` 適用の根拠
- `frontend/src/liner/core/grid/gridGeneration.ts:60`: 全 runtime 点への同一適用の根拠
- `frontend/src/liner/core/types.ts:289`: `zProvenance` に transition 情報がない根拠
- `frontend/src/liner/core/pipeline/pipeline.ts:388`: `sourceRevision` 生成元の根拠
- `frontend/src/liner/mapper/frameModelMapper.ts:270`: frame 転送時の trace 既存根拠

## 8. 10. 数式 / pseudocode

```text
resolveInterval(physicalDistance):
  if intervals contain physicalDistance:
    return bestMatchingInterval
  return flatInterval

templateRelativeElevation(offset, template):
  return resolved offsetLines[].elevation at offset

resolveCrossfall(physicalDistance, offset):
  interval = resolveInterval(physicalDistance)
  t = resolveTransition(interval, physicalDistance)
  leftSlopePercent = lerp(interval.leftSlopeStart, interval.leftSlopeEnd, t)
  rightSlopePercent = lerp(interval.rightSlopeStart, interval.rightSlopeEnd, t)
  crossfallDeltaZ = resolveCrossfallOffset(intervalState, offset)
  return {
    mode: interval.mode,
    templateRelativeElevation: templateRelativeElevation(offset, template),
    crossfallDeltaZ,
    z: profileElevation + templateRelativeElevation + crossfallDeltaZ,
    sourceRevision: interval.sourceRevision,
    trace: buildTrace(interval, t)
  }
```

## 9. test matrix / edge cases

- interval 重複
- interval gap
- touch only
- pivot 境界ちょうど
- measured grid 優先
- width 未確定
- vertical 無し
- sourceRevision 固定
- 0 offset
- negative offset
- high density sections
