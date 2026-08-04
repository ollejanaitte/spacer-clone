# Apollo Step 5-JP — 日本語 UI 設計

一般ユーザー画面を日本語中心にする設計・監査ドキュメント。

| Step | Scope | Status |
|------|-------|--------|
| **5-JP1** | 英語露出監査・用語集・文言設計 | 本ディレクトリ（設計のみ） |
| 5-JP2 | 共通翻訳辞書・表示 component | 未着手 |
| 5-JP3 | 全画面適用・残存英語検査・E2E | 未着手 |

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
| [evidence_index.md](./evidence_index.md) | JP1-A+ |
