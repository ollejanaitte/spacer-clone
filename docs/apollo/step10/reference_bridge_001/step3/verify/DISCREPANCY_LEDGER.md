# FINAL VERIFICATION — Discrepancy / Defect Ledger

> 分類: SOURCE_DATA / SAMPLE_DATA / UI / CONNECTOR / GEOMETRY / ANALYSIS / DESIGN / OUTPUT / PERSISTENCE / ELECTRON-WINDOWS / AUTHORIZATION

| ID | 分類 | 内容 | 差異量 | 判定 | 原因 | 対応 | 状態 |
|----|------|------|--------|------|------|------|------|
| D-01 | GEOMETRY | PU15 斜角 94°14′27″（≈4.241° skew）がソフトで直交（skew=0） | ~4.241° | WARN | 設計簡略化（STEP1 P04 §5・DEF-07 曲線/skew） | ソフトは設計どおり直交。skew モデル化は Phase 8/認証後 | 記録 |
| D-02 | GEOMETRY | AR2 支持位置 station 0（橋始点）vs 原本主桁始点 station≈2.458 | ~2.458m | WARN | supportStationsFromSpans の設計簡略化（support[0]=0） | 設計どおり。実支承は桁端（bearing setback） | 記録 |
| D-03 | SOURCE_DATA | 中間格点（GRID-1002..1026/2002..2026）座標が原本に存在するが Phase 2 抽出外で HOLD | 抽出可能値が HOLD | WARN | Phase 2 抽出範囲（mapping GM-012/13 で HOLD 宣言） | ソフトの HOLD 伝播は契約どおり（不具合ではない）。将来抽出で補完可能 | 記録 |
| D-04 | GEOMETRY | 端部パネル桁高 2580mm vs 3D 用一定 2.7m | 120mm（端部のみ） | WARN | 3D 表示用 declared default（G-GEO-0008 中央値使用） | 表示用。設計桁高は認証後 | 記録 |
| D-05 | GEOMETRY | 平面線形 R=160m/R=3000m を直線近似 | 曲線→直線 | WARN | 道路線形接続 DEF-01（RB-001 ACL を直線 plane grid としてモデル化） | STEP2 設計どおり。道路側接続で解消見込み | 記録 |
| D-06 | SAMPLE_DATA | 縦断/横断勾配が Geometry 入力に未使用（フラット） | n/a | NOT_VERIFIABLE | サンプル入力として未定義 | Geometry 入力範囲外（LINER 側） | 記録 |

## ソフト不具合（FAIL）

- なし。全 WARN は設計書に宣言済みの簡略化・deferred に帰属し、ソフト側の明確な欠陥は検出されなかった。

## 原本データ・Golden の書き換え

- 実施していない（Golden 自己生成・原本数値の勝手な変更なし）。
