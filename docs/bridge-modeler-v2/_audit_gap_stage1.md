# Audit Gap Stage 1 — Bridge Modeler V2 Design Package

Date: 2026-07-14  
Auditor: MiMo (automated completeness audit)  
Scope: `docs/bridge-modeler-v2/` 全 16 ファイル  
Method: 全ファイル読み取り → 設計判断なし。矛盾・曖昧さ・未定義の列挙のみ。

---

## DOCUMENT_INVENTORY

| # | ファイル | 責務 | 行数 |
| --- | --- | --- | --- |
| 0 | `README.md` | 設計パッケージのインデックス、読書順序、非対象の明記 | 24 |
| 1 | `_supervisor_decisions.md` | ADR-BMV2-001〜014 の lock、命名規則、Phase 境界、Open Decision 一覧 | 144 |
| 2 | `_evidence_inventory.md` | コードベースの Read-Only 調査結果。Legacy/BridgeDefinition/LINER/Drawing の証拠パス | 166 |
| 3 | `00_bridge_modeler_v2_master_scope.md` | 全体目的、対象/非対象、Legacy 共存方針、再利用資産、MVP1 境界、完了条件 | 158 |
| 4 | `01_architecture_and_domain_model.md` | 4 層モデル、型概念定義、Mermaid データフロー、Adapter 境界、Frontend/Backend 分担 | 316 |
| 5 | `02_phase1_liner_bridge_interval.md` | Phase 1: LINER alignment 参照、BridgeInterval、stale detection、preview | 299 |
| 6 | `03_phase2_bridge_structure.md` | Phase 2: BridgeStructureModel、supports/girders/bearings、skew、3D preview | 384 |
| 7 | `04_phase3_fem_generation.md` | Phase 3: 段階的 FEM パイプライン、ProjectModel、IdCorrespondence、diagnostics | 358 |
| 8 | `05_phase4_load_surface.md` | Phase 4: DeckSurface/TrafficLoadZone/LoadPath、三層分離、line_id 直結禁止 | 360 |
| 9 | `06_phase5_results_drawing_dxf.md` | Phase 5: Results mapping、DrawingDocument、DXF 出力、preview 同一経路 | 334 |
| 10 | `07_persistence_versioning_migration.md` | 永続化方針、スキーマバージョニング、autosave、Legacy 共存、将来 API | 300 |
| 11 | `08_diagnostics_and_validation.md` | DiagnosticsEnvelope 型、必須診断コード一覧、fatal/warning 判断基準 | 272 |
| 12 | `09_test_and_verification_plan.md` | テスト戦略、fixture 方針、Legacy 回帰、Phase 別テスト観点 | 286 |
| 13 | `10_implementation_roadmap_and_pr_plan.md` | PR-BMV2-001〜023 の分割計画、前提/後続 PR、実行順序、Mermaid 依存図 | 631 |
| 14 | `11_traceability_matrix.md` | REQ-01〜36 の要件 traceability、ADR/OD → PR マッピング | 139 |
| 15 | `12_risk_register_and_open_decisions.md` | Risk register (RISK-01〜16)、OD-01〜05 の転記と状態管理 | 204 |

---

## TODO_TBD_LIST

### A. Open Decisions (OD) — 全ファイルに散在

| OD | 内容 | 最初の記載 | 影響 PR | 状態 |
| --- | --- | --- | --- | --- |
| OD-01 | host project JSON key for `BridgeModelerV2Document` | `_supervisor_decisions.md:108` | PR-BMV2-005 | OPEN |
| OD-02 | Backend REST vs frontend-only persistence for MVP1 | `_supervisor_decisions.md:109` | PR-BMV2-005 | OPEN |
| OD-03 | Girder "follow widening" 方式 (continuous vs piecewise) | `_supervisor_decisions.md:110` | PR-BMV2-007 | OPEN |
| OD-04 | Partial regeneration granularity (span-local vs full) | `_supervisor_decisions.md:111` | PR-BMV2-012 | OPEN |
| OD-05 | Coexistence end criteria for removing Legacy Wizard | `_supervisor_decisions.md:112` | PR-BMV2-022 | OPEN |

