# 12 — Risk Register and Open Decisions

Date: 2026-07-14  
Status: 計画文書（監督決定に基づく）  
Authority: `_supervisor_decisions.md`  
Scope constraint: Risk 表（Severity/Probability/Phase/Mitigation/Blocking）、OD-01〜05 転記

---

## 1. 目的

Bridge Modeler V2 のリスクレジスターと未決事項（Open Decisions）を管理する。リスクは Severity/Probability/Phase/Mitigation/Blocking で分類し、OD-01〜05 を転記して状態を管理する。

## 2. 対象範囲

| 対象 | 説明 |
| --- | --- |
| Risk register | 全リスクの登録・管理 |
| Open decisions | OD-01〜05 の転記と状態管理 |
| Severity | Critical / High / Medium / Low |
| Probability | High / Medium / Low |
| Blocking | Yes / No — 実装をブロックするか |
| Mitigation | 各リスクの緩和策 |

## 3. 対象外

| 対象外 | 根拠 |
| --- | --- |
| Legacy のリスク | 既存 Legacy のリスクは管理対象外 |
| Backend solver のリスク | 既存 solver のリスクは管理対象外 |

## 4. Risk Register

### 4.1 Critical Severity

| Risk ID | Risk | Severity | Probability | Phase | Mitigation | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-01 | OD-01 未決定により persistence 実装が遅延 | Critical | Medium | P1 | OD-01 決定済み。`bridgeModelerV2` キーで実装可 | **No (cleared 2026-07-14)** |
| RISK-02 | OD-02 未決定により backend API 方針が不明 | Critical | Low | P1 | OD-02 決定済み。frontend-only で先行 | **No (cleared 2026-07-14)** |

### 4.2 High Severity

| Risk ID | Risk | Severity | Probability | Phase | Mitigation | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-03 | LINER pipeline の API 変更により adapter が壊れる | High | Medium | P1 | LINER の public API のみ使用。internal API は回避 | Yes (PR-BMV2-003) |
| RISK-04 | FEM pipeline の性能問題（大規模桥梁） | High | Low | P3 | 既存 solver の性能パターンを参照。必要に応じて chunking | No |
| RISK-05 | DrawingDocument との型不整合 | High | Medium | P5 | LINER DrawingDocument の public 型のみ再利用 | Yes (PR-BMV2-020) |
| RISK-06 | Stable ID の衝突が想定以上に発生 | High | Low | P0 | suffix policy の実装（PR-BMV2-008）。collision テスト追加 | No |

### 4.3 Medium Severity

| Risk ID | Risk | Severity | Probability | Phase | Mitigation | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-07 | Legacy BridgeWizard への意図しない影響 | Medium | Low | P0 | feature flag で完全分離。Legacy テストで回帰検知 | No |
| RISK-08 | Phase 間のデータ渡しの型不整合 | Medium | Medium | P2-3 | 各 Phase の handoff に integration テスト | No |
| RISK-09 | DXF ファイルの LibreCAD での描画ズレ | Medium | Medium | P5 | DXF parser テストで roundtrip 検証。手動 LibreCAD 確認 | No |
| RISK-10 | OD-03 未決定により girder 配置が限定的 | Medium | Medium | P2 | MVP1 は piecewise stations で先行。OD-03 決定後に拡張 | No |
| RISK-11 | OD-04 未決定により再生成粒度が粗い | Medium | Medium | P3 | MVP1 は full structure で先行 | No |
| RISK-12 | Autosave のデバウンス設定による UX 劣化 | Medium | Low | P1 | App の autosave パターンをそのまま模倣 | No |

### 4.4 Low Severity

| Risk ID | Risk | Severity | Probability | Phase | Mitigation | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-13 | 3D preview の描画性能 | Low | Low | P2 | BridgeThreeViewer の既存パターンを参照 | No |
| RISK-14 | DXF レイヤー名の切り捨て | Low | Medium | P5 | diagnostics で通知。cadLayerPresets を参照 | No |
| RISK-15 | V2 document の JSON サイズ増大 | Low | Low | P1 | 必要最小限のデータのみ保存 | No |
| RISK-16 | OD-05 未決定により Legacy 並存が長期化 | Low | High | P0 | 明示的な deprecation PR まで保持 | No |

## 5. Risk 優先度マトリクス

```
Severity ▲
  Critical │ R-01  R-02
           │
  High     │ R-03  R-04  R-05  R-06
           │
  Medium   │ R-07  R-08  R-09  R-10  R-11  R-12
           │
  Low      │ R-13  R-14  R-15  R-16
           └──────────────────────────────────────→ Probability
             Low     Medium     High
```

## 6. Blocking Risk 詳細

| Risk ID | ブロック対象 | ブロック条件 | 解除条件 |
| --- | --- | --- | --- |
| RISK-01 | ~~PR-BMV2-005 (persistence)~~ | ~~OD-01 未決定~~ | **解除済み (2026-07-14)** |
| RISK-03 | PR-BMV2-003 (LINER adapter) | LINER API 変更 | adapter 修正 |
| RISK-05 | PR-BMV2-020 (DrawingDocument) | 型不整合 | 型調整 |

## 7. Open Decisions (OD) 転記

### OD-01: Exact host project JSON key for embedding BridgeModelerV2Document

| 項目 | 内容 |
| --- | --- |
| **ID** | OD-01 |
| **内容** | `BridgeModelerV2Document` を project JSON の哪个 key に保存するか |
| **候補** | A: `bridgeModelerV2`, B: `bridgeModelerV2` (sibling), C: 別ファイル |
| **状態** | **RESOLVED** (ADR-BMV2-015, 2026-07-14) |
| **影響** | PR-BMV2-005 (persistence) |
| **影響範囲** | 永続化方法、autosave パターン |
| **優先度** | Critical |
| **期限** | PR-BMV2-005 実装前 |

