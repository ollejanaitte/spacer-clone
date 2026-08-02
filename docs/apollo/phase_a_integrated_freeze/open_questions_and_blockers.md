# Phase A Open Questions and Blockers

**Authority:** Phase A integrated freeze
**Updated:** 2026-08-02 (Step A0)

## 方針

- 不足資料を推測で補わない。
- 資料不足・根拠不足は失敗ではなく `BLOCKED` として記録する。
- 未実施検証を PASS と記録しない。
- このファイルは各 Step の終了時に更新する。

## オープン項目

| ID | カテゴリ | 内容 | 影響 | 状態 | 再開条件 |
|----|----------|------|------|------|----------|
| PA-OQ-001 | 道示条文 | 道示 R7 (I〜V) は画像エクスポートPDFのみで、テキスト層なし。条項・表番号の目視確認が未実施。 | 条文マッピング・式・係数の採択が不可能 | BLOCKED | 人間による目視確認（または許可済み検索可能版の入手） |
| PA-OQ-002 | ライセンスPDF所在 | 外部ライセンスPDFの参照パス `/home/masaharu/Projects/bridge-standards-research/260726_設計基準/` が現環境に存在しない。ローカルコピーは `local-archive/restricted-pdf/bridge-standards/260726_設計基準/` に存在。 | 参照整合の確認 | BLOCKED | 参照先を実在パスへ修正し、DS-01 レジスタとの整合を確認 |
| PA-OQ-003 | JIS | JIS 番号が 1 件も確定していない（JIS-001..034 全 BLOCKED）。材料強度・鋼種の確定に必須。 | 材料規格の採択不可 | BLOCKED | ライセンスJIS一次資料の取得と人間確認 |
| PA-OQ-004 | 正誤表反映 | 2026-03-31 正誤表の電子/紙未反映項目の内容把握が未実施。 | 版・正誤表の最終確定 | BLOCKED | 公式正誤表PDFの内容確認 |
| PA-OQ-005 | 設計計算例 | 非合成RC床版鋼鈑桁（多主桁）の道示R7対応の正式計算例がローカルに存在しない。現存する計算例は合成桁・箱桁（H29対応）のみ。 | 検証ケース・式の照合根拠が不足 | BLOCKED | 正式計算例の入手、または独立検算資料 |
| PA-OQ-006 | 独立計算結果 | 独立機関・ツールによる計算結果（analytical golden / external machine evidence）が未取得。 | validation case の独立証跡が不足 | BLOCKED | EA-03 外部実行パッケージの実行 |
| PA-OQ-007 | phase1_design_expansion_refreeze | `decision_log.md` と `open_questions_and_blockers.md` が同ディレクトリに存在しない。 | 既存再凍結の完全性 | BLOCKED | 既存文書の内容から作成するか、作成状況の確認 |
| PA-OQ-008 | 単位体積重量 | VVS02 のユーザー入力単位重量（steelUnitWeight / rcUnitWeight）を正式値へ昇格しない。正式値は道示採択を待つ。 | 鋼重・死荷重の数値根拠 | DEFERRED | 道示 II / III の材料値採択 |
| PA-OQ-009 | 解析方式 | 主桁・床組・ブレースの解析モデル化（荷重分配・剛域・偏心等）の方式が未決定。 | 04_analysis_model_rules.md の一部が BLOCKED に | BLOCKED | A4 にて既存 IF3・solver を調査し決定 |
| PA-OQ-010 | 旧Apollo版 | 旧Apolloマニュアルの版・発行年が不明。 | 機能構成の参考に留める | BLOCKED (参考として REFERENCE_ONLY) | 版確定は数値根拠としては不要 |

## ブロッカーサマリ（Step A0 時点）

- 道示 R7 の条文目視確認: BLOCKED
- JIS 規格番号: BLOCKED
- 独立計算結果: BLOCKED
- 非合成鋼鈑桁の R7 対応正式計算例: BLOCKED
- 外部ライセンスPDF参照パスの整合: BLOCKED

## 次 Step での対応

- A1 (基準・版・適用範囲): 既存 DS-01 target_standard_freeze を統合し、上記ブロッカーを保持。
- A2 (材料・単位・係数): 既存 DS-03 を統合。材料値は全 BLOCKED を維持。
- A3 (荷重・組合せ): 既存 DS-04 を統合。荷重値・係数は全 BLOCKED を維持。

## A8 時点の状態（2026-08-02）

- A0..A7 の成果物（00..09・README・decision_log）はすべて main へマージ済み。数値・式・係数は全 BLOCKED を維持し、Phase B 実装許可は 08_numeric_authorization_gate.md の全セル NOT_AUTHORIZED のまま。
- PA-OQ-001..010 は未解決のまま残る（Phase B の解除条件として 08 §4 に引き継ぎ）。
- PA-OQ-002（外部参照パス）は実在パス `local-archive/restricted-pdf/bridge-standards/260726_設計基準/` に記録済みで継続監視。
