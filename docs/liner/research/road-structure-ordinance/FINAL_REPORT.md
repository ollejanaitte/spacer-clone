# Road Structure Ordinance TOC Reverse Engineering
# Final Report

本報告書は、`道路構造令の解説と運用（令和3年3月）`PDFの**目次リバースエンジニアリング**フェーズの最終報告である。

---

## 1. Executive Summary

- 情報源PDFを特定し、SHA256・ページ数等を記録した。
- 目次ページ（PDF 6〜11）を特定し、OCR（RapidOCR）で全文を抽出した。
- 目次を3ブロック（法令本体 / 施行規則 / 参考）＋3編（Ⅰ総説・Ⅱ計画設計の考え方・Ⅲ道路の構造）
  に階層化し、**346項目**の機械可読インデックスを作成した。
- ソフトウェア開発観点の仮分類（232項目）、LINER関連度の仮評価、Rule Engine候補（23件）、
  実案件（西知多道路・東海JCT）との接続候補を整理した。
- 本文解析優先順位（Priority A/B/C・Phase RO-1〜10）と次フェーズ計画を作成した。
- 実装・Git操作・上部工環境変更は一切行っていない。

## 2. Source PDF

| 項目 | 値 |
| --- | --- |
| ファイル名 | 道路構造令の解説と運用_令和3年3月.pdf |
| 絶対パス | ~/Projects/道路構造令の解説と運用_令和3年3月.pdf |
| サイズ | 227,041,364 bytes |
| 出版 | 令和3年3月31日（改訂版第1刷, 公益社団法人日本道路協会） |

候補は1件のみ発見（`find ~/Projects` により確定）。

## 3. Source Integrity

- SHA256: `a6838c6f4f584aa0122366b3ab9bf1d171cf2f82bfc7ed7c24da085b256a5e67`
- ページ数: 385（PDF物理ページ）
- 印刷ページ番号は最大717（主要参考図書フッター `—716—` `—717—` をPDF 383で確認）。
- 本PDFはスキャン画像PDF（テキスト層なし）。`pdftotext -layout` で0文字出力を確認。

## 4. TOC Extraction Method

優先順位に従いOCRを最後の手段として利用（テキスト層が無いため）。

1. `pdfinfo` → ページ数・メタデータ確認
2. `pdftotext` → テキスト抽出不可（0文字）を確認
3. `pdftoppm`（150dpi）で目次候補ページを画像化
4. **RapidOCR (onnxruntime)** を目次ページ（PDF 6〜11）に限定して適用
5. 2カラムレイアウトに対応した列分割・高解像度再OCRで確認

OCRは目次ページのみ（本文全体にはOCRをかけていない）。

## 5. TOC Page Range

- PDF物理ページ: **6〜11**（6ページ）
- 内訳: p6 目次開始・Ⅰ、p7 Ⅱ(第2〜4章)+Ⅲ(第1〜2章)、p8 Ⅲ(第2章横断面・第3章線形序盤)、
  p9 Ⅲ(第3章線形・第4章平面交差)、p10 Ⅲ(第4章〜第8章)、p11 Ⅲ(第8章〜第10章・主要参考図書)
- PDF 12ページ以降は法令本体（印刷ページ1〜）、PDF 1〜5は表紙・序・まえがき等。

## 6. Chapter Count

- 章（L2）: **17**
  - Ⅰ編（節相当のL2: 1-1〜1-3）= 3
  - Ⅱ編 = 4章
  - Ⅲ編 = 10章
- 編（L1ブロック）: 6（法令本体・施行規則・Ⅰ・Ⅱ・Ⅲ・主要参考図書）

## 7. Section Count

- 節（L3）: **88**
- 項（L4）: **235**
- 合計ノード（L1含む）: **346**

## 8. Hierarchy Summary

- 原文の階層（編/章/節/項）に忠実にツリー化した（`TOC_TREE.md`）。
- 原文に無い階層は追加していない。
- 不確実な見出しは `hierarchy_confidence = LOW/MEDIUM` を付与（23項目）し、
  `HIERARCHY_UNCERTAIN` 相当としてnotes欄に明記した。

