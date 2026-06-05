# 結果表示設計

## 1. 目的

解析結果を3Dビュー、表、グラフ、結果確認画面へ表示するための責務分離を定義する。

本設計は表示アーキテクチャの定義であり、実装、UI変更、API変更は行わない。

## 2. 基本構成

結果表示は以下の流れとする。

```text
Result
↓
ViewModel
↓
Viewer
```

`Result` は [result-schema.md](result-schema.md) で定義する解析結果である。`ViewModel` は表示対象に合わせて結果を整形した派生データであり、`Viewer` は画面表示を担当する。

## 3. 責務分担

| 層 | 責務 | 含めるもの | 含めないもの |
| --- | --- | --- | --- |
| Result | 解析結果の事実 | 変位、反力、部材断面力、固有値解析結果、応答スペクトル結果、影響線結果 | 表示倍率、表示色、線幅、フォントサイズ、カメラ状態、UI状態 |
| ViewModel | 表示用の派生データ | 表示対象、フィルタ済み値、図化用系列、凡例用ラベル、正規化値 | ソルバ固有の計算処理 |
| Viewer | 画面描画と操作 | 3D表示、表、グラフ、選択状態、カメラ、表示設定 | 解析結果の永続スキーマ |

## 4. ViewModelの種類

### 4.1 変位ViewModel

節点変位を表、変形図、変位グラフへ渡すための派生モデルである。

```ts
export type DisplacementViewModel = {
  resultId: string;
  loadCaseId: string;
  items: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
    rx: number;
    ry: number;
    rz: number;
    magnitude: number;
  }>;
};
```

### 4.2 反力ViewModel

支点反力を表、反力図、帳票プレビューへ渡すための派生モデルである。

```ts
export type ReactionViewModel = {
  resultId: string;
  loadCaseId: string;
  items: Array<{
    nodeId: string;
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
  }>;
};
```

### 4.3 部材断面力ViewModel

部材断面力は `N`, `Qy`, `Qz`, `Mx`, `My`, `Mz` に統一する。

```ts
export type MemberSectionForceComponent = "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";

export type MemberSectionForceViewModel = {
  resultId: string;
  loadCaseId: string;
  component: MemberSectionForceComponent;
  items: Array<{
    memberId: string;
    station: number;
    value: number;
  }>;
};
```

### 4.4 固有値解析ViewModel

固有値解析結果は、モード一覧、モード図、動的解析結果表へ渡す。

```ts
export type EigenModeViewModel = {
  resultId: string;
  modes: Array<{
    modeNo: number;
    eigenvalue: number;
    period: number;
    frequency: number;
    participationFactor: number;
    effectiveMassRatio: number;
  }>;
};
```

### 4.5 応答スペクトル解析ViewModel

応答スペクトル解析結果は、モード別結果と合成結果を分けて表示する。

```ts
export type ResponseSpectrumViewModel = {
  resultId: string;
  combinationMethod: "SRSS" | "CQC";
  modalResults: Array<{
    modeNo: number;
    displacements: DisplacementViewModel["items"];
  }>;
  combinedResult: {
    displacements: DisplacementViewModel["items"];
    reactions?: ReactionViewModel["items"];
    memberSectionForces?: MemberSectionForceViewModel["items"];
  };
};
```

### 4.6 影響線ViewModel

影響線対象は節点変位、反力、断面力とする。

```ts
export type InfluenceTargetViewModel =
  | { type: "nodeDisplacement"; nodeId: string; component: "ux" | "uy" | "uz" | "rx" | "ry" | "rz" }
  | { type: "reaction"; nodeId: string; component: "fx" | "fy" | "fz" | "mx" | "my" | "mz" }
  | { type: "memberSectionForce"; memberId: string; component: MemberSectionForceComponent; station?: number };

export type InfluenceLineViewModel = {
  resultId: string;
  lineId: string;
  target: InfluenceTargetViewModel;
  values: Array<{
    station: number;
    value: number;
  }>;
};
```

## 5. Viewerとの関係

ViewerはViewModelを受け取り、画面の状態と描画を管理する。表示倍率、表示色、線幅、フォントサイズ、カメラ状態、UI状態はViewer側またはViewer用設定として扱い、`Result Schema` には戻さない。

## 6. 関連文書

- [result-schema.md](result-schema.md)
- [report-drawing-output.md](report-drawing-output.md)
- [../investigation/visualization-study.md](../investigation/visualization-study.md)