**根拠**: OD-01〜05 は `_supervisor_decisions.md:108-112` で定義され、`12_risk_register_and_open_decisions.md:95-172` で転記。各 Phase 文書 (02:297-299, 03:383-384, 04:356-358, 07:288-291) でも参照。MVP1 完了条件に OD-01 依存あり (`00:94`)。

### B. "将来" 参照 — 遅延実装の明示

| ファイル | 行 | 内容 |
| --- | --- | --- |
| `_supervisor_decisions.md` | 56 | "Migration: Legacy BridgeProject は **not** auto-migrated to V2 in MVP; coexistence = side-by-side. Optional one-way import adapter is P2." |
| `_supervisor_decisions.md` | 67 | "Optional backend persistence endpoints for V2 documents: design for `/api/bridge-modeler-v2/...` but implementation is later PRs" |
| `07_persistence_versioning_migration.md` | 23 | "Backend API（将来設計）: `/api/bridge-modeler-v2/...` は将来の PR" |
| `07_persistence_versioning_migration.md` | 78-85 | "§5.2 将来: Backend API（MVP1 後）" — 端点設計のみ、実装は別途 PR |
| `07_persistence_versioning_migration.md` | 115-121 | "§6.3 Import Adapter（P2 以降）" — Legacy→V2 one-way import |
| `07_persistence_versioning_migration.md` | 170-177 | "§8.2 将来: 移行方針（bmv2-2.0.0 以降）" — Reader + Transformer パターン |
| `10_implementation_roadmap_and_pr_plan.md` | 626-631 | OD-01〜05 は全て "OPEN (監督確認待ち)" |

### C. "後続 Phase 引渡し" — 各 Phase 文書の末尾

| ファイル | セクション | 引渡し物 |
| --- | --- | --- |
| `02_phase1` | §23 (L285-292) | `RoadAlignmentReference`, `BridgeInterval[]`, `sourceRevision`, `localOriginPolicy` → Phase 2, 5 |
| `03_phase2` | §23 (L370-377) | `BridgeStructureModel`, `BridgeSection[]`, `BridgeMaterial[]`, `BridgeSupport[]` → Phase 3, 5 |
| `04_phase3` | §23 (L345-352) | `ProjectModel`, `IdCorrespondence`, `DiagnosticsEnvelope[]`, FEM pipeline steps → Phase 4, 5 |
| `05_phase4` | §23 (L347-354) | `Phase4State`, `LoadPath[]`, `DeckSurface` → Phase 5 |
| `06_phase5` | §23 (L322-328) | `BridgeDrawingDocument`, DXF ファイル, DrawingDocument → 以降 PR |

### D. "別途 PR" / 実装遅延の明示

| ファイル | 行 | 内容 |
| --- | --- | --- |
| `00_master_scope` | 35 | "Backend への新規 API エンドポイント追加（MVP1 後の PR）" |
| `07_persistence` | 84 | "実装: 別途 PR（監督指示）" |
| `10_roadmap` | 各 PR | PR-BMV2-005 以降の persistence は OD-01/02 依存 |

### E. "実装時に決定" / 未定義フィールド

| ファイル | 行 | 内容 |
| --- | --- | --- |
| `01_architecture` | L122-125 | `AnalysisModelSpec` が "// Phase 3 で実装" のプレースホルダー（§2.5）。04 §7 で実体定義あり |
| `03_phase2` | L151 | `BridgeSection.dimensions: Record<string, number>` — shape に応じた寸法の key が未定義 |
| `03_phase2` | L163 | `BridgeMaterial.properties: Record<string, number>` — E, fy, fc 等と注釈はあるが key 列挙なし |

---

## CONTRADICTIONS

### C-01: Mermaid 依存図と PR 前提定義の不一致

