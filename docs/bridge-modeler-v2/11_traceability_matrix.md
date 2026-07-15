# 11 — Traceability Matrix

Date: 2026-07-14  
Status: 計画文書（監督決定に基づく）  
Authority: `_supervisor_decisions.md`  
Scope constraint: 方針案要求 / Phase / 設計書セクション / 実装 PR 仮 ID / テスト観点

---

## 1. 目的

Bridge Modeler V2 の設計書から実装 PR、テスト観点への traceability を明確にする。各要件がどの設計書で定義され、どの PR で実装され、どのテストで検証されるかを一覧表示する。

## 2. 方針案要求一覧

| 要件 ID | 要件内容 | 設計書 | Phase | PR 仮 ID | テスト観点 |
| --- | --- | --- | --- | --- | --- |
| REQ-01 | V2 専用ルート | 00 §4, ADR-BMV2-001 | P0 | PR-BMV2-002 | E2E-05: flag off 時に非表示 |
| REQ-02 | Feature flag 制御 | 00 §4, ADR-BMV2-011 | P0 | PR-BMV2-002 | Unit: flag on/off |
| REQ-03 | LINER alignment 参照 | 02 §4-7, ADR-BMV2-002 | P1 | PR-BMV2-003 | Unit: adapter 変換 |
| REQ-04 | Source revision tracking | 02 §19, ADR-BMV2-002 | P1 | PR-BMV2-003 | Unit: stale detection |
| REQ-05 | Bridge interval 定義 | 02 §7, §9 | P1 | PR-BMV2-004 | Unit: validation |
| REQ-06 | V2 document schema | 07 §4, ADR-BMV2-008 | P1 | PR-BMV2-005 | Unit: serialize/deserialize |
| REQ-07 | Autosave | 07 §7, ADR-BMV2-008 | P1 | PR-BMV2-005 | Integration: save/load |
| REQ-08 | Supports 入力 | 03 §7, §18 | P2 | PR-BMV2-006 | Unit: stable ID, validation |
| REQ-09 | Skew angle | 03 §7 | P2 | PR-BMV2-006 | Unit: validation |
| REQ-10 | Girder line 入力 | 03 §7, §18 | P2 | PR-BMV2-007 | Unit: stable ID, validation |
| REQ-11 | Cross girder 入力 | 03 §7, §18 | P2 | PR-BMV2-007 | Unit: stable ID |
| REQ-12 | Bearing 入力 | 03 §7, §18 | P2 | PR-BMV2-009 | Unit: stable ID, validation |
| REQ-13 | Section 入力 | 03 §7 | P2 | PR-BMV2-009 | Unit: validation |
| REQ-14 | Material 入力 | 03 §7 | P2 | PR-BMV2-009 | Unit: validation |
| REQ-15 | Deterministic stable ID | 01 §2.6, ADR-BMV2-004 | P0 | PR-BMV2-008 | Unit: 一意性, 衝突回避 |
| REQ-16 | 3D structure preview | 03 §10 | P2 | PR-BMV2-010 | Integration: structure → viewer |
| REQ-17 | Diagnostics envelope | 01 §2.7, ADR-BMV2-013 | P0 | PR-BMV2-014 | Unit: collector |
| REQ-18 | BMV2_ 接頭辞 | 08 §4 | P0 | PR-BMV2-014 | Unit: code naming |
| REQ-19 | Fatal = block, Warning = banner | 08 §8 | P0 | PR-BMV2-014 | Unit: severity 判断 |
| REQ-20 | FEM station set 生成 | 04 §7 | P3 | PR-BMV2-011 | Unit: station set |
| REQ-21 | FEM node 生成 | 04 §7, §18 | P3 | PR-BMV2-012 | Unit: stable ID, node |
| REQ-22 | FEM member 生成 | 04 §7, §18 | P3 | PR-BMV2-012 | Unit: member direction |
| REQ-23 | Support/spring mapping | 04 §7 | P3 | PR-BMV2-013 | Unit: mapping |
| REQ-24 | IdCorrespondence | 04 §7 | P3 | PR-BMV2-012 | Unit: 対応表 |
| REQ-25 | Viewer 接続 | 04 §10 | P3 | PR-BMV2-015 | E2E-02: FEM flow |
| REQ-26 | Solver integration | 04 §13 | P3 | PR-BMV2-018 | E2E-02: FEM flow |
| REQ-27 | DeckSurface 定義 | 05 §7 | P4 | PR-BMV2-016 | Unit: validation |
| REQ-28 | TrafficLoadZone 定義 | 05 §7 | P4 | PR-BMV2-016 | Unit: validation |
| REQ-29 | LoadPath 定義 | 05 §7 | P4 | PR-BMV2-017 | Unit: distribution |
| REQ-30 | line_id 直結禁止 | 05 §1, ADR-BMV2-005 | P4 | PR-BMV2-017 | Regression: line_id 未使用 |
| REQ-31 | Results mapping | 06 §7 | P5 | PR-BMV2-019 | Unit: mapper |
| REQ-32 | DrawingDocument 生成 | 06 §7, ADR-BMV2-006 | P5 | PR-BMV2-020 | Unit: builder |
| REQ-33 | DXF 種別 | 06 §7 | P5 | PR-BMV2-021 | E2E-04: DXF export |
| REQ-34 | Preview/DXF 同一経路 | 06 §1, ADR-BMV2-006 | P5 | PR-BMV2-020 | Parity: preview ≠ DXF |
| REQ-35 | Legacy coexistence | 00 §4, ADR-BMV2-001 | P0 | PR-BMV2-022 | E2E-05: Legacy 未変更 |
| REQ-36 | DXF parser (LibreCAD) | 09 §10 | P5 | PR-BMV2-021 | DXF Parser: parse/roundtrip |
| REQ-37 | 受入条件マトリクス | 16 AC table | P1-P5 | PR-BMV2-023 | AC: 26 AC 全検証 |
| REQ-38 | Fixture 1-15 定義 | 09 §15 | P1-P5 | PR-BMV2-023 | Fixture: 15 fixture 検証 |

