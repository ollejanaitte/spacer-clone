================================================================================
統合設計 Phase 4-00  既存橋梁配置資産監査（Bridge Layout 資産監査）
================================================================================
確定日: 2026-08-12
対象: 旧spacer-clone（main @ 09b16cf）既存資産
目的: Bridge Layout（Phase 4-02以降）実装前に、既存橋梁配置資産を洗い出し
      KEEP / ADAPT / REWRITE / DEFER を確定する。

--------------------------------------------------------------------------------
1. 監査対象・方法
--------------------------------------------------------------------------------
- 対象: 旧spacer-clone の bridge / bridgeDefinition / liner / bridgeProject /
  apollo / substructure / contracts / docs(liner, apollo step10, substructure-planning)
- 方法: 探索エージェント2系統（実装監査・文書/研究監査）＋ 現物確認
- 座標契約: docs/rebuild/phase3/R3-00_coordinate_origin_freeze.md（新正本・凍結済）

--------------------------------------------------------------------------------
2. 橋梁配置の基幹概念と対応資産
--------------------------------------------------------------------------------
- 橋梁区間 / start・end station .... bridgeProject（BpAlignment.bridgeStart/EndStation）
- A1 / A2 橋台・P1..Pn 橋脚 .... pierLineGeometry / BridgeLayoutSupport / BpSupport / substructure.Support
- pier station .................. PierDraft{physicalDistance} / BpSupport.stationM
- span length / span list ....... SpanDraft{start/endPhysicalDistance} / BpSpan / BridgeLayoutSpan{id,length}
- skew / 交角 ................... pierLineGeometry / bridgeLayoutSkew / skewAngleRad（符号規約が分散）
- bridge centerline ............. road alignment（liner horizontal）+ bridgeProject alignment
- girder line / 桁線 ............ superstructureAdapter / BSDD.girderLines / GeometrySnapshot.girderLines
- terrain reference ............. next/modules/terrain（Phase 3完遂・新正本）
- existing reference ............ next/modules/existingConditions（Phase 3完遂・新正本）
- coordinate conversion ......... coordinate3d.ts(pointAtStationOffset) / threeCoords.ts / R3-00 freeze
- 3D bridge placement ........... apollo/geometry/placement.ts（placeSupportLines/placeGirderLines）

