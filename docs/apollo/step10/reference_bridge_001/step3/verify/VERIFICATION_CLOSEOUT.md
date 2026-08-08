# FINAL VERIFICATION — Verification Checklist / Closeout

> **Authority:** Reference Bridge 001 (RB-S10-001) — 最終動作検証

## 1. Verification Checklist

| 領域 | 項目 | 結果 | 根拠 |
|------|------|------|------|
| Runtime/UI | 起動 → 上部工画面 → パイプライン操作 | PASS | Playwright E2E-S3-001（実backend起動） |
| UI 主要導線 | Geometry→3D→Design→Replay→Analysis | PASS | E2E-S3-001 |
| dead-end / stub | 主要経路 | 0 | STEP3 closeout |
| Source/Sample parity | 橋長・支間・幅員・主桁・床版・舗装 | PASS | SOURCE_SAMPLE_COMPARISON（PASS 7） |
| Geometry/Drawing parity | 格点端点・主桁・床版 | PASS | GEOMETRY_DRAWING_COMPARISON（PASS 11） |
| Analysis/Design numeric | 反力・断面力・照査 | NOT_AUTHORIZED | RESULT_NUMERIC_COMPARISON（数値認証前） |
| Artifact | 数量CSV・STL・manifest | PASS | パネル出力 + 決定論再生成 |
| save/load | 同一入力→同一結果 | PASS | RB-001 入力は決定論（fingerprint 安定） |
| Project Replay | verdict=PASS | PASS | E2E-S3-001 |
| E2E | Playwright | PASS (2/2) | step3-superstructure-pipeline.spec |
| Electron | unit 26/26 + compile + 構成 | PASS | STEP3-03 |
| Windows | 構成検証済み（実機未検証） | CONFIG_VERIFIED | STEP3-03（実機は packaging 工程） |
| backend tests | pytest | PASS (655) | 再実行 |
| frontend typecheck | tsc -b | PASS | 再実行 |

## 2. 判定サマリ

| 判定項目 | 結果 |
|----------|------|
| RUNTIME_VERIFICATION | PASS |
| SOURCE_SAMPLE_PARITY | PASS（WARN 4 / NOT_VERIFIABLE 5 明示） |
| GEOMETRY_DRAWING_PARITY | PASS（WARN 3 明示） |
| RESULT_NUMERIC_PARITY | NOT_AUTHORIZED（認証前。数値比較対象なし） |
| ARTIFACT_AUDIT | PASS |
| PROJECT_REPLAY | PASS |
| E2E | PASS |
| WINDOWS_VERIFICATION | CONFIG_VERIFIED（実機は packaging 工程） |
| FINAL_VERIFICATION_VERDICT | PASS |

## 3. 数値認証

- `FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION` を維持（数値認証を勝手に GRANTED にしない）。
- 本検証の PASS は「ソフト動作・接続・原本との入力/幾何一致」に対するものであり、設計数値の正式認証ではない。

## 4. 原本

- 鋼鈑桁橋_設計計算例.pdf / 鋼鈑桁橋_図面例.pdf を SHA-256 で確認（source manifest SRC-002/003 と一致）。
- テキスト抽出により設計条件・格点座標表・主桁寸法を照合。

## 5. 残課題

- D-01..D-06（skew・支持位置オフセット・中間格点 HOLD・端部桁高・曲線近似・勾配未入力）は
  設計簡略化/deferred として記録。ソフト不具合なし。
- Windows 実機起動は packaging 工程。
- 数値照合は認証後（Phase B / OWN-026）。
