# Typed Draft Schema vNext - PR-1a-2 補遺

> 作成日: 2026-06-30
> 用途: PR-1a-2（JSON Schema）で確定した判断の記録
> 関連: N2 §4, Master Pre-Decision Document, PR-1a-1 補遺

## 1. 背景

PR-1a-2 では `schemas/project.schema.json` に `liner.draftSchemaVersion` と `liner.domainDraft` を追加した。
既存 `projectLinerMetadata` は additive 変更とし、legacy `liner.draft`（`additionalProperties: true`）は v0.1 migration 入力として読み込み互換のため維持する。

vNext 保存時の必須条件は `projectLinerMetadataVNext`（`draftSchemaVersion` + `domainDraft` 必須）として定義した。
ベース `projectLinerMetadata` 単体では `draftSchemaVersion` / `domainDraft` は optional とし、既存プロジェクトの後方互換を保つ。

## 2. FrameSamplingProfileDraft 命名整合

N2 §5 では Frame 系統の既定値を「max chord 0.25 m」と表記するが、N2 §4 の `SamplingSettingsDraft.frame` 型名・フィールド名は `FrameSamplingProfileDraft` / `maxMemberLength` を採用する。

| 設計書表現 | JSON Schema フィールド | 対応関係 |
|---|---|---|
| N2 §5 frame max chord 0.25 m | `sampling.frame.maxMemberLength` | Frame member 細分化の最大弦長（m）。Decision #9, #15 の 0.25 m 制約はこのフィールドで表現する |
| max sagitta 0.0025 m | `sampling.frame.maxSagitta` | 許容矢距誤差 |
| （暗黙の station 間隔） | `sampling.frame.stationIntervalFallback` | 要素ベース細分化が不十分な場合の測点間隔フォールバック |

display / dxf 系統は `SamplingProfileDraft`（`maxChordLength`, `maxSagitta`, `minSegmentsPerElement`）を維持する。
Frame 系統のみ member 分割責務に合わせて別型とする。

## 3. parabolic 縦断要素 — JIP-LINER 互換（Pre-Decision #2）

PR-1a-1 の保守的 TS 定義（`startPhysicalDistance` / `pviPhysicalDistance` 等）とは独立に、JSON Schema は Master Pre-Decision #2 を優先する。

### 確定フィールド

| フィールド | 必須 | 説明 |
|---|---:|---|
| `type: "parabolic"` | Yes | discriminant |
| `id` | Yes | |
| `startStation` | Yes | 開始測点 (m) |
| `endStation` | Yes | 終了測点 (m) |
| `startGrade` | Yes | 開始勾配 (%, 上り正) |
| `endGrade` | Yes | 終了勾配 (%, 上り正) |
| `length` | Yes | 曲線長 (m) |
| `startElevation` | No | 開始標高 (m), 計算可能 |
| `curveType` | No | `"crest"` \| `"sag"`, 計算で導出可能 |

K値方式・半径 R 方式は採用しない。TS 型の更新は PR-2a-1 以降で行う。

## 4. GridDefinition と Sampling Frame 責務境界

| 責務 | 担当 | 内容 |
|---|---|---|
| グリッド点の生成範囲・参照 | `gridDefinitions[]` | 測点範囲 (`stationRange`)、横断テンプレート参照 (`crossSectionTemplateId`)、測点間隔 (`stationInterval`)、対象 offset line (`offsetLineIds`) |
| Frame member 細分化精度 | `sampling.frame` | `maxMemberLength` / `maxSagitta` / `stationIntervalFallback` による chord/sagitta 制御 |

`GridDefinitionDraft` は「どの station × offset 上に grid point を置くか」を定義する。
`FrameSamplingProfileDraft` は「生成された grid/alignment 上で Frame member をどの精度で細分化するか」を定義する。
Frame 分割パラメータを grid 側に重複持ちしない。

## 5. 横断 offset line（Pre-Decision #4 反映）

`crossSectionOffsetLineDraft` は offset 線リスト方式を採用:

- 必須: `id`, `offset`（中心線から m, 右正）, `elevation`（相対標高 m, 上正）
- optional: `role`（shoulder / lane / median / sidewalk / edge / custom）, `label`

レイヤー方式・パラメトリック方式は採用しない。
