# Apollo Phase 1 設計機能拡張 — 実装順序

**Status:** PROPOSED_SEQUENCE / FROZEN_FOR_REVIEW  
**Date:** 2026-08-01  
**Baseline:** `1fbcb3ea804f965b8f262284573f4f4d42dc2411`

## 1. 方針

実装は、数値設計を先行させず、データ契約、3DとのID対応、解析結果の割当、STALE管理、図面・計算書モデルの順に基盤を作る。

各PRは原則として次を満たす。

- 1つの責務
- 対象ファイルと非対象ファイルを明示
- 既存Apollo、Frame、Roadの非回帰
- 数値根拠が未採択の場合は `NOT_AUTHORIZED`
- 変更後のローカル検証項目を記録
- GitHubへ反映する前に差分・テスト・ビルドを確認

## 2. 既存APロードマップとの関係

既存AP-00〜AP-18は破棄しない。今回の拡張は、既存のAP-05、AP-06、AP-07、AP-08、AP-12、AP-14、AP-15、AP-16を具体化し、主桁・床組・補剛材・添接・図面を追加分解する。

既存のIF3、解析実行、STALE、export gateは再利用し、二重実装しない。

## 3. 推奨PR系列

### AP-DX-00 — 再凍結文書とガバナンス

**目的**

- 本ディレクトリの文書を正本候補として整備
- 数値未採択時の禁止事項を明記
- 実装開始ゲートを定義

**変更範囲**

- `docs/apollo/phase1_design_expansion_refreeze/`

**非対象**

- アプリコード
- スキーマ
- UI

**完了条件**

- 文書一式
- マニュアル対応表
- ローカル検証計画
- 文書差分検査

---

### AP-DX-01 — 設計エンティティ契約

**目的**

主桁、床版、床組、補剛材、添接、床版接合要素の型と永続化境界を追加する。

**候補エンティティ**

- `MainGirder`
- `GirderSectionSegment`
- `RcDeck`
- `Haunch`
- `CrossBeam`
- `SwayBracing`
- `LateralBracing`
- `BraceMember`
- `Stiffener`
- `Splice`
- `DeckAnchorage`

**依存**

- AP-01 / AP-02契約基盤

**テスト**

- schema validation
- round trip
- stable ID
- unknown / placeholder保持
- composite connector拒否

**完了条件**

- 非合成属性が明示される
- null数値を虚偽の既定値へ変換しない

---

### AP-DX-02 — 3D部材と設計エンティティのIDバインディング

**目的**

完成済み3D表示の部材を設計データへ結び付ける。

**機能**

- 3Dオブジェクトの `designEntityId`
- 選択部材から編集画面へ移動
- 設計状態の表示
- 表示モデルと設計モデルの不一致検知

**依存**

- AP-DX-01
- 現行3D表示

**テスト**

- 主桁・床版・横桁の選択
- ID欠落時fail closed
- main viewer / Apollo viewer非回帰

---

### AP-DX-03 — 主桁断面セグメント編集

**目的**

主桁断面、断面変化位置、添接候補位置を編集・保存できるようにする。

**機能**

- 桁高
- フランジ幅・厚さ
- 腹板厚
- 材料参照
- 断面変化位置
- 断面候補
- 断面諸量計算の純粋関数境界

**非対象**

- 正式な強度判定
- 自動最適化

**テスト**

- セグメント連続性
- 重複・逆転位置拒否
- 寸法範囲の構文検証
- 編集後STALE

---

### AP-DX-04 — RC床版・ハンチ・舗装モデル

**目的**

床版設計に必要な形状、鉄筋候補、照査横断を管理する。

**機能**

- 床版厚
- 舗装厚
- かぶり
- 片持部
- ハンチ
- 主鉄筋・配力鉄筋候補
- 支点上補強筋候補
- 照査位置

**非対象**

- 正式な床版数値照査

**テスト**

- 非合成属性固定
- 床版厚・ハンチ形状保存
- 荷重生成用面積・体積の幾何検証

---

### AP-DX-05 — 床組・斜材配置モデル

**目的**

横桁、対傾構、横構、斜材を構造化する。

**機能**

- 部材配置
- start/end node
- member role
- design group
- section/material reference
- effective length placeholder
- connection type
- weld orientation

**テスト**

- 節点参照整合
- 交差・重複・孤立部材検出
- グループ参照整合
- 3D表示生成

---

### AP-DX-06 — 補剛材モデル

**目的**

支点上、中間垂直、水平、格点、補強リブを独立エンティティとして管理する。

**機能**

- type
- station
- side
- plate dimensions
- material
- weld definition
- design group
- calculation status

**テスト**

- 支点上補剛材位置
- パネル内補剛材位置
- 同一位置重複
- 主桁断面変更後STALE

---

### AP-DX-07 — 添接モデルと配置バリデーション

**目的**

主桁添接の形状入力と配置成立性検査を実装する。

**機能**

- flange/web splice
- bolt pattern
- pitch/gauge/edge distance
- splice plate
- symmetry option
- manual arrangement

**非対象**

- 自動最適配置
- 正式な耐力照査

**テスト**

- 幾何干渉
- 本数と配置配列の一致
- 負値・重複拒否
- 図形プレビュー

---

### AP-DX-08 — 解析モデル生成拡張

**目的**

設計モデルから主桁・横桁・ブレースの解析モデルを生成する。

**機能**

- nodes/members
- section stiffness
- support conditions
- dead load generation
- member mapping
- provenance

**依存**

