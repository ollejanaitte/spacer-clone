# Package Report: PKG-003-RBS-I

run_id: LR-20260726-001
package_id: PKG-003-RBS-I
status: COMPLETE
review_date: 2026-07-26

## 件数

| 項目 | 期待 | 実績 |
|------|------|------|
| primary | 12 | 12 |
| handoff（当package） | 16 | 16 |
| duplicate参照 | 4 | 4 |

## 所在サマリ

| location_status | 件数 |
|-----------------|------|
| LOCATED | 3 |
| PARTIALLY_LOCATED | 9 |

LOCATED: H5A-0002（単位系）, H5A-0075（床版荷重）, H5A-0236（活荷重/路面荷重）

## 証拠画像

- 13件（300 dpi PNG）
- 索引: `stage5b_evidence_index.csv`
- 出力先: `research/stage5b/page-images/evidence/`

## 機械検証

```text
PACKAGE_ACCEPTANCE: PASSED
SCHEMA_DRIFT: NO
TRACEABILITY_ERROR: 0
MISSING_EVIDENCE_FOR_LOCATED_RESULTS: 0
PDF_SHA_MISMATCH: 0
INPUT_SHA_MISMATCH: 0
DISK_STATUS: OK
```

## 監督レビュー

- 根拠区分: すべて STANDARD_REQUIREMENT（道示Ⅰ）
- Target / Historical: 全行維持
- 数値・式の設計値確定: なし
- 版・正誤表: errata_status=UNKNOWN（OPEN維持）

## 未解決（package内）

- APOLLO任意荷重用語と道示記号体系の対応（PARTIALLY_LOCATED 9件）
- 片持部荷重: 道示Ⅱ/Ⅲへの横断参照未了
- 水平荷重: 8.17風荷重の別頁確認未了

## checkpoint

`checkpoints/checkpoint_PKG-003-RBS-I.json`

## 次package

PKG-004-RBS-II へ継続（確認待ちなし・パイロットゲート通過）