## 3. 設計書セクション → PR マッピング

| 設計書 | Phase | 主要 PR |
| --- | --- | --- |
| 00 Master Scope | 全体 | PR-BMV2-002, PR-BMV2-022 |
| 01 Architecture | 全体 | PR-BMV2-001, PR-BMV2-008, PR-BMV2-014 |
| 02 Phase 1 | P1 | PR-BMV2-003, PR-BMV2-004 |
| 03 Phase 2 | P2 | PR-BMV2-006, PR-BMV2-007, PR-BMV2-009, PR-BMV2-010 |
| 04 Phase 3 | P3 | PR-BMV2-011, PR-BMV2-012, PR-BMV2-013, PR-BMV2-015, PR-BMV2-018 |
| 05 Phase 4 | P4 | PR-BMV2-016, PR-BMV2-017 |
| 06 Phase 5 | P5 | PR-BMV2-019, PR-BMV2-020, PR-BMV2-021 |
| 07 Persistence | P1 | PR-BMV2-005 |
| 08 Diagnostics | P0 | PR-BMV2-014 |
| 09 Test Plan | 全 Phase | PR-BMV2-023 |
| 10 Roadmap | 全体 | PR-BMV2-001 〜 PR-BMV2-023 |

## 4. PR → テスト観点マッピング

| PR 仮 ID | Unit | Integration | E2E | DXF Parser | 手動確認 |
| --- | --- | --- | --- | --- | --- |
| PR-BMV2-001 | 型チェック | — | — | — | tsc |
| PR-BMV2-002 | flag on/off | — | E2E-05 | — | ルート遷移 |
| PR-BMV2-003 | adapter | LINER mock | — | — | alignment 選択 |
| PR-BMV2-004 | validation | adapter → interval | E2E-01 | — | station 入力 |
| PR-BMV2-005 | serialize | save/load | — | — | 保存/読み込み |
| PR-BMV2-006 | stable ID, validation | interval → support | E2E-01 | — | supports 入力 |
| PR-BMV2-007 | stable ID, validation | support → girder | E2E-01 | — | girder 入力 |
| PR-BMV2-008 | ID 生成, 一意性 | — | — | — | ID 確認 |
| PR-BMV2-009 | stable ID, validation | girder → bearing | E2E-01 | — | bearing 入力 |
| PR-BMV2-010 | adapter | structure → viewer | E2E-01 | — | 3D preview |
| PR-BMV2-011 | station set | interval → station set | — | — | station set |
| PR-BMV2-012 | stable ID, node, member | station set → nodes | — | — | nodes/members |
| PR-BMV2-013 | mapping | nodes → support | — | — | support mapping |
| PR-BMV2-014 | collector | — | — | — | diagnostics |
| PR-BMV2-015 | adapter | ProjectModel → viewer | E2E-02 | — | FEM 表示 |
| PR-BMV2-016 | validation | structure → deck | E2E-03 | — | deck 入力 |
| PR-BMV2-017 | distribution | deck → load path | E2E-03 | — | distribution |
| PR-BMV2-018 | adapter | ProjectModel → solver | E2E-02 | — | solver 実行 |
| PR-BMV2-019 | mapper | solver → results | — | — | results 確認 |
| PR-BMV2-020 | builder | results → Drawing | E2E-03 | — | Drawing preview |
| PR-BMV2-021 | builder | builder → DXF | E2E-04 | DXF parse | DXF file |
| PR-BMV2-022 | — | — | E2E-05 | — | Legacy 確認 |
| PR-BMV2-023 | fixture | adapter → fixture | E2E-01〜05 | — | 全テスト通過 |

