# Design Calculation Adapter 契約（A-01 Freeze）

区分: FREEZE
日付: 2026-08-08
目的: 将来の正式設計計算エンジンを差し込める Adapter 境界の最小契約。
「橋脚モデル → Adapter入力 → 計算Engine → Adapter結果 → UI → 永続化 → 再表示」の
データ往復を可能にするための契約であり、正式な道路橋数値照査の完成ではない。

## 1. 位置づけ

- M3 の designEngine（runDesign / DesignResult）とは別レイヤーの「接続契約」。
- UI・Three.js に依存しない（純粋なデータ型）。
- 正式設計 OK/NG と誤認しない status 表現を使う。

## 2. CalculationAdapterInput

| フィールド | 型 | 備考 |
|---|---|---|
| schemaVersion | string | "0.1.0" |
| projectId / bridgeId | string? | |
| supportId | string | 安定ID |
| structureType | "pier" \| "abutment" | |
| geometry | AdapterGeometry | column / cap / columns / beam / footing / pileGroup / backwall / wing |
| placement | AdapterPlacement | station / offset / skewDeg / zOverride |
| modelRevision | string | ソースモデルの revision（stale 検出） |
| units | { length, force, angle } | m / kN / deg |
| bearingSeatCount | number | |
| reactionCaseKinds | string[] | 上部工 reactionCases の kind 一覧 |

## 3. CalculationAdapterResult

| フィールド | 型 | 備考 |
|---|---|---|
| schemaVersion | string | "0.1.0" |
| calculationId | string | 計算単位の安定ID |
| supportId | string | |
| engineType | "test-mock" | 正式Engineは未接続 |
| engineVersion | string | |
| status | TEST_PASS / TEST_FAIL / HOLD / ERROR | OK/NG と誤認しない |
| checks | AdapterCheck[] | TEST_PASS / TEST_FAIL / HOLD |
| summary | { pass, fail, hold, total } | |
| errors / warnings | string[] | |
| trace | AdapterTraceEntry[] | 入力・中間値・根拠 |
| generatedAt | string | |
| isFormalDesign | false（固定） | 正式設計結果でないことの明示 |
| engineLabel | "TEST" \| "MOCK" | UI での識別ラベル |

## 4. 制約

- validateAdapterInput / validateAdapterResult は fail-closed。
- Test/Mock 結果を正式な構造安全性判定として表示しない。
- engineType は test-mock のみ許可（本物の正式Engineは将来差し込み）。
