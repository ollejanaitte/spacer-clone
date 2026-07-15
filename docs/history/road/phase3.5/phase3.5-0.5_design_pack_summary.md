# Phase3.5 Design Pack Summary

## 1. 設計書一覧と依存関係マトリクス

| 設計書 | N1 | N2 | N3 | N4 | N5 | N6 | N7 | U1-U8 | Phase3.5-0調査 |
|---|---|---|---|---|---|---|---|---|---|
| N1 Horizontal | - | 依存 | - | - | 参照される | 参照される | 参照される | U1/U2/U6/U8 | 依存 |
| N2 Typed Draft Schema | 参照される | - | 参照される | 参照される | 参照される | 参照される | 参照される | U4 | 依存 |
| N3 Vertical | - | 依存 | - | - | 参照される | 参照される | 参照される | U2/U3/U5/U8 | 依存 |
| N4 Cross Section | - | 依存 | - | - | 参照される | 参照される | 参照される | U2/U3/U5/U8 | 依存 |
| N5 3D Integration | 依存 | 依存 | 依存 | 依存 | - | 参照される | 参照される | U5/U6 | 依存 |
| N6 DXF/STL Export | 依存 | 依存 | 依存 | 依存 | 依存 | - | 参照される | U7/U8 | 依存 |
| N7 PR Breakdown | 依存 | 依存 | 依存 | 依存 | 依存 | 依存 | - | 依存 | 依存 |
| U1-U8 Updates | 依存 | 依存 | 依存 | 依存 | 依存 | 依存 | 参照される | - | 依存 |

N2を全設計書の共通前提とし、N1/N3/N4はN5へ、N5はN6へ接続する。N7はN1-N6およびU1-U8すべてに依存する。

## 2. Human Decision 反映チェック

| Decision # | 内容 | 反映先設計書 | 反映箇所 |
|---|---|---|---|
| 1 | DXF曲線出力はPhase3.5初期はpolyline近似 | N6, U7 | DXF strategy / sampling |
| 2 | クロソイドはSimpson積分維持、精度Gate明記 | N1, U1 | Algorithm / accuracy |
| 3 | UIはJIP-LINER準拠タブ構成 | N1, N3, N4, N7 | UI / PR-UI-0 |
| 4 | v0.1固定Z/offsetのみ非破壊migration | N2, U4 | Migration |
| 5 | Project保存はdomain draft必須 | N2, U4 | schema example |
| 6 | Frame Modelは細分化直線member | N5, N7 | 3D integration / mapper PR |
| 7 | 横断勾配・superelevation符号は3.5-3で確定 | N4, N5 | crossfall / localFrame |
| 8 | Phase3.5は単一alignment | N1, N2, N5 | domain model |
| 9 | SamplingはDisplay/DXF/Frameの3系統分離 | N1, N2, N5, N6, U6, U7, U8 | sampling tables |
| 10 | Diagnostic Severityを表で固定 | N1/N3/N4/N6 §8, U2 | Diagnostic Severity |
| 11 | Feature Flag 不採用（Branch運用） | N7 §7 | Release strategy |
| 12 | `draftSchemaVersion` 命名 | N2, U4, N7 全体 | naming / schema examples |
| 13 | Tab Framework 先行PR（PR-UI-0） | N7 §2/§3/§4/§5/§6 | PR breakdown / graph |
| 14 | Simpson精度を目標値化 + Spike（PR-1b-0） | N1 §5, U1, N7 §2/§4 | target accuracy / spike PR |
| 15 | Sampling Frame max chord 0.25m 厳守 | N1, N2, N5, N6, U6, U7, U8 | sampling defaults |
| 16 | Migration Round-trip Test必須 | N2 §9, N7 PR-1a-5 | round-trip test policy |

## 3. 用語整合性チェック

| 用語 | 統一定義 | 主な反映先 | 状態 |
|---|---|---|---|
| `liner.schemaVersion` | Project integration metadata version | N2, U4 | OK |
| `liner.draftSchemaVersion` | Liner domain draft version | N2, U4, N7 | OK |
| `liner.domainDraft` | typed domain payload root | N2 | OK |
| `LinerDomainDraftVNext` | vNext domain draft type name | N2 | OK |
| Display sampling | Preview / 確認図用sampling | N1, N2, U6 | OK |
| DXF sampling | Plan/Profile DXF polyline approximation | N1, N2, N6, U7 | OK |
| Frame sampling | Frame Model用の細分化直線member | N1, N2, N5 | OK |
| Target Accuracy | Simpsonクロソイドの実測目標値。保証値ではない | N1, U1, N7 | OK |
| Diagnostic Severity | Error/Warningの固定分類 | N1, N3, N4, N6, U2 | OK |

## 4. 未解決事項リスト

| 項目 | 該当設計書 | 扱い |
|---|---|---|
| Clothoid Spike結果待ち | N1, PR-1b-0 | PR-1b-0 完了後にHuman Decision |
| Sampling Frame 0.25mの計算性能影響 | N5, N7 | 計算負荷は許容、対策はDisplay/DXFまたは構造側で行う |

## 5. Phase3.5-1〜5 実装着手前チェックリスト

- [x] N1〜N6の設計レビュー完了。
- [x] U1〜U8の更新差分レビュー完了。
- [x] draftSchemaVersion 命名で責務分離を承認。
- [x] 新規diagnostic codeとSeverityを正式採番方針として承認。
- [x] Simpsonクロソイドは目標値化、Spike (PR-1b-0) で実測判定。
- [x] Sampling既定値 (Display 0.5m / DXF 0.1m / Frame 0.25m厳守) を承認。
- [x] v0.1 fixed-z/offset migrationのみ対応する方針を再確認。
- [x] N7のPR分割とクリティカルパス（PR-UI-0, PR-1b-0 追加版）を承認。
- [x] Migration Round-trip Test 3種を PR-1a-5 のDoneとして必須化。
- [x] Feature Flag は採用せず Branch運用とする。
- [x] 実装開始PRを PR-1a-1 に固定。

## 6. PR総数サマリ（N7との連携）

| SubPhase | PR数 | サイズ合計 | 想定工数 |
|---|---:|---|---:|
| 3.5-1a | 7 (PR-UI-0 追加) | S+S+S+M+M+M+S | 6d |
| 3.5-1b | 7 (PR-1b-0 追加) | S+M+M+M+M+M+M | 8.5d |
| 3.5-1c | 5 | M+M+S+S+M | 5d |
| 3.5-2a | 5 | S+S+M+M+M | 6d |
| 3.5-2b | 5 | M+M+S+S+M | 5d |
| 3.5-3a | 5 | S+S+M+M+M | 6d |
| 3.5-3b | 4 | M+M+S+S | 4.5d |
| 3.5-4a | 5 | M+M+M+L+M | 8d |
| 3.5-4b | 4 | M+M+S+M | 5d |
| 3.5-5a | 5 | M+M+S+S+S | 5.5d |
| 3.5-5b | 4 | S+M+M+S | 4d |
| **Total** | **56** | - | **63.5d** |
