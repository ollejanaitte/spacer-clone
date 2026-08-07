# X0_PR_LEDGER — Phase X0 Step PR 台帳

全PRのbase = `research/liner-r1-planning`。mainへのPR・push・mergeはなし。

| Step | Branch | PR number | Merge commit | Files | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| X0-P00 | research/liner-x0-p00-freeze | #470 | 7071f3ff5b4b4fbd1f5ee6ef0eaad5a4ee4416ac | README.md / X0_SCOPE.md / X0_SOURCE_ROOTS.md | MERGED | スコープ・ソースルート確定 |
| X0-P01 | research/liner-x0-p01-discovery | #471 | e20e9cc95035b490bf02d25cf0b748ceee9e998b | DOCUMENT_INVENTORY.csv / SOURCE_REGISTER.csv | MERGED | 資産台帳147件 |
| X0-P02 | research/liner-x0-p02-metadata | #472 | 6bae4c6351987759dac15e5315cda2578adc7643 | OCR_TEXT_LAYER_STATUS.csv | MERGED | PDF94件のテキスト層判定 |
| X0-P03 | research/liner-x0-p03-classification | #473 | b1ab09dcbeb9ac02d87e1925ada7761e2b12b804 | DOCUMENT_RELATION_MATRIX.csv | MERGED | 設計領域別関連度 |
| X0-P04 | research/liner-x0-p04-priority | #474 | f3a79f4c214af9b4b15f91a5780cecbb138ccf29 | DUPLICATE_REPORT / VERSION_FAMILY_REPORT / RESEARCH_PRIORITY / OPEN_QUESTIONS | MERGED | 重複・版・優先順位 |
| X0-P05 | research/liner-x0-p05-integration | #475 | （X0-P05 merge後に記入） | X1_HANDOFF.md / X0_PR_LEDGER.md / PHASE_X0_FINAL_REPORT.md | MERGED | 統合・引継ぎ・最終報告 |

## 確認事項

- 全PR base = research/liner-r1-planning（mainへのPRなし）
- 各Stepはintegration branch最新から派生（前Stepの未merge branchからは派生していない）
- 各PR本文冒頭に `DO NOT RETARGET TO MAIN` を記載
