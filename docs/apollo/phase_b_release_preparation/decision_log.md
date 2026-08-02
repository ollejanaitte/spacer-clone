# Phase A+ Decision Log

**Authority:** Phase A+ (Phase B release preparation)
**Start:** 2026-08-02
**Repository:** /home/masaharu/Projects/spacer-clone
**Model:** DeepSeek V4 Flash (SINGLE_MODEL_FULL_EXECUTION)

Phase A+ の決定記録。既存 Phase A（DEC-PHA-0001..0018）と DS-00..DS-09（DEC-DS00-0001 等）は書き換えない。本ログは Phase A+ の作業上の決定のみを記録する。状態変更には新しい decision ID と証拠を付ける。

| DEC-ID | Date | Step | Decision | Status | Notes |
|--------|------|------|----------|--------|-------|
| DEC-PB-0001 | 2026-08-02 | P0 | Phase A+ は Phase A（PR #250..#258）の成果物を上書きせず、参照整合を保持する。数値実装は行わず、ブロッカー整理・人間確認票・独立検証計画・最小セル選定を実施する。 | ADOPTED | README.md / 00_baseline_and_gate_matrix.md に反映。 |
| DEC-PB-0002 | 2026-08-02 | P0 | ブロッカー解除レジスタ 01_blocker_resolution_register.csv を正本とし、各ブロッカーに evidence_required / human_action_required / resolution_status を記録する。状態変更は新しい DEC-ID と証拠を付けて行う。 | ADOPTED | 01_blocker_resolution_register.csv に反映。 |
| DEC-PB-0003 | 2026-08-02 | P1 | ライセンス PDF 参照パスは実在パス local-archive/restricted-pdf/bridge-standards/260726_設計基準/ を正本とする（PA-OQ-002 RESOLVED）。旧Apollo マニュアルは unknown-rights 21 行すべてパス存在を確認し、REFERENCE_ONLY を維持する（PA-OQ-010 RESOLVED）。phase1_design_expansion_refreeze の decision_log/open_questions は実在せず、捏造せず「不在」を記録し、決定情報は既存本文に埋め込まれていることを確認する（PA-OQ-007 PARTIALLY_RESOLVED）。 | ADOPTED | 01_blocker_resolution_register.csv / 07_user_action_required.md に反映。 |
| DEC-PB-0004 | 2026-08-02 | P2 | 道示 R7 目視確認票 02_standard_visual_review_workbook.md と、正誤表・JIS 取得計画 03_errata_and_jis_acquisition_plan.md を作成。道示 PDF（I/II/III/V）は画像スキャンでテキスト層なし（pdfinfo/pdftotext で確認、各 388/821/519/210 ページ）。正誤表 PDF は公式 URL 到達性確認のみ（HTTP 200 / 771KB / application/pdf）、内容抽出・適用は未実施。JIS 34 行は全て合成プレースホルダのまま。PA-OQ-001/003/004/008 は READY_FOR_HUMAN_REVIEW を維持。 | ADOPTED | 02/03 ファイル作成。01_blocker_resolution_register.csv / 07_user_action_required.md に反映。 |
| DEC-PB-0005 | 2026-08-02 | P3 | リポジトリ solver の同一性・物理契約を 04_solver_identity_and_physical_contract.md にコード・テスト観察から凍結。入出力・DOF・座標・要素剛性・荷重・反力・部材端力・IF3 チェックサム/stale・決定性・並行は CONFIRMED_BY_CODE/TEST または PROJECT_SPECIFIC。浮動小数点再現性・単位束縛（AN-BLK-003）・座標/符号外部束縛（AN-BLK-004）・外部解析器契約（AN-BLK-001..）・荷重組合せマッピング（AN-BLK-010）は BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT を維持。PA-OQ-009・GATE-NR-02 は PARTIALLY_RESOLVED 相当（リポジトリ側文書化完了・外部証跡待ち）として READY_FOR_HUMAN_REVIEW 維持。 | ADOPTED | 04 ファイル作成。01_blocker_resolution_register.csv / 07_user_action_required.md に反映。 |
| DEC-PB-0006 | 2026-08-02 | P4 | Golden 独立検証実行計画 05_golden_validation_execution_plan.md を策定。Golden 定義（ANALYTICAL/PARITY/APPROVED_REGRESSION/DESIGN_VERIFICATION）、独立性条件、同一モデル生成値を独立証拠にしない規則、入力 fixture・単位・期待中間/最終値・許容誤差（DS-07 既定: abs(a−e)<=max(A,R·|e|)）、チェックサム・実行環境・ツール・出力ファイル・承認者・再現手順・差分判定・失敗時処理を凍結。最小候補 GOLD-MG-001..007 を定義（数値はプレースホルダ、基準採択待ち）。本計画策定は Golden 承認ではない。PA-OQ-005/006・GATE-NR-03 は READY_FOR_HUMAN_REVIEW 維持、07_validation_cases.csv は全 BLOCKED 維持。 | ADOPTED | 05 ファイル作成。01_blocker_resolution_register.csv / 07_user_action_required.md に反映。 |
| DEC-PB-0007 | 2026-08-02 | P5 | 06_first_numeric_release_candidate.md で候補 A〜H を 8 項目（基準依存/解析器依存/既存実装/独立Golden/誤判定/fail-closed/将来拡張性）で比較し、**A（主桁断面諸量・純幾何）** を FIRST_RELEASE_CANDIDATE に選定。CURRENT_AUTHORIZATION は既存語彙（NOT_AUTHORIZED/CONDITIONAL/AUTHORIZED）に合わせ **NOT_AUTHORIZED**（CONDITIONAL_CANDIDATE は語彙外のため不採用）、GRANTED は行わない。B〜H は正式照査条件不足で BLOCKED 相当。A の GRANTED には独立手計算 Golden（対称/非対称）、丸め・許容誤差凍結、fail-closed/単位変換検証、独立確認者承認、セル単位 GRANTED の DEC-ID が必要。PHASE_B_START_VERDICT: NO_GO_PENDING_INDEPENDENT_GOLDEN。 | ADOPTED | 06 ファイル作成。01_blocker_resolution_register.csv / 07_user_action_required.md に反映。 |
