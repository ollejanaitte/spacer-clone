# 影響線解析 Phase B-3 設計メモ

## 1. 目的と位置付け

本書は、Phase B完了時点の影響線解析実装を記録し、Phase Cで包絡、移動荷重、載荷線、道路橋活荷重へ進む前に確定すべき判断を整理する。

影響線エンジン、載荷面、移動荷重、包絡結果の詳細設計を再定義するものではない。詳細は既存設計書を参照し、本書では現在の実装到達点と次フェーズへの接続方針を中心に扱う。

## 2. 現在の到達点

### 2.1 影響線MVP

現在の実装は、構造部材1本を載荷対象とし、その部材上に生成したstationへ荷重を順次配置して、指定targetの影響値を計算する。

現在選択できるtargetは次のとおりである。

- 節点変位
- 支点反力
- 部材端力

各targetの結果は共通のstation列に対応する値配列として `InfluenceResult` に保存される。

### 2.2 保存、再読込、再解析

プロジェクトには計算済み結果ではなく、`analysisSettings.influence` の解析条件を保存する。

保存されたプロジェクトを開くと、次の条件を復元して同じ影響線解析を再実行できる。

- `caseId`
- 対象部材
- station数
- 荷重方向
- 荷重大きさ
- target定義

保存前後の再解析結果が一致することをAPIテストで確認済みである。

### 2.3 解析結果の検証

片持ち梁および単純支持梁について、反力、曲げモーメント、変位の影響線を手計算式と比較する検証を実施済みである。

この検証は現在の単一部材載荷と部材上集中荷重の範囲に対するものであり、複数部材ラインや道路橋活荷重の妥当性を保証するものではない。

### 2.4 CSV出力

`influence_lines.csv` をbackendとfrontendの双方から出力できる。

列順は次で固定している。

```text
case_id,line_id,target_id,target_type,node_id,member_id,component,end,station_index,station,ratio,x,y,z,value
```

行順は `targetResults` 順、その内側を `stations` 順とする。`targetResults.values` と `stations` の長さが一致しない場合、および非有限値を含む場合はエラーとする。

### 2.5 グラフ表示

frontendではtargetごとに影響線系列を表示する。

- target単位の表示ON/OFF
- 全選択
- 全解除
- 初期状態は全系列表示
- 結果系列が変わった場合は全系列表示へ再初期化

グラフ表示の選択状態はViewModelまたは解析結果へ保存しない、一時的なUI状態である。

## 3. 現在の InfluenceResult

現在の主要構造は次のとおりである。

```ts
type InfluenceResult = {
  caseId: string;
  line: {
    id: string;
    memberId: string;
    stationCount: number;
    loadDirection: { x: number; y: number; z: number };
    loadMagnitude: number;
  };
  stations: Array<{
    station: number;
    ratio: number;
    position: { x: number; y: number; z: number };
    stationIndex: number;
  }>;
  targets: InfluenceTarget[];
  targetResults: Array<{
    targetId: string;
    values: number[];
  }>;
};
```

各フィールドの責務は次のとおりである。

| フィールド | 現在の責務 |
| --- | --- |
| `caseId` | 影響線解析ケースの識別 |
| `line` | 単一部材上の載荷条件 |
| `stations` | 載荷位置の順序、距離、比率、全体座標 |
| `targets` | 応答を抽出する対象と成分 |
| `targetResults` | targetごとのstation順影響値 |

`targetResults.values[index]` は `stations[index]` に対応する。この対応関係はグラフ、CSV、将来の移動荷重計算で共通して利用する。

## 4. 現在の制約

### 4.1 載荷経路

現在の `line` は1本の構造部材に直接対応する。独立したドメインとしての `loadingLine` は未実装であり、複数部材を連続して通過する載荷経路を表現できない。

### 4.2 基準荷重

現在は `loadMagnitude` を保持しているが、これを単位荷重に固定するか、任意の基準荷重として扱うかがドメイン上明確ではない。

移動荷重計算へ進む前に、影響値がどの基準荷重に対する応答かを明示する必要がある。

### 4.3 未実装領域

次の機能は未実装である。

- 影響線からの最大値、最小値、絶対値最大の包絡
- `movingLoadCase`
- `loadingSurface`
- 独立した `loadingLine`
- 複数部材ライン
- 複数軸荷重
- 複数ラインまたは複数車線の同時載荷
- 道路橋のT荷重、L荷重、群集荷重、A活荷重、B活荷重
- 車線、歩道、載荷幅、横分配を含む道路面モデル

## 5. 将来の拡張方針

### 5.1 loadingLine

`loadingLine` は構造部材そのものではなく、荷重が移動する経路として定義する。

将来は1本以上の構造部材または載荷面上の経路へ関連付け、各stationについて少なくとも次を同定できるようにする。

- `lineId`
- ライン全体のstation
- `segmentIndex`
- 対応する構造部材
- 部材内位置
- 全体座標
- 荷重分配規則

詳細は [influence-moving-load.md](influence-moving-load.md) および [influence-engine.md](influence-engine.md) を参照する。

### 5.2 loadingSurface

`loadingSurface` は橋面、床面、車道などの載荷領域を構造モデルから分離して表現する。

`loadingLine`、車線、歩道、格子点、横方向の荷重分配をまとめる上位モデルとし、構造節点や部材を直接所有しない。

詳細は [loading-surface-grid.md](loading-surface-grid.md) を参照する。

### 5.3 movingLoadCase

`movingLoadCase` は影響線生成条件とは分離し、実荷重モデルと走行条件を保持する。

想定する責務は次のとおりである。