| 項目 | 内容 |
| --- | --- |
| **箇所** | `10_implementation_roadmap_and_pr_plan.md` §5 Mermaid (L562) vs PR-BMV2-001 定義 (L36) |
| **Mermaid** | `T0[PR-BMV2-008] --> T1[PR-BMV2-001]` — 008 が 001 の前提を示す矢線 |
| **PR-BMV2-001** | "前提 PR: なし" |
| **PR-BMV2-008** | "前提 PR: なし（理想的には PR-BMV2-001 と同時期）" |
| **矛盾** | 両 PR とも相互に前提としていないが、Mermaid では 008→001 の依存を描画。実行順序テーブル (L534) でも 008=1番目、001=2番目。前提 PR 定義と Mermaid が不一致 |
| **影響** | 実装順序の誤解を招く可能性 |

### C-02: AnalysisModelSpec の未定義プレースホルダーと完全定義の不一致

| 項目 | 内容 |
| --- | --- |
| **箇所** | `01_architecture_and_domain_model.md` §2.5 (L121-125) vs `04_phase3_fem_generation.md` §7 (L88-94) |
| **01 §2.5** | `type AnalysisModelSpec = { // FEM 生成の入力仕様 // Phase 3 で実装 };` — フィールドなし |
| **04 §7** | `type AnalysisModelSpec = { stationSet: number[]; includeDeadLoad: boolean; includeLiveLoad: boolean; meshDensity: "coarse" \| "standard" \| "fine"; };` — 4 フィールド定義 |
| **矛盾** | アーキテクチャ文書では空のプレースホルダー、Phase 3 文書では完全定義。读者は哪个为准か判断できない |
| **影響** | 型設計の着手時に混乱の可能性 |

### C-03: BridgeInterval の Stable ID 生成方針の矛盾

| 項目 | 内容 |
| --- | --- |
| **箇所** | `02_phase1_liner_bridge_interval.md` §18 (L249-251) vs §7 (L93-98) |
| **§18** | "Phase 1 では Deterministic stable ID を生成しない。ID は Phase 2 で BridgeStructureModel のエンティティに割り当てる" |
| **§7** | `type BridgeInterval = { id: string; // deterministic stable ID (ADR-BMV2-004) ... }` |
| **矛盾** | Phase 1 の BridgeInterval 型に stable ID フィールドがあるが、Phase 1 では ID を生成しないと明記 |
| **影響** | Phase 1 実装時に BridgeInterval.id の値をどう扱うか不明 |

### C-04: Stable ID の "never array indices" と一部 ID パターンの矛盾

| 項目 | 内容 |
| --- | --- |
| **箇所** | `_supervisor_decisions.md` ADR-BMV2-004 (L41) vs `03_phase2` §18 (L326) / `05_phase4` §18 (L302-307) |
| **ADR-BMV2-004** | "IDs are strings derived from semantic keys ... never array indices" |
| **03 §18** | `CrossGirder: xgir:{index}` — index は配列インデックス |
| **05 §18** | `DeckZone: dz:{laneIndex}`, `TrafficLoadZone: tlz:{index}`, `LoadPath: lp:{index}` — いずれもインデックスベース |
| **矛盾** | ADR では "never array indices" と明記だが、CrossGirder/DeckZone/TrafficLoadZone/LoadPath の ID パターンはインデックスを使用 |
| **影響** | エンティティ追加/削除時に ID が不安定になる可能性。ADR との整合性損失 |

### C-05: FEM pipeline と Backend solver の API 契約Gap

| 項目 | 内容 |
| --- | --- |
| **箇所** | `04_phase3_fem_generation.md` §13 (L239-247) vs `_evidence_inventory.md` §3 (L43-48) |
| **04 §13** | "Analysis run: 既存 `POST /api/fem/generate` を呼び出し" |
| **evidence §3** | `POST /api/fem/generate` は BridgeProject を受け取り `generate_fem_model(project)` を実行 |
| **Gap** | V2 の FEM pipeline は BridgeStructureModel → ProjectModel を Frontend で生成するが、既存 Backend API は BridgeProject を入力とする。ProjectModel → solver の API 契約が未定義 |
| **影響** | Phase 3 実装時に Frontend→Backend のデータ変換経路が不明 |