## 9. Software-Relevant Chapters

Rule Engine・数値実装に直接関わる章（Priority A）:

- Ⅲ-1 道路の区分と設計速度、設計車両
- Ⅲ-2 横断面の構成
- Ⅲ-3 線形・視距

## 10. LINER-Relevant Chapters

- **P0_DIRECT_CORE（82項目）**: Ⅲ-1（区分・設計速度・車両）、Ⅲ-2（横断）、Ⅲ-3（線形）
- **P1_DIRECT_SUPPORT（95項目）**: Ⅲ-4（平面交差）、Ⅲ-5（立体交差）、Ⅲ-2-13（建築限界）、Ⅲ-8-5（橋）
- **P2_FUTURE（57項目）**: 自転車・歩道・積雪地域・特定車両停留施設等
- **P3_REFERENCE（96項目）** / **P4_OUT_OF_SCOPE（15項目）**

## 11. Road Geometry-Relevant Chapters

- 平面線形: Ⅲ-3-1〜3-8（曲線半径・曲線長・片勾配・拡幅・緩和区間）
- 縦断線形: Ⅲ-3-10〜3-14（縦断勾配・縦断曲線・横断勾配・合成勾配）
- 横断構成: Ⅲ-2（車線・路肩・中央帯・歩道・建築限界）
- 交差点: Ⅲ-4〜5

## 12. Bridge-Relevant Chapters

- Ⅲ-2-13 建築限界（桁下空間照査）
- Ⅲ-8-5 橋、高架の道路等（設計自動車荷重・構造基準）
- Ⅲ-1 設計車両・設計速度（橋梁配置への入力）
- Ⅲ-3 縦断線形（橋梁の縦断・高さ計画）

## 13. Rule Engine Candidates

- 候補数: **23**（RULE-01〜RULE-23, `RULE_ENGINE_CANDIDATES.csv`）
- 全行 `requires_body_review = YES`（本文未確認のため）
- 主な候補: road_class, design_speed, lane_width, shoulder_width, median_width,
  minimum_curve_radius, curve_length, superelevation, widening, clothoid_transition,
  sight_distance, maximum_grade, vertical_curve, cross_slope, composite_grade,
  clearance, intersection_geometry, ramp_geometry, design_vehicle, traffic_volume,
  access_control, snow_region_width, exception_rule

## 14. Existing Road Project Mapping

- 実案件: 西知多道路（東海JCT）道路詳細設計業務（線形計算書161p・設計図168p）
- 接続候補（15件+）: 道路区分・設計速度・曲線半径・曲線長・緩和区間・片勾配・拡幅・
  縦断勾配・縦断曲線・横断勾配・車線幅員・路肩・中央帯・建築限界・立体交差(IC/JCT)・橋梁
- 詳細は `ROAD_PROJECT_MAPPING.md`

## 15. Priority A Chapters

1. Ⅲ-1 道路の区分と設計速度、設計車両
2. Ⅲ-2 横断面の構成
3. Ⅲ-3 線形・視距（3-1〜3-14）

## 16. Priority B Chapters

1. Ⅰ-1-3 用語の定義（データモデル語彙）
2. Ⅱ-3 地域の状況に応じた道路構造
3. Ⅲ-4 平面交差
4. Ⅲ-5 立体交差（IC/JCT・ランプ）
5. Ⅲ-8 土工、舗装、道路構造物（特に8-5 橋・高架）

## 17. Priority C Chapters

- Ⅰ（総説）、Ⅱ（計画設計の考え方）大部分、Ⅲ-2-7〜2-12（自転車・歩道・副道・植樹帯・軌道敷）、
  Ⅲ-6（鉄道）、Ⅲ-7（自転車専用道路等）、Ⅲ-8-1〜8-4（土工・舗装・排水・法面）、
  Ⅲ-9（附属施設）、Ⅲ-10（雑則特例※例外層としてRule Engine設計時は要確認）

## 18. Unknown / Ambiguous Items

