# Document Identity and Revision Report

## 1. Purpose

Record the identity metadata for each source original and assess revision status.

## 2. Apollo User Manual

| Field | Value |
|-------|-------|
| Title | Apollo SuperDesigner & SuperDrawing — 鋼橋の自動設計製図システム |
| Subtitle | ユーザーズ・マニュアル |
| Date | 2002年4月 |
| Author | 長崎富彦 |
| System components | Align, Analyzer, SuperDesigner, SuperDrawing, y-Mater |
| Pages | 30 |
| Format | A4 |
| Role | Reference — system architecture and data flow context |
| Revision | No revision field found. Single release assumed. |
| Status | SOURCE_CONFIRMED |

## 3. Design Drawing (鋼鈑桁橋_図面例.pdf)

| Field | Raw value | Source |
|-------|-----------|--------|
| Business name | 令和3年度 道路改良工事の内橋梁詳細設計業務（知－5） | Cover, catalog, title blocks |
| Work name | 上部工（金沢IC Aランプ） | Cover |
| Bridge name | 旭高架橋 Aランプ PU15-AR2 | Catalog, title blocks |
| Route | 一般国道247号（西知多道路） | Title blocks |
| Location | 知多市旭地内始め | Title blocks |
| Client | 愛知県知多建設事務所 | Cover |
| Date | 令和5年3月 | Cover |
| Total sheets | 全141葉 | Catalog, title blocks |
| PDF pages | 143 | pdfinfo |
| Format | A3 | pdfinfo |
| Role | Source drawing set for reproduction |

### Revision status

No revision marks, revision columns, or change history found in text-extracted
title blocks. The drawing set is recorded as a single self-consistent release
with no visible revision indicators.

**Revision status:** REVISION_NOT_FOUND
**Release judgment:** SAME_PROJECT_SET_REVISION_UNCERTAIN

## 4. Design Calculation (鋼鈑桁橋_設計計算例.pdf)

| Field | Raw value | Source |
|-------|-----------|--------|
| Business name | 令和3年度 道路改良工事の内橋梁詳細設計業務（知－5） | Cover |
| Volume | 第18編 上部工設計計算書（ランプ橋） | Cover |
| Bridge name | 金沢IC Aランプ橋 | Cover, title |
| Subtitle | 3径間連続鈑桁橋 | Cover |
| Client | 愛知県知多建設事務所 | Cover |
| Date | 令和5年3月 | Cover |
| Pages | 2226 | pdfinfo |
| Format | A4 | pdfinfo |
| Role | Source calculation book for reproduction |
| END marker | Page 2221: "END ----- 2221" | Last content page |

### Revision status

No revision marks, revision columns, or change history found in the text
extraction. The calculation book is recorded as a single self-consistent release.

**Revision status:** REVISION_NOT_FOUND
**Release judgment:** SAME_PROJECT_SET_REVISION_UNCERTAIN

## 5. Same-project set judgment

| Criterion | Finding |
|-----------|---------|
| Same business name | YES — 令和3年度 道路改良工事の内橋梁詳細設計業務（知－5） |
| Same client | YES — 愛知県知多建設事務所 |
| Same date | YES — 令和5年3月 |
| Same bridge | YES — 金沢IC Aランプ橋 / 旭高架橋 Aランプ PU15-AR2 |
| Same route | YES — 一般国道247号（西知多道路） |
| Revision consistency | UNCERTAIN — no revision fields found in either document |
| Release judgment | SAME_PROJECT_SET_REVISION_UNCERTAIN |

## 6. Verdict

DOCUMENT_IDENTITY_VERDICT: PASS
REVISION_STATUS_VERDICT: PARTIAL (REVISION_NOT_FOUND, release judgment:
SAME_PROJECT_SET_REVISION_UNCERTAIN)