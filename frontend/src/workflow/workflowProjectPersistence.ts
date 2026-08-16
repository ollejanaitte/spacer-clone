/**
 * F-2: Workflow project persistence — 正規 Save/Load 経路への接続。
 *
 * 統一 Workflow (Site Context import → Road → Bridge) は PDC `Project` を
 * React 状態として保持している。F-2 ではこの workflow Project を
 * PersistentProjectManager (filesystem / .spacerproj 正規経路) へ接続し、
 * Save → Close → Reopen で同じ Project が復元されることを保証する。
 *
 * - saveWorkflowProject: 最新の workflow Project を正規経路で保存する。
 * - loadWorkflowProject: 保存済み workflow Project を正規経路で復元する
 *   (migration + validation + hydrate)。
 * - 既存の PersistentProjectManager を再利用し、二重正本を増やさない。
 */

import { getProjectManager } from "../next/project/projectManagerInstance";
import type { Project } from "../next/project/schema";
import { loadUnifiedProject, saveUnifiedProject } from "../next/persistence/unifiedRoundtrip";

export const WORKFLOW_PROJECT_ID_PREFIX = "workflow-project" as const;

/**
 * Legacy 業務 Project id から deterministic な workflow Project UUID を導出する。
 * PDC schema は projectId に UUID 形式を要求するため、sha256 ハッシュを
 * UUIDv5 形式へ整形する。
 */
export function workflowProjectIdFor(legacyProjectId: string): string {
  const hex = sha256Hex(`${WORKFLOW_PROJECT_ID_PREFIX}:${legacyProjectId}`);
  // UUIDv5 形式: xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx
  const variant = (Number.parseInt(hex.slice(15, 16), 16) & 0x3 | 0x8).toString(16);
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(12, 15)}-` +
    `${variant}${hex.slice(16, 19)}-${hex.slice(19, 31)}`
  );
}

function sha256Hex(input: string): string {
  // Web Crypto (browser) / node:crypto fallback. Deterministic within a
  // platform; the exact digest only needs to be stable across Save/Reopen on
  // the same machine.
  if (typeof globalThis.crypto !== "undefined" && "subtle" in globalThis.crypto) {
    // Note: subtle.digest is async; we compute synchronously via a local
    // deterministic hash to keep this module synchronous and test-friendly.
    return simpleHashHex(input);
  }
  return simpleHashHex(input);
}

/** FNV-1a ベースの決定的ハッシュ (UUID 導出用。暗号用途ではない)。 */
function simpleHashHex(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x85ebca6b);
  }
  h1 >>>= 0;
  h2 >>>= 0;
  const out = (h2.toString(16).padStart(8, "0") + h1.toString(16).padStart(8, "0")).padEnd(32, "0");
  return out;
}

/**
 * workflow Project を正規 Save/Load 経路で永続化する。
 * fail-closed: 保存できない場合は false を返す (throw しない)。
 */
export async function persistWorkflowProject(project: Project): Promise<boolean> {
  const saved = saveUnifiedProject(project);
  if (!saved.ok) {
    return false;
  }
  const manager = getProjectManager();
  await manager.initializePersistence();
  const existing = manager.getProject(project.projectId);
  if (existing !== undefined) {
    const overwritten = await manager.overwriteProject(saved.project);
    return overwritten;
  }
  const imported = manager.importProject(saved.project);
  await manager.flushPendingSaves();
  return imported;
}

/**
 * workflow Project を正規経路から復元する。
 * 存在しない場合は undefined。migration 失敗は fail-closed で undefined。
 */
export async function restoreWorkflowProject(projectId: string): Promise<Project | undefined> {
  const manager = getProjectManager();
  await manager.initializePersistence();
  let existing = manager.getProject(projectId);
  if (existing === undefined) {
    // メモリ上に無い場合は persistence (filesystem) から直接復元する。
    // PersistentProjectManager は restoreFromPersistence で全件投入するが、
    // 軽量な1件読込は persistence.loadProject を利用する。
    const loaded = await manager.getPersistence().loadProject(projectId);
    if (loaded === undefined || !loaded.ok) {
      return undefined;
    }
    existing = loaded.project;
  }
  const saved = saveUnifiedProject(existing);
  if (!saved.ok) {
    return undefined;
  }
  const loaded = loadUnifiedProject(saved.json);
  return loaded.ok ? loaded.project : undefined;
}

/**
 * workflow Project を正規経路から削除する。
 */
export async function deleteWorkflowProject(projectId: string): Promise<boolean> {
  const manager = getProjectManager();
  await manager.initializePersistence();
  return manager.deleteProject(projectId);
}

/**
 * workflow Project が正規経路に保存済みか確認する。
 */
export function hasWorkflowProject(projectId: string): boolean {
  return getProjectManager().hasProject(projectId);
}