- 使用するloading lineまたはloading surface
- 軸荷重と軸間距離
- 複数軸、複数車両、複数ラインの配置
- 走行開始位置、終了位置、刻み
- 荷重係数、組合せ係数
- 対象target
- 履歴および包絡の生成条件

### 5.4 EnvelopeResult

包絡結果は `InfluenceResult` に直接追加せず、`movingLoadCase` の計算結果として分離する。

`InfluenceResult` は基準荷重による応答関数、`EnvelopeResult` は実荷重配置を走査した結果という責務分担を維持する。

### 5.5 道路橋活荷重

道路橋活荷重は、汎用的な `loadingSurface`、`loadingLine`、`movingLoadCase` の上に規定依存のプリセットまたは生成規則として構築する。

荷重規定を影響線エンジンへ直接埋め込まず、次を分離する。

- 荷重モデル
- 車線および載荷領域
- 配置探索規則
- 荷重係数と組合せ規則
- 規定名、版、revisionなどの出典情報

### 5.6 他の解析結果との接続

応答スペクトル結果、静的結果、移動荷重包絡、将来の荷重組合せ結果は、共通のtarget識別と成分体系を利用して結果表示および帳票へ接続する。

ただし、応答スペクトルのモード合成と移動荷重の最不利配置探索は異なる計算である。共通化するのは結果の参照方法と表示モデルであり、計算ロジック自体を同一化しない。

## 6. EnvelopeResult の推奨構造

Phase Cで検討する基本構造を次に示す。

```ts
type EnvelopeResult = {
  movingLoadCaseId: string;
  sourceInfluenceCaseId: string;
  items: Array<{
    targetId: string;
    max: EnvelopeExtreme;
    min: EnvelopeExtreme;
    absMax: EnvelopeExtreme;
  }>;
};

type EnvelopeExtreme = {
  value: number;
  governingStation: number;
  governingStationIndex: number;
  loadPositions: Array<{
    loadId: string;
    lineId: string;
    station: number;
    position: { x: number; y: number; z: number };
    magnitude: number;
  }>;
};
```

`max`、`min`、`absMax` は値だけでなく、その値を発生させた載荷状態を再現できる情報を保持する。

複数軸や複数ラインでは、最不利状態は単一stationでは表現できない。`governingStation` は走行ケースの代表位置または探索ステップ位置とし、実際の荷重配置は `loadPositions` を正とする。

同時性断面力、同時性反力、全targetの応答スナップショットを保存するかは、結果サイズと帳票要件を確認してPhase C以降に決定する。詳細は [envelope-result.md](envelope-result.md) を参照する。

## 7. movingLoadCase の計算方針

線形解析を前提とする基本式は次である。

```text
response = Σ(influenceValue × actualLoad / referenceLoad)
```

この式を曖昧なく適用するため、将来の影響線結果またはその生成条件に `referenceLoadMagnitude` を明示する。

推奨方針は次のとおりである。

1. 影響線生成時の基準荷重を有限かつ0以外とする。
2. 既定値は1とする。
3. `targetResults` は基準荷重を載荷したときの応答値として扱う。
4. 実荷重寄与は `actualLoad / referenceLoadMagnitude` で換算する。
5. 荷重方向と符号規約を影響線生成条件に保持する。

単一軸、単一ラインでは各走行位置について1つの影響値を参照する。複数軸では軸ごとのstationへ補間または一致する影響値を参照し、寄与を加算する。

複数ラインおよび複数部材ラインへ拡張する場合も、各荷重位置を `lineId + station` で同定し、構造部材への分配はloading lineまたはloading surface側の規則で解決する。

## 8. Phase Cへ進む前の判断

### 8.1 包絡を単独で先行実装しない

現在の `targetResults` から単純な最大値、最小値、絶対値最大を求めることはできる。しかし、それは基準荷重1個を動かした影響線の極値であり、将来の移動荷重包絡とは責務が異なる。

先に単純包絡だけを永続スキーマへ固定すると、複数軸や複数ラインで必要になる最不利荷重配置を表現できず、後から互換性のない変更が必要になる。

### 8.2 EnvelopeResultを関連設計と同時に確定する

`EnvelopeResult` は次を同時に設計した後で確定する。

- `loadingLine` のstationと複数部材表現
- `movingLoadCase` の軸、車両、走行位置
- `referenceLoadMagnitude`
- 最不利状態を再現する `loadPositions`
- 履歴を保存する範囲
- 同時性結果と帳票要件

### 8.3 Phase Cの推奨着手順

1. `referenceLoadMagnitude` と符号規約を確定する。
2. 単一ライン用の `movingLoadCase` を定義する。
3. 単一集中荷重で移動履歴を生成する。
4. 履歴から `EnvelopeResult` を生成する。
5. 複数軸へ拡張する。
6. 独立した `loadingLine` と複数部材ラインへ拡張する。
7. `loadingSurface`、車線、道路橋活荷重規則へ拡張する。

この順序でも、`EnvelopeResult` の最終形は手順2までの設計を確認してから確定する。

## 9. 関連文書

- [influence-moving-load.md](influence-moving-load.md): 影響線・移動荷重のドメインと全体構成
- [influence-engine.md](influence-engine.md): station生成、荷重分配、解析エンジン
- [envelope-result.md](envelope-result.md): 移動履歴、包絡、最不利載荷位置
- [loading-surface-grid.md](loading-surface-grid.md): loading surface、grid、line、荷重分配
- [moving-load-design-review.md](moving-load-design-review.md): 設計上の論点と段階分離
- [result-schema.md](result-schema.md): 結果スキーマ全体
- [result-visualization.md](result-visualization.md): 結果から表示モデルへの変換
- [response-spectrum-analysis.md](response-spectrum-analysis.md): 応答スペクトル解析結果との責務比較
