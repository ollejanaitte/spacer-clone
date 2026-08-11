================================================================================
Phase 2-A  2-00  既存道路/LINER資産監査（KEEP / ADAPT / REWRITE / DEFER）
================================================================================
監査日: 2026-08-11

--------------------------------------------------------------------------------
1. 監査対象と方針
--------------------------------------------------------------------------------
新統合システム（/app）のRoad Module（Phase 1で確立したModule Core上のroad領域）へ、
既存の道路/LINER資産を正式接続するための事前監査。

判定基準:
- KEEP   : 原則そのまま再利用可能
- ADAPT  : 有効だが新Module Core / Project Data Coreへ合わせた改修が必要
- REWRITE: 現構造では新システムへ持ち込むべきでなく再実装すべき
- DEFER  : Phase 2-Aでは扱わず後続Phaseへ送る

注意:
- 旧LINERを丸ごとコピーしない
- 「実装済み」と「型だけ存在」を区別
- current fact（実在コード・実在tests）とhistorical/proposalを分離
- 現状とtarget architectureを分離

--------------------------------------------------------------------------------
2. 監査一覧
--------------------------------------------------------------------------------
| Asset | Path | 現況 | 判定 | 理由 | 次Phase |
|------|------|------|------|------|--------|
| RoadDesignDocument型 | frontend/src/contracts/roadDesignDocument.ts | 実装済み（650行・型+validation関数） | ADAPT | road領域正本として利用価値が高いが、Phase 1 ModuleDataRecordの{state,data,validation}構造へ包んで格納する必要がある。detectForbiddenRoadFrameMechanicsKeys等は流用可。 | 2-A（本Step） |
| validateRoadDesignDocument | frontend/src/contracts/roadDesignDocument.ts | 実装済み | ADAPT | 現行validation（schemaId/必須field検証）は有効。Module validationとしてwrapper経由で再利用。 | 2-A |
| RoadDesignDocument読み書きAdapter | frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts | 実装済み | DEFER | 旧LINER draft→RoadDesignDocument変換。新Module Core用の直接AdapterはPhase 2-Aで新設する。既存mapperは旧draft由来の参照として保全。 | 2-02以降 |
| 平面線形（Straight/Arc/Clothoid） | frontend/src/liner/core/geometry/{line,arc,clothoid,horizontal}.ts | 実装済み+テストあり | DEFER | 幾何計算本体はPhase 2-02平面線形Core移植で扱う。Phase 2-Aでは接続のみ。 | 2-02 |
| 測点計算（station） | frontend/src/liner/core/station/*.ts | 実装済み | DEFER | 測点計算本体は後続Phase。 | 2-02以降 |
| 縦断計算 | frontend/src/liner/core/vertical*.ts | 実装済み | DEFER | 縦断本体は後続Phase。 | 2-02以降 |
| 横断計算 | frontend/src/liner/core/crossSection*.ts | 実装済み | DEFER | 横断本体は後続Phase。 | 2-02以降 |
| 拡幅計算 | frontend/src/liner/core/width/ | 実装済み | DEFER | 拡幅本体は後続Phase。 | 2-02以降 |
| 2D Preview / 3D | frontend/src/liner/core/geometry3d/ frontend/src/liner/core/visual/ | 実装済み | DEFER | 2D/3D可視化は後続Phase。 | 2-02以降 |
| DXF / Drawing | frontend/src/liner/drawing/ frontend/src/liner/dxf/ | 実装済み | DEFER | 成果品系は後続Phase。 | 成果品Phase |
| Save/Load（旧LINER方式） | frontend/src/liner/importer/ | 実装済み | DEFER | 新システムはR1-04 Persistence / R1-05 Packageを正本とする。旧方式は参照保全。 | 後続 |
| Road validation（旧） | frontend/src/liner/schema/validateProjectLinerExtension.ts | 実装済み | ADAPT | 旧LINER拡張検証。Road Module validationの参考・流用可。 | 2-A |
| 旧/pro/liner UI | frontend/src/liner/pages/*.tsx | 実装済み | DEFER | 新システムの正規導線として復活させない。参照用に保全。 | 非接続 |
| backend road_geometry | backend/rule_engine/road_geometry/ | 実装済み（Python） | DEFER | Python backend road geometry。新システムのfrontend正本化方針では後続Phaseで判断。API接続はPhase 2-02以降。 | 2-02以降 |
| backend rule_engine | backend/rule_engine/rules/ | 実装済み | DEFER | ルールエンジンは後続Phase。 | 2-02以降 |
| legacy road adapter | frontend/src/contracts/legacy/road/adapter.ts | 実装済み | DEFER | 旧legacy変換。新Module接続では直接使用しない。 | 後続 |
| Module Core（Phase 1） | frontend/src/next/modules/ | 実装済み | KEEP | Module Contract/Registry/State/Adapter/Validation/Auto Saveが成立。Road Moduleはこの上へ接続。 | 2-A |

--------------------------------------------------------------------------------
3. KEEP
--------------------------------------------------------------------------------
- Phase 1 Module Core一式（contract/registry/state/adapter/validation/moduleService）
- Project Data Core / Persistence / Auto Save / Package（R1-02〜R1-05基盤）

--------------------------------------------------------------------------------
4. ADAPT
--------------------------------------------------------------------------------
- RoadDesignDocument型 + validateRoadDesignDocument（road領域正本として利用）
- 旧LINER拡張validation（参考流用）

--------------------------------------------------------------------------------
5. REWRITE
--------------------------------------------------------------------------------
（Phase 2-AではREWRITE判定の資産はない。
 旧LINERを丸ごとコピーしない方針のため、幾何計算本体はPhase 2-02以降で
 新Module Core規格に合わせて再構築・移植する。）

--------------------------------------------------------------------------------
6. DEFER
--------------------------------------------------------------------------------
- 平面線形Core（Straight/Arc/Clothoid/Composite/Offset/測点）: Phase 2-02
- 縦断（Grade/Parabolic）: Phase 2-02以降
- 横断（CrossSlope/CrossSection/Width/Widening）: Phase 2-02以降
- 2D Preview / 3D / Drawing / DXF: 後続Phase
- backend road_geometry / rule_engine: 後続Phase
- 旧/pro/liner UI: 新正規導線として復活させない

--------------------------------------------------------------------------------
7. current fact vs target proposal
--------------------------------------------------------------------------------
【現状（current fact）】
- RoadDesignDocumentは独立した契約型（road-design kind）として存在
- LINER資産は旧システム（/pro）配下で実装・テスト済み
- backendにPython road geometryがある
- 新システムのroad ModuleはPhase 1のDummy（length/labelのみ）

【目標（target）】
- RoadDesignDocumentを新システムのroad領域正本としてModule Data Core配下へ接続
- Road ModuleはModule Core規格（{state, data, validation}）で格納
- 旧LINER計算本体はPhase 2-02以降にModule規格へ移植
- 旧/pro/linerは正規導線としない

--------------------------------------------------------------------------------
8. 監査の裏取り（実コード・tests）
--------------------------------------------------------------------------------
- RoadDesignDocument型: frontend/src/contracts/roadDesignDocument.ts 実在・650行
- validateRoadDesignDocument: 同ファイル 実在
- 平面線形: frontend/src/liner/core/geometry/{line,arc,clothoid,horizontal}.ts + テスト実在
- 測点/縦断/横断: frontend/src/liner/core/ 配下 実在
- backend road_geometry: backend/rule_engine/road_geometry/{contracts,api,adapters}.py 実在
- Phase 1 Module Core: frontend/src/next/modules/ 実在・26テスト
================================================================================
