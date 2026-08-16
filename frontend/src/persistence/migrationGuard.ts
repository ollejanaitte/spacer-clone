import { CURRENT_PROJECT_SCHEMA_VERSION } from "../projectMigration";
import type { ProjectModel } from "../types";

/**
 * A-07 Migration Guard — schemaVersion の安全な migration と fail-closed guard。
 *
 * 契約:
 * - schemaVersion 欠落 → legacy 基準 version (現行 v1) として確定し、CURRENT まで順次 migration。
 *   (欠落データを「最新版扱い」にしない。CURRENT が 2 以上になっても同じ。)
 * - schemaVersion が存在し、対応 version なら順次 migration chain を適用。
 * - schemaVersion が CURRENT より新しい (future) → fail-closed で拒否 (黙って最新扱いしない)。
 * - schemaVersion が非対応 / legacy 基準未満 / 非整数 → fail-closed で拒否。
 * - pre / post migration validation (onValidate) を実施。
 *
 * migrateProject (projectMigration.ts) は後方互換のため変更しない。
 * 本 Guard は canonical chain / Load 境界が利用する安全版を提供する。
 */

export const LEGACY_SCHEMA_VERSION = 1;
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1];

export type MigrationStep = (raw: Record<string, unknown>) => Record<string, unknown>;
export type MigrationChain = Readonly<Record<number, MigrationStep>>;

/** CURRENT 増加時に各旧 version の migration step 必須化を強制する guard。 */
export function assertMigrationChainComplete(
  chain: MigrationChain,
  currentVersion: number,
  legacyBaseVersion: number,
): void {
  for (let version = legacyBaseVersion; version < currentVersion; version += 1) {
    if (chain[version] === undefined) {
      throw new Error(
        `Migration step for schemaVersion ${version} is missing (current=${currentVersion}, legacyBase=${legacyBaseVersion}).`,
      );
    }
  }
}

/** 現行 CURRENT_PROJECT_SCHEMA_VERSION=1 のため step は空。CURRENT 増加時に各旧 version の step を追加する。 */
export const MIGRATION_CHAIN: MigrationChain = {};

export type SequentialMigrationResult =
  | { readonly ok: true; readonly project: Record<string, unknown>; readonly steps: readonly number[] }
  | {
      readonly ok: false;
      readonly reason: "migration-step-missing";
      readonly version: number;
      readonly diagnostics: readonly string[];
    };

/**
 * fromVersion から currentVersion まで chain の step を順次適用する純関数。
 * 各 step 適用後に schemaVersion を更新し、最終的に currentVersion を付与する。
 * CURRENT=1 (step 無し) では順序の仕組みのみ定義され、実 step は空となる。
 */
export function runSequentialMigrationSteps(
  raw: unknown,
  fromVersion: number,
  chain: MigrationChain,
  currentVersion: number,
): SequentialMigrationResult {
  const base =
    typeof raw === "object" && raw !== null ? { ...(raw as Record<string, unknown>) } : {};
  let current: Record<string, unknown> = base;
  const steps: number[] = [];
  for (let version = fromVersion; version < currentVersion; version += 1) {
    const step = chain[version];
    if (step === undefined) {
      return {
        ok: false,
        reason: "migration-step-missing",
        version,
        diagnostics: [`Migration step for schemaVersion ${version} is missing.`],
      };
    }
    current = { ...step(current), schemaVersion: version + 1 };
    steps.push(version);
  }
  return { ok: true, project: { ...current, schemaVersion: currentVersion }, steps };
}

export type MigrationViolation = {
  readonly path: string;
  readonly message: string;
};

export type MigrationValidateFn = (
  project: unknown,
) => { readonly valid: boolean; readonly errors: readonly MigrationViolation[] };

