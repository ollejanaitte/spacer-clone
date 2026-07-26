# 07 — Validation and Test Strategy

## 方針

本パッケージは **ギャップ分析・テスト計画準備** 用である。ゴールデンデータ（Reference Bridge の確定入力・期待値）は **未確定**。

## READY subset テスト

- 対象: READY 69 件のみ
- 各要件: requirement_id → validation_rule_id → evidence_image の鎖を維持
- 検証: 所在確認・入力境界の存在確認。数値一致テストは Target Standard 選定後

出典: `validation/stage5_ready_subset_test_plan.md`（パッケージ内コピー予定）

## Reference Bridge 候補

- `validation/stage7_reference_bridge_input_candidates.md` — RB-001 候補（未確定）
- 入力から結果・帳票までの追跡は Stage 7 範囲

## 入力検証

- `validation_rule_candidates.csv` — READY 連携の候補ルール
- 自動数値確定禁止（`BLOCK_NUMERIC_AUTO_DETERMINATION`）を前提
- 単位系・必須フィールドの存在チェックは候補段階

## 解析結果検証

| 項目 | 状態 |
|------|------|
| 断面力 | 期待値未確定 |
| 反力 | 期待値未確定 |
| 変位 | 期待値未確定 |
| ゴールデン解析 | **未確定** |

## トレーサビリティ検証

- `evidence/index.csv` と画像ファイルの 1:1
- `standards/ready_requirements.csv` 69 行
- crosswalk の READY 行と feature_id 整合

## JIS GAP の扱い

JIS SOURCE GAP 34 件は一次 JIS 未取得。JIS 依存の限界値・材料値をテスト期待値に **しない**。

## OPEN 項目

OPEN 32 件は追加出典レビュー待ち。テストケースの Pass 条件に含めない。

## APOLLO RETURN / UNKNOWN

- RETURN 残 4: APOLLO マニュアル追加抽出待ち
- UNKNOWN 15: 資料不足。ブロッカーとして記録

## パッケージ検証

Grok が `validate_frame_handoff_package.py` で構造・漏洩・件数を機械検証する。

## Verdict との関係

```text
APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY
```

全面回帰テスト・本番リリース判定には至らない。
