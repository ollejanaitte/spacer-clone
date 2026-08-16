import { PROJECT_MODULE_KEYS, PROJECT_SCHEMA_VERSION, projectSchema } from "./schema";
import type { Project, ProjectModule, ProjectModuleKey } from "./schema";

export function generateProjectId(): string {
  return crypto.randomUUID();
}

function createEmptyModule(): ProjectModule {
  return {};
}

export function createEmptyProject(name: string): Project {
  const now = new Date().toISOString();
  const modules = Object.fromEntries(
    PROJECT_MODULE_KEYS.map((key) => [key, createEmptyModule()]),
  ) as Record<ProjectModuleKey, ProjectModule>;
  return {
    projectId: generateProjectId(),
    name,
    createdAt: now,
    updatedAt: now,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    metadata: {},
    modules,
  };
}

export function getCurrentProjectSchemaVersion(): string {
  return PROJECT_SCHEMA_VERSION;
}

export type ProjectParseResult =
  | { ok: true; project: Project }
  | { ok: false; issues: string[] };

export function parseProject(input: unknown): ProjectParseResult {
  const result = projectSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      }),
    };
  }
  return { ok: true, project: result.data };
}

export function serializeProject(project: Project): string {
  const parsed = parseProject(project);
  if (!parsed.ok) {
    throw new Error(`Cannot serialize invalid project: ${parsed.issues.join("; ")}`);
  }
  return JSON.stringify(parsed.project);
}

export function deserializeProject(input: string): ProjectParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    return { ok: false, issues: ["input is not valid JSON"] };
  }
  return parseProject(raw);
}

export interface ProjectMigration {
  fromSchemaVersion: string;
  toSchemaVersion: string;
  migrate: (project: unknown) => unknown;
}

export const PROJECT_MIGRATIONS: readonly ProjectMigration[] = [];

export const PROJECT_SCHEMA_MAJOR_VERSION = PROJECT_SCHEMA_VERSION.split(".")[0];

/**
 * Semver の major を比較する。無効な形式は 0 扱い（fail-closed 側に倒す）。
 */
function majorOf(version: string): number {
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  return Number.isFinite(major) ? major : 0;
}

/**
 * future schemaVersion を fail-closed で拒否する境界。
 * current major より大きい major を持つ入力を「未対応の将来バージョン」として
 * 受け付けない（黙って最新扱いしない）。
 */
export function isFutureSchemaVersion(version: string): boolean {
  return majorOf(version) > majorOf(PROJECT_SCHEMA_VERSION);
}

/**
 * PDC 正規経路の migration エントリポイント。
 * - fromSchemaVersion が current major より大きい (future) → fail-closed
 * - PROJECT_MIGRATIONS を順次適用 → 公式 Schema validation (parseProject)
 * - 最終的に current schema へ一致させる
 */
export function migrateProject(input: unknown, fromSchemaVersion: string): ProjectParseResult {
  if (isFutureSchemaVersion(fromSchemaVersion)) {
    return {
      ok: false,
      issues: [
        `unsupported-future-schemaVersion: ${fromSchemaVersion} (current ${PROJECT_SCHEMA_VERSION})`,
      ],
    };
  }
  let current: unknown = input;
  for (const migration of PROJECT_MIGRATIONS) {
    if (migration.fromSchemaVersion === fromSchemaVersion) {
      current = migration.migrate(current);
      fromSchemaVersion = migration.toSchemaVersion;
    }
  }
  return parseProject(current);
}
