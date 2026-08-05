# 02 — Report Purpose and Classification

> **Authority:** Phase 2-B (specification freeze)
> **Base:** Phase 1 `05_current_output_capability.md`, `07_numeric_authorization_boundary.md`, `08_gap_analysis.md`.

## 1. 帳票の正式分類

| 分類 | ラベル | 定義 | 本 Phase 2 で該当 |
|------|--------|------|------------------|
| A | 非数値帳票 (Non-numeric report) | 入力条件・構造モデル・警告を確認する。数値設計判定をしない。 | **YES — 本帳票** |
| B | 入力条件確認帳票 (Input condition confirmation) | ユーザー入力値・BSDD 反映状態・STALE を確認する。 | **YES (サマリー/詳細の一部)** |
| C | 構造モデル確認帳票 (Structure model confirmation) | BSDD SDM / 3D 生成状態・ソリッドの存在・validation を確認する。 | **YES (サマリー/詳細の一部)** |
| D | 将来の数値設計計算書 (Future numeric design calc doc) | 解析結果・断面力・反力・照査比・加味判定を含む正式帳票。 | NO — 未実装 (U-01/U-02) |
| E | 現時点で生成禁止の帳票 (Forbidden at this stage) | formal PDF, continuous design drawings, numeric design calc book | YES — 正式 PDF・詳細設計計算書は **E** |

> ■ **決定:** 現段階の帳票は **A+B+C**（非数値確認帳票）と分類する。D（数値設計計算書）は **U-01/U-02** 未実装ギャップの将来の到達物。E は現時点 **生成禁止** (`assertFormalReportRejected`, `artifactBundle.ts:235 unsupportedScope`, §4 U-04/U-05)。

## 2. 正式名称

| 分類 | 推奨正式名称 | 補注 |
|------|------------|------|
| 本帳票 (A+B+C) | **連続橋入力条件・構造モデル確認書** | 正式名称。「設計計算書」とは区別する。 |
| 将来 (D) | 連続橋設計計算書 | 解析結果・照査判定を含む。Phase 5/6 到達。 |
| 禁止 (E) | （生成禁止） | formal PDF, continuous design drawings |

> ■ **「設計計算書」の使用条件:** 現段階で「設計計算書」という語を **使用しない**。parse 結果を含むため、利用者は数値解析済みと誤認する可能性があるため。当面は「確認書」「確認レポート」とする。将来 D に昇格した時点で初めて「設計計算書」という名称を許容する（条件: 解析結果バインド U-01 実装 + DS-09 cell が GRATED）。

名称候補への評価:

| 候補 | 評価 | 決定 |
|------|------|------|
| 連続橋入力条件確認書 | B だけ。C(構造モデル)を欠く。 | 不採用 |
| 連続桁構造モデル確認書 | C だけ。B(入力条件)を欠く。 | 不採用 |
| 連続橋設計条件確認レポート | 「設計」語が D(設計計算書)と混同しやすい。 | 不採用 |
| **連続橋入力条件・構造モデル確認書** | B+C を包含。「設計計算書」非使用。 | **採用** |

## 3. 値の種別の明確な区別

帳票は以下の値の種別を**明示的に区別**して出力する。種別ラベルは `value_kind` フィールド（将来 Report Model 必須）として凍結。

| 種別 | 定義 | データソース | 本帳票での扱い |
|------|------|--------------|----------------|
| 入力値 (input) | ユーザーがドラフトに入力した値 | `apolloBridgeStructureInput` (`draft.*`) | 出力可 (未承認) |
| 保存値 (stored) | 保存された project.json sidecar | `importExport.ts` 入出力 | 出力可 (未承認) |
| 表示値 (display) | 3D/STL に反映された geometry パラメータ | `solidGeometryParameters` (`bridgeStructureSolids.ts`) | 出力可 (未承認) |
| 3D生成値 (generated_geometry) | BSDD SDM から生成されたソリッド | `apolloBsdd.structuralDesignModel` | 出力可 (未承認) |
| 解析結果 (analysis_result) | FEM 解析の反力/断面力/たわみ | `app/reports.py` (linear IF3) / `apolloPhase1Unit2` | **NOT_AVAILABLE / NOT_BOUND** (U-01) |
| 設計照査結果 (design_check) | 曲げ/せん断/安定/たわみ/疲労の合否 | DS-09 部材・照査セル | **NOT_AUTHORIZED** (U-06, DS-09) |
| 承認済み設計値 (adopted) | ADOPTED 数値 | `adoption.ts` (ADOPTED path) | **Not present** (fail-closed, U-06) |

> ■ **原則:** `value_kind` が `analysis_result`/`design_check`/`adopted` の値は **現時点で帳票に現れない**（= `NOT_AVAILABLE` / `NOT_AUTHORIZED`）。将来 Phase 5/6 でバインドされた時のみ D（設計計算書）へ昇格。

## 4. 帳票目的

| 観点 | 内容 |
|------|------|
| 誰が使うか | 設計者 / 監査者 / Phase 2/3 実装担者 |
| いつ使うか | BSDD 生成直後 (non-STALE) の事前確認、および将来実装検証の正本 |
| 何を確認するか | (B) 入力値の一致性・STALE 状態 / (C) SDM・3D 生成状態・validation 結果 / (A) 警告・未承認状態 |
| 何を保証しないか | 数値設計の正確性・照査合否・承認を **全く保証しない** |
| 正式成果品として扱えるか | **いいえ** — `UNVERIFIED DEVELOPMENT OUTPUT` / `PROHIBITED` (`artifactBundle.ts:228-229`) |
| 将来の数値設計計算書との関係 | 章 ID とデータソースを共有する。将来 `analysis_result`/`design_check` をバインドして D へ昇格する。 |

## 5. 分類の実装対応（コード)

| 分類 | 実装コード | 証拠 |
|------|------------|------|
| A/B/C (confirmation) | `reportModel.ts` CH-COVER/DESIGN-COND/STRUCTURE/INPUTS/CHECKS-section, CH-WARNINGS | `reportModel.test.ts:28-40` |
| D (future numeric) | 未実装 (CH-REACTIONS/SHEAR/MOMENT/DEFLECTION = NOT_AVAILABLE) | `reportModel.ts:238,243,248,253` (U-01) |
| E (forbidden) | `assertFormalReportRejected`; `artifactBundle.ts:235 unsupportedScope` | `reportExport.ts:66`; `artifactBundle.ts:175-178,235-239` |

## 6. 変更管理

- A/B/C クラスの**目的・名称**は Phase 2 で凍結。実装変更なし。
- D クラスの名称「design calculation document」の **予約**はするが、実体は Phase 5/6 で到達。
- 分類表は将来 `ImplementationAuthorization` が `AUTHORIZED` になったセルについて **変更管理手続き** (DEC-PHA-xxxx) を経て更新する。

## 7. 次節への引き

- 章構成 (§3) は分類 A/B/C を前提とし、D 章は `NOT_IMPLEMENTED` として明示する (Phase 2-C)。
- 出力許可マトリクス (§6) は `value_kind` と分類に沿って 16 状態で凍結する (Phase 2-F)。

## 8. 状態

- HEAD: f38c0a1. local == origin/main. clean.
- 本節確定: classification A+B+C (non-numeric confirmation), D future, E forbidden; formal name = 連続橋入力条件・構造モデル確認書。
