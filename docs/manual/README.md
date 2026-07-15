# Manual

ユーザー向け操作手順の配置先です。

現時点では詳細なユーザーマニュアルは不足している。次の文書は設計書から推測して作らず、対応する製品面とリリース条件が安定してから作成する。

| Gap | Status | Owner | Start / release gate |
| --- | --- | --- | --- |
| `getting-started.md` | DOCUMENT_GAP | Documentation owner + release owner | Supported install/start matrix and release target are stable |
| `static-analysis.md` | DOCUMENT_GAP | Frame product owner + documentation owner | Static workflow and supported input/output surface are accepted |
| `dynamic-analysis.md` | DOCUMENT_GAP | Frame dynamics owner + documentation owner | Eigen/spectrum/time-history workflow and limitations are accepted |
| `road-design.md` | DOCUMENT_GAP | Road product owner + documentation owner | Road workflow and target persistence boundary are accepted |
| `bridge-workflow.md` | DOCUMENT_GAP | Road/Frame owners + documentation owner | Road-to-Frame import/apply/conflict workflow is accepted |
| `export.md` | DOCUMENT_GAP | Road/Frame output owners + documentation owner | GDRAW/PRINT/DRAFT/DXF/PDF/CSV behavior is accepted |
| `troubleshooting.md` | DOCUMENT_GAP | Support/release owner + documentation owner | Environment matrix and failure/recovery catalog are supported |

既存の関連ドキュメント:

- [Ubuntu runtime guide](../development/runtime-ubuntu.md)
- [../../README.md](../../README.md#quick-start)
- [../../examples/README.md](../../examples/README.md)
- [Time-history UI reference](../frame/ui/time-history-analysis-revision-2026-06.md)
- [JIP-LINER manual](../../マニュアル/JIP-LINER_マニュアル.pdf) — semantic reference only
- [SPACER operation manual](../../マニュアル/SPACER操作マニュアル.pdf) — semantic reference only

The two product PDFs are not substitutes for project user manuals and are not numerical oracles.
