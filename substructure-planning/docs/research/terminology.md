# 用語集（Terminology）

区分:
- SOURCE_DERIVED : 資料から読み取った事項
- EXISTING_CODE_DERIVED : 既存コードから読み取った事項
- PROPOSED : 今回提案する事項

## 構造要素

| 用語 | 読み | 定義 | 区分 |
|---|---|---|---|
| 下部工 substructure | かぶこう | 橋の地盤から支承までの支持構造。橋脚・橋台・基礎 | SOURCE_DERIVED |
| 上部工 superstructure | かみこう | 橋脚・橋台より上部の床版・桁 | SOURCE_DERIVED |
| 橋脚 pier | きょうきゃく | 中間支点の耐震部材。本件は単柱RC | SOURCE_DERIVED |
| 柱 column | はしら | 橋脚の縦部材 | SOURCE_DERIVED |
| 橋脚梁 / 張出梁 pier cap / cap | はねだしばり | 柱天端に横に張り出す横梁 | SOURCE_DERIVED |
| 支承座 bearing seat | ししょうざ | 梁天端上の支承を載せる段差 | SOURCE_DERIVED |
| 支承 bearing | ししょう | 上部工から下部工へ荷重を伝える装置 | SOURCE_DERIVED |
| フーチング footing | ふうち | 柱下端の拡大基礎板 | SOURCE_DERIVED |
| 杭 pile | くい | フーチング下の地中部材 | SOURCE_DERIVED |
| 杭基礎 pile foundation | くいきそ | フーチング＋杭群 | SOURCE_DERIVED |
| 橋台 abutment | きょうだい | 橋の両端の土構造物 | SOURCE_DERIVED |
| 逆T式橋台 | ぎゃくTしき | 壁＋基部＋底版のT字断面橋台 | SOURCE_DERIVED |
| 翼壁 wing wall | つばさかべ | 橋台両側の壁 | SOURCE_DERIVED |
| 地盤面 ground surface | じばんめん | 地盤の上面（不動沈降で上の方を指す） | SOURCE_DERIVED |
| 上部工簡易外形 superstructure envelope | かみぜんけい | 上部工を箱で近似した外形 | PROPOSED |

## 座標・配置

| 項目 | 意味 | 区分 |
|---|---|---|
| 橋軸方向 longitudinal axis | 進行方向前後 | SOURCE_DERIVED |
| 橋軸直角方向 transverse axis | 橋軸に直交する方向 | SOURCE_DERIVED |
| 鉛直方向 vertical axis | 上下 | SOURCE_DERIVED |
| 斜角 skew angle / 交角 | 橋軸直角と支承線の角度 | SOURCE_DERIVED |
| 支点座標 support position | 支点のX/Y/Z位置 | SOURCE_DERIVED |
| 支承位置 bearing seat position | 支承台の位置 | SOURCE_DERIVED |

## 力・反力

| 項目 | 意味 | 区分 |
|---|---|---|
| 反力 reaction | 支点に働く力 | SOURCE_DERIVED |
| 常時反力 permanent reaction | 自重・恒載 | PROPOSED |
| 活荷重反力 live load reaction | 床活荷重 | PROPOSED |
| 制動反力 braking reaction | 制動による力 | PROPOSED |
| 風反力 wind reaction | 風荷重 | PROPOSED |
| 耐震level1反力 | レベル1地震 | PROPOSED |
| 耐震level2反力 | レベル2地震 | PROPOSED |

## データ・モデル

| 項目 | 意味 | 区分 |
|---|---|---|
| schemaVersion | スキーマ版 | PROPOSED |
| JSON Schema | データ構造の検査仕様 | SOURCE_DERIVED |
| 安定ID stable entity id | 再生成しても変わらないID | PROPOSED |
| fail-closed | 未対応条件で黙って生成せず拒否 | PROPOSED |
| 概算体積 estimated volume | 幾何学体積。実務数量ではない | PROPOSED |
| 未検証 unverified | 数値設計未検証 | PROPOSED |

## 状態（UI）

| 表示 | 意味 |
|---|---|
| 入力済み | 入力完了 |
| 入力不足 | 未入力あり |
| 入力エラー | 検証失敗（負値・0・形式） |
| 未対応 | 対象外形式 |
| 3D生成可能 | 隣接足りて3D生成可 |
| 反力依存機能は利用不可 | 反力なし → 無効化 |
| 未検証 | 概算値 |
| 実務使用不可 | 正式設計ではない