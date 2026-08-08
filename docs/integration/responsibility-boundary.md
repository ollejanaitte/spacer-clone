# 責任分界表 — Owner / Source of Truth

> **Phase:** P2
> **方針:** 「共有すべき設計事実」と「各専門モジュール内部の計算途中値」を分離する。
> BridgeProject に何でも押し込まない。
> **領域:**
> 1. `ALIGNMENT_OWNER` — ①道路線形が正本
> 2. `SUPERSTRUCTURE_OWNER` — ②上部工が正本
> 3. `SUBSTRUCTURE_OWNER` — ③下部工が正本
> 4. `BRIDGE_PROJECT_SHARED` — 共通 BridgeProject が正本・共通契約として保持

## 凡例

- **owner**: 将来の責任領域（上記4領域）
- **SoT**: source of truth（正本の置き場所）
- **再計算**: 他の module が再導出してよいか（OK=非破壊で導出可 / NO=正本のみ / DERIVED=正本から決定論的に導出）
- **Adapter**: BridgeProject Adapter を経由して渡すか（yes / no）
- **status**: 現状の状態区分（下記）

status 候補（[value-status-unit-policy.md](value-status-unit-policy.md) にて確定）:
`CONFIRMED` 原本/入力確認済み / `DERIVED` 現行モデルから決定論的導出 /
`INFERRED` 推定 / `MISSING` 不足 / `DEFERRED` 保留 / `NOT_AUTHORIZED` 未認証

---

## 1. ALIGNMENT_OWNER（①道路線形が正本）

| 項目 | 現在の実装場所 | 現在の生成元 | 現在の利用先 | 将来owner | SoT | 単位 | 再計算 | Adapter | 現状問題 | 移行方針 |
|------|----------------|--------------|--------------|-----------|-----|------|--------|---------|----------|----------|
| station（測点） | ①`GeneratedStation` core/types.ts:186-193 | ① station 定義から導出 | ②AlignmentReference / ③SupportPlacement | ALIGNMENT_OWNER | ①（RDD+extension） | m | DERIVED | yes | RDD 本体は参照のみ、実測点は extension | CBDM.alignments + station を BridgeProject 経由で公開 |
| X / Y / Z | ①`Vec3` core/types.ts:10-19 | ①要素評価（evaluateAlignmentAtDistance） | ②GeometrySnapshot / ③SupportPlacementSnapshot | ALIGNMENT_OWNER | ①（決定論的導出値） | m | DERIVED | yes | ②はハードコード直線で代用中 | ②は LINER Coordinate3dInput を直接消費（WF-01 binding 実装） |
| tangent / heading / azimuth | ①`azimuth` core/types.ts:136 | ①要素定義 | ②crossSectionFrame / ③skew 適用 | ALIGNMENT_OWNER | ① | rad | DERIVED | yes | ②③は azimuth を source 値として保持せず | BridgeProject の alignment 値に azimuth を公開 |
| 平面線形（straight/arc/clothoid） | ①`LinearAlignment` core/types.ts:162-167 | ①ユーザー入力 | ②/③は近似（LinerAlignmentConnector） | ALIGNMENT_OWNER | ① | m / rad | NO（正本のみ） | yes（参照） | ②は曲線近似の deferred あり | ②へは station→XYZ/azimuth のみ渡し、要素定義は①に閉じる |
| 縦断（grade/parabolic） | ①`VerticalElementDraft` schema/types.ts:373-405 | ①ユーザー入力 | ②（未消費） | ALIGNMENT_OWNER | ① | ratio | NO | yes | ②は縦断を未消費（deck elevation ハードコード） | ②の deck elevation 導出を BridgeProject 経由の縦断値から |
| 横断勾配 / crossfall | ①`CrossSlopeIntervalDraft` schema/types.ts:423-431 | ①ユーザー入力 | ②crossfallPercent（未消費） | ALIGNMENT_OWNER | ① | % | NO | yes | ②で crossfall 未使用、符号規約が signConventions で定義のみ | 符号規約を BridgeProject で一元公開 |
| width / offset（幅員） | ①`WidthChangePointDraft` schema/types.ts:546-551 | ①ユーザー入力 | ③（bearingSeats 手動） | ALIGNMENT_OWNER | ① | m | NO | yes | ②③は幅員を独自入力 | 幅員の横断形を BridgeProject の alignment 値に公開 |

## 2. SUPERSTRUCTURE_OWNER（②上部工が正本）

