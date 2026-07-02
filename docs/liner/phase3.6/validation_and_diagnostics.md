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
| 4 | 左右対称性 | 対称主桁の累加幅差が 1mm を超える | Warning |
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
}
```

代表コード:

| Code | Level | 意味 |
|---|---|---|
| `IMPORTER_CUM_DISTANCE_CHAIN_INVALID` | Error / Warning | 累加距離連鎖不一致 |
| `IMPORTER_CUM_WIDTH_CHAIN_INVALID` | Error / Warning | 累加幅連鎖不一致 |
| `IMPORTER_AZIMUTH_JUMP` | Warning | 方位角急変 |
| `IMPORTER_SYMMETRY_WIDTH_MISMATCH` | Warning | 左右対称性不一致 |
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