export type MigrateProjectSafelyResult =
  | {
      readonly ok: true;
      readonly project: ProjectModel;
      readonly migratedFrom: number;
      readonly steps: readonly number[];
    }
  | {
      readonly ok: false;
      readonly reason:
        | "future-version"
        | "incompatible-version"
        | "migration-step-missing"
        | "schema-invalid";
      readonly schemaVersion: number | undefined;
      readonly diagnostics: readonly string[];
      readonly violations: readonly MigrationViolation[];
    };

function schemaInvalidFailure(
  schemaVersion: number | undefined,
  errors: readonly MigrationViolation[],
  context: string,
): MigrateProjectSafelyResult {
  return {
    ok: false,
    reason: "schema-invalid",
    schemaVersion,
    diagnostics: [
      `${context}: ${errors.map((entry) => `${entry.path}: ${entry.message}`).join("; ")}`,
    ],
    violations: errors,
  };
}

function migrateFromVersion(
  raw: Record<string, unknown>,
  fromVersion: number,
  onValidate: MigrationValidateFn | undefined,
): MigrateProjectSafelyResult {
  if (onValidate) {
    const pre = onValidate(raw);
    if (!pre.valid) {
      return schemaInvalidFailure(fromVersion, pre.errors, "Pre-migration schema validation failed");
    }
  }
  const sequential = runSequentialMigrationSteps(raw, fromVersion, MIGRATION_CHAIN, CURRENT_PROJECT_SCHEMA_VERSION);
  if (!sequential.ok) {
    return {
      ok: false,
      reason: "migration-step-missing",
      schemaVersion: fromVersion,
      diagnostics: sequential.diagnostics,
      violations: [],
    };
  }
  const project = sequential.project as ProjectModel;
  if (onValidate) {
    const post = onValidate(project);
    if (!post.valid) {
      return schemaInvalidFailure(
        CURRENT_PROJECT_SCHEMA_VERSION,
        post.errors,
        "Post-migration schema validation failed",
      );
    }
  }
  return { ok: true, project, migratedFrom: fromVersion, steps: sequential.steps };
}

/**
 * schemaVersion の安全な migration。
 * - 欠落 → legacy 基準 v1 として確定。
 * - 対応 version → 順次 migration。
 * - future / incompatible → fail-closed で {ok:false} (黙って最新扱いしない)。
 */
export function migrateProjectSafely(
  raw: unknown,
  options: { readonly onValidate?: MigrationValidateFn } = {},
): MigrateProjectSafelyResult {
  const { onValidate } = options;
  const isRecord = typeof raw === "object" && raw !== null;
  const rawSchemaVersion = isRecord
    ? (raw as Record<string, unknown>).schemaVersion
    : undefined;
  const detected: number | undefined =
    typeof rawSchemaVersion === "number" ? rawSchemaVersion : undefined;

  if (detected === undefined) {
    return migrateFromVersion(
      (isRecord ? raw : {}) as Record<string, unknown>,
      LEGACY_SCHEMA_VERSION,
      onValidate,
    );
  }
  if (!Number.isInteger(detected) || detected < LEGACY_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: "incompatible-version",
      schemaVersion: detected,
      diagnostics: [
        `Project schemaVersion ${detected} is incompatible (legacy base version is ${LEGACY_SCHEMA_VERSION}).`,
      ],
      violations: [],
    };
  }
  if (detected > CURRENT_PROJECT_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: "future-version",
      schemaVersion: detected,
      diagnostics: [
        `Project schemaVersion ${detected} is newer than the current supported version ${CURRENT_PROJECT_SCHEMA_VERSION}. Refusing to migrate.`,
      ],
      violations: [],
    };
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(detected)) {
    return {
      ok: false,
      reason: "incompatible-version",
      schemaVersion: detected,
      diagnostics: [
        `Project schemaVersion ${detected} is not a supported schema version (supported: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}).`,
      ],
      violations: [],
    };
  }
  return migrateFromVersion(raw as Record<string, unknown>, detected, onValidate);
}

assertMigrationChainComplete(MIGRATION_CHAIN, CURRENT_PROJECT_SCHEMA_VERSION, LEGACY_SCHEMA_VERSION);
