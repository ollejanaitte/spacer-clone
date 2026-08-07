# X1_PR_LEDGER — Phase X1 Step PR 台帳

全PRのbase = `research/liner-r1-planning`。mainへのPR・push・mergeはなし。

| Step | Branch | PR | Merge commit | Source assets | Rules added | Mappings added | Unresolved | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X1-P00 | research/liner-x1-p00-freeze | #476 | b6f5c34163e0df56cdf71f09948792fa02846818 | -（スコープ） | - | - | - | MERGED |
| X1-P01 | research/liner-x1-p01-road-ordinance | #477 | bad164a34893995a4414d89dfc098e38fd7e3316 | DOC-X0-0145 | 37 | 0 | 1 | MERGED |
| X1-P02 | research/liner-x1-p02-jip-liner | #478 | 4157c4c34f7e0e40d07f6a11321c5e170d4b41c3 | DOC-X0-0035 | 11 | 22 | 0 | MERGED |
| X1-P03 | research/liner-x1-p03-project-crosscheck | #479 | 631d77d406a37111d249e28f24457e417f565614 | DOC-X0-0143/0144 | 5 | 12 | 0 | MERGED |
| X1-P04 | research/liner-x1-p04-road-bridge | #480 | 27f04dfcb39b1839f31029b1e4af0cdc12a935f8 | DOC-X0-0001/0091 | 5 | 14 | 0 | MERGED |
| X1-P05 | research/liner-x1-p05-rule-engine | #481 | 3b2f43a2321962e20f0372a2cb363d2c4a21c13d | 統合 | 0（候補21） | 0 | 11 | MERGED |
| X1-P06 | research/liner-x1-p06-integration | #482 | （X1-P06 merge後に入力） | 統合 | 0 | 0 | - | MERGED |

累計: Rules 58 / FACT 55 / INFERENCE 2 / UNRESOLVED 1 / STANDARD_TO_LINER 22 / PROJECT 12 / ROAD_TO_BRIDGE 14 / Candidates 21

## 確認事項

- 全PR base = research/liner-r1-planning（mainへのPRなし）
- 各Stepはintegration branch最新から派生
- 各PR本文冒頭に `DO NOT RETARGET TO MAIN` を記載