--------------------------------------------------------------------------------
3. KEEP / ADAPT / REWRITE / DEFER 一覧
--------------------------------------------------------------------------------
| asset / file / concept          | 現在の役割                                     | 判定   | 理由                                                    | 再利用方法                                     | Bridge Layoutとの関係                   | リスク                          | 対応Phase |
|---------------------------------|------------------------------------------------|--------|---------------------------------------------------------|------------------------------------------------|------------------------------------------|--------------------------------|-----------|
| liner/core/geometry/horizontal.ts | straight/arc/clothoid 線形評価（C0/C1連続）     | KEEP   | 既存KEEP_AS_CANONICAL、next/roadから再export実績         | 直接参照（再export経由）                          | road alignment reference（配置の母体）     | 低                              | 4-02以降  |
| liner/core/coordinate3d.ts pointAtStationOffset | station+offset→3D座標/azimuth/localFrame の唯一正本 | KEEP | 全配置レイヤが委譲する既存規約                           | 直接参照                                      | bridge centerline / support 座標の核心    | 低                              | 4-02以降  |
| next/modules/road/roadCimGeometry・roadMesh | Road CIM（中心線+サーフェス）                     | KEEP   | Phase 2で確定済み                                       | 直接参照                                      | 同一Project座標系で橋梁を重ねる相手       | 低                              | 4-02以降  |
| next/modules/terrain/*          | Terrain正本（TIN/surface/3D）                     | KEEP   | Phase 3で確定済み                                       | 直接参照                                      | terrain reference                        | 低                              | 4-02以降  |
| pierLineGeometry.ts / bridgeLayoutSkew.ts | skew（斜角）のrad正規化・方向導出          | ADAPT  | 符号規約がliner/bridgeProject/substructureで分散           | 新Bridge Layout契約のskew正規化関数として取込   | skew / 交角                              | 符号規約統一が必要                 | 4-02      |
| liner/schema/types.ts SpanDraft/PierDraft | stationベース支間・橋脚の入力スキーマ           | ADAPT  | physicalDistanceベース・provenance/status非保有            | 新BridgeLayoutDocumentの入力sourceとして写像     | span/pier入力                            | value-status未統合                 | 4-02      |
| bridgeProject/types.ts BpSupport/BpSpan/alignment | provenance付きの中間橋梁表現                      | ADAPT  | 完成度が高くCBDMへの橋渡しに最適。BpCoordinateSystem整合確認のみ | 参照先として直接利用                          | start/end station・A1/A2・P1..Pn・span    | R3-00 freezeとの突合のみ           | 4-01〜    |
| apollo/contracts/layoutTypes.ts BridgeLayoutContract | 最小配置契約（spans/supports）                    | ADAPT  | 既に鋼鈑桁橋Goldenと数値一致。girder/skew/bearing未収容      | 新契約の基盤として拡張                        | BridgeLayoutContractの最小骨格            | 拡張が必要                        | 4-01      |
| apollo/contracts/layoutValidation.ts | validateBridgeLayoutContract（支点数/station順/累積長） | KEEP | 検証ロジックが鋼鈑桁橋Goldenと一致・テスト済み              | 新runtime validationの基盤として取込          | validation境界                          | 低                              | 4-01      |
| apollo/geometry/placement.ts GeometrySnapshot | 支持線・主桁線の3D配置と出力正本                 | ADAPT  | 宣言入力前提（spanLengthsM等）で入力形式が異なる            | 新BridgeLayoutDocument→配置engine入力のadapter | 3D bridge placement（後続・DEFER寄り）   | 入力契約の差異                     | 4-03〜    |
| coordinate3d.ts / frame.ts / crossSectionZMerge | 座標変換・フレーム合成                            | KEEP   | X4A監査でKEEP_AS_CANONICAL                             | 直接参照                                      | bridge-local/global変換                  | 低                              | 4-02〜    |
| threeCoords.ts（domainToThree） | domain→Three表示変換                             | ADAPT  | 表示責任・R3-00 freezeと同一規約。Phase 3-FixでnextのRender Adapterへ委譲済 | 共通Render Coordinate Adapter参照        | 3D表示全般                                | 低                              | 済        |
| bridgeDefinition/types.ts BridgeDefinition | stationベース意匠モデル（supports/spans/girders） | REWRITE | 座標を持たずcoordinatePolicyのframeが曖昧                   | 概念（station参照のみ）のみ流用・実装は新契約で書き直し | 意匠層（後続）                           | frame曖昧さ                       | 4-03〜    |
| substructure/model.ts Support / SupportPlacementEngine | pier/abutmentの配置snapshot計算                    | ADAPT  | x-longitudinal-y-transverse-z-up・P02 freeze準拠            | 下部工handoff境界で参照                        | 下部工へのhandoff（配置情報）             | skew符号の統一                     | 4-03      |
| contracts/bridgeProject.ts sharedFacts.supports | 配置事実の共有（station/offset/skew/elevation/bearingSeats） | ADAPT | クロスドメインhandoffに最適                                 | 新Contractのhandoff境界で参照                 | 下部工/上部工handoff                     | 中                              | 4-01〜    |
| roadToFrameTransferPackage.ts  | span端点をsubstructure/bearing-line参照で定義      | ADAPT  | 概念優良・UUID依存グラフが重い                             | 概念（span端点=参照）のみ流用                 | spanの端点定義                            | 重い契約                          | 4-02      |
| viewer/coordinateTransform.ts  | SpacerAxisSwap表示変換                            | ADAPT  | 表示責任のみ                                              | 表示変換ポリシーとして参照                    | 表示変換                                | 低                              | 済        |
| bridge/*（旧Bridge Wizard）    | 旧レガシー橋梁設計（局所・直線前提）              | REWRITE| station概念が薄く新座標系と非整合                             | 概念のみ（span/lines/FEM生成）                 | 参考のみ                                 | 旧座標系との混同                   | 使わない  |
| backend/engine/bridge_fem_generator.py | 旧直結FEM生成（station→X, offset→Y, Z=0）          | REWRITE| 単一正本（GeometrySnapshot）化のため書き直しが必要          | 後続Phase（FEM）でsnapshot消費型へ             | 上部工解析（後続）                       | 旧Z=0仮定                          | 後続      |
| JIP-LINERピア設定9方式           | ピア設定の設計意図（現行は2方式のみ実装）          | ADAPT  | GAP-400/401で方式3-9未実装・配置UIとして流用可              | 配置入力UIの仕様として採用                    | pier設定UI（4-03）                       | 実装量                              | 4-03      |
| JIP-LINER折れ桁/円弧桁（JIP-702）| 曲線橋・折れ桁設定                                | DEFER  | GAP-405 ABSENT・曲線橋はstraight-only確認済み               | -                                              | 曲線橋対応（後続Phase）                  | 低（対象外）                       | 後続      |
| ROAD_TO_BRIDGE_MAPPING.csv / ROAD_BRIDGE_INTERFACE_SPEC | 道路→橋梁8インターフェース（ALIGNMENT/STATION/COORDINATE/PROFILE/CROSSFALL/WIDTH/SKEW/ALIGNMENT_ELEMENT） | KEEP | ハンドオフ入力契約の正本                                   | 新ContractのroadReference境界として参照        | Road→Bridge参照境界                      | 低                              | 4-01      |
| reference_bridge_001（鋼鈑桁橋Golden）| 橋長134.001m・支間40.201+51.000+40.200・AG1/AG2・格点・支承 | KEEP | 配置データ構造（bridge range/span list/support/skew/girder）の実値正本 | テストfixtureとして利用                       | validation・Golden照合                   | 測点未抽出（HUMAN_CONFIRMATION）   | 4-01〜    |
| phase6_0 coordinates契約（6契約+変換行列） | station→X/offset→Y/elevation→Z等16変換              | KEEP   | FROZEN・座標系/単位/skew/crossfallの一元正本                 | 新Contractのcoordinate節で参照                 | coordinate変換境界                        | 低                              | 4-01      |
| substructure-planning exchange_schema（support-interface.json） | supportId/supportType/position/3軸/skewAngle/bearingSeats の交換スキーマ | ADAPT | fail-closed・下部工出力先として流用可                        | 下部工handoff境界で参照                        | 下部工handoff                             | 低                              | 4-03      |

--------------------------------------------------------------------------------
4. 重要な発見・決定事項
--------------------------------------------------------------------------------
1. 最小配置契約は既に存在（apollo/contracts/layoutTypes.ts + layoutValidation.ts）。
   鋼鈑桁橋Goldenと数値一致。Phase 4-01はこれを基盤として新正本へ発展させる。
2. 「3D bridge placement」のロジック本体は apollo/geometry/placement.ts にあり、
   その座標計算は coordinate3d.ts(pointAtStationOffset) へ全層が委譲する既存規約。
   Bridge Layoutもこの規約に従う（線形計算の再実装禁止）。
3. 新システム側の座標契約は R3-00 freeze（x-longitudinal/y-transverse/z-up、
   three変換 x→x/y→z/z→-y、Project/Local Origin分離、metric）で確定済み。
   既存bridge資産の座標系と整合。
4. skew符号規約が複数箇所に分散（liner: left normal→tangent / bridgeProject: rad右正
   transverse / bridgeDefinition: skewAngleDeg / substructure: +Z CCW正）。
   Phase 4-01で単一符号規約を明文化する。
5. 旧Bridge Wizard（frontend/src/bridge/*）は station概念が薄く局所座標固定のため
   新正本には採用しない。bridgeProject系とapollo/geometry系を正本の参照先とする。

--------------------------------------------------------------------------------
5. 判定サマリ
--------------------------------------------------------------------------------
- KEEP  : 道路線形計算 / pointAtStationOffset / Road・Terrain CIM / layoutValidation /
          鋼鈑桁橋Golden / phase6_0 coordinates契約 / ROAD_BRIDGE_INTERFACE_SPEC
- ADAPT : PierDraft/SpanDraft / BpSupport/BpSpan / BridgeLayoutContract / GeometrySnapshot /
          SupportPlacementEngine / sharedFacts.supports / JIP-LINERピア設定意図 / exchange_schema
- REWRITE: BridgeDefinition(概念流用) / 旧Bridge Wizard / 旧FEM generator
- DEFER : JIP-LINER折れ/円弧桁 / 張出し詳細 / 中間格点 / 曲線橋自動配置 / 下部工正式照査

--------------------------------------------------------------------------------
6. Bridge Layout（Phase 4-01）への接続
--------------------------------------------------------------------------------
- 入力: 新Road Module（Alignment/Station/Coordinate/Elevation）を参照。
  線形計算はliner coreへ委譲（再実装禁止）。
- 正本: BridgeLayoutDocument（新規）。BridgeLayoutContract最小骨格 + ADAPT資産を統合。
- 参照: Terrain / Existing（next/modules）をID/referenceで参照。
- handoff: 下部工（substructure Support / exchange_schema）、
  上部工（GeometrySnapshot / sharedFacts.supports）へ配置情報を渡す境界を定義。
================================================================================
