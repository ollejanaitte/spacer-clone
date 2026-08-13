# Phase 7-01B: Foundation Spring / Release / MPC Contract（設計Freeze）

- Phase: 7-01 Step B
- baseline: `f736d5d4326248fed42f60679a6d6bb602f5e5d6`
- 日付: 2026-08-13
- 凍結: Design Decision D-09 / D-16
- 対応R: R4 / R23

## 1. 目的

Foundation Spring（基礎地盤バネ）のContractと、Release / Constraint / MPCの契約定義を完全凍結する。
solver実装はPhase 7-02で対応するものとDEFERするものを明示。

## 2. Foundation Spring（R4解決）

### 2.1 定義

| field | 値 |
|---|---|
| entityId | uuid5(analysis-namespace, `spring:{sourceEntityId}`)（**kind統一=`spring`・Sol review #12**） |
| sourceEntityId | `foundation:{supportId}:{dof}` |
| sourceKind | foundationSpring |
| supportId | 対象support |
| nodeId | 対応Analysis node |
| direction | x / y / z（縦/横/鉛直）・回転はDEFER |
| coordinateSystem | global（下部工縦断/横断/鉛直に整合）or local |
| stiffness | number|null（kN/m） |
| valueState | CONFIRMED / SOURCE_NOT_AVAILABLE / NOT_AUTHORIZED / NOT_AVAILABLE |
| basis | 地盤定数source（N値・設計基準・載荷試験）またはnull |

### 2.2 source（Freeze）

- source候補: `SubstructureDocument.support.pier/abutment.footing/pileGroup` に地盤定数がある場合。
- 現状のSubstructureDocumentには**地盤ばね定数のfieldが存在しない**。
- **決定**:
  - Phase 7-02でSubstructureDocumentへ `foundationSpringConfiguration`（縦/横/鉛直のkN/m・source/provenance）を**任意fieldとして追加設計**。
  - 未設定時は `valueState=SOURCE_NOT_AVAILABLE` → **foundation springは使用しない**。
    解析modelでは§3.3の **AUTHORIZEDなbearing DOF拘束mapping**（FIXED/MOVABLE/UNDECIDED）が適用される
    （未知剛性の創作ではなく凍結された工学的支持条件。`springFallback="authorizedBearingConstraint"` を明示記録・#12）。
  - foundation springは「実装できるが値が無ければ使わない」契約。

### 2.3 solver実装（Phase 7-02）

- 対角加算 `K[dof,dof] += k`（elastic supportと同じ機構を共用）。
- **pile spring / soil spring / group効果**: DEFER（高度土・基礎相互作用）。

## 3. Release（R23・契約定義のみ）

### 3.1 定義（AnalysisDocument members[].release）

| field | 値 |
|---|---|
| memberId | 対象member |
| end | i / j |
| dof | ux / uy / uz / rx / ry / rz |
| releaseKind | FIXED / FREE / SPRING（+stiffness） |
| valueState | CONFIRMED / NOT_AVAILABLE |

### 3.2 solver実装

- member end releaseのsolver実装は**Phase 7-02スコープ外（DEFER）**。
- AnalysisDocumentには契約として保持・Viewer表示可能。
- Phase 7-02のsolverはrelease非対応（release指定memberがあれば `UNSUPPORTED_RELEASE` でfail-closed or 無視を明示）。

### 3.3 決定

- **Phase 7-02既定**: releaseは契約のみ・solver非対応・`UNSUPPORTED_RELEASE` fail-closed。

## 4. Rigid Link（R23・契約定義のみ）

| field | 値 |
|---|---|
| entityId | uuid5(`rigidLink:{sourceEntityId}`) |
| masterNodeId / slaveNodeId | 対象node |
| dofs | 拘束DOF（全6 or 指定） |
| 実装 | **DEFER**（solver非対応） |

## 5. MPC / Equality Constraint（R23・契約定義のみ）

| field | 値 |
|---|---|
| entityId | uuid5(`mpc:{sourceEntityId}`) |
| type | EQUALITY / LINEAR_COMBINATION（DEFER） |
| nodes / dofs | 対象 |
| 実装 | **DEFER**（solver非対応） |

## 6. Constraint（support DOF拘束）

- support constraintは§3（bearing_support_spring_contract）のbool DOFに集約（supports.constraint）。
- constraints配列を別途持たない（重複管理禁止・D-01）。

## 7. validation / fail-closed

| 項目 | 挙動 |
|---|---|
| releaseに値が無い | NOT_AVAILABLE（solver非対応） |
| release指定memberがsolverへ渡る | UNSUPPORTED_RELEASE fail-closed |
| rigidLink/MPCがsolverへ渡る | UNSUPPORTED_CONSTRAINT fail-closed |
| foundation spring値が無い | SOURCE_NOT_AVAILABLE・spring不使用・AUTHORIZED bearing拘束mapping適用（明示記録） |
| local spring軸不一致 | UNSUPPORTED_LOCAL_SPRING fail-closed（#11） |

## 8. tests観点

- foundation spring（CONFIRMED加算・SOURCE_NOT_AVAILABLE fallback）
- release契約保持・solver fail-closed
- rigid link / MPC契約保持・fail-closed
- 対角加算の剛性検証（1DOF spring支持）
- 回転spring（kNm/rad）