| 項目 | 現在の実装場所 | 現在の生成元 | 現在の利用先 | 将来owner | SoT | 単位 | 再計算 | Adapter | 現状問題 | 移行方針 |
|------|----------------|--------------|--------------|-----------|-----|------|--------|---------|----------|----------|
| 主桁（main girder）断面・配置 | ②BSDD structuralDesignModel / `generateBsdd.ts` | ② autoDesign（PENDING_AUTHORIZATION） | ②3D / ③superstructureEnvelope | SUPERSTRUCTURE_OWNER | BSDD | m / kN | DERIVED | yes（参照） | 断面候補のみ、adoption PENDING | BSDD を正本とし、BridgeProject は参照 |
| 床版（deck） | ②`DeckReference` geometry/types.ts:164-186 / BSDD deck | ②入力 | ②3D / ③envelope | SUPERSTRUCTURE_OWNER | BSDD | m | NO | yes | 幅/厚がハードコード＋golden 両方 | BridgeProject の shared fact として橋長/幅を公開し、厚・断面は BSDD |
| 支承（bearing） | ②`BearingPoint` geometry/types.ts:188-195 | ② geometry engine | ③bearingSeats | SUPERSTRUCTURE_OWNER | BSDD | m | DERIVED | yes | ③へは support-interface 手動 | 支承配置を BridgeProject の bearing 値として③へ |
| 横桁 / ハンチ | ②BSDD crossMembers / Haunch | ②入力・生成 | ②3D | SUPERSTRUCTURE_OWNER | BSDD | m | DERIVED | no | 横桁3D長さハードコード | BSDD 内に閉じる |
| 上部工設計照査（checks） | ②`design/checkFramework.ts:36-79` | ②（全 NOT_AUTHORIZED） | ②Report | SUPERSTRUCTURE_OWNER | BSDD designStatus | — | NO | no | 未認証 | 認証後のみ BridgeProject へ status 通知 |
| 数量（volumes） | ②`design/designOutput.ts` | ②幾何から導出 | ②Report | SUPERSTRUCTURE_OWNER | BSDD | m³ | DERIVED | no | 概算のみ | BSDD 内 |

## 3. SUBSTRUCTURE_OWNER（③下部工が正本）

| 項目 | 現在の実装場所 | 現在の生成元 | 現在の利用先 | 将来owner | SoT | 単位 | 再計算 | Adapter | 現状問題 | 移行方針 |
|------|----------------|--------------|--------------|-----------|-----|------|--------|---------|----------|----------|
| 橋脚（pier）形状 | ③`PierData` model.ts:96-109 | ③入力（or サンプル既定値） | ③3D / ③計算 | SUBSTRUCTURE_OWNER | ③ SubstructureProject | m | NO | yes（参照） | LINER 由来は station/skew のみで形状はサンプル | 形状は③内部、配置は BridgeProject shared から |
| 橋台（abutment）形状 | ③`AbutmentData` model.ts:118-132 | ③入力 | ③3D / ③計算 | SUBSTRUCTURE_OWNER | ③ | m | NO | yes（参照） | 同上 | 同上 |
| 基礎（foundation / pile） | ③`PileGroup` model.ts:87-94 | ③入力 | ③3D / ③計算 | SUBSTRUCTURE_OWNER | ③ schemas/substructure/foundation | m / 本 | NO | yes（参照） | 配置は単純格子近似 | ③内部 |
| 下部工設計計算（正式） | ③`design/designEngine.ts`（全て HOLD） | ③（未実装） | ③Result | SUBSTRUCTURE_OWNER | ③（将来 DesignResult） | kN / MPa | NO | no | 正式 engine 未実装、Test/Mock のみ | Design engine 実装時に A-01 契約を維持 |
| 下部工3D | ③`SubstructureSolidGenerator.ts` | ③幾何から導出 | ③3D viewer | SUBSTRUCTURE_OWNER | ③ | m | DERIVED | no | 表示のみ | ③内部 |

## 4. BRIDGE_PROJECT_SHARED（共通 BridgeProject が正本）

