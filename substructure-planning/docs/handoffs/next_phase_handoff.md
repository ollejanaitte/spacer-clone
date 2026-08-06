# 次フェーズ引継ぎ（Next Phase Handoff）

区分: PROPOSED
日付: 2026-08-07

## 1. 今回の成果サマリ

- 独立ツールとしての成立性を確認。
- 上部工(spacer-clone)と疎結合のJSON交換スキーマ(support-interface)を設計。
- データモデル・座標系・3D生成方式を整理。
- 最小プロトタイプ（Vanilla TS + Three.js）を動作確認（単体26/26, ブラウザ10/10 PASS）。
- JSON Schema 検証 12/12 PASS。

## 2. 確立した基盤

- 座標系: x-longitudinal-y-transverse-z-up（右手系 Z-up）
- 単位系: SI（m, deg, kN）
- 安定ID方式: P1-COLUMN-01 / P1-CAP / P1-FOOTING / P1-PILE-01 / A1-WING-L 等
- 疎結合: 上部工とは JSON のみ
- fail-closed: 未対応形式・不正入力は拒否

## 3. プロトタイプの起動

```bash
cd ~/Projects/substructure-planning-lab/prototype
npm install
npm run dev   # http://127.0.0.1:5173/
```

検証: `npm test`, `node tests/browser_verify.mjs`（dev起動中）, `python3 ../verification/schema_validation.py`

## 4. 既知の制限・次の課題

| 項目 | 現状 | 次アクション |
|---|---|---|
| 杭配置 | 等間隔グリッド近似 | 実配置パターン化 |
| 上部工 | 1枚箱 | 桁・横梁を含む詳細簡易外形 |
| 斜角・曲線 | 直線のみ | 曲線・超高対応 |
| 反力 | 未実装 | support-interface から読込 |
| 詳細設計 | NOT_GRANTED | 将来 Phase C/D |

## 5. 推奨する次フェーズ

### Phase B（推奨・次段階 拡張）
- 上部工 support-interface.json のインポート
- 橋台・翼壁の詳細化
- 杭配置の実用化
- 数量表示の拡張

### Phase C（概略設計）
- 耐震レベル1の概略照査
- 簡易水平力と基礎反力

### Phase D（詳細設計・将来）
- 示方書に基づく正式照査・配筋図・計算書

## 6. 留意事項

- 正式設計計算の保証はしていない（NOT_GRANTED を維持）
- spacer間クローンへの移植・GitHub反映は禁止
- 今後も既存 spacer-clone は読み取り専用で扱う

## 7. 参考文書

- README.md, architecture/roadmap.md
- verification/test_plan.md, test_results.md
- schemas/*.json