# X3_CODE_AUDIT — コード監査

## 現行LINERコード概況

- backend/app/: FastAPIアプリ（main.py, reports.py）
- backend/engine/: 橋梁FEM・時刻歴解析エンジン
- backend/tests/: テスト群（pytest）

## Rule Engine配置方針

新しい `backend/rule_engine/` パッケージとして新設。
既存の `backend/engine/`（橋梁・構造解析）とは分離。

| コンポーネント | 配置 | 責務 |
|---------------|------|------|
| backend/rule_engine/models.py | 新規 | データモデル |
| backend/rule_engine/registry.py | 新規 | Rule登録 |
| backend/rule_engine/loader.py | 新規 | Rule読込 |
| backend/rule_engine/rules/*.py | 新規 | Rule実装 |
| backend/tests/test_rule_engine_*.py | 新規 | テスト |

## 影響範囲

- 既存engineコードへは変更なし
- 新規パッケージ追加のみ
- 既存テストへ影響なし