### OD-02: Backend REST vs frontend-only persistence for MVP1

| 項目 | 内容 |
| --- | --- |
| **ID** | OD-02 |
| **内容** | MVP1 での V2 document の永続化を frontend-only にするか Backend REST を追加するか |
| **候補** | A: frontend-only (Project JSON), B: Backend REST (`/api/bridge-modeler-v2/...`) |
| **状態** | **RESOLVED** (ADR-BMV2-016, 2026-07-14) |
| **影響** | PR-BMV2-005 (persistence) |
| **影響範囲** | 保存方法、API 設計 |
| **優先度** | Critical |
| **期限** | PR-BMV2-005 実装前 |
| **推奨** | MVP1 は frontend-only で先行（ADR-BMV2-010） |

### OD-03: Whether girder "follow widening" uses continuous offset function or piecewise stations in MVP1

| 項目 | 内容 |
| --- | --- |
| **ID** | OD-03 |
| **内容** | ガーダーの "follow widening" を continuous offset function で実装するか piecewise stations で実装するか |
| **候補** | A: continuous offset function, B: piecewise stations |
| **状態** | **RESOLVED** (ADR-BMV2-017, 2026-07-14) |
| **影響** | PR-BMV2-007 (GirderLine) |
| **影響範囲** | ガーダー配置アルゴリズム |
| **優先度** | Medium |
| **期限** | PR-BMV2-007 実装前 |
| **推奨** | MVP1 は piecewise stations で先行 |

### OD-04: Partial regeneration granularity (span-local vs full structure)

| 項目 | 内容 |
| --- | --- |
| **ID** | OD-04 |
| **内容** | FEM 再生成の粒度を span-local にするか full structure にするか |
| **候補** | A: span-local (部分再生成), B: full structure (全体再生成) |
| **状態** | **RESOLVED** (ADR-BMV2-018, 2026-07-14) |
| **影響** | PR-BMV2-012 (FEM nodes/members) |
| **影響範囲** | 再生成の性能と UX |
| **優先度** | Medium |
| **期限** | PR-BMV2-012 実装前 |
| **推奨** | MVP1 は full structure で先行 |

### OD-05: Coexistence end criteria for removing Legacy Wizard

| 項目 | 内容 |
| --- | --- |
| **ID** | OD-05 |
| **内容** | Legacy BridgeWizard の非推奨化・削除の条件 |
| **候補** | A: V2 全 Phase 完了時, B: ユーザー移行率ベース, C: 明示的な判断時 |
| **状態** | **RESOLVED** (ADR-BMV2-019, 2026-07-14) |
| **影響** | PR-BMV2-022 (Legacy coexistence) |
| **影響範囲** | Legacy 並存期間 |
| **優先度** | Low |
| **期限** | Phase 5 完了後 |
| **推奨** | C: 明示的な判断時（ADR-BMV2-001 に従い） |

## 8. OD 状態管理

| ID | 状態 | 最終更新 | 次のアクション |
| --- | --- | --- | --- |
| OD-01 | **RESOLVED** | 2026-07-14 | ADR-BMV2-015 決定済み。PR-BMV2-005 実装可 |
| OD-02 | **RESOLVED** | 2026-07-14 | ADR-BMV2-016 決定済み。frontend-only で先行 |
| OD-03 | **RESOLVED** | 2026-07-14 | ADR-BMV2-017 決定済み。PR-BMV2-007 実装可 |
| OD-04 | **RESOLVED** | 2026-07-14 | ADR-BMV2-018 決定済み。full structure で先行 |
| OD-05 | **RESOLVED** | 2026-07-14 | ADR-BMV2-019 決定済み。条件付き撤去 |

## 9. Risk Monitoring

| 監視項目 | 方法 | 頻度 |
| --- | --- | --- |
| Blocking risk の状態 | チェックポイントで確認 | 各 PR 実装前 |
| OD の状態 | 監督との確認 | 週次 |
| 新規リスクの検知 | Phase 遷移時に再評価 | Phase 完了時 |
| 残存リスクの更新 | risk register 更新 | 月次 |

## 10. 完了条件

1. 全リスクが Severity/Probability/Phase/Mitigation/Blocking で分類される
2. OD-01〜05 が転記され、状態が **RESOLVED** である
3. Blocking risk がブロック対象 PR にマッピングされる
4. Risk monitoring プランが存在する

## 11. 未決事項

| ID | 内容 | 影響 |
| --- | --- | --- |
| (なし) | 全 OD が RESOLVED。blocking OD = 0 | — |

---

## ADR 転記

| ID | タイトル | 本文書との関連 |
| --- | --- | --- |
| ADR-BMV2-001 | New route, keep Legacy | OD-05, RISK-07 |
| ADR-BMV2-008 | Schema & persistence | OD-01, OD-02 |
| ADR-BMV2-010 | Frontend/backend split | OD-02 |
| ADR-BMV2-015 | ProjectModel host key | OD-01 resolved |
| ADR-BMV2-016 | Frontend domain persistence | OD-02 resolved |
| ADR-BMV2-017 | GirderLine offset piecewise-linear | OD-03 resolved |
| ADR-BMV2-018 | Full structure regeneration | OD-04 resolved |
| ADR-BMV2-019 | Legacy coexistence end criteria | OD-05 resolved |
