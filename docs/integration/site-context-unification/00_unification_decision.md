# 00. リポジトリ一本化 統合方式比較と正本決定

> **Authority:** INTEGRATION DECISION
> **対象:** site-context-prototype × spacer-clone
> **監査基準SHA:** site-context `b2c87ab` / spacer-clone `294f324`（2026-08-15時点）
> **Decision Freeze対象:** 本資料の「正本決定」は以後の統合作業の前提とする

## 1. 比較対象の前提

- **site-context-prototype**（`~/Projects/site-context-prototype`, main `b2c87ab`, 156 commits）
  - Electron + React 18 + three.js 0.169 + Vite + vitest 2 + zod
  - workspace monorepo（`packages/core` = `@scp/core` + `app`）
  - `@scp/core` に ProjectV2 / SiteContext / SelectionArea / SourceDataset / Terrain / coordinate(CRS) / generation persistence / .sitecontext package を実装
  - 実動UIは ProjectV1（localStorage + IndexedDB）。generation方式・ProjectV2 は core 実装済みだが UI 未接続
  - テスト 19 files / 137 tests 全PASS
- **spacer-clone**（`~/Projects/spacer-clone`, main `294f324`, 1000+ commits）
  - Electron(desktop/) + React 19 + three.js 0.184 + Vite 7 + vitest 4 + Playwright + FastAPI backend
  - `/app`(NextApp) が production 正・`/pro`(legacy) は参照用
  - Project Data Core（`frontend/src/next/project/`, schemaVersion 1.0.0, 8 module registry）
  - PersistentProjectManager + FilesystemProjectPersistence（project.json + .backup 世代5）+ .spacerproj（単一JSON）
  - 道路/地形/橋梁配置/上部工/下部工/解析/CIM/成果品 の8モジュール
  - Phase 10 Design Freeze / Phase 11 WP-9 まで merge 済み（`/app` production 正・FROZEN境界維持）

## 2. 統合方式の比較

| 比較項目 | A. site-context→spacer-clone吸収 | B. spacer-clone→site-context吸収 | C. 共通Core monorepo |
|---|---|---|---|
| 実装量 | 中（site-contextのドメインをterrainモジュール等へ選択移植） | 極大（1000+コミット・backend・8モジュールをprototypeへ） | 高（両リポジトリ再構成・新monorepo作成） |
| リスク | 中〜低（spacer-cloneのフリーズ・Protected Coreを守れば段階的吸収が可能） | 極高（productionをprototypeへ載せる） | 高（spacer-clone productionへの影響・git履歴断絶） |
| 既存機能回帰リスク | 低（既存実装に触れない追加から開始） | 極高 | 高 |
| Project/Save Load互換性 | .sitecontext(zip)→.spacerproj(JSON) Importer + ProjectV2→PDC mapping | 逆向き変換で冗長 | 両者共通Core化が必要で現状過大 |
| Electron統合難易度 | 低（spacer-clone Electronが正本・site-context側は3 IPCのみで廃止対象） | 高（基盤が無い） | 中 |
| 3D/地形統合難易度 | 中（EPSG/平面直角/heightfieldの質の高い実装をterrain moduleへ移植） | 高 | 中 |
| 道路/橋梁/解析/CIM接続性 | 高（spacer-cloneに既存・現況地形が道路/橋梁配置へ供給可能に） | 低（基盤が無い） | 中 |
| 将来保守性 | 高い（1リポジトリで全体把握） | 低 | 高い（概念的） |
| AIエージェントが1リポジトリだけで作業可能か | はい（spacer-cloneが正本） | いいえ | 部分的（Core+pkgの両方見る必要） |

## 3. 正本決定

### 採用: **A. site-context-prototype を spacer-clone へ吸収（spacer-clone = 正本リポジトリ）**

### 決定理由

1. **アプリ本体は spacer-clone に集約済み**。統合後のアプリは「道路/橋梁/FEM/CIM/成果品 + 現況地形」の設計システムであり、spacer-clone の拡張が自然な形である。
2. **site-context のドメインは spacer-clone の module 枠に収まる**。現況地形・座標系・地形取得は PDC の `terrain` モジュールと `metadata`（existingConditions 等）に対応する。モジュール登録数を増やさずに吸収可能（厳格 schema は維持）。
3. **既存の相互非依存宣言と矛盾しない**。site-context 側 `docs/design/02_spacer_port_investigation.md` の「Site Context は SPACER に一切依存しない」は、**site-context が主導して自身の資産を spacer-clone へ移植する**ことで充足される（spacer-clone 側の FROZEN 境界・Protected Core は変更しない）。
4. **段階的吸収で回帰リスクを最小化**。今回の方針は「既存実装に触れない追加（契約・interface・docs）」から開始し、実吸収（P2以降）は site-context 側の変更に留める。
5. **1正本リポジトリ目標**。AI エージェントが spacer-clone 1つを見れば全体（現況地形含む）を理解・修正できる構造を実現する。

### 却下理由

- **B**: site-context は prototype 規模（156 commits）で、backend・8モジュール・CIM 等の基盤を持たない。production を prototype へ吸収するのは実装量・リスクとも過大。
- **C**: 概念的には将来望ましいが、両リポジトリの再構成・git履歴断絶・production への影響が過大。吸収完了後の spacer-clone 内 workspace 化（段階的 monorepo 化）として後続 Phase で実現可能。

## 4. 決定の効力範囲

- 本決定は「統合境界（02章）」「Adapter契約（03章）」の前提である。
- spacer-clone の Phase 10/11 FROZEN 境界・Protected Core・`/pro` legacy 参照境界は**不変**とする。
- site-context 側の Design Freeze（SCP-DF-2026-08-15-1）は実吸収開始（P2）まで**維持**する。
- 実吸収の各ステップは理由付き PR / main 小commit で実施し、Save/Load・Project Schema の後方互換を壊さない。