- AP-DX-03〜07
- 既存AP-09〜AP-11

**テスト**

- deterministic generation
- ID mapping
- coordinate/unit propagation
- non-composite stiffness
- internal solver run

---

### AP-DX-09 — 解析結果の設計部材割当

**目的**

解析結果を設計用の部材・断面・照査位置へ戻す。

**機能**

- member force envelope
- reaction mapping
- displacement mapping
- section location interpolation
- result checksum binding

**テスト**

- revision/checksum一致
- STALE result拒否
- unmapped member警告
- envelope再現性

---

### AP-DX-10 — 共通照査エンジン枠

**目的**

設計式を安全に追加する共通インターフェースを実装する。

**機能**

- formula registry
- standard decision reference
- input completeness
- result status
- utilization
- intermediate values
- warnings

**テスト**

- 未採択式は `NOT_AUTHORIZED`
- 入力不足は `INCOMPLETE`
- 異なるrevisionは `STALE`
- nullからOKを生成しない

---

### AP-DX-11 — 主桁断面照査

**目的**

採用基準決定後、主桁の正式照査を段階実装する。

**実装順**

1. 断面諸量
2. 曲げ
3. せん断
4. 組合せ
5. 腹板・フランジ安定
6. 断面決定要因
7. 断面候補比較

**前提ゲート**

- Target Standard ADOPTED
- material constants ADOPTED
- validation fixture
- independent calculation evidence

---

### AP-DX-12 — RC床版照査

**目的**

RC床版の主鉄筋、配力鉄筋、片持部、支点部を照査する。

**前提ゲート**

- 床版設計基準
- 荷重モデル
- かぶり・鉄筋材料
- 正解例

**非合成規則**

床版を主桁合成断面へ加算しない。

---

### AP-DX-13 — 床組・斜材照査

**目的**

横桁、対傾構、横構、斜材の断面と連結条件を照査する。

**実装順**

1. 横桁作用力
2. 横桁断面
3. 横桁添接
4. 横桁補剛材
5. 対傾構・横構断面
6. 細長比・有効長
7. 連結部インターフェース

---

### AP-DX-14 — 主桁補剛材照査

**目的**

支点上補剛材、中間補剛材、水平補剛材、ラップ範囲を照査する。

**前提**

- 支点反力
- 主桁せん断力
- パネル寸法
- 溶接条件
- 採用基準

---

### AP-DX-15 — 添接照査

**目的**

上・下フランジ、腹板の添接を照査する。

**実装順**

1. 手入力配置の照査
2. 配置修正支援
3. 候補自動生成
4. 最適化

自動最適化は最後とする。

---

### AP-DX-16 — 鋼重と再解析ループ

**目的**

仮定鋼重と設計鋼重を分離し、更新後の再解析を管理する。

**機能**

- member weight
- component weight
- block summary
- provisional / calculated distinction
- delta
- reanalysis required

**テスト**

- 部材追加・変更時の差分
- 重複集計防止
- 単位整合
- STALE伝播

---

### AP-DX-17 — たわみ・剛比・キャンバー

**目的**

解析結果からたわみ、剛比、キャンバー集計を構造化する。

**機能**

- allowable reference
- actual displacement
- load group aggregation
- camber series
- drawing semantic output

**前提**

許容値の採択。

---

### AP-DX-18 — 疲労照査

**目的**

主桁・横桁の疲労照査基盤を実装する。

**前提ゲート**

- 疲労荷重
- 交通量
- detail category
- stress range extraction
- adopted standard

Phase 1後半の独立ゲートとする。

---

### AP-DX-19 — Drawing Semantic Model

**目的**

設計データから図面意味モデルを生成する。

**対象**

- 標準断面
- 主桁側面
- 横桁・対傾構配置
- 横構配置
- 補剛材配置
- 添接概要
- 部材表

**非対象**

- 製作図完全自動化

**テスト**

- geometry snapshot
- dimension consistency
- entity traceability
- preview label

---

### AP-DX-20 — 計算書モデルとPDF出力

**目的**

ReportModelから一貫した計算書を生成する。

**機能**

- chapter registry
- calculation audit
- warning/error index
- figure embedding
- revision and checksum
- controlled PDF

**テスト**

- semantic snapshot
- missing section behavior
- STALE export block
- page/header metadata

---

### AP-DX-21 — 統合検証とリリース判定

**目的**

参照橋梁で、入力から解析・照査・図面・計算書までを統合検証する。

**判定**

- `PASS`
- `PASS_WITH_BLOCKERS`
- `NOGO`

Golden numeric comparisonは、独立検算資料と採用決定がある項目だけに限定する。

## 4. 直近の推奨作業

最初のコード実装候補はAP-DX-01とする。ただし着手前に以下を確認する。

- 現行mainのApollo契約・型・永続化パス
- 既存AP-01/AP-02との重複
- 現行3D model handoffのstable ID
- feature flag / scope guard
- ローカルテストコマンド

## 5. ローカル検証が必要になる時点

GitHub上だけで完結する文書作成・コード検索が終わり、次のいずれかへ進む時点でZorinOS上の検証が必要となる。

- TypeScript型・schemaの実コンパイル確認
- 既存テストスイートの全件確認
- production build
- main viewer / Apollo viewerの手動表示確認
- 3D選択とIDバインディングのブラウザ確認
- backend解析実行
- PDF・DXF等の生成確認

実施場所:

```text
/home/masaharu/Projects/spacer-clone
```

実施項目と結果は `local_verification_plan.md` および `local_verification_report.md` に保存する。
