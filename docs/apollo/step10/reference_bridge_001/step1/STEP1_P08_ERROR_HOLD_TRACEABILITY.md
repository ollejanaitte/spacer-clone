# STEP 1-P08 — ERROR_HOLD_TRACEABILITY_SPEC

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本:** `phase6_0/geometry/unresolved_geometry_contract.md`・`value_state_contract.md`・backend `errors.py`・`frontend/src/apollo/errors.ts`

## 1. 値状態（全層共通）

| 状態 | 意味 | 扱い |
|------|------|------|
| CONFIRMED | 正値確定 | 計算・出力に使用可 |
| HUMAN_CONFIRMATION_REQUIRED | 人間確認必要 | `humanConfirmationId` 保持で伝播（HCR-001） |
| CONFLICT | 候補あり未確定 | `candidates` 保持・選択なし（CONF-P2II-001） |
| HOLD_INSUFFICIENT_SOURCE | 根拠不足 | `stateReason` 保持・補間禁止（中間格点） |
| NOT_AVAILABLE | 値なし | 明示（analysisReference） |

## 2. エラー階層

| 種別 | 例 | 扱い |
|------|-----|------|
| fatal | schema 不整合・保存失敗 | fail-closed（処理中断・ユーザ通知） |
| error | 入力不正・解析失敗 | ダイアログ/バナー表示、続行不可 |
| warning | stale・provenance 欠落・HOLD 出力使用 | 警告表示、続行可 |
| info | 進捗・開発情報 | 表示 |

## 3. 伝播規則

- 入力の unresolved は出力でも unresolved（数値に捏造しない）。
- バウンダリ（connector/API）で状態は維持され、変換・丸めで状態が消えない。
- 出力 artifact（計算書/図面/数量/CSV/STL）は unresolved を含む場合、その旨を manifest に明記。

## 4. UI での表現

| 状態 | 表現 |
|------|------|
| CONFIRMED | 通常表示 |
| HCR / CONFLICT / HOLD | 状態バッジ + 詳細（humanConfirmationId / candidates / stateReason） |
| NOT_AVAILABLE | 「—」/ 非該当表示 |
| warning | 警告バナー（SaveStatusBadge / WorkflowStatusBadge 拡張） |
| fatal / error | GuardDialog / エラーバナー（既存 dialog 機構） |

## 5. traceability（エラー・未解決の追跡）

- 各値は `goldenId` / `sourceRefs` / `traceabilityId` を保持し、層を跨いで失わない。
- 照査結果・設計結果は「式 source（DS-xx / R7）・入力値・判定」を traceability に記録。
- Replay では unresolved の伝播経路を検証（捏造検出 = FAIL_UNRESOLVED）。

## 6. 監査チェック

- 中間値で unresolved → 数値化されていないこと。
- エラー/警告が UI で表示可能であること（吞み込まれない）。
- 認証ゲート（NOT_AUTHORIZED）を数値出力が透過しないこと。
