# 差分監査（JIP-LINER × 現行 spacer-clone）

## 監査の前提

- JIP側: Phase 1 棚卸し（`jip_liner_feature_inventory.csv`）。「機能」とは設計データ・計算・出力・検証の単位。
- 現行側: Phase 2 監査（`current_system_inventory.csv`）。正本 main@7b07f62。
- 差分分類:
  - `GAP_JIP_MISSING` … JIP にある機能が現行に存在しない（不足）
  - `GAP_JIP_PARTIAL` … 存在するが一部のみ・型のみ・検証不十分（不足）
  - `GAP_DONE` … 双方に揃っている（パリティ済み）
  - `GAP_VERIFICATION` … 現行実装はあるが、JIP-LINER実出力／実設計計算例との突合検証がない
  - `GAP_MODERNIZE` … JIP を単に再現するのではなく、現行 UX として設計し直すべきもの
  - `GAP_DESIGN_NEED` … JIP にも現行にも無いが、実務・将来で必要と判断するもの
  - `GAP_CURRENT_ONLY` … JIP に無いが現行に有る（付加価値・維持すべきもの）

## 差分マトリクス（要約）

### A. 平面線形

| JIP機能 | 現行 | 分類 | 判定 |
|---|---|---|---|
| 直線/円/クロソイド | 同等 | GAP_DONE | ベースパリティ済み |
| 平行線/直角平行 | Offset線 | GAP_JIP_PARTIAL | Offset は実装、直角平行/拡幅が不足 |
| 拡幅（1次/4次） | 型定義のみ | GAP_JIP_PARTIAL | **実装必要**（曲線橋で必須） |
| 要素入力3方式 | 数値入力中心 | GAP_MODERNIZE | GUI 入力方式は別途 Phase5/6 |
| 測点有効範囲・ブレーキ | equation(break) のみ | GAP_JIP_PARTIAL | ランプ/ブレーキの測点体系 |
| 接続/分岐 | ABSENT | GAP_JIP_MISSING | ランプ橋の前提（Phase8） |
| 複数線形 | AlignmentBundle | GAP_DONE | active選択式 |

### B. 高さ・縦断・横断

| JIP機能 | 現行 | 分類 | 判定 |
|---|---|---|---|
| 縦断(PH) | grade/parabolic | GAP_DONE | |
| 横断(GR) | crossSlope | GAP_DONE | |
| 断面高さ W/WG | Z Merge | GAP_JIP_PARTIAL | WG系（ハンチ用G高さ）は未実装 |
| 断面高さ WA/WB | 1合成式 | GAP_JIP_PARTIAL | WA/WB の平均/簡易補正が明示モデルでない |
| クラウン/片勾配/パラボラ | 対応 | GAP_DONE | |

### C. 橋梁骨格（ピア・スパン）

| JIP機能 | 現行 | 分類 | 判定 |
|---|---|---|---|
| ピア（距離/平行/2点/垂直/角度/測点） | PierDraft（距離ベース） | GAP_JIP_PARTIAL | 設定方式の9種のうち距離/測点のみ。角度・2点・平行は欠 |
| ピア斜角 | skewAngleRad 有 | GAP_DONE | |
| 支承位置 | bearingOffsets | GAP_DONE | |
| セクションS×主桁G（格点系） | CrossBeam + MeasuredGrid | GAP_JIP_PARTIAL | 「S×G 交差」の正規入力（構文/UI）が未整備 |
| スパン簡易入力（参照ピア→間隔） | SpanDraft | GAP_JIP_PARTIAL | 間隔生成UIが未整備 |
| 円弧桁/折れ桁（主桁） | なし | GAP_JIP_MISSING | 曲線橋主桁 |
| 小標系 TRAN | グローバル | GAP_JIP_PARTIAL | 実務帳票では小座標系が標準 |

### D. LDIST / HAUNCH / HOSO

| JIP機能 | 現行 | 分類 | 判定 |
|---|---|---|---|
| 格点間距離・張出し長 | 実装 | GAP_DONE | |
| ハンチ type 1,2,6,7,8,9,14 | native相当 | GAP_DONE | マッピング表有（対応済み） |
| ハンチ type 3,11,13,15,16,17 | なし | GAP_JIP_MISSING | 一定/最小2乗/比例/キャンバー円弧/対角線/全入力 |
| ハンチ type 4,5,10（基準桁） | 明示エラー | GAP_JIP_MISSING | 基準桁モデルが必要 |
| ハンチ type 12（WG/W） | 明示エラー | GAP_JIP_MISSING | ハンチ用G高さ系が前提 |
| 舗装厚（HOSO） | 実装 | GAP_DONE | |
| 舗装厚の照査（最小厚） | 未確認 | GAP_JIP_PARTIAL | 照査UIの有無要確認 |

### E. 図面（GDRAW）

| JIP機能 | 現行 | 分類 | 判定 |
|---|---|---|---|
| 平面図（ライン/セクション描画） | Plan A/B | GAP_DONE（部分） | 隠し/線種/延長オプション未実装→GAP_JIP_PARTIAL |
| 座標テーブル | planCoordinateTable | GAP_JIP_PARTIAL | 項目数/精度ポリシー未確定 |
| 交角描画 | なし | GAP_JIP_MISSING | |
| ライン間/セクション間寸法線 | ジェネリック寸法 | GAP_JIP_PARTIAL | 自動/手動規則未確定 |
| プロファイル | ある（地面は未設定） | GAP_JIP_PARTIAL | |
| バンド | ある | GAP_JIP_PARTIAL | |
| DXF | 実装 | GAP_DONE | |

### F. その他のプログラム

| JIP機能 | 現行 | 分類 | 判定 |
|---|---|---|---|
| APLINE | なし | GAP_JIP_MISSING | IP線形等（曲線橋で要検討） |
| MDSKOUT（MightyBridge） | なし | GAP_DESIGN_NEED | 現代は「解析向け出力」として設計 |
| LTOOL/GVIEW/FOOTING/MDVIEWER/GCROSS | なし | GAP_JIP_MISSING（一部） | FOOTING/MDVIEWERは上部工3Dと統合検討 |
| 1ファイル運用/バックアップ | RoadDesignDocument | GAP_CURRENT_ONLY | 現代化で維持 |

### G. 検証・品質

| 事項 | 分類 | 判定 |
|---|---|---|
| ゴールデンテストが解析参照（Simpson等）のみ | GAP_VERIFICATION | **JIP-LINER実出力・実設計計算例との突合が無い** |
| Phase5描画ゴールデンが自己参照 | GAP_VERIFICATION | 外部帳票との突合が無い |
| Importer サンプルの補間（C1-C17/GE2）未置換 | GAP_VERIFICATION | PDF実値への置換必要 |

## 定量的サマリ

集計は「整合性検査・定量集計」フェーズで実施（数量は matrix CSV から自動化はせず、本表を主としCSVで追跡）。

| 分類 | 概算件数 |
|---|---|
| GAP_DONE | 15 |
| GAP_JIP_PARTIAL | 16 |
| GAP_JIP_MISSING | 12 |
| GAP_VERIFICATION | 3 |
| GAP_MODERNIZE | 4 |
| GAP_DESIGN_NEED | 2 |
| GAP_CURRENT_ONLY | 3 |

※ 概算は本監査の代表行ベース。正確な数は `matrices/gap_matrix.csv` を参照。