# SPACER CLONE Issue Backlog

**Authority:** OPERATIONAL / NAVIGATION
**Status:** ACTIVE
**作成日時:** 2026-08-16 (JST) — SPACER CLONE Phase 5 で整備

Phase 2〜4 までに判明した**残課題**と**今後の改善候補**を、
将来 GitHub Issues へ切り出しやすい形式で一覧化した文書。

- 実際の GitHub Issue / Project / label / milestone は作成していない。
- コード・テスト・CI は一切変更していない。
- 優先度は簡易 (P1〜P3) で、過剰な議論は行わない。

## 優先度定義

| 優先度 | 意味 |
| --- | --- |
| P1 | 早めに対応すべき |
| P2 | 次期改善で対応 |
| P3 | 将来検討 |

---

## A. 残課題 (Phase 2〜4 で判明した未解決事項)

### E2E-001 — apollo-step5-jp3a が全E2E実行時に timeout FAIL

- **ID:** E2E-001
- **タイトル:** apollo-step5-jp3a: コールド起動時 180s timeout 超過
- **種別:** performance / timeout / hang
- **優先度:** P1
- **現象 / 背景:**
  - 全E2E実行時に1件FAIL。
  - コールド起動時、fullPageスクリーンショット7回を含む処理が 180s timeout 超過。
  - 単独実行 / ウォームアップ時は PASS 実績あり。
  - E2E基盤の port/lifecycle 問題とは別分類。
- **既知の原因:** 特定は未確定 (今回深掘りしない)。
- **次回の作業方針:**
  - 全体負荷時の処理時間確認
  - fullPage スクリーンショットの負荷確認
  - test順序 / worker / server負荷 / DOM走査コストの確認
  - 無根拠な timeout 延長は禁止
- **完了条件:** 全E2E実行で安定して PASS する根拠 (原因特定 + 修正) が示せること。
- **今回実装しない理由:** Phase 5 は課題の文書化のみ。実装調査の深掘りは禁止。

### E2E-002 — apollo-step5-jp3c が onboarding overlay で FAIL

- **ID:** E2E-002
- **タイトル:** apollo-step5-jp3c: onboarding overlay が pointer events を遮断
- **種別:** fixture/helper不足 / onboarding state依存
- **優先度:** P1
- **現象 / 背景:**
  - 全E2E実行で1件FAIL。
  - onboarding overlay が pointer events を遮断するケース。
- **既知の原因:**
  - onboarding 初期状態に依存する fixture 不足。
- **既対応:**
  - onboarding dismiss 追加済み
  - force-click 追加済み
  - 単独 PASS 実績あり
- **次回の作業方針:**
  - fixture として onboarding 状態を安定化
  - force-click 依存を減らせるか確認
  - production 初期状態を fixture 代わりにしない
- **完了条件:** 全E2E実行で安定して PASS。force-click / dismiss 依存が最小化されている。
- **今回実装しない理由:** Phase 5 は課題の文書化のみ。fixture 実装は禁止。

### ROUTE-001 — /th/run 直行時に lobby 表示 (redirect 不整合)

- **ID:** ROUTE-001
- **タイトル:** /th/run 直行時に想定画面でなく lobby が表示される
- **種別:** production実装バグ / SPA route redirect不整合
- **優先度:** P1
- **現象 / 背景:**
  - /th/run 直行時に想定画面ではなく lobby 表示。
  - th-analysis-revamp 2件FAIL のうち1件として整理。
- **既知の原因:**
  - `redirectLegacyRoutes()` が `replaceState` のみ実行。
  - React 側 routing state が更新されない。
- **次回の作業方針:**
  - routing state 更新方法を設計
  - legacy redirect と React route state の整合確認
  - 既存 route の回帰確認
- **完了条件:** /th/run 直行時に想定画面が表示され、既存 route 回帰なし。
- **今回実装しない理由:** Phase 5 は課題の文書化のみ。route 修正は禁止。
- **Phase 6 対応結果 (2026-08-16):** 修正済み。main.tsx の routing state 初期化前に
  `redirectLegacyRoutes()` を実行し、replaceState 後の正規パスでルーティング判定する
  よう変更 (commit `ffcb4b9`)。対象E2E 5件 PASS。

### ROUTE-002 — th-analysis-revamp 関連 FAIL (2件目)

- **ID:** ROUTE-002
- **タイトル:** th-analysis-revamp 関連 FAIL (routing 不整合起因の関連失敗)
- **種別:** production実装バグ (推定)
- **優先度:** P1
- **現象 / 背景:**
  - th-analysis-revamp で計2件 FAIL。
  - うち1件は ROUTE-001 として整理済み。本件は関連する2件目。
  - /th/run 直行時の routing 不整合に起因する関連 FAIL。
- **既知の原因:** 未確定。ROUTE-001 と同一根本原因の可能性が高い。
- **次回の作業方針:**
  - ROUTE-001 と同一根本原因かを確認
  - 同一なら将来 GitHub Issue 化時に統合可
  - 今回は「残4件」を明示するため一覧上は別項目で記録
