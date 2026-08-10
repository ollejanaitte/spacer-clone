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

export function migrateProject(input: unknown, fromSchemaVersion: string): ProjectParseResult {
  let current: unknown = input;
  for (const migration of PROJECT_MIGRATIONS) {
    if (migration.fromSchemaVersion === fromSchemaVersion) {
      current = migration.migrate(current);
      fromSchemaVersion = migration.toSchemaVersion;
    }
  }
  return parseProject(current);
}
