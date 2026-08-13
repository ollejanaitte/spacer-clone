# Phase 7-01B: Bearing / Support / Spring Contract（設計Freeze）

- Phase: 7-01 Step B
- baseline: `f736d5d4326248fed42f60679a6d6bb602f5e5d6`
- 日付: 2026-08-13
- 凍結: Design Decision D-05 / D-08 / D-09 / D-11
- 対応R: R4 / R5

## 1. 目的

Bearing（支承）・Support（支持）・Spring（弾性バネ）の責任境界とmapping規則を完全凍結する。

- 上部工 `bearingConfiguration.bearingSeats`（bearingType/fixedOrMovable）と下部工 `bearingReactionReferences.bearingSeats` の両方に対応。
- Phase 5 SuperstructureHandoff（v1.0.0）とのfield-level整合を保証。

## 2. 座標・単位・符号（Freeze）

| 項目 | 値 |
|---|---|
| 座標系 | project-global XYZ（m）・right-handed・z up |
| 局所軸 | x=longitudinal（+station）/ y=transverse（+R）/ z=vertical（+up） |
| 単位 | 力 kN・モーメント kNm・剛性 kN/m or kNm/rad・角度 rad |
| 反力符号 | +z up-positive（上部工を持ち上げる向き） |
| moment符号 | right-hand-rule |
| skew符号 | counterclockwise-positive（+Z軸回り） |

## 3. Bearing Contract（Freeze）

### 3.1 識別・ID

| field | 値 |
|---|---|
| seatId | `BRG-{supportId}-{girderId}`（唯一・canonical） |
| entityId | uuid5(analysis-namespace, `bearing:{seatId}`)（D-11） |
| sourceEntityId | seatId |
| sourceKind | bearingSeat |

### 3.2 bearing種別

| enum | 意味 | Phase 7-02 DOF拘束 |
|---|---|---|
| fixed | 固定支承 | 全DOF拘束（ux,uy,uz,rx,ry,rz = true） |
| movable | 可動支承 | 橋軸方向(x)解放・他拘束（uz,uy + 回転はモデル依存） |
| rubber | ゴム支承（弾性） | spring（弾性support）or bool拘束（値が無ければNOT_AVAILABLE） |
| pot | pot支承 | 未対応→UNSUPPORTED（DEFER）or movable扱い（明示） |
| custom | カスタム | NOT_AVAILABLE（明示） |
| null | 未定義 | UNDECIDED（下記default） |

### 3.3 fixedOrMovable → DOF拘束 mapping table（D-08 Freeze）

| fixedOrMovable | ux | uy | uz | rx | ry | rz | 備考 |
|---|---|---|---|---|---|---|---|
| FIXED | T | T | T | T | T | T | 固定支承 |
| MOVABLE（縦可動） | F | T | T | F | F | F | 橋軸方向解放・橋軸直角+鉛直拘束（既定） |
| MOVABLE（縦横可動） | F | F | T | F | F | F | 両方向可動（設計条件で指定時） |
| UNDECIDED | F | T | T | F | F | F | **既定**（全支持・縦解放・D-08） |

- T=拘束（constrained）・F=解放（free）。
- 回転拘束はモデル化方針により変更可（FEM model contractで定義）。Phase 7-02既定は上表。

### 3.4 rubber支承の扱い（R4・D-09）

- rubber支承は**弾性spring**としてモデル化する契約。
- 剛性値（縦/横/回転）がsourceに存在する場合のみCONFIRMED。
- **値が無い場合**: `valueState=SOURCE_NOT_AVAILABLE` → **解析modelではbool拘束（UNDECIDED既定）にフォールバックし、source記録**（補完しない）。
- フォールバック時は `analysisStatus` に注意（NOT_AUTHORIZED維持）。

## 4. Support Contract（Freeze）

### 4.1 識別

| field | 値 |
|---|---|
| entityId | uuid5(analysis-namespace, `support:{supportId}-{girderId}` or `support:{supportId}`) |
| sourceEntityId | `{supportId}-{girderId}` / `{supportId}` |
| sourceKind | bearingSeat / bridgeLayoutSupport / substructureSupport |
| nodeId | 対応Analysis node（supportPoint:{supportId}:{girderId}） |

### 4.2 constraint（bool DOF）

- `{ux, uy, uz, rx, ry, rz: boolean}`（§3.3 mapping結果）。
- supportのsource種別を記録（FROM_BEARING / FROM_SUPPORT / FROM_BEARING_DEFAULT）。

### 4.3 springId（elastic support時）

- spring要素を持つsupportは `springId` で参照。
- Phase 7-02: solverはspring supportを**剛性行列へ加算**（assembly ADAPT・詳細foundation_spring_release_mpc）or bool fallback。

## 5. Spring Contract（Freeze・R4）

### 5.1 定義

| field | 値 |
|---|---|
| entityId | uuid5(analysis-namespace, `spring:{sourceEntityId}`) |
| source | TRANSLATIONAL / ROTATIONAL |
| dof | ux / uy / uz / rx / ry / rz |
| coordinateSystem | local / global（既定: local=bearing local frame） |
| stiffness | number（kN/m or kNm/rad・正有限）|
| valueState | CONFIRMED / SOURCE_NOT_AVAILABLE / NOT_AUTHORIZED / NOT_AVAILABLE |

### 5.2 zero / infinite表現

- **stiffness=0**: 剛性ゼロ = 解放（free DOF）を意味する。bool拘束とは独立。
- **stiffness=∞**: bool拘束（ux=true等）で表現。spring要素では表さない。
- 曖昧を避けるため、springは `valueState` で状態を明示。

### 5.3 solver実装（Phase 7-02）

- **elastic support（spring）**: 対角stiffness加算 `K[dof,dof] += k` をassemblyへ実装（KEEP engineへ最小ADAPT）。
- 回転spring: `K[dof,dof] += k_rot`（kNm/rad）。
- サポートされない場合（MPC等）はDEFER（契約のみ）。

## 6. Phase 5 Handoffとの対応（field-level Freeze）

| Phase 5 SuperstructureHandoff | AnalysisDocument | 変換 |
|---|---|---|
| `supports[].supportId` | support.sourceEntityId | 直写し |
| `supports[].position` | node xyz | 直写し（m） |
| `supports[].skewAngleRad` | coordinateContext | CCW positive |
| `supports[].localFrame` | support.localFrame | tangent/transverse/vertical |
| `bearingSeats[].seatId` | bearing.sourceEntityId | 直写し |
| `bearingSeats[].position` | bearing.position | project-global XYZ |
| `bearingSeats[].orientation` | bearing.localFrame | 実frame |
| `bearingSeats[].bearingType` | bearing.bearingType | enum一致 |
| `bearingSeats[].fixedOrMovable` | bearing.fixedOrMovable | §3.3 mapping |
| `reactionCases[].Fz` | 下部工側（解析に含めない） | NOT_AUTHORIZED入力として維持 |

## 7. validation / fail-closed

| 項目 | 挙動 |
|---|---|
| seatId重複 | reject |
| supportId・girderIdが存在しない | reject（dangling） |
| local frame非正規（非直交） | reject |
| spring値非正 | reject（負剛性等） |
| 未対応bearingType（pot等） | UNSUPPORTED（明示）or movable既定（明示） |

## 8. tests観点

- mapping table全ケース（FIXED/MOVABLE/UNDECIDED/rubber）
- rubber spring（CONFIRMED/NOT_AVAILABLE fallback）
- zero/infinite表現
- 回転spring・local/global変換
- Phase 5 Handoff field-level mapping
- fail-closed（dangling/非正規）
