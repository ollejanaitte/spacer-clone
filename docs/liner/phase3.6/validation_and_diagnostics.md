# Phase 3.6 Validation and Diagnostics

## 0. 目的

Phase 3.6 の診断は、PDF 写経ミスを早期に検出し、Phase 3.5 vNext draft へ変換できる状態かを判断するために行う。

診断は importer JSON 用と adapter 用を分ける。Phase 3.5 の C0/C1 診断は共通バリデータ層として再利用するが、Phase 3.5 UI に importer 固有診断を混ぜない。

## 1. 診断レベル

| Level | 意味 | 例 |
|---|---|---|
| Error | 保存継続は可能だが、エクスポート不可 | station 欠落、plan なしで pipeline 入力生成不可 |
| Warning | エクスポート可能な場合があるが、確認が必要 | 方位角急変、座標系 epoch 未入力 |
| Info | 入力状態または参考情報 | `********` を notComputed として保持 |

## 2. 写経ミス検出ルール

| # | Rule | 判定 | Level |
|---|---|---|---|
| 1 | 累加距離連鎖 | `sec[n].cumDist - sec[n-1].cumDist == sec[n].unitDist` を許容差内で確認 | Error / Warning |
| 2 | 累加幅連鎖 | `point[n].cumWidth - point[n-1].cumWidth == point[n].unitWidth` を許容差内で確認 | Error / Warning |
| 3 | 方位角急変 | 隣接 section の方位角差が Phase 3.5 PR-A 後 C1 許容 `0.001°` を超える | Warning |
| 4 | 左右対称性 | 対称主桁の累加幅差が 1mm を超える（`bridge.validationProfile.expectSymmetry === true` のときのみ） | Warning |
| 5 | STA 単調増加 | section の station が前 section 以下になる | Error |
| 6 | 計画高と縦断勾配 | 隣接計画高差と距離から求めた勾配が PDF 勾配と不整合 | Warning |
| 7 | `********` 整合 | notation が `********` で value が null かつ `flags.notComputed` | Info / Error |
| 8 | sourceRef 欠落 | 入力セルに sourceRef がない | Warning |
| 9 | 座標系未入力 | 水平または鉛直座標系が未確定 | Warning |
| 10 | 行マスタ不一致 | section の point 行が girderLine master と一致しない | Error |

## 3. 許容差

初期設計値:

| 対象 | 許容差 |
|---|---:|
| 距離、幅、座標 | 0.001 m |
| 計画高 | 0.001 m |
| 勾配 | 0.001 % |
| 方位角 | 0.001° |
| 左右対称性 | 0.001 m |

許容差は実装フェーズで定数化する。新規 npm パッケージには依存しない。

## 4. C0/C1 診断ロジックの流用

Phase 3.5 の `validateAlignment()` に実装される C0 / C1 診断を、Phase 3.6 adapter の補助入力検証で再利用する。

配置方針:

```text
frontend/src/liner/core/diagnostics        共通 geometry diagnostics
frontend/src/liner/importer/diagnostics    importer JSON diagnostics
frontend/src/liner/importer/adapter        Phase 3.6 -> Phase 3.5 diagnostics
```

Phase 3.6 固有 rule は importer 配下に置き、Phase 3.5 の 6 タブから直接参照しない。共通化するのは純粋な geometry / numeric validator に限る。

## 5. 実行タイミング

| タイミング | 実行内容 |
|---|---|
| 入力中即時 | セル型、`********`、累加幅、行マスタ一致 |
| 画面遷移時 | section 完了率、累加距離、STA 単調性、sourceRef |
| 横断面リスト表示時 | 全 section の station / 方位角 / 入力率 |
| ピア/スパン確認時 | span 範囲、支点 station、girderLineSet 対応 |
| エクスポート時 | 全 rule + Phase 3.5 adapter 変換可否 |

## 6. Diagnostic 型

```ts
interface ImporterDiagnostic {
  id: string;
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  targetPath: string;
  sourceRef?: SourceRef;
  suggestedAction?: string;
  acknowledgement?: DiagnosticAcknowledgement;
}

interface DiagnosticAcknowledgement {
  acknowledgedBy?: string | null;
  acknowledgedAt: string;
  reason: string;
  suppressUntilChange: boolean;
}
```

`acknowledgement` は「確認済み」情報を持つ。`suppressUntilChange: true` の場合、対象セルが変更されるまで診断を再表示しない。

Error レベルの診断は acknowledgement で抑制できても、エクスポート時のブロック判定には影響しない。acknowledgement は importer JSON 本体に含め、conversion log には残さない。

代表コード:

| Code | Level | 意味 |
|---|---|---|
| `IMPORTER_CUM_DISTANCE_CHAIN_INVALID` | Error / Warning | 累加距離連鎖不一致 |
| `IMPORTER_CUM_WIDTH_CHAIN_INVALID` | Error / Warning | 累加幅連鎖不一致 |
| `IMPORTER_AZIMUTH_JUMP` | Warning | 方位角急変 |
| `IMPORTER_SYMMETRY_WIDTH_MISMATCH` | Warning | 左右対称性不一致（`expectSymmetry` が true の橋のみ） |
| `IMPORTER_STATION_NOT_MONOTONIC` | Error | STA 単調性違反 |
| `IMPORTER_PROFILE_GRADE_MISMATCH` | Warning | 計画高と勾配の不整合 |
| `IMPORTER_NOT_COMPUTED_FLAG_MISMATCH` | Error | `********` と flags が不整合 |
| `IMPORTER_SOURCE_REF_MISSING` | Warning | sourceRef 欠落 |
| `IMPORTER_EXPORT_PLAN_MISSING` | Error | Phase 3.5 draft 生成に必要な plan がない |

## 7. UI 表示

- Error は赤、Warning は黄、Info は灰で表示する。
- 横断面編集ではセル単位のハイライトを行う。
- 横断面リストでは page 単位の集約件数を表示する。
- エクスポート確認では Error が 1 件でもある場合、書き出しボタンを無効にする。
- 確認済み診断は淡色で表示する。
- 診断パネルに「確認済みを表示 / 非表示」トグルを設ける。

### 8. 描画可否判定 (Renderability Gate)

§2 は入力データが正しいかを検出する rule 群であり、累加距離連鎖、STA 単調性、対称性などを扱う。本節は入力データが描画・エクスポートに必要な最小要件を満たしているかを判定する。両者は独立系統として動作する。ある Section が §2 の全 rule を pass しても本節で `blocked` になり得るし、逆もあり得る。

#### 8.1 判定対象別 最小要件

横断図 (Cross Section SVG):

| Status | 条件 |
|---|---|
| `ok` | 対象 Section の `points[]` のうち、`cumulativeWidth` と `designElevation` の両方が非 null である Point が 2 点以上存在し、`points[]` の `lineLabel` が全て確定している。`azimuth` は不要 |
| `partial` | 2 点未満だが 1 点は非 null。一部 Point に `********`（notComputed）があっても、残りで 2 点以上確保できる場合は `ok` |
| `blocked` | 有効な Point が 0 または 1 点のみ |

平面プレビュー (Plan Preview):

| Status | 条件 |
|---|---|
| `ok` | 対象 Bridge の `sections[]` のうち、`points[]` の `x` と `y` が両方非 null である Point を 1 点以上含む Section が 2 セクション以上存在し、各 Section の `azimuth.value` と `stationingRef.stationValue` が非 null |
| `partial` | 1 セクションのみ描画可能。azimuth が 1 セクションで欠落しているが XY が揃っている場合、該当セクションは点表示のみ可能 |
| `blocked` | 描画可能な Section が 0 件 |

Phase 3.5 エクスポート (Export):

| Status | 条件 |
|---|---|
| `ok` | 全 Section の平面プレビュー要件を満たし、`alignmentMetadata.plan` が 1 要素以上存在し、`coordinateSystem.horizontal.datum` が設定済みで、全 Section の `stationingRef.stationValue` が単調増加し、Error 診断が 0 件 |
| `partial` | `alignmentMetadata.profile` または `alignmentMetadata.crossSlope` のいずれかが欠落しているが、他要件は満たす。adapter は Warning を出しつつエクスポート可能 |
| `blocked` | `alignmentMetadata.plan` が欠落、診断に Error が 1 件以上、または Bridge に有効な Section が 0 件 |

#### 8.2 判定粒度

- Section 単位: 横断図の描画可否。
- Bridge 単位: 平面プレビュー・エクスポートの描画可否。
- Project 単位: 含まれる全 Bridge のエクスポート可否の集約。

Bridge 単位の集約ルール:

- 全 Section が `ok` なら Bridge も `ok`。
- 1 つでも `blocked` があれば Bridge は `partial` とし、描画できる部分だけ描く。
- 全 Section が `blocked` なら Bridge は `blocked`。

Project 単位も同様の集約ルールを適用する。

#### 8.3 未充足フィールドリスト

判定が `partial` または `blocked` の場合、「何が欠けているか」を `MissingFieldRef[]` として列挙する。

| Field | 意味 |
|---|---|
| `targetPath` | 欠落フィールドの JSON パス。例: `bridges[0].sections[2].points[3].x` |
| `label` | ユーザー向け表示ラベル。例: `横断面 3 / G1 / X 座標` |
| `requiredFor` | 必要な描画対象。`crossSection` / `planPreview` / `export` |
| `severity` | `blocking` または `degrading` |
| `sourceRef` | sourceRef があれば添付し、PDF 行列復帰に使う |

#### 8.4 Renderability 診断コード

| Code | Level | 意味 |
|---|---|---|
| `IMPORTER_RENDER_CROSS_SECTION_BLOCKED` | Info | 横断図描画不可 |
| `IMPORTER_RENDER_PLAN_PREVIEW_BLOCKED` | Info | 平面プレビュー描画不可 |
| `IMPORTER_RENDER_EXPORT_BLOCKED` | Warning | Phase 3.5 エクスポート不可 |
| `IMPORTER_RENDER_EXPORT_DEGRADED` | Info | Phase 3.5 エクスポートは可能だが補助入力欠落あり |

これらは §2 の写経ミス検出ルールの診断コードとは別系統として扱う。