### C-06: DrawingDocument の sourcePhase フィールドの型不自然

| 項目 | 内容 |
| --- | --- |
| **箇所** | `06_phase5_results_drawing_dxf.md` §7 (L111) |
| **内容** | `sourcePhase: 1 \| 2 \| 3 \| 4 \| 5` — 1 つの DrawingDocument が複数 Phase にまたがる意味 |
| **問題** | 1 つの描図が複数 Phase の入力に依存することは自然だが、`sourcePhase` が単数型で "which phase produced this" を示唆。実際には Phase 3 (FEM) + Phase 4 (荷重) の結果を併せて描図する場合がある |
| **影響** | 型の意図が不明瞭。配列型 `sourcePhases: (1\|2\|3\|4\|5)[]` の方が正確かもしれない |

### C-07: PR-BMV2-005 の後続 PR 参照先が存在しない

| 項目 | 内容 |
| --- | --- |
| **箇所** | `10_implementation_roadmap_and_pr_plan.md` PR-BMV2-005 (L125) |
| **内容** | "後続 PR: PR-BMV2-015" |
| **問題** | PR-BMV2-015 は "Viewer/ProjectModel 接続" (Phase 3)。persistence の後続として viewer 接続が挙げられているが、PR-BMV2-015 の前提 PR は "PR-BMV2-013, PR-BMV2-014" で PR-BMV2-005 は含まれていない。一方で PR-BMV2-005 の実質的な後続は永続化の利用箇所であるべきだが、Mermaid では T1[T1]→T6[PR-BMV2-005]→T6（他自己参照）となっている |
| **影響** | PR 依存関係の混乱 |

---

## AMBIGUOUS_CONTRACTS

### A-01: DocumentMetadata 型が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `01_architecture_and_domain_model.md` §2.1 (L65) |
| **内容** | `BridgeModelerV2Document` のフィールド `metadata: DocumentMetadata` |
| **問題** | `DocumentMetadata` の型定義がどの文書にも存在しない。field 一覧、型、必須/任意が不明 |
| **影響** | PR-BMV2-001 のドメイン型定義時に型を決定する必要あり |

### A-02: StationAxis 型が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `06_phase5_results_drawing_dxf.md` §7 (L88) |
| **内容** | `DrawingDocument` のフィールド `stationAxes: StationAxis[]` |
| **問題** | `StationAxis` の型定義がどの文書にも存在しない。LINER の DrawingDocument と同一とされるが、V2 での定義なし |
| **影響** | Phase 5 の DrawingDocument 使用時に型が不明 |

### A-03: DeadLoad 型が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `05_phase4_load_surface.md` §7 (L143) |
| **内容** | `Phase4State` のフィールド `deadLoads: DeadLoad[]` |
| **問題** | `DeadLoad` の型定義がどの文書にも存在しない。field 一覧、計算方法が不明 |
| **影響** | Phase 4 実装時に自重荷重の型を決定する必要あり |

### A-04: ImpactFactorConfig 型が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `05_phase4_load_surface.md` §7 (L144) |
| **内容** | `Phase4State` のフィールド `impactFactor: ImpactFactorConfig` |
| **問題** | `ImpactFactorConfig` の型定義がどの文書にも存在しない。Legacy の `ImpactFactor` (`frontend/src/bridge/types.ts:16-20`) はあるが、V2 版の型は未定義 |
| **影響** | Phase 4 実装時に衝撃係数の型を決定する必要あり |

### A-05: BridgeSection.dimensions の key 列挙なし

