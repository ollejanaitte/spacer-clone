# FINAL VERIFICATION — Source vs Sample Input Comparison Matrix

> **Authority:** Reference Bridge 001 (RB-S10-001) — 最終動作検証
> **原本:** `鋼鈑桁橋_設計計算例.pdf`（SRC-003, sha256 da6ab70…, 2226p）/ `鋼鈑桁橋_図面例.pdf`（SRC-002, sha256 77718e3…, 143p）
> 原本はローカル `/home/masaharu/Projects/鋼鈑桁橋_*.pdf` に存在し、SHA-256 は source manifest と一致（SOURCE_CONFIRMED）。
> **判定:** PASS = tolerance 内 / WARN = 既知・非blocking差異 / NOT_VERIFIABLE = 根拠不足・比較不能 / NOT_AUTHORIZED = 認証前

| # | Source項目 | Source値 (原本) | Sample/ソフト入力値 | 差分 | 単位 | tolerance | source locator | 判定 |
|---|-----------|-----------------|---------------------|------|------|-----------|----------------|------|
| S-01 | 橋長 | 134.001m | bridgeLengthM 134.001 | 0 | m | 0 | 設計計算書 P7 設計条件 / G-GEO-0001 | PASS |
| S-02 | 支間長 | 40.201+51.000+40.200 | spanLengthsM [40.201,51,40.2] | 0 | m | 0 | 設計計算書 P7 / G-GEO-0002..0004 | PASS |
| S-03 | 総幅員 | 8.010m | deckSpecs.widthM 8.01 | 0 | m | 0 | 設計計算書 P7 / G-GEO-0017 | PASS |
| S-04 | 有効幅員 | 7.000m（車道幅） | （Geometry入力に未使用） | n/a | m | - | 設計計算書 P7 | NOT_VERIFIABLE（ソフト入力未使用） |
| S-05 | 主桁 | AG1・AG2 | GIRDER-AG1/AG2 | 0 | - | 0 | 設計計算書 P7 / 図面 | PASS |
| S-06 | 舗装厚 | t=80mm | G-GEO-0019 0.08m | 0 | mm | 0 | 設計計算書 P7 / G-GEO-0019 | PASS（golden 一致） |
| S-07 | 床版厚 | t=230mm | deckSpecs.thicknessM 0.23 | 0 | mm | 0 | 設計計算書 P7 / G-GEO-0018 | PASS |
| S-08 | 斜角 PU15 | θ=94°14′27″（≈4.241° skew） | ソフトは support skew=0（直交） | ~4.241° | rad/deg | - | 設計計算書 P7 | WARN（skew 未モデル化。DEF-07 に帰属） |
| S-09 | 斜角 PR1/PR2/AR2 | θ=90°00′00″ | skew=0 | 0 | - | 0 | 設計計算書 P7 | PASS |
| S-10 | 平面線形 | R=160m ～ R=3000m | 直線（LINER straight ACL） | 曲線→直線近似 | - | - | 設計計算書 P7 | WARN（道路線形接続 DEF-01 により直線近似） |
| S-11 | 縦断勾配 | i=6.000% ～ 0.100% | 解析入力 z=0（フラット） | n/a | % | - | 設計計算書 P7 / G-GEO-0027/28 | NOT_VERIFIABLE（ソフト Geometry 入力未使用） |
| S-12 | 横断勾配 | 5.000/2.000/2.958% | フラット（未入力） | n/a | % | - | 設計計算書 P7 / G-GEO-0029..31 | NOT_VERIFIABLE（同上） |
| S-13 | 主桁高 | 2700mm（中央）/ 2580mm（端部パネル） | 3D 用 depth 2.7m（一定） | 端部 120mm 差 | mm | - | 設計計算書 主桁腹板高表 / G-GEO-0008 | WARN（端部桁高を一定値で近似。3D表示用 declared default） |
| S-14 | 上フランジ幅 | 620mm（断面図） | 3D 用 flangeWidth 0.62m | 0 | mm | 0 | 設計計算書 断面図 / G-GEO-0020 | PASS（golden 一致） |
| S-15 | ウェブ厚 | 14mm（断面） | 3D 用 webThickness 0.014m | 0 | mm | 0 | 設計計算書 / G-GEO-0022 | PASS（golden 一致） |
| S-16 | 材料 | SM520/SM490Y/SM400/SS400 | （Geometry 入力未使用） | n/a | - | - | 設計計算書 P7 | NOT_VERIFIABLE |

## 総括

- PASS 7 項目（橋長・支間・幅員・主桁・舗装・床版・フランジ・ウェブ）。
- WARN 4 項目（PU15 skew・平面曲線近似・端部桁高・支持位置モデル — 全て設計で宣言された簡略化/ deferred に帰属）。
- NOT_VERIFIABLE 5 項目（有効幅員・縦断・横断・材料等 — ソフトの Geometry 入力に未使用）。
- ソフトのサンプル入力値に原本と矛盾する値はない。
