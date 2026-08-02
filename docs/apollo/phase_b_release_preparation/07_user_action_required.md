# Phase A+ — 07 人間作業指示書（User Action Required）

**Authority:** Phase A+（P1 時点で初期化、P2〜P6 で更新）
**Date:** 2026-08-02（P4 更新）
**Model:** DeepSeek V4 Flash（モデル単体で確認不能な作業を文書化）

本ファイルは、DeepSeek（モデル）単体では完了できない人間作業を、対象・確認項目・記入欄・判定方法・再開条件としてまとめる。モデルはこのファイルの内容を捏造・省略せず、人間の確認が完了するまで数値を採択しない。

## 現在の人間作業一覧

| 作業ID | 対象ブロッカー | 作業内容 | 必要資料 | 優先度 | 状態 | 担当 Step |
|--------|----------------|----------|----------|--------|------|-----------|
| UA-P1-01 | PA-OQ-002 | ライセンス PDF の参照パスが実在することを確認（local-archive/restricted-pdf/bridge-standards/260726_設計基準/） | なし（リポジトリ内） | 高 | モデル確認済み・人間最終確認 | P1 |
| UA-P1-02 | PA-OQ-007 | phase1_design_expansion_refreeze に decision_log.md / open_questions_and_blockers.md が**不在**であることを確認し、復元方針を承認 | なし（リポジトリ内） | 高 | モデル確認済み・人間承認待ち | P1 |
| UA-P1-03 | PA-OQ-010 | 旧Apollo マニュアル（unknown-rights）の REFERENCE_ONLY 維持を承認（数値根拠へ昇格しない） | なし | 高 | モデル確認済み・人間承認待ち | P1 |
| UA-P2-01 | PA-OQ-001 | 道示 R7 の条文・表・式の目視確認（02_standard_visual_review_workbook.md の確認票を使用） | 道示 R7 I〜V（restricted-pdf） | 高 | 確認票作成済み・人間確認待ち | P2 |
| UA-P2-02 | PA-OQ-003 | JIS 一次資料の取得と番号確認（03_errata_and_jis_acquisition_plan.md） | ライセンス JIS 一次資料 | 高 | 計画作成済み・人間確認待ち | P2 |
| UA-P2-03 | PA-OQ-004 | 2026-03-31 正誤表の内容確認（03_errata_and_jis_acquisition_plan.md） | 公式正誤表 PDF（road.or.jp） | 中 | URL到達性のみ確認済み・内容確認待ち | P2 |
| UA-P2-04 | PA-OQ-008 | 材料確認票（単位体積重量等）の確認（02_standard_visual_review_workbook.md VR-R7-I-003） | 道示 R7 II/III（restricted-pdf） | 中 | 確認票作成済み・人間確認待ち | P2 |
| UA-P3-01 | PA-OQ-009 | 04_solver_identity_and_physical_contract.md の物理契約（DOF・座標・I/J・符号・部材端力）を設計要件と突合し、正単位荷重プローブ（Phase A A4 §4 の 6 項目）を承認 | なし（リポジトリ内コード・テスト） | 高 | 文書作成済み・人間確認待ち | P3 |
| UA-P3-02 | GATE-NR-02 | 解析器機械証跡の取得（ビルド ID・ライブラリ版・チェックサム・実行記録・再現手順）と、浮動小数点再現性の確認 | 実行環境・証跡保存先 | 高 | 文書作成済み・外部実行待ち | P3 |
| UA-P4-01 | PA-OQ-005 | 非合成鋼鈑桁 R7 正式計算例の入手 or 独立検算資料の作成（05_golden_validation_execution_plan.md §5/§6） | 正式計算例・独立検算 | 高 | 計画作成済み・独立誘導待ち | P4 |
| UA-P4-02 | PA-OQ-006 | EA-03 外部実行パッケージの実行・証跡取得（05_golden_validation_execution_plan.md §9/§10） | 外部実行環境・実行権限 | 高 | 計画作成済み・外部実行待ち | P4 |
| UA-P4-03 | GATE-NR-03 | Golden の独立誘導・承認（GOLD-MG-001..007、07_validation_cases.csv の PASS 化） | 独立誘導成果物・承認者 | 高 | 計画作成済み・独立誘導/承認待ち | P4 |
| UA-P5-01 | PB-RC-A | A（主桁断面諸量・純幾何）の独立表計算/手計算結果の作成・確認・署名（06_first_numeric_release_candidate.md §6。対称・非対称 I 断面の断面積・図心・断面二次モーメント・断面係数。丸め・許容誤差を凍結） | 独立表計算 or 手計算 | 高 | 候補選定済み・独立計算/署名待ち | P5 |

## 記入方法

1. 対象ブロッカーの該当ファイル（確認票・取得計画・実行計画）を開く
2. 確認項目を順に実施し、記入欄（確認者・確認日・確認結果・証跡保存先）を埋める
3. 確認完了後、01_blocker_resolution_register.csv の該当行の resolution_status を更新する決定（DEC-ID）を記録する
4. 数値が採択されるのは、人間確認が完了し、DEC-ID で ADOPTED/GRANTED が明示された後

## 再開条件

- 人間確認が完了したブロッカーから順に、01_blocker_resolution_register.csv を更新し、08_numeric_authorization_gate.md の該当セルを DEC-ID 付きで昇格できる
- 数値・式・係数の採択は、対応する確認票・計画が完了するまで禁止

## P1 時点の見積もり

- リポジトリ内確認（UA-P1-01/02/03）: モデルでほぼ完了。人間は承認のみ（各 1 分程度）
- 道示目視（UA-P2-01）: 主桁断面諸量・曲げ・せん断・たわみを優先。作業時間は人間の目視速度に依存
- JIS 取得（UA-P2-02）: ライセンス資料の入手が必要。外部調達
- 独立計算（UA-P4-01/02）: 外部実行環境・独立機関が必要。別途調整
- 解析器契約確認（UA-P3-01/02）: コード・テスト観察はモデルで完了。人間はプローブ承認と機械証跡取得
