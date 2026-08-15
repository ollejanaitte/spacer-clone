# site-context × spacer-clone リポジトリ一本化（統合契約）

> **Authority:** INTEGRATION CONTRACT（P0）
> **Status:** 監査完了・正本決定済み・統合境界確定
> **対象:** site-context-prototype（absorbed）× spacer-clone（canonical）
> **Baseline:** site-context `b2c87ab` / spacer-clone `294f324`

## 概要

- **正本リポジトリは spacer-clone**。site-context-prototype の能力（現況地形・座標系・地形取得・SiteContext/ProjectV2）を spacer-clone の Project Data Core（PDC）へ吸収する。
- モジュール登録数は増やさない。`terrain` モジュール + `metadata` へのマッピングで吸収する。
- 今回（P0/P1）は統合契約・共有interface・schema mapping・テストまでを実施。実データの移行（P2以降）は段階的に行う。

## 文書一覧

| 章 | ファイル | 内容 |
|----|----------|------|
| 00 | [00_unification_decision.md](00_unification_decision.md) | 統合方式A/B/C比較・正本決定 |
| 01 | [01_audit_findings.md](01_audit_findings.md) | 両リポジトリ横断監査サマリ・重複機能一覧 |
| 02 | [02_integration_boundaries.md](02_integration_boundaries.md) | 領域別正本・概念マッピング・No-Change Zone・Phase計画 |
| 03 | [03_adapter_contract.md](03_adapter_contract.md) | Adapter / 共有interface 契約（コード実装と対応） |

## コード実装

| ファイル | 内容 |
|----------|------|
| `frontend/src/next/integration/siteContext/contract.ts` | 共有interface型定義・type guard |
| `frontend/src/next/integration/siteContext/mappingManifest.ts` | 概念マッピング表（正本決定のデータ化） |
| `frontend/src/next/integration/siteContext/__tests__/contract.test.ts` | vitest 14件（既存PDC slot整合検証） |

## 大前提

- spacer-clone の Phase 10/11 FROZEN 境界・Protected Core・`/pro` legacy 参照は**変更しない**。
- spacer-clone の既知 dirty 状態（apollo evidence JSON 3件 / final_report.txt 削除 / R1-04.5 txt）は**保護・不変更**。
- site-context 側の Design Freeze（SCP-DF-2026-08-15-1）は実吸収開始まで**維持**。
- Save/Load・Project Schema・.spacerproj の後方互換を壊す変更は、migration と旧データ読込テストを**先に**実装する。

## Status

| 項目 | 状態 |
|------|------|
| 監査 | COMPLETE（01章） |
| 正本決定 | COMPLETE（00章） |
| 統合境界 | COMPLETE（02章） |
| 共有interface / schema mapping | COMPLETE（03章 + コード・テスト14件） |
| .sitecontext→.spacerproj Importer | PENDING（P2） |
| terrain module 強化（PORT） | PENDING（P3） |
| site-context UI 統合 | PENDING（P4） |
| site-context repo 運用終了 | PENDING（P5） |