| 項目 | 内容 |
| --- | --- |
| **箇所** | `03_phase2_bridge_structure.md` §7 (L151) |
| **内容** | `dimensions: Record<string, number>; // shape に応じた寸法` |
| **問題** | shape が `"I" \| "box" \| "T" \| "composite" \| "custom"` と列挙されているが、各 shape で必要な寸法 key が未定義。例: I 型なら `height`, `flangeWidth`, `webThickness` 等だが明記なし |
| **影響** | UI 入力フォームの設計時にどのフィールドを表示するか不明 |

### A-06: BridgeMaterial.properties の key 列挙なし

| 項目 | 内容 |
| --- | --- |
| **箇所** | `03_phase2_bridge_structure.md` §7 (L163) |
| **内容** | `properties: Record<string, number>; // E, fy, fc 等` |
| **問題** | kind が `"steel" \| "concrete" \| "prestressed_concrete" \| "composite"` と列挙されているが、各 kind で必要な properties key が未定義 |
| **影響** | UI 入力フォームの設計時にどのフィールドを表示するか不明 |

### A-07: BridgeDefinition → BridgeStructureModel の変換 adapter が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `01_architecture_and_domain_model.md` §4.1 (L196-199) / `03_phase2_bridge_structure.md` §12 (L254-265) |
| **内容** | `BridgeDefinition (1.0.0) ──adapter──→ BridgeStructureModel` |
| **問題** | BridgeProject → BridgeDefinition, LinerBridge → BridgeDefinition の adapter は実装済み (evidence §5) だが、BridgeDefinition → BridgeStructureModel の adapter は未実装で型変換ロジックも未定義。BridgeDefinition の各フィールドと BridgeStructureModel の各フィールドの対応関係が不明 |
| **影響** | Legacy/LINER からの import 経路の実装時に変換ロジックを新規設計する必要あり |

### A-08: FEM pipeline → Backend solver の ProjectModel 渡し経路が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `04_phase3_fem_generation.md` §12-13 (L225-247) |
| **内容** | "ProjectModel ──adapter──→ Backend Solver: 既存 POST /api/fem/generate を使用" |
| **問題** | 既存 API は BridgeProject を受け取るが、V2 の pipeline は ProjectModel を生成する。ProjectModel を既存 solver に渡す経路（adapter/API 変換）が未定義。`_evidence_inventory.md:43` では `POST /api/fem/generate` → `generate_fem_model(project)` と BridgeProject 入力が確認済み |
| **影響** | Phase 3 の solver integration (PR-BMV2-018) 実装時に API 契約を新規設計する必要あり |

### A-09: DrawingDocument の Bridge 専用拡張が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `06_phase5_results_drawing_dxf.md` §6-7 (L68-113) |
| **内容** | LINER の `DrawingDocument` を再利用するが、Bridge 描図固有のレイヤー/ビューポート/プリセットが未定義 |
| **問題** | LINER の `cadLayerPresets` (`_evidence_inventory.md:48`) は LINER 専用。Bridge 描図で使用する場合のレイヤー名/色/線種が未定義 |
| **影響** | Phase 5 の DXF 出力時にレイヤー設定を新規設計する必要あり |

### A-10: Validation の実行タイミング（input-time vs save-time）がPhase間で不統一

| 項目 | 内容 |
| --- | --- |
| **箇所** | 各 Phase 文書 §15 Validation / `08_diagnostics_and_validation.md` §7.1 |
| **08 §7.1** | Input validation, State validation, Pipeline validation, Cross-reference validation の 4 タイプを定義 |
| **各 Phase** | 各 Phase で validation ルールを列挙するが、どのルールがどのタイミングで実行されるか（入力時/保存時/パイプライン実行時）が明示されていない |
| **問題** | `08 §7.1` でタイミングを分類しているが、各 Phase の validation テーブルでは条件とエラーコードのみでタイミングが未指定 |
| **影響** | 実装時に validation の実行場所を都度判断する必要あり |

---

## MISSING_ACCEPTANCE_CRITERIA

### M-01: MVP1 完了条件が抽象的

