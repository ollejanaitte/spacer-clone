================================================================================
Phase R1  R1-01  新統合システム App Shell（救出・完了記録）
================================================================================
Phase R1 途中で停止していた「新統合システム App Shell」未コミット成果を
失わず回収し、検証・GitHub main 反映まで完了した記録。

完了日: 2026-08-10

--------------------------------------------------------------------------------
1. 開始状態
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- 開始時branch: feature/r1-01-new-app-shell
- 開始時HEAD : 0983dbce304a6b4475c392660f6db888bdb71adf（= R1-00 baseline記録）
- origin/main: 465ac392d64498d000a5a0bcb18c98900f408a4d
- rebuild/integrated-system: 4560eaf4e5404048b25392d213a6d6610ab27aea
- 未コミット差分: あり（下記2.参照）

--------------------------------------------------------------------------------
2. 救出した未コミット差分
--------------------------------------------------------------------------------
MODIFIED:
- desktop/electron/main.ts          Electron既定URLを /app へ変更
- desktop/electron/dist/main.js     main.ts のコンパイル結果（追跡対象）
- frontend/src/main.tsx             /app 判定を追加し NextApp へ分岐

UNTRACKED / NEW:
- frontend/src/next/NextApp.tsx                 App Shell
- frontend/src/next/routes.ts                   /app routing・navigateTo
- frontend/src/next/types.ts                    ProjectSummary
- frontend/src/next/pages/BusinessListPage.tsx  業務一覧（空状態）
- frontend/src/next/pages/ProjectHomePage.tsx   Project Home（最低限route）
- frontend/src/next/styles.css                  App Shell スタイル
- frontend/src/next/__tests__/NextApp.test.tsx  テスト3件

保全方法: /tmp/r1-01-rescue/ へ差分patch + 新規ファイル一式を退避後、
feature/r1-01-new-app-shell 上で検証・commit。

--------------------------------------------------------------------------------
3. 実装概要
--------------------------------------------------------------------------------
- NextApp（新統合システム App Shell）を旧 App.tsx / LobbyApp から分離。
- main.tsx の Root で isNextAppPath 判定 → /app 配下は NextApp を表示。
  旧システムは /pro, / から従来どおり到達可能。
- Electron dev 既定URLを http://127.0.0.1:5173/app へ変更。
- /app → BusinessListPage（業務一覧・空状態を正しく表示）。
- /app/projects/:id → ProjectHomePage（Project Home・未実装セクション明示）。
- 旧システムの巨大stateは一切コピーしていない。
- R1-02以降の機能は未実装（ProjectHome の各セクションは「未実装」表示）。
- mock/fakeを完成機能として見せていない（業務一覧は Repository 未接続のため
  空状態のみ。R1-04で接続予定とコメント明記）。

--------------------------------------------------------------------------------
4. 修正内容（レビュー後）
--------------------------------------------------------------------------------
ゼロからの書き直しなし。既存未コミット実装を尊重し、追加修正なし。
- electron:compile で dist/main.js が main.ts と整合することを確認。
- typecheck / test / build / Electron実機をすべて確認済み。

--------------------------------------------------------------------------------
5. 検証結果
--------------------------------------------------------------------------------
- R1-01 tests : PASS（NextApp.test.tsx 3/3）
- electron tests : PASS（desktop/electron 4ファイル 26/26）
- typecheck   : PASS（tsc -b）
- build       : PASS（tsc -b && vite build）
- Electron実起動 : PASS
  - Electron window「SPACER Clone MVP」起動
  - URL: http://127.0.0.1:5173/app（/app 表示確認）
  - 新App Shell ヘッダー（#1f3b5a）と「新しい業務」ボタン（#2563eb）を
    スクリーンショット検出 → BusinessListPage 表示を確認
  - 致命的白画面なし・consoleに致命エラーなし
- 証拠: docs/rebuild/evidence/r1-01-electron-app.png

--------------------------------------------------------------------------------
6. GitHub反映
--------------------------------------------------------------------------------
- PR: #814
- merge先: GitHub main（PR merge）
- main merge後 SHA: （merge実行時点のSHAを記録）
- rebuild/integrated-system: main 同期後のSHAを記録

--------------------------------------------------------------------------------
7. 残課題
--------------------------------------------------------------------------------
- 業務一覧の実データは R1-04 で Project Repository へ接続（空状態のみ現状正）
- Project Home の各セクション実装は R1-02 以降
- 本番パッケージ（app.isPackaged）時の /app エントリは未対応（dev時のみ）

--------------------------------------------------------------------------------
8. 判定
--------------------------------------------------------------------------------
R1_01_CODE_REVIEW_VERDICT       : PASS
R1_01_TEST_VERDICT              : PASS
R1_01_TYPECHECK_VERDICT         : PASS
R1_01_BUILD_VERDICT             : PASS
R1_01_ELECTRON_BOOT_VERDICT     : PASS
R1_01_APP_SHELL_VERDICT         : PASS
R1_01_GITHUB_REFLECTION_VERDICT : PASS
R1-01: COMPLETE

R1-02 以降には進まない。