- **完了条件:** ROUTE-001 の修正後に PASS。統合可否の判断が下せていること。
- **今回実装しない理由:** Phase 5 は課題の文書化のみ。route 修正は禁止。
- **Phase 6 対応結果 (2026-08-16):** ROUTE-001 と同一根本原因と判定。
  ROUTE-001 の修正 (`ffcb4b9`) で同時解消し、対象E2E 5件 PASS。統合扱い。

---

## B. 今後の改善候補 (将来検討)

### TEST-001 — E2E Gate の3階層化 (smoke / critical / full)

- **ID:** TEST-001
- **タイトル:** E2E Gate の3階層化 (smoke / critical / full) の導入検討
- **種別:** テスト基盤改善
- **優先度:** P2
- **現象 / 背景:**
  - 通常作業で全120件を回すのは過剰。
  - 日常変更では対象spec または smoke のみ実行し、マイルストーン時のみ full E2E としたい。
- **既知の原因:** なし (現状の運用改善候補)。
- **次回の作業方針:**
  - smoke / critical / full の分類定義を検討
  - 日常 Gate とマイルストーン Gate の切り分けを設計
- **完了条件:** E2E の階層化定義が確定し、日常作業で効率よく Gate を回せる。
- **今回実装しない理由:** Phase 5 は分類実装しない。一覧化のみ。

### CI-001 — CI への E2E / test:full 追加検討

- **ID:** CI-001
- **タイトル:** GitHub Actions CI への E2E / test:full 追加の検討
- **種別:** CI 改善
- **優先度:** P2
- **現象 / 背景:**
  - 現状 CI は npm ci / test:fast / typecheck / build のみ。
  - E2E / test:full は必須 Gate に含めていない。
- **既知の原因:** なし (設計判断事項)。
- **次回の作業方針:**
  - いつ追加するか
  - 実行時間 / stability / cost
  - 必須 or 任意 Gate か
  を別途検討。
- **完了条件:** CI への E2E / test:full 追加の判断 (追加 or 見送り) と理由が明確。
- **今回実装しない理由:** Phase 5 は CI 変更禁止。

### OPS-001 — 開発・テストルールの実装強制の検討

- **ID:** OPS-001
- **タイトル:** 開発・テスト運用ルールの機械的な強制 (Gate化) の検討
- **種別:** 運用改善
- **優先度:** P2
- **現象 / 背景:**
  - Phase 4 で文書ルール (development-test-rules.md) は正式化済み。
  - 文書のみでは遵守が人依存になる。
- **既知の原因:** なし (運用改善候補)。
- **次回の作業方針:**
  - CI / scripts / preflight / agent checks での強制方法を検討
- **完了条件:** 主要ルールの少なくとも一部が機械的に強制・検知できる。
- **今回実装しない理由:** Phase 5 は実装禁止。

### SCHEMA-001 — Schema / Persistence 同期チェックの自動化検討

- **ID:** SCHEMA-001
- **タイトル:** ProjectModel / JSON Schema / Persistence 同期漏れ検知の自動化検討
- **種別:** 品質基盤改善
- **優先度:** P2
- **現象 / 背景:**
  - Phase 2 で ProjectModel と JSON Schema の更新漏れが発生した。
- **既知の原因:** 同期作業が手動依存。
- **次回の作業方針:**
  - TypeScript 型 / JSON Schema / serializer / deserializer / migration / roundtrip test の
    同期漏れを早期発見できる仕組みを検討
- **完了条件:** 同期漏れを機械的に検知できる仕組みの導入判断が明確。
- **今回実装しない理由:** Phase 5 は実装禁止。

### FIXTURE-001 — E2E fixture / helper の標準化

- **ID:** FIXTURE-001
- **タイトル:** E2E fixture / helper の標準化検討
- **種別:** テスト基盤改善
- **優先度:** P2
- **現象 / 背景:**
  - 旧5-Span初期状態依存
  - onboarding state 依存
  - route / sample load 依存
  により E2E が不安定。
- **既知の原因:** fixture の共通化・明示的な state 生成が未整備。
- **次回の作業方針:**
  - 共通 fixture
  - 明示 state 生成
  - onboarding / localStorage 初期化
  - sample setup
  の標準化を検討 (E2E-002 の根本対応に直結)。
- **完了条件:** E2E が初期状態に依存せず安定して実行できる。
- **今回実装しない理由:** Phase 5 は実装禁止。

---

## 今後の Issue 化手順 (参考)

1. 各項目を GitHub Issue 化する際は、この文書の ID を参照に prefix を付与する。
2. 関連項目 (例: E2E-002 / FIXTURE-001, ROUTE-001 / ROUTE-002) の統合判断は
   根本原因特定後に行う。
3. 未確定事項 (root cause 等) は GitHub Issue の body に「要確認」として残す。

## 未確定事項 (今回確定しない)

- E2E-001 の根本原因 (perf / worker / DOM走査のいずれかは未確定)
- CI への E2E / test:full 追加時期・判定基準
