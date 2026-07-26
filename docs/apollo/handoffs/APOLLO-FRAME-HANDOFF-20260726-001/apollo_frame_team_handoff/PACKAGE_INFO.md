# Package Info — APOLLO-FRAME-HANDOFF-20260726-001

**Status:** DRAFT (Composer 2.5 — Grok 検収前)

## Purpose

骨組み計算ソフト開発チーム向け Stage 6 ギャップ分析引渡しパッケージ。READY 69 件は実装許可ではなく、既存 OSS / 製品との差分検討用候補である。

## Verdicts

```text
APOLLO_RESEARCH_SCOPE_VERDICT: COMPLETE
APOLLO_READY_SUBSET_TO_OSS_GAP_ANALYSIS_VERDICT: READY
APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY
```

Target Standard: **NOT_SELECTED**

## SHA256SUMS self-exclusion

`SHA256SUMS.txt` および `MANIFEST.csv` はハッシュ対象から **除外** する。

理由: 自己参照ハッシュは生成後に陳腐化し、検証で誤警告を生む。それ以外の全パッケージファイルは `SHA256SUMS.txt` で検証する。最終 ZIP 全体のハッシュは ZIP 外の `.zip.sha256` サイドカーで管理する。

## Counts (frozen reference)

| Bucket | Count |
|--------|------:|
| Stage 4 features | 281 |
| READY (gap-analysis subset) | 69 |
| OPEN | 32 |
| JIS SOURCE GAP | 34 |
| APOLLO RETURN remaining | 4 |
| UNKNOWN | 15 |

## Exclusions

- APOLLO マニュアル原本 PDF
- 道路橋示方書・JIS・DDB 原本
- 実行ファイル・設計 DB（`.mdb`）・線形データ（`.alg`）・図面（`.dwg`）
- 絶対パス・Git メタデータ

## License

Evidence 画像は内部検証用途。受領組織は利用権限・再配布条件を独自に確認すること。本パッケージは外部公開や再配布を自動許可しない。

## Draft note

本ファイルは `manual-research/handoff-work/PACKAGE_INFO.md` の草案である。
