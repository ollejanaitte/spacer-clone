# Phase 7-01C: Load / Combination Contract（設計Freeze）

- Phase: 7-01 Step C
- baseline: `9766128e44ec22f0cdd83f59336182f4c47bd162`
- 日付: 2026-08-13
- 凍結: Design Decision D-06 / D-07
- 対応R: R2

## 1. 目的

R2を最優先で解決：死荷重をsupport節点のみへ載荷する仕様を廃止し、
**部材分布載荷（memberLoad）を正式仕様**とする。nodalLoadsのbackend未転送も解消する。

## 2. Load Case（Freeze）

| caseId | kind | 内容 | Phase 7-02状態 |
|---|---|---|---|
| DL-STRUCTURAL | dead | 主桁+横桁+横構+支承（partition明示） | **実装**（主桁分布+横桁は主桁に包含） |
| DL-DECK | dead | RC床版自重 | **実装**（girder均等配分） |
| DL-PAVEMENT | dead | 舗装 | 入力境界（MISSING） |
| DL-APPURTENANCE | dead | 付属物 | 入力境界（MISSING） |
| LL | live | 活荷重 | 未実装（liveLoadReference=null） |

- source: `superstructureLoadModel.buildDeadLoads`（KEEP）の値。
- 単位: kN（総量）・kN/m（分布）・kN（nodal）。

## 3. Load転送（Freeze・R2解決）

### 3.1 死荷重配分（正式仕様）

| load | 配分方法 | 転送形式 |
|---|---|---|
| DL-STRUCTURAL（主桁） | 各主桁memberへ均等配分（kN/m = structuralGirderTotal / Σ主桁延長） | **memberLoad（distributed・local z=-1）** |
| DL-STRUCTURAL（横桁/横構/支承） | structuralSecondaryがMISSINGのため**主桁分布に包含**（partition維持） | 同上 |
| DL-DECK | deck自重（thickness×unitWeight×deckWidth）をgirder lineへ均等配分（kN/m = deckKN / Σ主桁延長） | memberLoad（distributed・local z=-1） |
| 集中荷重（必要時） | 特別な場合のみnodalLoad（明示指定） | nodalLoad |

- **support節点のみへの集中載荷は正式仕様にしない**（廃止）。
- 総量保存: Σ(memberLoad×延長) + Σ(nodalLoad) = case総量（tolerance 1e-9相対）。

### 3.2 memberLoad / nodalLoad 形式（Freeze）

```
memberLoad: {
  id, loadCaseId, memberId,
  type: "distributed" | "point",
  direction: "local_z" | "local_y" | "local_x" | "global_*",
  magnitude: number,        // kN/m（distributed）or kN（point）
  positionM: number|null,   // point時：member始端からの距離
  unit: "kN_per_m" | "kN",
  sign: "-z（重力下向き）"
}
nodalLoad: {
  id, loadCaseId, nodeId,
  fx..mz: number,           // kN・kNm・global
  unit: "kN" | "kNm"
}
```

### 3.3 backend転送（R2・nodalLoads未転送解消）

- `build_grillage_project`（Solver Input Adapter）はgrillage/analysis入力から
  **memberLoads・nodalLoads・loadCases** を正しくbackend project（`memberLoads` / `nodalLoads` / `loadCases`）へ転送する。
- backend engine `assembly.py` の `equivalent_uniform_load_local`（KEEP）で分布荷重→等価節点力へ変換（現行機能・要検証）。

## 4. Load Combination（Freeze・D-07）

| combinationId | expression | 係数 | Phase 7-02実行 |
|---|---|---|---|
| COMBO-1 | DL-STRUCTURAL + DL-DECK | 1.0 / 1.0 | **実行**（linear staticで組合わせる） |
| 他（LL含む） | 宣言のみ | — | **DEFER**（宣言構造・実行しない） |

- **実行方法（Freeze）**: COMBO-1は
  ① 各caseを別々にsolver実行→結果を係数で線形合成（superposition）、または
  ② 荷重ベクトルを係数合成して1回solver実行（loadVector = Σ factor×loadVector(case)）。
  **Phase 7-02既定: ② を採用**（決定論的・1回solve・solver KEEP）。
- result case: `resultCaseId = "COMBO-1"`。
- 部分係数・envelope・施工段階: DEFER。

## 5. solver入力（Freeze）

- AnalysisDocument loadCases → backend project `loadCases`（`{id, name, type}`）・`memberLoads`・`nodalLoads`。
- solver結果のmember forcesは各case。COMBO-1は合成後結果をIF3 resourceへ。

## 6. fail-closed

| 項目 | 挙動 |
|---|---|
| 配分後総量不一致 | reject（>1e-9相対） |
| 分布荷重方向未指定 | reject |
| 未対応load kind | UNSUPPORTED_LOAD |
| case合計が0（MISSINGのみ） | 空case許容（解析は0荷重で実行・source記録） |
| 部材loadのmember不存在 | reject |

## 7. tests観点

- DL-STRUCTURAL/DL-DECKのmemberLoad配分（総量保存・各member kN/m）
- COMBO-1合成（①との等価性・決定論）
- nodalLoads/memberLoadsのbackend転送（R2 regression）
- 分布荷重→等価節点力（closed-form）
- 空case・fail-closed
- 配分がsupport節点のみにならないこと（guard）
