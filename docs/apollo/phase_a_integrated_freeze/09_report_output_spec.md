# Phase A — 09 計算書出力仕様 凍結

**Authority:** Phase A integrated freeze (A7)
**Date:** 2026-08-02
**Step:** A7 — 検証・計算書・許可ゲート
**Integration base:** phase1_design_expansion_refreeze `scope_and_architecture_freeze.md` §9（ReportModel）・`implementation_sequence.md` AP-DX-20・DS-06（解析結果の正本性）・DS-09（出力許可ゲート）
**Adoption vocabulary:** DS-00 と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**計算書出力仕様**を再凍結する。既存 phase1 再凍結の決定を書き換えず、参照整合を保持する。

**Phase A の方針:** 画面 HTML を直接印刷して正式計算書にしない。計算結果と根拠を構造化してから PDF 等へ変換する（phase1 §9 と同一）。未採択の照査・数値は出力しない。

---

## 1. 計算書モデル（ReportModel）

phase1 再凍結 §9 の ReportModel 章構成をそのまま採用する。

```text
ReportModel
  ├─ 設計条件
  ├─ 構造概要
  ├─ 材料
  ├─ 荷重
  ├─ 解析条件・結果
  ├─ RC床版
  ├─ 主桁
  ├─ 床組
  ├─ 補剛材
  ├─ 添接
  ├─ たわみ・剛比
  ├─ 疲労
  ├─ 鋼重
  ├─ 図面
  └─ 監査記録
```

各章は chapter registry（AP-DX-20）で管理し、章の追加・欠落・順序を検証可能にする。

## 2. 出力可否（authorization）の規則

計算書に**数値結果・照査判定を出力できるのは、08_numeric_authorization_gate.md で `GRANTED` となった部材・照査のみ**。

- 未採択（`NOT_AUTHORIZED`）の部材・照査は、該当章に「未許可」状態を明示し、数値・照査比を出力しない。
- 疲労は `OUT_OF_SCOPE` のため、データ境界（入力枠）のみ記録し、疲労照査数値は出力しない。
- 解析結果（変位・断面力）の出力は解析器の正本性（DS-06 / AN-BLK-004）を満たした場合のみ。プローブ未通過の結果は出力しない。
- 数値・係数・許容値はすべて 06_formula_registry.csv / DS レジスタの採択済み ID を参照し、出所のない値を出さない。

## 3. 出力内容の構造

| 章 | 必須要素 | 数値出力条件 |
|----|----------|--------------|
| 設計条件 | 橋種・適用基準（DS-01）・適用範囲（A1）・単位系（A2） | 常時 |
| 構造概要 | 全体構成・断面候補・配置（stable ID で追跡） | 常時 |
| 材料 | 鋼種・コンクリート・鉄筋・係数（DS-03 / A2 参照） | 採択済み値のみ。未採択は「未許可」 |
| 荷重 | 荷重モデル・組合せ（DS-04 / A3 参照） | 採択済み値のみ。未採択は「未許可」 |
| 解析条件・結果 | 解析モデル生成規則（A4）・変位/断面力 | 正本性確認済みの結果のみ |
| RC床版 | 照査項目・中間値・判定根拠（MT-050..053） | GRANTED セルのみ |
| 主桁 | 照査項目・中間値・判定根拠（MT-070..072） | GRANTED セルのみ |
| 床組 | 横桁・対傾構・横構（MT-100..103） | GRANTED セルのみ |
| 補剛材 | 支点上・中間・水平（MT-110..112） | GRANTED セルのみ |
| 添接 | ボルト配置・照査（MT-080..082） | PHASE1_REFERENCE、正式照査後のみ |
| たわみ・剛比 | たわみ・キャンバー（MT-090..091） | GRANTED セルのみ |
| 疲労 | データ境界のみ（荷重・応力範囲・detail category 入力枠） | OUT_OF_SCOPE、数値出力なし |
| 鋼重 | 概算・実鋼重（MT-120..121） | 採択済み割増係数のみ |
| 図面 | 標準断面・配置図（Drawing Semantic Model と共通 ID） | 常時（配置情報） |
| 監査記録 | 計算履歴・チェックサム・リビジョン・警告/エラーインデックス | 常時 |

## 4. 計算プロセスと監査（AP-DX-20 との整合）

- **chapter registry:** 章の存在・順序・必須要素を検証（semantic snapshot テスト）。
- **calculation audit:** 入力・中間値・判定根拠・採用式 ID を記録。根拠のない数値を監査記録に含めない。
- **warning/error index:** STALE 状態・未許可照査・未採択値を警告として集約。
- **figure embedding:** 図・配置・断面を計算書へ埋め込む場合は stable ID で追跡。
- **revision and checksum:** リビジョン履歴とチェックサムを計算書に付与。
- **controlled PDF:** 構造化出力から PDF へ変換（画面印刷を正本としない）。

## 5. 変更・再解析・STALE 規則（phase1 §10 との整合）

- ソース（入力・基準・式・係数）が変更されたら、該当結果は STALE として再解析・再照査を要求する。
- STALE 状態の計算書章は出力ブロック対象（NEGATIVE テストで拒否を確認、VC-NEG-001）。
- 計算書と解析結果の同時更新を保証し、結果と根拠の不一致を出力しない。

## 6. 出力対象外・禁止事項

- 未採択の照査式・係数・許容値・抵抗値の出力。
- 画面例・サンプル値・旧 Apollo 仮定値を正式計算書値として出力。
- 疲労照査数値・地震照査数値（Phase 1 OUT_OF_SCOPE）。
- 出所不明の数値を正式根拠として引用。

## 7. A7 検証（Self-check）

| Check | Result |
|-------|--------|
| ReportModel 章構成が phase1 §9 と一致 | PASS |
| 出力可否が 08 許可ゲートと連動（未採択は未許可） | PASS |
| 疲労をデータ境界のみ・OUT_OF_SCOPE で扱う | PASS |
| 画面印刷を正式計算書にしない（構造化→PDF） | PASS |
| STALE・警告・チェックサム・リビジョン要件を保持 | PASS |
| 数値・式・係数を捏造していない | PASS |
| 既存 phase1 再凍結 / DS の決定を書き換えていない | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 未完の TODO / TBD なし | PASS |
