================================================================================
Phase R1  R1-03  Project Manager / Project Repository 最小縦断実装（完了記録）
================================================================================
新ホーム画面からProjectトップまでの最小縦断経路を確立し、
旧メイン画面への正規導線を排除した記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 32fbc48713e696a7e67fe04e8f9ff8a971e16ee9（R1-02 final main）
- R1-02: COMPLETE / FROZEN（Project Data Core / schema 1.0.0）
- branch     : feature/r1-03-project-manager 他 Step別branch

--------------------------------------------------------------------------------
2. 実装範囲
--------------------------------------------------------------------------------
Step A: Project Manager / Repository 契約と最小実装
- businessMetadata: 業務件番 / 設計段階5種 / その他カスタムラベル
  （R1-02 schemaのmetadataへ最小定義、strictObject top-levelは不変）
- projectRepository: storage非依存interface（create/get/list/update/delete）
- inMemoryProjectRepository: parseProject検証・duplicate-id・not-found処理
- projectManager: create/get/list/update/duplicate/delete（updatedAt管理・複製時新ID）
- projectManagerInstance: UI向けsingleton（test reset対応）

Step B: 新ホーム画面・routing・旧メイン画面導線排除
- HomePage: 業務から設計（業務一覧へ）/ クイック解析（新規解析）2系統 + 最近使用したデータ表示基盤
- QuickAnalysisPage: Project独立の入口（解析本体は後続Phase）
- routes: /app(ホーム) /app/quick /app/business/new /app/business/:id/edit
- NextAppから旧システムボタン削除 → 新UIから旧メイン画面へ到達不能
- R1-02 routes（isNextAppPath等）は維持し、legacy route（/pro /）は旧資産保全のため残置

Step C: 業務一覧 + 新規作成 + 編集
- BusinessListPage: 表形式（No/システム内部Project ID/業務件番/業務名/設計段階/更新日時）
  + 業務検索 + [＋新規作成][業務データ読込][業務を開く][業務編集][複製][削除]
- BusinessForm: 共通フォーム（5設計段階+その他カスタム入力）
- NewProjectPage: ProjectManager経由作成（R1-02 createEmptyProject利用・UI独自生成なし）
- EditProjectPage: 既存値表示→保存で更新
- LoadBusinessPage: 業務データ読込のUI・責任境界のみ（本格Importは後続Phase）

Step D: 複製 + 削除確認 + Projectトップ
- ProjectTopPage: 業務情報（件番/設計段階/更新日時/内部ID）+ 9領域入口
  （業務情報/道路/地形・現況/橋梁配置/下部工/上部工/FEM/CIM/成果品）
- DeleteConfirm: 削除→確認ダイアログ→完全削除（ゴミ箱・復元なし）
- BusinessListPage: 複製（新ID生成・元Project非破壊）+ 削除確認 + 操作フィードバック

--------------------------------------------------------------------------------
3. 旧メイン画面導線排除結果
--------------------------------------------------------------------------------
- NextAppの「旧システムへ」ボタン（nav-legacy）を削除
- ホーム/業務一覧/Projectトップ/クイック解析から旧メイン画面へ遷移する導線なし
- 「戻る」操作で旧メイン画面へ戻らない（戻る先は業務一覧/ホームのみ）
- refresh / routingの通常操作では /app（新ホーム）が正規入口
- 旧システム本体（/pro / route）は旧資産保全のため削除せず、新UIから到達不能化

--------------------------------------------------------------------------------
4. Project操作確認結果
--------------------------------------------------------------------------------
- 新規作成: UI→ProjectManager→R1-02 Data Core（createEmptyProject）→Repository
- 業務編集: 既存値プリフィル→保存でupdatedAt更新
- 複製: 新しいProject ID生成・元Project非破壊
- 削除: 確認ダイアログ→完全削除
- 業務を開く: /app/projects/:id のProjectトップへ遷移
- Projectトップ: 業務情報 + 9領域入口表示

--------------------------------------------------------------------------------
5. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- src/next全体: 59/59 PASS（Step A〜E）
- R1-02 regression（project）: 32/32 PASS
- electron tests: 26/26 PASS
- typecheck: PASS
- build: PASS
- Electron通常起動回帰: 新ホーム画面描画確認
  （証跡: docs/rebuild/evidence/r1-03-home-screen.png）
- 縦断テスト: ホーム→業務一覧→新規作成→開く→Projectトップ、クイック分離、最近使用

--------------------------------------------------------------------------------
6. GitHub反映
--------------------------------------------------------------------------------
- PR #821 Step A → merge
- PR #822 Step B → merge
- PR #823 Step C → merge
- PR #824 Step D → merge
- PR #825 Step E（記録）→ merge（後述）
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
7. 残課題（R1-04以降）
--------------------------------------------------------------------------------
- 永続化: filesystem / localStorage を正本とする本格保存
- Project Repository 本格実装（in-memoryから差し替え可能な境界は確立済み）
- Save / Load 本実装・ProjectファイルImport/Export
- 各設計module本体（道路/地形/橋梁配置/下部工/上部工/FEM/CIM/成果品）
- Project Manager 本実装（業務フロー・ワークフロー拡張）

--------------------------------------------------------------------------------
8. verdict
--------------------------------------------------------------------------------
R1-03: COMPLETE
R1-04以降には進まない。
