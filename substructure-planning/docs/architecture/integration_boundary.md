# 上部工との統合境界（Integration Boundary）

区分:
- PROPOSED : 今回提案する事項
- EXISTING_CODE_DERIVED : spacer-clone から読み取った事項
- INFERENCE : 推論

## 1. 境界の基本方針

- 下部工ツールは spacer-clone のコードを import しない。
- 共有するのは**交換スキーマ（JSON）**のみ。
- 実行時に相互にライブラリをロードしない。ファイル・ディレクトリ共有しない。

## 2. データ境界

| 方向 | データ | 形式 |
|---|---|---|
| 上部工 → 下部工 | 支点・支承・桁下高・反力（任意） | support-interface.json |
| 下部工 → 上部工（将来） | 下部工寸法・形状・数量 | substructure-project.json の一部 |

## 3. 座標系・単位系の整合

EXISTING_CODE_DERIVED:
- spacer-clone: x-longitudinal-y-transverse-z-up、右手系 Z-up
- 下部工ツールも同じ規約を採用（coordinate_system.md）

これにより、座標変換なしで支援点を一致させられる。

## 4. 反力データ

- 上部工から reactions（permanent/live/braking/wind/seismic）が来る場合、表示のみに利用。
- 反力依存の計算（将来の詳細設計）は反力なしでは無効。
- 正式照査は常に無効。

## 5. 未対応形式の処理

- supportType が pier/abutment 以外（例: virtual_pier）は fail-closed（拒否）。
- 斜角・寸法が不正な場合は拒否。
- schemaVersion 不一致は拒否。

## 6. 実行時境界

- LAB_ROOT の prototype は単独で起動。
- spacer-clone の dev サーバー・ポート・プロセスには触れない。
- spacer-clone の node_modules / dist には依存しない。

## 7. 制約・禁止

- spacer-clone へのファイル追加・変更・削除 禁止
- spacer-clone の git 操作（commit/checkout等）禁止
- GitHub への push / PR / merge 禁止
- 商用ソフトの画面・ソース複製禁止

## 8. 連携の流れ（具体）

1. 上部工ツールが support-interface.json を出力（BridgeDefinition から生成）
2. 下部工ツールが support-interface.json を読み込み、支点を配置
3. 下部工ツール内で下部工の構造形式・寸法を入力
4. 3D生成・概算数量
5. substructure-project.json として保存
6. 将来: 下部工形状・数量を上部工へ戻す

## 9. 統一ID

- supportId は上部工の support.id（BridgeDefinition）と一致させる（EXISTING_CODE_DERIVED）。
- 下部工内の部材IDは下部工ツールが独自に付与（P1-CAP 等）。

## 10. 結論

疎結合 JSON 交換方式で十分に成立する。
上部工側の BridgeDefinition の supports/bearings の概念をそのまま
交換スキーマへ投影することで、追加変更なく連携可能。