| 項目 | 内容 |
| --- | --- |
| **箇所** | `00_bridge_modeler_v2_master_scope.md` §7 (L88-96) |
| **問題** | 条件 5 "3D preview で構造を確認できる" — 何をもって "確認できる" とするか（表示される/操作できる/正しい位置に描画される）が不明。条件 6 "OD-01 解決後" は外部依存で検証不可 |
| **影響** | MVP1 リリース判断の主観的評価を招く |

### M-02: Phase 3 の "既存 solver が動作する" が抽象的

| 項目 | 内容 |
| --- | --- |
| **箇所** | `04_phase3_fem_generation.md` §22 (L343) |
| **問題** | 条件 7 "既存 solver が動作する" — 何をもって "動作する" とするか（API 呼び出しが成功する/結果が正しい/性能基準を満たす）が不明 |
| **影響** | Phase 3 完了判断の基準が不明確 |

### M-03: Semantic parity テストの "一致" 基準が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `00_master_scope` §9 (L126) / `09_test_plan` §6 (L110) |
| **問題** | "Semantic parity テストが Legacy と V2 の結果一致を検証する" — "一致" の定義（数値一致/構造一致/許容誤差付き）が未定義。FEM 結果は計算精度により異なる可能性がある |
| **影響** | parity テストの合格/不合格判断が主観的になる |

### M-04: Diagnostics の "banner 表示" の UI 仕様が抽象的

| 項目 | 内容 |
| --- | --- |
| **箇所** | `08_diagnostics_and_validation.md` §9 (L215-233) |
| **問題** | banner の色/位置/消去条件/同時表示数/優先順位が未定義。"画面上部" "パネル内" のみで実装仕様として不十分 |
| **影響** | UI 実装時に詳細仕様を新規設計する必要あり |

### M-05: Stale detection の実行方法が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `02_phase1_liner_bridge_interval.md` §19 (L255-257) |
| **問題** | "stale detection は polling または LINER pipeline 完了イベントで実現" — polling 間隔/イベントの具体的な API/ハンドリングが未定義 |
| **影響** | Phase 1 実装時に stale detection の実行方法を新規設計する必要あり |

### M-06: Autosave の debounce 間隔・トリガー条件が未定義

| 項目 | 内容 |
| --- | --- |
| **箇所** | `07_persistence_versioning_migration.md` §7 (L123-132) |
| **問題** | "App の debounce パターンに従う" とあるが、App の autosave パターン自体の debounce 間隔/トリガー条件が `_evidence_inventory.md` では未調査。Mermaid (L157) では "Debounce (500ms)" と仮定しているが根拠なし |
| **影響** | autosave の UX に直結するパラメータが未確定 |

### M-07: E2E テストフレームワークが未指定

| 項目 | 内容 |
| --- | --- |
| **箇所** | `09_test_and_verification_plan.md` §9.2 (L206-213) |
| **問題** | "既存 E2E フレームワークに従う" とあるが、`_evidence_inventory.md` では E2E フレームワークの調査結果がない。実際の E2E フレームワークが不明 |
| **影響** | E2E テストの実装着手時にフレームワーク選定が必要 |

---

## RECOMMENDED_DOC_UPDATES

### R-01: `01_architecture_and_domain_model.md` — AnalysisModelSpec の完全定義を反映

| 項目 | 内容 |
| --- | --- |
| **対象** | `01_architecture_and_domain_model.md` §2.5 (L121-125) |
| **問題** | AnalysisModelSpec が空のプレースホルダー。04 §7 に完全定義あり |
| **推奨** | 01 §2.5 の型定義を 04 §7 と一致させるか、"Phase 3 文書参照" への参照に統一 |

### R-02: `01_architecture_and_domain_model.md` — DocumentMetadata 型を追加

| 項目 | 内容 |
| --- | --- |
| **対象** | `01_architecture_and_domain_model.md` §2.1 (L65) |
| **問題** | `metadata: DocumentMetadata` の型定義なし |
| **推奨** | `DocumentMetadata` の型定義を §2 の型概念セクションに追加 |