## 5. ADR → PR マッピング

| ADR | タイトル | 対応 PR |
| --- | --- | --- |
| ADR-BMV2-001 | New route, keep Legacy | PR-BMV2-002, PR-BMV2-022 |
| ADR-BMV2-002 | LINER is source of truth | PR-BMV2-003 |
| ADR-BMV2-003 | Four layers | PR-BMV2-001 |
| ADR-BMV2-004 | Deterministic stable IDs | PR-BMV2-008 |
| ADR-BMV2-005 | Separate deck/traffic load | PR-BMV2-016, PR-BMV2-017 |
| ADR-BMV2-006 | DrawingDocument is IR | PR-BMV2-020, PR-BMV2-021 |
| ADR-BMV2-007 | Staged FEM pipeline | PR-BMV2-011 〜 PR-BMV2-018 |
| ADR-BMV2-008 | Schema & persistence | PR-BMV2-005 |
| ADR-BMV2-009 | Units & coordinates | PR-BMV2-003 |
| ADR-BMV2-010 | Frontend/backend split | PR-BMV2-018 |
| ADR-BMV2-011 | Feature flag | PR-BMV2-002 |
| ADR-BMV2-012 | Undo/redo | PR-BMV2-006 以降 |
| ADR-BMV2-013 | Diagnostics envelope | PR-BMV2-014 |
| ADR-BMV2-014 | BridgeDefinition relationship | PR-BMV2-003 |

## 6. OD → PR マッピング

| OD | 内容 | 影響 PR | 状態 |
| --- | --- | --- | --- |
| OD-01 | host project JSON key → `ProjectModel.bridgeModelerV2` | PR-BMV2-005 | **RESOLVED** |
| OD-02 | Backend REST vs frontend-only | PR-BMV2-005 | OPEN (監督確認待ち) |
| OD-03 | Girder "follow widening" 方式 | PR-BMV2-007 | OPEN (監督確認待ち) |
| OD-04 | Partial regeneration granularity | PR-BMV2-012 | OPEN (監督確認待ち) |
| OD-05 | Coexistence end criteria | PR-BMV2-022 | OPEN (監督確認待ち) |

## 7. 設計書 → 11 へのリンク

| 設計書 | リンク対象 | 本文書との関連 |
| --- | --- | --- |
| 13_open_decisions_resolution.md | OD-01 RESOLVED | §6 OD マッピング |
| 14_implementation_contract_catalog.md | REQ/AC 契約 | §2 REQ 一覧 |
| 15_integrated_execution_and_release_plan.md | PR リリース計画 | §3, §4 PR マッピング |
| 16_acceptance_criteria_matrix.md | AC-P1-01 〜 AC-P5-04 | REQ-37 対応 |

## 8. 完了条件

1. 全要件（REQ-01 〜 REQ-38）が traceability でカバーされる
2. 全設計書セクションが PR にマッピングされる
3. 全 ADR が PR にマッピングされる
4. 全 OD が影響 PR にマッピングされる
5. 13-16 へのリンクが正しい

## 9. 未決事項

| ID | 内容 | 影響 |
| --- | --- | --- |
| (なし) | traceability は監督指示に従い明確 | — |
