# Apollo Phase 1 3D/STL Risk Register

| リスク | 区分 | 条件 | 初期対処 |
|---|---|---|---|
| SoR不一致 | STOP | source ownership を説明できない | Step 2 表を再確認 |
| axis不一致 | STOP | viewer と export の軸が不一致 | Step 1 座標契約へ戻る |
| unit不一致 | STOP | `m/mm` 変換が不一致 | unit test 追加 |
| missing bridge geometry | WARN | solid の一部省略 | warning + fallback |
| viewer state混入 | WARN | state を正本へ保存 | adapter 分離 |
| dual write | STOP | ProjectModel/BridgeDefinition 両書込み | 実装中止 |
| Unit 3 regression | STOP | 既存非数値編集が壊れる | revert / root cause fix |
| STL品質不足 | WARN | zero-area / duplicate geometry | export gate で失敗 |
| Electron GPU問題 | WARN | WebGL fallback 依存 | fallback 2D 許容、記録 |
| performance低下 | WARN | provisional threshold 超過 | profile / reduce scope |
| scope creep | WARN | unrelated viewer/electron change | PR 分割見直し |
| package追加必要 | STOP | 既存依存で実現不可 | ADR 待ち |