### R-03: `03_phase2_bridge_structure.md` — dimensions/properties の key 列挙を追加

| 項目 | 内容 |
| --- | --- |
| **対象** | `03_phase2_bridge_structure.md` §7 (L151, L163) |
| **問題** | `Record<string, number>` で key が未定義 |
| **推奨** | 各 shape/kind で必要な key を表で列挙。例: I 型 → `{ height, flangeWidth, flangeThickness, webThickness }` |

### R-04: `05_phase4_load_surface.md` — DeadLoad / ImpactFactorConfig 型を追加

| 項目 | 内容 |
| --- | --- |
| **対象** | `05_phase4_load_surface.md` §7 (L143-144) |
| **問題** | Phase4State で参照される型が未定義 |
| **推奨** | `DeadLoad` と `ImpactFactorConfig` の型定義を §7 に追加 |

### R-05: `10_implementation_roadmap_and_pr_plan.md` — Mermaid 依存図と PR 定義の整合

| 項目 | 内容 |
| --- | --- |
| **対象** | `10_implementation_roadmap_and_pr_plan.md` §5 (L560-601) |
| **問題** | T0→T1 の矢線が PR-BMV2-001 の "前提 PR: なし" と矛盾 |
| **推奨** | T0→T1 の矢線を削除するか、PR-BMV2-001 の前提 PR に PR-BMV2-008 を追加して整合させる |

### R-06: `02_phase1_liner_bridge_interval.md` — BridgeInterval.id の取扱いを明記

| 項目 | 内容 |
| --- | --- |
| **対象** | `02_phase1_liner_bridge_interval.md` §7 (L93-98) vs §18 (L249-251) |
| **問題** | BridgeInterval に id フィールドがあるが Phase 1 では ID を生成しない |
| **推奨** | §18 で "BridgeInterval.id は Phase 1 では空文字または仮値とし、Phase 2 で正式割り当て" 等の取扱いを明記 |

### R-07: `03_phase2_bridge_structure.md` / `05_phase4_load_surface.md` — ID パターンと ADR の整合確認

| 項目 | 内容 |
| --- | --- |
| **対象** | 03 §18 CrossGirder / 05 §18 DeckZone, TrafficLoadZone, LoadPath |
| **問題** | ADR-BMV2-004 の "never array indices" との整合性 |
| **推奨** | インデックスベース ID の使用理由を明記するか、セマンティックキー（例: `xgir:{stationM}`）に変更。ADR の "never array indices" の範囲（FEM node/member のみか、全エンティティか）を明確化 |

### R-08: `04_phase3_fem_generation.md` — FEM pipeline → Backend solver の API 契約を追記

| 項目 | 内容 |
| --- | --- |
| **対象** | `04_phase3_fem_generation.md` §12-13 (L225-247) |
| **問題** | ProjectModel → Backend solver のデータ変換経路が未定義 |
| **推奨** | §12 に "Frontend FEM pipeline が生成した ProjectModel を既存 `POST /api/fem/generate` に渡す adapter または直接呼び出しの仕様" を追記 |

### R-09: `08_diagnostics_and_validation.md` — 各 Phase の validation タイミング列を追加

| 項目 | 内容 |
| --- | --- |
| **対象** | `08_diagnostics_and_validation.md` §5 / 各 Phase §15 |
| **問題** | validation ルールにタイミング（入力時/保存時/実行時）が未指定 |
| **推奨** | 各 Phase の validation テーブルに "タイミング" 列を追加 |

### R-10: `07_persistence_versioning_migration.md` — autosave debounce の根拠を明記

| 項目 | 内容 |
| --- | --- |
| **対象** | `07_persistence_versioning_migration.md` §7.1 (L130-131) |
| **問題** | "App の debounce パターンに従う" とあるが App の debounce 実態が未調査 |
| **推奨** | `_evidence_inventory.md` に App の autosave/debounce 実装の調査結果を追加、または 07 §7.1 で具体的な間隔を明記 |
