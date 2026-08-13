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

| enum | 意味 | Phase 7-02 DOF拘束（下記§3.3唯一mapping table） |
|---|---|---|
| fixed | 固定支承 | §3.3参照（並進3拘束・回転は解放が既定） |
| movable | 可動支承 | §3.3参照（縦方向解放） |
| rubber | ゴム支承（弾性） | spring（弾性support）or §3.3既定（値が無ければmapping既定） |
| pot | pot支承 | **UNSUPPORTED（DEFER・明示）** |
| custom | カスタム | **NOT_AVAILABLE（明示）** |
| null | 未定義 | UNDECIDED（§3.3既定） |

### 3.3 fixedOrMovable → DOF拘束 mapping table（唯一・Freeze・Sol review #7/#8）

**本表を唯一のmapping tableとする**（全adapter・test・viewerから参照。他文書に別mappingを置かない）。

| fixedOrMovable | ux | uy | uz | rx | ry | rz | 備考 |
|---|---|---|---|---|---|---|---|
| FIXED | T | T | T | F | F | F | 固定支承＝**並進3拘束・回転解放**（grillageモデル化・#8。完全固定端は別扱い） |
| MOVABLE（縦可動） | F | T | T | F | F | F | 橋軸方向解放・橋軸直角+鉛直拘束（既定） |
| MOVABLE（縦横可動） | F | F | T | F | F | F | 両方向可動（設計条件で指定時） |
| UNDECIDED | F | T | T | F | F | F | **既定**（全支持・縦解放・D-08） |

- T=拘束（constrained）・F=解放（free）。
- **回転DOF（rx/ry/rz）はPhase 7-02で常に解放**（部材端は剛接合で回転伝達・#8）。
- **完全固定端**（全6DOF拘束）はsupportの別enum `constraintKind="FULL_FIXED"` として明示（bearing固定とは区別）。
- **唯一mappingのauthority**: `BearingSupportResolver`（Sol review #5・Phase7-01B_superstructure_adapter §10）が参照。

### 3.4 local→global変換（Freeze・Sol review #9）

- bearingのDOF拘束は**bearing local frame**（longitudinal/transverse/vertical）で定義。
- solver（KEEP）は**global bool DOF（ux/uy/uz）のみ**支持。
- **変換規則**:
  - local vertical(z) → global uz（常に一致）。
  - local longitudinal(x) → global ux（**skew=0時のみ正確**）。
  - local transverse(y) → global uy（同上）。
  - **skew≠0時**: 縦/横解放方向はglobal軸と一致しないため、`constraintApproximation="globalAxisApproximation"` を
    supportに明示し、global ux/uy解放で近似（工学的近似・明示記録・結果NOT_AUTHORIZED維持）。
  - 正確な斜角拘束はMPCを要するため**DEFER**（Phase 7-02では近似+明示）。
- **skip条件**: skew≠0かつ近似が不適切な場合 → `UNSUPPORTED_SKEW_BEARING` でfail-closed（WP-Dで確定）。

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

### 4.3 springIds（elastic support時）

- spring要素を持つsupportは `springIds: string[]` で複数参照（#10）。
- Phase 7-02: solverはspring supportを**剛性行列へ加算**（KEEP engine `assembly.py`へ最小ADAPT・詳細foundation_spring_release_mpc）。
  値が無い場合は§3.5のAUTHORIZED bearing拘束mapping（`springFallback="authorizedBearingConstraint"`）。

## 5. Spring Contract（Freeze・R4）

### 5.1 定義

| field | 値 |
|---|---|
| entityId | uuid5(analysis-namespace, `spring:{sourceEntityId}`) |
| sourceKind | spring |
| source | TRANSLATIONAL / ROTATIONAL |
| dof | ux / uy / uz / rx / ry / rz |
| coordinateSystem | local / global（既定: global） |
| stiffness | number（kN/m or kNm/rad・正有限）|
| valueState | CONFIRMED / SOURCE_NOT_AVAILABLE / NOT_AUTHORIZED / NOT_AVAILABLE |

### 5.2 zero / infinite表現

- **stiffness=0**: 剛性ゼロ = 解放（free DOF）を意味する。bool拘束とは独立。
- **stiffness=∞**: bool拘束（ux=true等）で表現。spring要素では表さない。
- 曖昧を避けるため、springは `valueState` で状態を明示。

### 5.3 solver実装（Phase 7-02・Sol review #11）

- **global spring**: 対角stiffness加算 `K[dof,dof] += k` をassemblyへ実装（KEEP engineへ最小ADAPT・WP-D所有・回帰責任明示）。
- **local spring**: **軸一致時のみ**対角加算。軸不一致（斜角）のlocal springは `TᵀKlocalT` によるglobal組立を契約化し、
  Phase 7-02で未実装の場合は `UNSUPPORTED_LOCAL_SPRING` でfail-closed（#11）。
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
