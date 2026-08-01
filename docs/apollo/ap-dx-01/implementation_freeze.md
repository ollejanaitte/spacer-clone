# AP-DX-01 — 設計エンティティ契約 実装凍結

**Status:** READY_FOR_LOCAL_IMPLEMENTATION  
**Date:** 2026-08-01  
**Base:** `main` at `cb6084ba0bcfd7dd3d4999b964e5c8f25c77cabe`  
**Scope:** 非合成RC床版鋼鈑桁橋（多主桁）  
**Numeric design authorization:** NOT_GRANTED

## 1. 目的

Apollo Phase 1 の設計データ正本である `BridgeSuperstructureDesignDocument` を、主桁、床版、床組、補剛材、添接、床版接合要素まで追跡可能な契約へ拡張する。

本タスクは型、schema、validation、round-trip、stable ID、unknown/placeholder保持の実装に限定する。正式な強度照査、自動断面決定、自動最適化、設計基準値の採用は行わない。

## 2. 対象ファイル候補

実装前にリポジトリ実態を確認し、必要最小限に限定する。

- `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`
- `frontend/src/contracts/runtime/schemas/bridgeSuperstructureDesignDocument.ts`
- `frontend/src/contracts/runtime/parsers.ts`
- `frontend/src/contracts/__tests__/bridgeSuperstructureDesignDocument.test.ts`
- 必要なexport barrel
- 必要なschema fixture

Apollo UI、3D renderer、backend、IF3、解析コードは本PRの対象外とする。

## 3. 既存契約との関係

既存の次の型・規則を再利用し、二重実装しない。

- `UuidString`
- `GovernedQuantity`
- `Provenance`
- `DocumentReference`
- `Extensions`
- `ValidationResult`
- `TargetStandardStatus`
- schema identity / version registry

既存 `BsddBridge`、`BsddDeck`、`BsddGirderLine`、`BsddMaterialDefinition`、`BsddAnalysisBinding` は破壊的に置換しない。後方互換性を確認しながら追加境界を設計する。

## 4. 必須エンティティ

最低限、次を契約上表現できること。

- `MainGirder`
- `GirderSectionSegment`
- `RcDeck`
- `Haunch`
- `CrossBeam`
- `SwayBracing`
- `LateralBracing`
- `BraceMember`
- `Stiffener`
- `Splice`
- `DeckAnchorage`

各エンティティは、少なくとも次を保持する。

- stable ID
- revision
- provenanceまたはsource reference
- geometry reference
- analysis mapping placeholder
- design status
- adoption status
- extensionsまたはunknown保持境界

## 5. 共通状態

数値未採択時の状態をfail-closedで扱う。

- `NOT_AUTHORIZED`
- `INCOMPLETE`
- `READY`
- `STALE`
- `OK`
- `NG`
- `WARNING`
- `ERROR`

このPRで数値照査を実装しないため、入力だけから `OK` を生成してはならない。

## 6. 非合成規則

次を契約とvalidatorで明確にする。

- `compositeAction = false`
- RC床版を主桁剛性・断面耐力へ加算しない
- `compositeShearConnector` はPhase 1で禁止
- `DeckAnchorage` は合成作用とは独立した接合要素
- `DeckAnchorage` の数値照査状態は、基準採択まで `NOT_AUTHORIZED`
- unknown connector kindを暗黙にcomposite connectorへ変換しない

## 7. null・unknown・placeholder規則

- 未入力数値を0や推測値へ変換しない
- `null` は未入力・未採択として保持する
- unknown fieldは既存のunknown保持機構に従う
- parserは既知でない値を黙って破棄しない
- migrationが必要な場合は別タスクとして明示し、本PRで無断実施しない

## 8. stable ID規則

- UUID形式を使用する
- entity IDは保存・再読込後も不変
- 配列indexを永続IDとして使用しない
- 参照先が欠落した場合はvalidator error
- 重複IDはvalidator error
- geometry / analysis参照はnullable placeholderを許容するが、存在しないIDを有効扱いしない

## 9. schema・parser規則

- TypeScript型、JSON Schema、runtime parserを同時に更新する
- schema version変更の要否を実装前に判定する
- version変更が必要ならcontract registryとmigration方針を先に提示し、勝手にversion bumpしない
- parse → serialize → parse のround-tripで情報を失わない
- current fixtureを壊さない

## 10. validator要件

最低限、次を検出する。

- ID形式不正
- 重複ID
- 欠落参照
- revision不正
- 非合成規則違反
- composite connector混入
- entity typeとrequired fieldの不整合
- null許容境界違反
- adoption statusとdesign statusの矛盾

validatorは未採択数値を理由に文書全体を虚偽の有効状態へしない。

## 11. 必須テスト

- schema validation
- parser round-trip
- stable ID保持
- duplicate ID拒否
- dangling reference拒否
- unknown / placeholder保持
- null数値保持
- composite connector拒否
- `DeckAnchorage` の非合成独立性
- `NOT_AUTHORIZED` fail-closed
- existing BSDD fixture非回帰
- typecheck
- lint
- production build

実在するコマンドのみをリポジトリから特定して実行する。

## 12. 非対象

- Apollo UI
- 3D ID binding
- 断面編集画面
- 解析モデル生成
- IF3変更
- backend変更
- 正式設計式
- 材料定数・荷重値・許容値
- 自動最適化
- 図面・計算書実装

## 13. ローカル実装ゲート

ローカル実装は次を満たしてから開始する。

1. `/home/masaharu/Projects/spacer-clone` のみを使用
2. 最新 `main` と `origin/main` の一致
3. clean worktree
4. 新しい専用branchを作成
5. Cursor CLI Autoモードへ実作業を委任
6. 1目的1commit、各commit後push
7. 中断・終了時に `final_report.txt` 更新

## 14. 完了条件

- 対象エンティティの契約が追加される
- TypeScript型、schema、parser、validatorが一致する
- 非合成規則がfail-closedである
- round-tripで情報損失がない
- stable IDと参照整合性が検証される
- 数値未採択時に `OK` を生成しない
- 対象テスト、typecheck、lint、buildがPASS
- application UI、3D、IF3、backendに変更がない
- `final_report.txt` が更新される
- PRはレビュー可能だが、ユーザー承認なしにmainへマージしない

## 15. 次工程

AP-DX-01完了後、AP-DX-02で3D部材と設計エンティティのstable ID bindingへ進む。
