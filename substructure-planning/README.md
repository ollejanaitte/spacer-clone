# 下部工計画・3Dモデリングツール（事前調査・要求整理・技術検証）

このフォルダは、仮称「下部工計画・3Dモデリングツール」の
**事前調査・要求整理・データモデル設計・3D生成方式検討・最小プロトタイプの技術検証**を行う
独立した研究ラボ（LAB_ROOT）です。

- 正式な下部工設計ソフトの実装ではありません。
- 既存の上部工開発（spacer-clone）から完全に分離したローカル環境です。
- GitHubへの書込み・push・PR・mergeは行いません。
- 数値はすべて「参考値・未検証・実務使用不可」です。

## 成果物一覧

```
LAB_ROOT/
├── README.md
├── STATUS.md
├── preflight_report.txt          Phase 0 プリフライト報告
├── research/                     資料・要求調査
│   ├── requirements.md
│   ├── scope.md
│   ├── terminology.md
│   ├── reference_inventory.md
│   ├── existing_asset_review.md
│   └── risk_register.md
├── architecture/                 設計案
│   ├── system_concept.md
│   ├── data_model.md
│   ├── exchange_schema.md
│   ├── coordinate_system.md
│   ├── three_d_generation.md
│   ├── integration_boundary.md
│   └── roadmap.md
├── schemas/                      JSON Schema試作
│   ├── substructure-project.schema.json
│   ├── support-interface.schema.json
│   ├── pier.schema.json
│   ├── abutment.schema.json
│   ├── foundation.schema.json
│   └── sample-project.json
├── prototype/                    最小3Dプロトタイプ（Vanilla TS + Three.js）
├── verification/                 検証
│   ├── test_plan.md
│   ├── test_results.md
│   ├── schema_validation.py
│   ├── fixtures/
│   ├── screenshots/
│   └── logs/
├── handoffs/next_phase_handoff.md
└── final_report.txt
```

## 主要な結論（詳細は final_report.txt）

| 項目 | 結論 |
|---|---|
| 独立ツール成立性 | 成立可能 |
| 上部工との疎結合 | JSON交換スキーマ（support-interface）で成立 |
| 3D生成 | Vanilla TS + Three.js で成立（プロトタイプ動作） |
| データモデル | 安定ID付きエンティティモデルを設計 |
| 検証 | データ12/12、単体26/26、ブラウザ10/10 PASS |

NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
PRODUCTION_USE_AUTHORIZATION: NOT_GRANTED
