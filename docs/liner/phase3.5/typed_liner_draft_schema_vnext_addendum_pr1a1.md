# Typed Draft Schema vNext - PR-1a-1 補遺

> 作成日: 2026-06-29
> 用途: PR-1a-1 で保守的に定義した補助型の根拠記録
> 関連: N2 §4, N7 PR-1a-1

## 1. 背景

N2 §4 では以下の補助型のフィールド詳細が未定義のため、PR-1a-1（型定義のみのPR）では
最小限の保守的定義を行う。各型の確定は PR-1a-2（JSON Schema）以降で改めて議論する。

## 2. 保守的定義した型一覧

### 2.1 StationDefinitionDraft

- 採用フィールド: `originDisplayedStation`, `interval`, `explicitStations`, `equations`
- 根拠: N2 §4 の `stationDefinition` 必須保存、N2 §5 の `stationDefinition interval`、既存 `core/types.ts` の `StationDefinition`
- 確定保留事項: 測点方程式の許可種別、`interval` と `explicitStations` の併用可否、physical/displayed station の制約

### 2.2 VerticalAlignmentDraft

- 採用フィールド: `id`, `elements`
- 根拠: N2 §4 の `verticalAlignment.elements[]` union、N2 §5 の fixed-z migration、既存 `core/types.ts` の `VerticalGeometryResult`
- 確定保留事項: grade/parabolic の必須フィールド、PVI/PVC/PVT の保存粒度、固定Z migration 時の最小要素長

### 2.3 CrossSectionTemplateDraft

- 採用フィールド: `id`, `name`, `offsetLines`
- 根拠: N2 §4 の `crossSections[]`、N2 §5 の fixed offset migration、既存 `core/types.ts` の `GridPointRole` と `ZProvenance`
- 確定保留事項: テンプレート1件以上の制約、offset line role の enum 固定、構造基準 offset / 桁高 / 偏心の保存責務

### 2.4 GridDefinitionDraft

- 採用フィールド: `id`, `crossSectionTemplateId`, `stationRange`, `stationInterval`, `offsetLineIds`
- 根拠: N2 §4 の `gridDefinitions[]`、N2 §5 の station range / offsets migration、既存 `core/types.ts` の `GridResult`
- 確定保留事項: station range の端点表現、offset line 参照の必須性、Frame 分割設定を grid 側に持つか sampling 側に閉じるか

### 2.5 SpanDraft

- 採用フィールド: `id`, `startPhysicalDistance`, `endPhysicalDistance`, `pierIdStart`, `pierIdEnd`
- 根拠: N2 §4 の `spans[]`、既存 `core/types.ts` の `SpanResult`
- 確定保留事項: span と pier の相互参照制約、端点 station の保存要否、空配列許可範囲

### 2.6 PierDraft

- 採用フィールド: `id`, `physicalDistance`, `skewAngleRad`, `bearingOffsets`
- 根拠: N2 §4 の `piers[]`、既存 `core/types.ts` の `PierResult`
- 確定保留事項: skew angle の既定値、bearing offset の index/offset 制約、support line 生成責務

### 2.7 GenerationSettingsDraft

- 採用フィールド: `defaultMemberGroupKey`, `connectivityMode`
- 根拠: N2 §4 の `generationSettings`、既存 `core/types.ts` の `FrameGenerationHintResult`
- 確定保留事項: member group rule の保存場所、support template hint の draft 化要否、既定値の JSON Schema 表現

## 3. 次PR (PR-1a-2 以降) への申し送り

- 上記すべての型について、JSON Schema 化の際に再確認が必要。
- `VerticalElementDraft` の parabolic field set は Human Decision 候補。
- `CrossSectionTemplateDraft` の Z 合成関連フィールドは N4 実装前に再確認が必要。
- `GridDefinitionDraft` と `SamplingSettingsDraft` の Frame 分割責務境界は PR-1a-2 または PR-1b-3 で確認する。
- `GenerationSettingsDraft` は最小定義に留めており、Frame mapper 側の確定仕様に合わせて拡張する。

## 4. 既存 core/types.ts との重複・関連

| addendum 型 | core/types.ts の関連型 | 関係 |
|---|---|---|
| `StationDefinitionDraft` | `StationDefinition`, `StationEquation` | draft 側の保存形。既存型の field set を保守的に踏襲。 |
| `VerticalAlignmentDraft` | `VerticalGeometryResult`, `ProfileSegmentResult` | draft 入力と計算結果の関係。PR-1a-1 では入力型のみ追加。 |
| `CrossSectionTemplateDraft` | `GridPointRole`, `ZProvenance` | offset line role と Z 合成要素の保存候補。 |
| `GridDefinitionDraft` | `GridResult`, `GridLineResult`, `GridPointResult` | grid 生成入力と計算結果の関係。 |
| `SpanDraft` | `SpanResult` | span 入力と計算結果の関係。 |
| `PierDraft` | `PierResult` | pier 入力と計算結果の関係。 |
| `GenerationSettingsDraft` | `FrameGenerationHintResult` | Frame 生成ヒントの draft 側設定候補。 |
