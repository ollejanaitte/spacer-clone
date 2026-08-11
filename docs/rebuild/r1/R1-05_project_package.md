================================================================================
Phase R1  R1-05  Project Package / Import・Export / Integrity Check（完了記録）
================================================================================
R1-04で永続化された1業務=1Projectフォルダーを、1業務=1.spacerprojファイルとして
書き出し・検査・読込・登録できるようにした記録。

完了日: 2026-08-11

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 16a9d9b572d7b4bb4edadac97940195fc577372c（R1-04 final main）
- R1-01/02/03/04: COMPLETE / R1-04.5（Luna Vision委任）: GO
- branch     : feature/r1-05-project-package 他 Step別branch

--------------------------------------------------------------------------------
2. Package仕様（.spacerproj）
--------------------------------------------------------------------------------
- 方式: 単一JSONコンテナ（依存追加なし・node:crypto sha256）
- 構造: manifest + files
- manifest: packageFormatVersion(1) / containerFormat("spacerproj-json-v1") /
  projectId / projectSchemaVersion / createdAt / files[path,size,checksum]
- files: project.json（R1-02 schema正本）
- 将来: containerFormatでZIP等への拡張可能性を確保（大容量moduleはR1-05対象外）

--------------------------------------------------------------------------------
3. 実装範囲
--------------------------------------------------------------------------------
Step A: Package format + manifest + checksum + version責任境界
- projectPackage（型）/ packageChecksum（sha256）/ projectPackageBuilder /
  projectPackageInspector / packagePathSafety（path traversal拒否）

Step B: Export + 保存先選択 + 安全なPackage生成
- Electron SAVE_SPACER_PROJチャンネル（temp→rename・壊れた最終成果物を残さない）
- saveSpacerProjFile（renderer/browser fallback）
- projectPackageExporter + BusinessListPage[業務データ書き出し]

Step C: Import + 事前Integrity Check + 検査結果画面
- projectPackageImporter: 選択→事前検査
- IntegrityCheckResult画面（5項目+容量+総合判定）
- LoadBusinessPage: placeholder→正式実装（正常時のみ読込→登録→Projectトップ）

Step D: 同一ID競合 + 上書きbackup + 複製 + transactional import
- overwriteProject（安全backup→置換・backup失敗時拒否）
- importAsDuplicate（新Project ID・内容維持）
- ConflictResolutionDialog: 上書き/複製/キャンセル3択

Step E: round-trip + 破損Package試験 + Luna目視確認 + regression
Step F: Final Report

--------------------------------------------------------------------------------
4. Integrity Check項目
--------------------------------------------------------------------------------
- ファイル破損 / Project Schema / 必須データ / checksum / 容量 / unsafe path
- NGが1つでもあれば読込不可（例外許可なし）
- 総合判定: 読込可能 / 読込不可

--------------------------------------------------------------------------------
5. 競合処理 / 上書きbackup / transactional safety
--------------------------------------------------------------------------------
- 同一Project ID検出→上書き/別Projectとして複製/キャンセル の3択
- 上書き: 既存を自動backup→backup成功確認→置換（失敗時は既存非破壊）
- 複製: 新Project ID生成・内容維持・R1-02 validator通過
- Import失敗時: 半端Projectを業務一覧に残さない・temp残置なし

--------------------------------------------------------------------------------
6. 破損Package試験（必須CASE A〜H）
--------------------------------------------------------------------------------
- CASE A 破損JSON: reject（invalid-json）
- CASE B project.json破損: checksum不一致→reject
- CASE C schemaVersion不正: reject
- CASE D 必須ファイル欠落: reject（missing-project.json）
- CASE E checksum不一致: reject
- CASE F manifest不正: reject（format version）
- CASE G 容量不足: reject（insufficient-capacity）
- CASE H 同一ID競合: 3択処理
- path traversal / 絶対パス: 読込拒否
- 既存Project非破壊・半端登録なし・temp残置なし

--------------------------------------------------------------------------------
7. Export→Import round-trip
--------------------------------------------------------------------------------
- Project Data Core主要値（projectId/name/schemaVersion/createdAt/updatedAt/
  businessNumber/designStage/その他カスタム/modules）が一致
- 新環境（他PC相当）への登録・開く・内容維持を確認

--------------------------------------------------------------------------------
8. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- package tests: 36/36 PASS
- src/next全体: 121/121 PASS
- electron tests: 26/26 PASS
- typecheck: PASS / build: PASS
- Electron通常起動: 新ホーム描画確認
- Luna目視確認（read-only）: ホーム画面UI崩れなし・テキスト一致（証跡:
  docs/rebuild/evidence/r1-05-home-screen.png / Lunaは変更を残していない）
- 旧メイン画面への正規導線: 復活していない

--------------------------------------------------------------------------------
9. GitHub反映
--------------------------------------------------------------------------------
- PR #833 Step A → merge
- PR #834 Step B → merge
- PR #835 Step C → merge
- PR #836 Step D → merge
- PR #837 Step E（記録）→ merge（後述）
- 各Step merge後、rebuild/integrated-systemをfast-forward同期・4系統SHA一致確認

--------------------------------------------------------------------------------
10. 残課題（R1-06以降）
--------------------------------------------------------------------------------
- 道路/地形/橋梁配置/下部工/上部工/FEM/CIM/成果品 本体
- Package暗号化 / 電子署名 / DRM
- cloud / NAS同期 / 複数人同時編集 / 差分同期
- 大容量CIM差分Package最適化
- 旧Project形式migration本実装

--------------------------------------------------------------------------------
11. verdict
--------------------------------------------------------------------------------
R1-05: COMPLETE
R1-06以降には進まない。
