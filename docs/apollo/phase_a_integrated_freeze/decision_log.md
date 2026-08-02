# Phase A Decision Log

**Authority:** Phase A integrated freeze
**Start:** 2026-08-02
**Repository:** /home/masaharu/Projects/spacer-clone
**Model:** DeepSeek V4 Flash (SINGLE_MODEL_FULL_EXECUTION)

Phase A の決定記録。既存 DS-00〜DS-09 の DEC-DS00-0001 等は書き換えない。本ログは Phase A の統合作業上の決定のみを記録する。

| DEC-ID | Date | Step | Decision | Status | Notes |
|--------|------|------|----------|--------|-------|
| DEC-PHA-0001 | 2026-08-02 | A0 | Phase A は既存 DS-00〜DS-09 / EA / POST-EA-01 / phase1_design_expansion_refreeze / AP-DX-01 / VVS01/02 を統合・再凍結する。既存の決定を書き換えない。 | ADOPTED | 新規に数値を捏造せず、既存レジスタへ参照整合する。 |
| DEC-PHA-0002 | 2026-08-02 | A0 | 数値・式・係数の採択状態は DS-00 adoption_status_model の語彙（ADOPTED / ADOPTED_WITH_CONDITION / BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT / REFERENCE_ONLY / NOT_APPLICABLE / OUT_OF_SCOPE 等）を Phase A でも維持する。 | ADOPTED | 一部揃っても全体を一括 GRANTED にしない。 |
| DEC-PHA-0003 | 2026-08-02 | A0 | 数値実装許可は部材・照査単位で管理する。未採択項目は NOT_AUTHORIZED。 | ADOPTED | 08_numeric_authorization_gate.md で定義。 |
| DEC-PHA-0004 | 2026-08-02 | A0 | 各 Step (A0〜A8) ごとに専用ブランチを作成し、PR を main へマージする。次 Step は最新 main から開始する。 | ADOPTED | 巨大 PR1本 にしない。 |
| DEC-PHA-0005 | 2026-08-02 | A1 | Phase A の対象基準・版・正誤表は DS-01 の採用基準（道路橋示方書・同解説 令和7年改訂版 / Ver2.00 + 2026-03-31 正誤表 overlay）をそのまま採用し、再凍結する。 | ADOPTED | 01_standard_scope_freeze.md に反映。 |
| DEC-PHA-0006 | 2026-08-02 | A1 | Phase A の適用範囲は DS-00 / phase1 再凍結の IN/OUT をそのまま踏襲する。Phase 1 では耐震・疲労照査・下部構造本体は OUT、疲労はデータ境界のみ定義する。 | ADOPTED | 01_standard_scope_freeze.md に反映。 |
| DEC-PHA-0007 | 2026-08-02 | A2 | Phase A の材料物性・単位系・係数の統合は DS-03 のレジスタ/ポリシー（44行、数値 0 採択、文書固有単位保存）をそのまま採用する。数値は BLOCKED を維持し、捏造しない。 | ADOPTED | 02_materials_units_factors.md に反映。 |
| DEC-PHA-0008 | 2026-08-02 | A2 | 荷重側部分係数は DS-04 レジスタ（LF-DS04-001..010、全 BLOCKED）、抵抗側係数は DS-05 を参照する。数値実装許可は A7 の NOT_AUTHORIZED ゲートで部材・照査単位に管理する。 | ADOPTED | 02_materials_units_factors.md に反映。 |
| DEC-PHA-0009 | 2026-08-02 | A3 | Phase A の荷重・組合せ統合は DS-04 レジスタ（LM-DS04-001..014 / LF-DS04-001..010 / 汎用組合せシェル / SX-DS04-001..005）をそのまま採用する。荷重同一性・分布・数値・係数は BLOCKED を維持し、捏造しない。 | ADOPTED | 03_loads_and_combinations.md に反映。 |
| DEC-PHA-0010 | 2026-08-02 | A3 | 動的影響は LF-DS04-010 が唯一の数値オーナー、LM-DS04-007 はポインタのみ。組み合わせ成分に含めず二重適用しない。地震・疲労・架設段階は OUT_OF_SCOPE、施工時荷重は FUTURE_PHASE を維持する。 | ADOPTED | 03_loads_and_combinations.md に反映。 |
