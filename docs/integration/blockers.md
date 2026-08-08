# Unresolved Blocker 一覧

> **Phase:** P5
> 各 blocker について「確認済み事実 / 推定 / 提案」を区別する。

| # | Blocker | 種別 | 影響 | 対処 |
|---|---------|------|------|------|
| B0 | ①道路線形最新成果が `main` 未統合（`research/liner-terrain-fix-p01-coords` 203 ahead / 271 behind） | 確認済み事実 | ①の最新状態（MAIN3D/山岳500m/terrain）を main ベースで接続できない | Phase 3 冒頭に統合。専用 integration branch で段階 merge |
| B1 | 支点反力 NOT_AUTHORIZED（grillage NOT_GRANTED） | 確認済み事実 | CASE A の③照査・CASE B の③開始が fail-closed | 認証プロセス整備。それまで反力は NOT_AUTHORIZED で伝搬 |
| B2 | 中間格点座標 HOLD（全50点） | 確認済み事実 | ②の格点配置が endpoint のみ。③への格点渡し不可 | 別 source（道路線形）から確定 or 認証 |
| B3 | CBDM schema version 不一致（registry 1.0.0 / JSON schema contractVersion 0.1.0 / drift test assert 0.1.0 / fixture 1.0.0） | 確認済み事実 | version 判断が紛れる | 次回契約更新時に統一（提案: contractVersion を 1.0.0 へ、drift assert を緩和） |
| B4 | value status 語彙が3系統（CBDM 6+3 / GovernedQuantity adoptionStatus 4 / authority 4） | 確認済み事実 | status の比較が困難 | BridgeProject value-status-unit-policy でマッピング明文化（本 PR で定義済み）。実装統一は Phase 3 |
| B5 | Model3D が契約外（runtime payload のみ、RESEARCH 側にのみ存在） | 確認済み事実 | 統合3D の共通契約がない | Phase 4 で `BridgeGeometry3dPayload` を正規化 |
| B6 | `SupportPlacementEngine`（実線形配置）が実行時 host に未配線 | 確認済み事実 | ③の配置が直線プレースホルダ | Phase 3-5 で配線 |
| B7 | road-to-frame-transfer-package に producer なし | 確認済み事実 | ①→② の正規転送経路が未使用 | Phase 4 |
| B8 | ③の正式 Design Engine 未実装（Test/Mock のみ） | 確認済み事実 | 下部工設計は HOLD | A-01 契約を維持して実装（Phase 4） |
| B9 | `CommonModelGeometryInputAdapter` が数値幾何を渡さない | 確認済み事実 | CBDM→② の数値が空 | Phase 3-2 |
| B10 | ②の縦断・横断勾配が未消費（deck elevation ハードコード） | 確認済み事実 | 線形の縦横断が②に反映されない | Phase 3-3（WF-01 binding）で解消 |
| B11 | ②サンプル RB001 の線形がハードコード直線 | 確認済み事実 | ②→① 復元の前提が弱い | CASE B の reconstruction は DERIVED/INFERRED で明示 |
| B12 | 3D 座標変換規約が2系統（domain z-up / three y-up） | 確認済み事実 | 統合3D の整合確認が必要 | value-status-unit-policy §5 で canonical を宣言済み。実装は Phase 4 |

## 判断メモ
- B3/B4 は契約上の不整合（**確認済み事実**）。修正は本 Phase のスコープ外とし、
  次回契約更新（1.0.0 化）時に一括対応する（**提案**）。
- B0/B1/B8 は Phase 3 の完了条件に直結するため、Phase 3 readiness の主要判定材料。