| 項目 | 現在の実装場所 | 現在の生成元 | 現在の利用先 | 将来owner | SoT | 単位 | 再計算 | Adapter | 現状問題 | 移行方針 |
|------|----------------|--------------|--------------|-----------|-----|------|--------|---------|----------|----------|
| 橋長 | ②AlignmentReference / ①SpanDraft / CBDM | 複数 | ②/③ | BRIDGE_PROJECT_SHARED | **CBDM** | m | NO | yes | ①②が別保持、CBDM fixture は空 | CBDM.bridgeGeometry を正本化し、①②は読み出し |
| 支間 | ②spanLengthsM / ①SpanDraft / CBDM | 複数 | ②/③ | BRIDGE_PROJECT_SHARED | **CBDM** | m | NO | yes | 同上 | 同上 |
| 支持線 / 支持位置 | ②SupportLine / ③Support / CBDM | ②geometry engine | ②3D / ③配置 | BRIDGE_PROJECT_SHARED | **CBDM**（station/skew/elevation） | m / rad | DERIVED | yes | ③へ複数流入経路 | BridgeProject の shared support 値へ一本化 |
| 斜角 | ①PierDraft / ②SupportLine.skewRad / ③Support.skewRad | ①入力（golden） | ②/③ | BRIDGE_PROJECT_SHARED | **CBDM**（rad 正準） | rad | NO | yes | 符号規約が複数 | CBDM の skew 値を正本化、deg は sourceUnit |
| 主桁線 / 主桁間隔 | ②GirderLine / CBDM.girders | ②入力 | ②3D / ③envelope | BRIDGE_PROJECT_SHARED（配置） | **CBDM** | m | DERIVED | yes | ②独自導出 | 配置は CBDM、断面は BSDD |
| 支点反力 | ③SupportReactions（入力） / BFAD result | ②分析（未認証） | ③照査（将来） | BRIDGE_PROJECT_SHARED | BFAD result resource | kN | DERIVED | yes | 未認証、語彙不整合（caseKind vs loadCaseId） | 認証後に result resource を正本化し③へ |
| 座標系・単位コンテキスト | coordinate-context / unit-context（契約層） | 定義 | 全ツール | BRIDGE_PROJECT_SHARED | 契約層 | — | NO | yes | ②③は domain 系、Three.js は y-up 変換が2系統 | BridgeProject で canonical（x-longitudinal/z-up/m/rad）を宣言 |
| 3D ペイロード契約 | ①BridgeGeometry3dPayload（RESEARCH）/ ②ApolloVisualizationModel | 各ツール | 各 viewer | BRIDGE_PROJECT_SHARED（契約のみ） | 契約層（runtime 参照） | m | DERIVED | yes（参照） | 契約に無い | Model3D は契約外の runtime payload とし参照のみ |
| プロジェクト manifest | engineering-project（契約層） | 定義 | — | BRIDGE_PROJECT_SHARED | engineering-project | — | NO | yes | superstructure/substructure 参照が無い | BridgeProject doc が工程 manifest を統括 |

## 5. 各計算処理の責任

| 計算処理 | 実装箇所 | owner | 正本 | 備考 |
|----------|----------|-------|------|------|
| station→XYZ / azimuth / curvature | ①`core/geometry/*` | ALIGNMENT_OWNER | ① | ②③は再実装禁止（AlignmentConnector で消費） |
| grade / crossfall 評価 | ①`core/geometry/vertical.ts` 等 | ALIGNMENT_OWNER | ① | |
| 支持線配置（skew 適用） | ②`geometry/placement.ts` | BRIDGE_PROJECT_SHARED（配置導出） | CBDM | ③は再計算しない（shared support 値を使う） |
| 主桁線・格点配置 | ②`geometry/{gridPoints,members}.ts` | SUPERSTRUCTURE_OWNER（配置） | CBDM→BSDD | 中間格点は HOLD |
| 断面・設計照査 | ②`design/*` | SUPERSTRUCTURE_OWNER | BSDD | NOT_AUTHORIZED |
| 反力（解析） | ②`backend/engine/grillage.py` | SUPERSTRUCTURE_OWNER（生成）→BRIDGE_PROJECT_SHARED（正本化） | BFAD result | NOT_GRANTED |
| pier/abutment 配置（station/skew→座標） | ③`SupportPlacementEngine.ts` | BRIDGE_PROJECT_SHARED（shared support から導出） | CBDM | 実行時未配線 |
| 下部工照査 | ③`design/designEngine.ts` | SUBSTRUCTURE_OWNER | ③ | 未実装（HOLD） |

## 6. 主な決定

1. **共有設計事実の正本は CBDM**（橋長・支間・支持・斜角・主桁配置）。BridgeProject はその
   オーナー・status を宣言する統括契約。
2. **専門計算途中値は各 owner の文書に閉じる**（BSDD / substructure project）。BridgeProject には入れない。
3. **①の線形は①に閉じ、②③は station→XYZ/azimuth/grade を消費するだけ**（再実装禁止）。
4. **反力は BFAD result resource を正本化**。認証されるまでは status=NOT_AUTHORIZED で fail-closed。
5. **3D は契約外**（runtime payload）。共通の座標変換規約のみ BridgeProject で宣言。
6. **road-to-frame-transfer-package は将来の①→②正規経路**として残し、現行の headless frame project は
   暫定経路と明記する。
