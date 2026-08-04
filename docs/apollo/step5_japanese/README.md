# Apollo Step 5-JP — 日本語 UI 設計

一般ユーザー画面を日本語中心にする設計・監査ドキュメント。

| Step | Scope | Status |
|------|-------|--------|
| **5-JP1** | 英語露出監査・用語集・文言設計 | COMPLETE（設計のみ） |
| **5-JP2** | 共通翻訳辞書・表示 component | COMPLETE |
| **5-JP3** | 全画面適用・残存英語検査・E2E | COMPLETE — see [jp3/jp3_completion_gate.md](./jp3/jp3_completion_gate.md) |

## 表示レイヤー

1. **L1 一般表示** — 日本語、短い、次の操作が分かる
2. **L2 補足** — 理由・影響・対処
3. **L3 技術情報** — enum / diagnostic code / field path（折りたたみ）

## 不変条件

- 内部 enum / schema / diagnostic code / 保存データは英語のまま
- `APPLICATION_CODE_CHANGED: NO`（JP1）
- 正式認可状態は変更しない（NOT_GRANTED / PROHIBITED）

## Documents (JP1)

| File | Substep |
|------|---------|
| [01_english_exposure_audit.md](./01_english_exposure_audit.md) | JP1-A |
| [ui_text_inventory.csv](./ui_text_inventory.csv) | JP1-A |
| [screen_inventory.csv](./screen_inventory.csv) | JP1-A |
| [technical_only_allowlist.csv](./technical_only_allowlist.csv) | JP1-A |
| [unresolved_terms.csv](./unresolved_terms.csv) | JP1-A |
| [02_japanese_ui_principles.md](./02_japanese_ui_principles.md) | JP1-B |
| [apollo_japanese_glossary.csv](./apollo_japanese_glossary.csv) | JP1-B |
| [workflow_status_glossary.csv](./workflow_status_glossary.csv) | JP1-B |
| [structural_member_glossary.csv](./structural_member_glossary.csv) | JP1-B |
| [workflow_step_glossary.csv](./workflow_step_glossary.csv) | JP1-B |
| [authorization_glossary.csv](./authorization_glossary.csv) | JP1-B |
| [prohibited_translation.csv](./prohibited_translation.csv) | JP1-B |
| [terminology_decision_register.csv](./terminology_decision_register.csv) | JP1-B |
| [03_ui_text_architecture.md](./03_ui_text_architecture.md) | JP1-C |
| [04_technical_details_disclosure.md](./04_technical_details_disclosure.md) | JP1-C |
| [05_message_style_guide.md](./05_message_style_guide.md) | JP1-C |
| [06_mobile_and_accessibility.md](./06_mobile_and_accessibility.md) | JP1-C |
| [status_message_catalog.csv](./status_message_catalog.csv) | JP1-C |
| [button_label_catalog.csv](./button_label_catalog.csv) | JP1-C |
| [field_label_catalog.csv](./field_label_catalog.csv) | JP1-C |
| [warning_error_catalog.csv](./warning_error_catalog.csv) | JP1-C |
| [authorization_message_catalog.csv](./authorization_message_catalog.csv) | JP1-C |
| [screen_translation_matrix.csv](./screen_translation_matrix.csv) | JP1-C |
| [jp2_implementation_plan.md](./jp2_implementation_plan.md) | JP1-C |
| [jp3_e2e_plan.md](./jp3_e2e_plan.md) | JP1-C |
| [jp2_pr_plan.csv](./jp2_pr_plan.csv) | JP1-C |
| [07_completion_gate.md](./07_completion_gate.md) | JP1-D |
| [evidence_index.md](./evidence_index.md) | JP1-A+ |
