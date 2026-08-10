================================================================================
Phase R1  R1-02  最小Project Schema / Project Data Core（完了記録）
================================================================================
新統合システムのProject正本候補となる最小Project Data Core / Schemaを
実装・検証・GitHub main反映まで完了した記録。

完了日: 2026-08-10

--------------------------------------------------------------------------------
1. baseline
--------------------------------------------------------------------------------
- 新worktree : /home/masaharu/Projects/spacer-clone-next
- base SHA   : 6ce29a992873c442a94c6ad67150e984f637e302（R1-01 final main）
- branch     : feature/r1-02-project-schema
- R1-01 COMPLETE 済み（App Shell / /app routing）

--------------------------------------------------------------------------------
2. schema概要
--------------------------------------------------------------------------------
Project 正本（唯一のProject構造）:
- projectId     : UUID（必須・一意）
- name          : 非空文字列（日本語OK）
- createdAt     : ISO 8601 UTC
- updatedAt     : ISO 8601 UTC
- schemaVersion : セマンティックバージョン（必須）
- metadata      : 拡張メタデータ（Record）
- modules       : 8キー固定（road / terrain / bridgeLayout / substructure /
                  superstructure / analysis / cim / deliverables）
                  ※R1-02では各モジュールは空コンテナ（後から接続できる拡張点）

--------------------------------------------------------------------------------
3. Project Data Core 構造
--------------------------------------------------------------------------------
frontend/src/next/project/
- schema.ts                  : zod schema + 型 + 定数（PROJECT_SCHEMA_VERSION = 1.0.0）
- projectDataCore.ts         : 生成/ID/validation/serialize/deserialize/migration
- __tests__/projectDataCore.test.ts

--------------------------------------------------------------------------------
4. validation方式
--------------------------------------------------------------------------------
- zod strictObject + 個別規則（uuid / semver / ISO8601UTC / min(1)）
- runtime validation: parseProject() が { ok, issues } を返す
- unknown top-level field reject / 必須項目欠損 reject / 非オブジェクト reject
- TypeScript型のみで「validation済み」とはしない

--------------------------------------------------------------------------------
5. serialization方式
--------------------------------------------------------------------------------
- serializeProject(): parseProject を通過後 JSON.stringify
- deserializeProject(): JSON.parse → parseProject（不正JSON / 不正Project reject）
- serialize → deserialize equality をテストで保証

--------------------------------------------------------------------------------
6. migration境界
--------------------------------------------------------------------------------
- ProjectMigration interface（from/to/migrate）を定義
- PROJECT_MIGRATIONS registry（現状空・将来migrationを追加可能）
- migrateProject() が registry を順次適用 → parseProject
- schemaVersion 必須により将来のmigration起点を確定

--------------------------------------------------------------------------------
7. 設計原則の遵守
--------------------------------------------------------------------------------
- UI local state を正本にしない          → UI改修なし
- 各設計ツールが独立Projectを持たない     → 単一schemaのみ
- 旧BusinessProjectをコピーしない         → 新システム独立実装
- localStorage/filesystem/Repository/Save/Load は実装しない（R1-03以降）
- 道路/FEM/CIM等の本格実装なし

--------------------------------------------------------------------------------
8. tests / typecheck / build / 回帰
--------------------------------------------------------------------------------
- R1-02新規tests: 17/17 PASS
- R1-01回帰（NextApp）: 3/3 PASS
- src/next全テスト: 20/20 PASS
- electron tests: 26/26 PASS
- typecheck: PASS（tsc -b）
- build: PASS（tsc -b && vite build）
- Electron通常起動回帰: /app App Shell描画確認（証跡:
  docs/rebuild/evidence/r1-02-regression-app-shell.png）
  ※Electron画面変更なしのためGUI/CDP検証は新設しない方針

--------------------------------------------------------------------------------
9. GitHub反映
--------------------------------------------------------------------------------
- PR: #816
- merge先: GitHub main（PR merge）
- final main SHA: （merge後SHAを記録）
- rebuild/integrated-system: 同期後のSHAを記録

--------------------------------------------------------------------------------
10. 残課題
--------------------------------------------------------------------------------
- modulesの中身実装（R1-03以降）
- Project Repository / 永続化 / Save / Load（R1-03以降）
- schemaVersion 1.0.0 → 以降の実migration

--------------------------------------------------------------------------------
11. verdict
--------------------------------------------------------------------------------
R1_02_SCHEMA_VERDICT           : PASS
R1_02_VALIDATION_VERDICT       : PASS
R1_02_SERIALIZATION_VERDICT    : PASS
R1_02_TEST_VERDICT             : PASS
R1_02_TYPECHECK_VERDICT        : PASS
R1_02_BUILD_VERDICT            : PASS
R1_02_REGRESSION_VERDICT       : PASS
R1_02_GITHUB_REFLECTION_VERDICT: PASS
R1-02: COMPLETE

R1-03以降には進まない。
