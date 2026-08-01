# GitHub調査スコープ検証記録

**Date:** 2026-08-01  
**Repository:** `ollejanaitte/spacer-clone`  
**Branch:** `docs/apollo-phase1-design-expansion-refreeze`  
**Base:** `main` / `1fbcb3ea804f965b8f262284573f4f4d42dc2411`

## 1. GitHub側検証結果

`main...docs/apollo-phase1-design-expansion-refreeze` の比較結果:

- status: `ahead`
- ahead: 6 commits
- behind: 0 commits
- merge base: `1fbcb3ea804f965b8f262284573f4f4d42dc2411`
- application code changes: なし
- dependency / lockfile changes: なし
- documentation-only scope: PASS

変更対象:

- `README.md`
- `scope_and_architecture_freeze.md`
- `implementation_sequence.md`
- `manual_traceability.csv`
- `local_verification_plan.md`

## 2. 作成済み成果

- 非合成RC床版鋼鈑桁橋の対象・非対象
- 非合成床版とスタッド／床版接合要素の扱い
- Geometry / Structural Design / Analysis / Check / Drawing / Reportの責務境界
- AP-DX-00〜AP-DX-21の実装順序
- APOLLOマニュアル各章と実装モジュールの対応表
- 数値未採択時の `NOT_AUTHORIZED` 規則
- ZorinOSローカル検証計画

## 3. GitHubだけでは確認できない事項

以下はGitHub API上の差分確認だけでは保証できない。

- Markdownリンク・CSVを含むリポジトリ内検査の実行結果
- 既存Apolloテストの実行結果
- TypeScript typecheck / lint / production build
- main viewerとApollo viewerの3D表示非回帰
- backend / IF3解析関連テスト
- ローカル正本とGitHub branchのSHA一致

## 4. 次のゲート

この時点でGitHub上の調査・設計文書作成と変更スコープ確認は完了した。

次はZorinOSの次のリポジトリで `local_verification_plan.md` に従いローカル検証を行う。

```text
/home/masaharu/Projects/spacer-clone
```

ローカル検証結果は次へ保存する。

```text
docs/apollo/phase1_design_expansion_refreeze/local_verification_report.md
```

ローカル検証完了までは、再凍結の最終判定、PR作成、mainへのマージを行わない。
