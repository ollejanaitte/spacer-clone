# 07 — Warning and Status Message Specification

> **Authority:** Phase 2-G (specification freeze)
> **Base:** Phase 1 `05_current_output_capability.md` (manifest warnings), `08_gap_analysis.md` (status codes).

## 1. 警告文の凍結 (必須)

全帳票 (summary + detailed) の **ヘッダとフッタ** に必ず以下を表示する。色だけに依存せず、文字列で必須表示する。

```
UNVERIFIED DEVELOPMENT OUTPUT
NOT FOR DESIGN, FABRICATION OR CONSTRUCTION
USER REVIEW REQUIRED
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
DESIGN_OR_CONSTRUCTION_USE: PROHIBITED
```

> ■ 根拠: `artifactBundle.ts:158-162` (`00_README.txt`), `reportModel.ts:150-156` (warnings[]), `reportModel.ts:168` (watermark row)。Phase 1 `reportModel.test.ts:36-37` で `"UNVERIFIED DEVELOPMENT OUTPUT"` と `"CH-QUANTITY"` 含有を検証済み。

### 補助警告 (状況に応じて付加)
| 状況 | 補助警告 |
|------|----------|
| STALE | `STALE: regenerate before export` (`reportModel.ts:155`) |
| validation FAIL | `入力検証に不整合 N 件 (詳細は CP-19)` |
| CP-13 NOT_AVAILABLE (CONTINUOUS) | `断面諸量は CONTINUOUS では未出力 (NOT_AVAILABLE) -- ガード未分離 (U-03)` |
| CP-3x numeric results | `解析結果/断面力/照査結果は未実装 (NOT_AVAILABLE) -- 将来 D クラス` |

## 2. 状態コード (10 states)

| internal_code | display_name | severity | 表示位置 | summary | detailed | 非色依存表示 | 出力続行 | ユーザー操作 | 解除条件 | log |
|---------------|--------------|----------|----------|---------|----------|-------------|----------|--------------|----------|-----|
| NA-NOTAUTHORIZED | NOT_AUTHORIZED | high | ヘッダ右 / フッタ | バッジ | バッジ+detail | `NOT_AUTHORIZED` 文字 | yes(dev only) | none | DS-09 cell DEC-PHA-xxxx | yes |
| NA-NOTIMPL | NOT_IMPLEMENTED | medium | CP-23 list | list | detail | `NOT_IMPLEMENTED` | yes | none | impl + gate | yes |
| NA-STALE | STALE | warning | CP-21 / ヘッダ | バッジ | バッジ+note | `STALE` | yes(dev only) | regenerate | regenerate BSDD | yes |
| NA-INVALID | INVALID | high | CP-19 | バッジ | diagnostics | `INVALID: N issues` | yes(dev only) | fix input | validation pass | yes |
| NA-PARTIAL | PARTIALLY_AVAILABLE | info | CP-18/25 | count | list | `PARTIAL(N/...)` | yes | none | n/a | yes |
| NA-HCR | HUMAN_CONFIRMATION_REQUIRED | high | CP-23/H-01..03 | list | detail | `HUMAN_CONFIRMATION_REQUIRED` | yes(dev only) | review | human decision | yes |
| NA-CONFLICT | CONFLICTING_EVIDENCE | high | CP-23 | list | detail | `CONFLICTING_EVIDENCE` | yes(dev only) | review H-01..03 | reconcile | yes |
| NA-LEGACY | LEGACY_DATA | info | CP-21 | note | detail | `LEGACY_SCHEMA v1.0.0` | yes(dev only) | none | migrate | yes |
| NA-IMPORTWARN | IMPORT_WARNING | warning | CP-19/21 | note | detail | `IMPORT_WARNING: ...` | yes | review | re-import | yes |
| NA-EXPORTRROR | EXPORT_WARNING | warning | CP-20 | note | detail | `EXPORT_WARNING: STALE/BLOCKED` | abort | regenerate | consistent state | yes |

> ■ **非色依存表示の原則**: バッジは `(badge)` ではなく `文字列ラベル`+`status_code` を併記。HTML では `aria-label` + テキスト。色は補助的 (赤=high, 黄=warning, 青=info)。

## 3. 状態ごとの出力許可 (output continuation)

| state | summary output | detailed output | formal PDF |
|-------|----------------|-----------------|------------|
| NOT_AUTHORIZED | yes (warning) | yes (status tag) | NO |
| NOT_IMPLEMENTED | list in CP-23 | detail row `NOT_IMPLEMENTED` | NO |
| STALE | yes (badge) | yes (badge+note) | NO |
| INVALID | yes (badge) | yes (diagnostics) | NO |
| PARTIALLY_AVAILABLE | yes | yes | NO |
| HUMAN_CONFIRMATION_REQUIRED | list | detail | NO |
| CONFLICTING_EVIDENCE | list | detail | NO |
| LEGACY_DATA | note | detail | NO |
| IMPORT_WARNING | note | detail | NO |
| EXPORT_WARNING | NO (abort) | NO (abort) | NO |

> ■ **formal PDF はすべて NO** (`assertFormalReportRejected`)。dev HTML/CSV は state を警告として続行。

## 4. 警告表示規則 (display rules)

1. ヘッダ: `連続橋入力条件・構造モデル確認書` + 分類バッジ (CP-02) + `NOT_AUTHORIZED` バッジ (if any NOT_AUTHORIZED).
2. フッタ: mandatory watermark strings (§1) + `generatedAt` + `inputChecksum`.
3. 章 row: `value` 右寄せ + `status_code` ラベル (e.g. `NOT_AVAILABLE`, `UNVERIFIED`, `NOT_AUTHORIZED`).
4. STALE 章: `STALE` バッジ + 前回値 not shown or `prev=...` (dev only).
5. CP-23 未実装章: U-01..U-06 の一覧 (link to `08_gap_analysis.md §4`).

## 5. 変更管理

- 警告文は Phase 2 で凍結。追加/変更は `DEC-PHA-xxxx` 経由。
- state code は `chapter_matrix.csv` / `output_permission_matrix.csv` に参照される canonical 値。

## 6. 状態

- HEAD: ef4d4dc. local == origin/main. clean.
- 本節確定: mandatory watermark + 10 state codes + display/continuation rules。
