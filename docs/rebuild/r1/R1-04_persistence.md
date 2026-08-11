================================================================================
Phase R1  R1-04  Project Persistence / Auto Save（完了記録）
================================================================================
Project Data Core + Manager/Repository を実filesystem永続化・自動保存・
再起動復元へ接続し、最小自動バックアップまで確立した記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : eff437d1e4375a0ccebc7f2452e7328f2e3f10df（R1-03 final main）
- R1-01/02/03: COMPLETE
- 保存先     : Electron app.getPath("userData")/projects/<projectId>/
  （R1-04時点では開発・テストで実fs検証。IPCでmain process経由書込）

--------------------------------------------------------------------------------
2. 実装範囲
--------------------------------------------------------------------------------
Step A: filesystem persistence責任境界 + filesystem Repository
- FileSystemGateway（memory/node/ipc）: storage非依存fs境界
- ProjectPersistence interface（save/load/delete/backup）
- FilesystemProjectPersistence: project.json正本・invalid reject・backup世代管理
- FilesystemProjectRepository: async create/get/list/update/delete

Step B: 自動保存 + 保存状態管理 + 保存失敗通知
- PersistentProjectManager: mutation後に自動persist（saving/saved/failed状態）
- Electron IPC（projectPersistenceIpc / userData/projects）+ preload/main登録
- IpcFileSystemGateway: renderer→main process橋渡し
- SaveStatusIndicator: ヘッダーに保存中.../保存済み/保存に失敗しました を表示

Step C: アプリ再起動復元 + 業務一覧再構築
- restoreFromPersistence: filesystemからvalid project復元（invalid skip・件数報告）
- NextApp起動時restore + 読み込み中ゲート（旧routeを正規入口にしない）

Step D: 最小自動バックアップ
- 自動保存時に.backup/<タイムスタンプ>.spacerbak を自動生成
- 世代管理: 保持数5・自動prune
- backup失敗が正本保存を巻き込まない
- Projectトップにbackup一覧表示

Step E: filesystem縦断テスト + regression + Electron起動確認

--------------------------------------------------------------------------------
3. 保存構造
--------------------------------------------------------------------------------
projects/
└─ <projectId>/
   ├─ project.json       ← Project正本（R1-02 schema・runtime validation通過のみ保存）
   └─ .backup/           ← 自動バックアップ（正本と分離・世代管理5）
       20260811_HHMMSS_xxx.spacerbak

--------------------------------------------------------------------------------
4. Auto Save構成
--------------------------------------------------------------------------------
- UI mutation（create/update/duplicate/delete）→ PersistentProjectManagerが
  syncでin-memory更新後、async queueでpersistenceへ自動保存
- 保存状態: saving → saved / failed をlistenerでUIへ通知
- 保存失敗は黙殺せず、SaveStatusIndicatorで明示表示
- 連続編集はqueue直列化（過剰I/O・競合防止の最小設計・debounceは導入せず）

--------------------------------------------------------------------------------
5. 再起動復元結果
--------------------------------------------------------------------------------
- 作成→自動保存→完全終了→再起動→業務一覧復元→開く→内容維持 を実fsテストで確認
- 業務件番・業務名・設計段階（その他カスタム含む）・Project ID が維持
- 削除済みProjectは再起動後も復活しない
- 不正JSON / invalid schema file はskipされ、正本に影響しない

--------------------------------------------------------------------------------
6. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- src/next全体: 85/85 PASS
  （persistence 12 / auto-save 6 / restart-restore 4 / backup 3 / filesystem vertical 1 / R1-03 regression）
- electron tests: 26/26 PASS
- typecheck: PASS
- build: PASS
- Electron通常起動回帰: /app新ホーム描画確認（証跡: docs/rebuild/evidence/r1-04-electron-home.png）
- 旧メイン画面への正規導線: 復活していない（NextApp nav-legacy無し）

--------------------------------------------------------------------------------
7. GitHub反映
--------------------------------------------------------------------------------
- PR #827 Step A → merge
- PR #828 Step B → merge
- PR #829 Step C → merge
- PR #830 Step D → merge
- PR #831 Step E（記録）→ merge（後述）
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
8. 残課題（R1-05以降）
--------------------------------------------------------------------------------
- .spacerproj本格書き出し / Project Package
- Import/Export / 他PCデータ読込 / checksum / integrity check
- 同一Project ID読込時の上書き・複製・選択処理
- 旧Project形式migration本実装
- 大容量CIM向け差分バックアップ（現状はシンプルなJSONスナップショット）

--------------------------------------------------------------------------------
9. verdict
--------------------------------------------------------------------------------
R1-04: COMPLETE
R1-05以降には進まない。
