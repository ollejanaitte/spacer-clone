# Phase 7.1: Git履歴・PRによる消失経路追跡

- Phase: 7.1 Road/LINER救出監査
- baseline: d524f6fb8f39e5ce1a2b7e5dd230f162a84f6a35
- 日付: 2026-08-13

## 1. 旧LINERの開発履歴（Git main first-parent）

| 時期 | 内容 | merge方式 |
|---|---|---|
| Phase 1 | 平面線形・測点（P1-D01..D04・golden fixture GC-02..07） | main merge |
| Phase 2 | 縦断・横断（P2・PR #152） | main merge |
| Phase 3 | RoadDesignDocument・drawing（#153・#155） | main merge |
| Phase 4 | LDIST/HAUNCH/HOSO・drawing persistence（P4-D01..D07・#157-#163） | main merge |
| Phase 5 | 正式図面・DXF parity（P5-D02..D04） | main merge |
| X系列（X0-X4d） | geometry kernel・road rules・facade（research/liner-x*） | X0/X1/X1.8はmain merge・**X2-X4dは個別PRでは未merge** |
| phase3-0 integration | 3D viewer + mountain sample統合（#724-#726） | main merge |
| R1/R2・MTN・M3D | reference比較・mountain・3D（research/liner-*） | main merge |

## 2. 旧LINER正本候補の特定

- 旧LINERのコードは**現在のmainに完全残存**（frontend/src/liner 532ファイル・削除されていない）。
- mainはresearch branch（x4d等）の**superset**（geometry3d/output/visualがmain側に追加済み）。
- **正本候補 = 現mainの frontend/src/liner + backend/rule_engine**。
  - 根拠: mainのliner/coreファイル数37 ≧ x4dの34・mainのrule_engine/rulesにclearance/curve_length/superelevation_transition/wideningが追加済み。

## 3. 現Road Moduleの作成経路

- Phase 2-02..12 feature branch群（**PR #852-#862**）が新Road Module（frontend/src/next/modules/road）を構築。
  - phase2-02-horizontal(#852)・03-stationing(#853)・04-vertical(#854)・05-crosssection(#855)・06-width(#856)・07-intermediate(#857)・09-road3d(#859)・10-road-cim(#860)・12-e2e(#862)
- 新Road ModuleはLINER kernelをKEEP/ADAPT（再export wrapper）として構築。

## 4. backend/rule_engine の経路

- X2-X4d seriesでPython portとして開発（research/liner-x2..x4d）。
- 内容はmainへ統合された（phase3-0 integration経由でrule_engineがmainに入る）。
- しかし**backend/app/main.pyへは一切配線されていない**（/api/rules /api/road route無し・DORMANT）。

## 5. 各機能の遷移分類（KEEP/ADAPT/MOVE/REWRITE/DISCONNECT/DELETE）

| 機能 | 旧LINER | 現Road | 遷移 |
|---|---|---|---|
| 平面線形kernel | frontend/src/liner/core/geometry/* | road/horizontal.ts（再export） | **KEEP** |
| 縦断kernel | liner/core/vertical* | road/vertical.ts（再export） | **KEEP** |
| 測点kernel | liner/core/station/* | road/stationing.ts（再export） | **KEEP** |
| 横断kernel | liner/core/crossSection* | road/crossSection.ts（再export） | **KEEP** |
| 拡幅/crossfall | liner/core/width・grid | road/width.ts（再export） | **KEEP** |
| 統合パイプライン | liner/core/pipeline | road/intermediateResult.ts | **ADAPT** |
| 3D mesh | liner/core/geometry3d/visual | road/roadMesh.ts・roadCimGeometry.ts | **ADAPT/新規** |
| RoadDesignDocument | liner/adapters/linerDomainDraftRoadDesignMapper | contracts/roadDesignDocument.ts | **KEEP/ADAPT** |
| 入力UI（editor群13種） | liner/components/*Editor.tsx | **無し** | **DISCONNECT**（現Roadはview-only） |
| 正式図面/DXF | liner/drawing・dxf | **無し** | **DISCONNECT**（残存LINERのみ） |
| 2D/3D preview | liner/pages + visual | road preview（SVGのみ） | **ADAPT（簡略化）** |
| Save/Load | liner/adapters/linerProjectDraft（project.liner） | roadModuleAdapter（modules.road.data.roadInput） | **REWRITE**（新PDC経路） |
| Importer（PDF転記） | liner/importer | **無し** | **DISCONNECT**（残存LINERのみ） |
| backend rule_engine | backend/rule_engine（Python） | 新Road Moduleは使用せず | **DISCONNECT/DORMANT** |

## 6. 「旧UI非復活」方針の出所調査（最重要）

### 事実（A. Git/GitHubで確認できる事実）

- `docs/rebuild/phase2/R2-00_road_liner_audit.md`（Phase 2-00 既存道路/LINER資産監査・PR #847・2026-08-11）に明記:
  - 41行目: 「旧/pro/liner UI: 新システムの正規導線として復活させない。参照用に保全。」
  - 19行目: 「旧LINERを丸ごとコピーしない」
  - 74行目: 「旧/pro/liner UI: 新正規導線として復活させない」
- `docs/rebuild/phase2/R2-00_boundary_freeze.md`（Phase 2-A境界凍結）が同方針を引き継ぐ。

### 文書化された実装方針（B）

- 上記Phase 2-00監査が「既存道路/LINER資産を新統合システム（/app）のRoad Moduleへ正式接続する」方針を文書化。
- 判定基準 KEEP/ADAPT/REWRITE/DEFERで旧LINER資産を分類し、UIをDEFER（非接続）とした。

### ユーザー明示指示の証拠（C）

- **確認できなかった**。Phase 2-00監査書・Phase 2 design書に「ユーザーが旧/pro/liner UIを復活させないよう指示した」という記録・引用は見つからなかった。

### AI/実装側判断だった可能性（D）

- Phase 2-00監査は実装側（rebuild phase担当）の設計判断として文書化されている。
- 「新システムの正規導線」をModule Core（/app）とする方針は、rebuildアーキテクチャ（Project Data Core / Module Core）に基づく実装側判断と解釈される。

### 証拠不足でUNKNOWN（E）

- 旧/pro/liner UIを復活させない方針の「ユーザー明示指示」の有無は、本監査で確認できる範囲では**証拠が無い**。ユーザー指示があった可能性は否定できないが、文書・GitHub上で裏付けられない。

## 7. 結論

- **旧LINERは削除されていない**。UI・計算core・testsともmainに残存し、`/pro/linear-coordinate`+`/pro/liner/*`でroute接続済み。
- 新Road ModuleはLINER計算kernelをKEEP/ADAPTしたview-only計算パイプライン。**入力編集UIは非接続（DISCONNECT）**。
- 「旧UI非復活」はPhase 2-00監査（実装側設計判断・文書化済み）が起源。**ユーザー明示指示の証拠は無い**。
- backend/rule_engineはDORMANT（非配線のPython port）。
