/**
 * F-7: Reference Business 001 production sample loader.
 *
 * `buildRb001CompleteProject()` はこれまでテスト専用だったが、F-7 の実ブラウザ
 * Full E2E および業務受け入れで「Reference Business 001 を開く」ために
 * production の業務一覧から読み込めるようにする。
 *
 * 読み込み先は PDC PersistentProjectManager (正規 Save/Load 経路)。
 * 既存の sample 読み込み (tutorial sample) と同様の方式。
 */

import { getProjectManager } from "../project/projectManagerInstance";
import { buildRb001CompleteProject } from "../../liner/samples/reference-business-001/savedProject";
import { applyBusinessMetadata } from "../project/businessMetadata";

export type LoadReferenceBusinessResult =
  | { ok: true; projectId: string; name: string }
  | { ok: false; reason: string };

/**
 * RB001 完成 Project を新規登録する。
 * 既に同名 Project が存在する場合は上書きせず reason を返す (fail-closed)。
 */
export async function loadReferenceBusinessSample(): Promise<LoadReferenceBusinessResult> {
  const { project } = buildRb001CompleteProject();
  const manager = getProjectManager();
  await manager.initializePersistence();

  const existing = manager.listProjects().find((p) => p.name === project.name);
  if (existing !== undefined) {
    return { ok: false, reason: `すでに同じ名前の業務があります: ${existing.name}` };
  }

  const withMetadata = applyBusinessMetadata(project, {
    businessNumber: "RB001",
    designStage: "bridge-detailed",
  });

  const registered = manager.importProject(withMetadata);
  if (!registered) {
    return { ok: false, reason: "登録に失敗しました。" };
  }
  await manager.flushPendingSaves();
  return { ok: true, projectId: withMetadata.projectId, name: withMetadata.name };
}
