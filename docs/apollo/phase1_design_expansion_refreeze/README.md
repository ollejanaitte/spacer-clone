# Apollo Phase 1 設計機能拡張 再凍結

**Status:** DESIGN / RESEARCH FREEZE  
**Date:** 2026-08-01  
**Baseline:** `1fbcb3ea804f965b8f262284573f4f4d42dc2411`  
**Scope:** 非合成RC床版鋼鈑桁橋（多主桁）の設計・製図・計算書機能拡張  
**Implementation authorization:** NOT GRANTED by this document

## 目的

3D表示完了後のApolloについて、主桁、RC床版、横桁・対傾構・横構、補剛材、添接、鋼重、疲労、図面、設計計算書までの機能を一括で実装し始めるのではなく、設計対象、データ境界、解析との接続、成果物、依存関係、未確定事項を再整理して凍結する。

本再凍結は次を保証する。

- 現在の3D表示・解析連携を壊さない。
- 非合成桁に合成桁の設計仮定を混入させない。
- 設計基準、材料定数、荷重値、照査式が未採用の状態で数値PASSを出さない。
- 画面、解析モデル、設計照査、図面、計算書を同一データから追跡可能にする。
- 実装を小さなPRに分割し、各段階で検証できるようにする。

## 正本

- `scope_and_architecture_freeze.md`: 対象範囲、設計ワークフロー、データモデル、禁止事項
- `implementation_sequence.md`: 実装PRの推奨順序、依存関係、完了条件
- `manual_traceability.csv`: APOLLOマニュアル機能と本計画の対応
- `local_verification_plan.md`: ローカル環境で行う必須検証、コマンド選定方針、記録方法、合格条件

## ローカル検証

GitHub上の文書だけで再凍結完了とは判定しない。マージ前に `local_verification_plan.md` のLV-01〜LV-08をローカル正本で実施し、対象SHA、コマンド、exit code、PASS/FAIL、残課題をGit管理された検証レポートへ保存する。

## 結論

次の実装開始点は数値設計ではなく、**設計エンティティと編集・表示の構造化**とする。

最初の実装候補は以下。

1. 主桁断面・床版・床組・補剛材・添接の型と永続化
2. 3D表示部材と設計エンティティのID対応
3. 解析結果を設計部材へ戻す読み取りモデル
4. NOT_AUTHORIZED / INCOMPLETE / READY / RUNNING / OK / NG / WARNING / STALE / ERROR の判定状態（`scope_and_architecture_freeze.md` §5.5 と同一）
5. 非権威プレビューとしての標準断面・配置図

採用基準、荷重、材料、許容値、抵抗値、疲労等級、溶接・ボルト条件が採択されるまでは、自動断面決定および正式な数値照査を禁止する。