| toc_id | 見出し | 理由 |
| --- | --- | --- |
| T003 | Ⅰ 総説（編名） | OCR「Ⅰ 則」。正確な編名は本文要確認 |
| T030 | Ⅱ-2-2-4 空間の道路構造 | タイトルOCR不明 |
| T041 | Ⅱ-3-2-4 渋滞対策 | タイトルOCR不明瞭 |
| T101 | Ⅲ-2-4-3 付加追越車線の構造 | タイトルOCR不明瞭 |
| T155 | Ⅲ-3-1-7 本章の適用 | タイトルOCR不明瞭 |
| T157 | Ⅲ-3-3 曲線半径（節ページ） | ページ番号OCR不能 |
| T235 | Ⅲ-4-7 ラウンドアバウト? | タイトルOCR不可。構成から推定 |
| T251 | Ⅲ-5-4 インターチェンジ等 | タイトルOCR不明瞭 |
| T295〜T299 | Ⅲ-8-4 法面・擁壁等 | タイトルOCR不明瞭 |
| T313 | Ⅲ-9-2-6 交通安全施設 | タイトルOCR不明 |
| T317 | Ⅲ-9-3-2 道路標示? | タイトルOCR不明瞭 |

（hierarchy_confidence = LOW/MEDIUM の23項目すべて）

## 19. Deliverables

`docs/liner/research/road-structure-ordinance/` 配下12ファイル（README.md, SOURCE_INFO.md,
TOC_RAW.txt, TOC_NORMALIZED.md, TOC_TREE.md, TOC_INDEX.csv, SOFTWARE_RELEVANCE_MATRIX.csv,
RULE_ENGINE_CANDIDATES.csv, ROAD_PROJECT_MAPPING.md, BODY_RESEARCH_PRIORITY.md,
NEXT_PHASE_PLAN.md, FINAL_REPORT.md）。

## 20. Recommended Next Phase

`NEXT_PHASE_PLAN.md` 参照。Phase RO-1（道路分類・設計速度）→ RO-3/4（平面線形・片勾配・拡幅・緩和）→
RO-6（縦断）→ RO-2（横断）→ RO-5（視距）→ RO-7（交差点・立体交差）→ RO-8（橋梁連携）→
RO-9（例外）→ RO-10（参考）。**自動開始しない。**

## 21. Non-Implementation Audit

- 変更対象は `docs/liner/research/road-structure-ordinance/**` のみ。
- frontend/backend/tests/desktop/package.json/lock 等の差分なし。
- `git status --short --untracked-files=all` により確認（下記の通り）。
- Git commit/push/PR/merge 未実施。
- 上部工worktree（~/Projects/spacer-clone）は読み取りのみ。既存の3件の変更は外部要因（事前存在）で、当方操作による変化なし。

## 22. Final Verdicts

```
SOURCE_FOUND_VERDICT: PASS  （候補1ファイルを確定）
SOURCE_HASH_VERDICT: PASS   （SHA256記録済み）
TOC_EXTRACTION_VERDICT: PASS（目次ページ6-11をOCRで完全抽出）
TOC_HIERARCHY_VERDICT: PASS （階層化完了。LOW/UNCERTAIN 23項目を明示）
TOC_INDEX_VERDICT: PASS     （346行・16列のCSV）
SOFTWARE_CLASSIFICATION_VERDICT: PASS（仮分類。本文未確認は断定しない）
LINER_RELEVANCE_VERDICT: PASS（仮評価。P0〜P4を付与）
RULE_ENGINE_CANDIDATE_VERDICT: PASS（23件。requires_body_review=YES）
PROJECT_MAPPING_VERDICT: PASS（接続候補15件+を整理）
BODY_RESEARCH_PRIORITY_VERDICT: PASS（A/B/C + Phase RO-1〜10）
PDF_NON_COPY_VERDICT: PASS  （PDF原本をrepo未コピー）
UPPER_WORKTREE_NON_MODIFICATION_VERDICT: PASS（~/Projects/spacer-clone 未変更）
IMPLEMENTATION_NON_EXECUTION_VERDICT: PASS（実装コード変更なし）
GIT_NON_EXECUTION_VERDICT: PASS（commit/push/PR/merge なし）
OVERALL_VERDICT: COMPLETE
```
