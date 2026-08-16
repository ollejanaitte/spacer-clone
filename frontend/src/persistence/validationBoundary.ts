import type { ProjectModel } from "../types";
import { migrateProject } from "../projectMigration";
import { validateProjectAgainstSchema } from "./projectSchemaValidator";
import { serializeApolloPhase1Unit2ForPersistence } from "../apollo/unit2Draft";
import { serializeProjectForPersistence } from "../liner/adapters/linerProjectDraft";

/**
 * A-05 Validation Boundary — canonical Save/Load の公式 JSON Schema 検証境界。
 *
 * 主経路 (canonical chain) の実プロダクション境界で公式 Schema
 * (`schemas/project.schema.json`) による validation を fail-closed で実施する。
 *
 * - SAVE: persisted 表現 (serialize 出力) を書込み前に検証。不適合なら保存を拒否。
 * - LOAD: JSON.parse + migrateProject 後、hydration 前に persisted 表現を検証。
 *         不適合なら hydration を拒否 (構造化エラーを返す)。
 *
 * 通常・Apollo の両経路は serializeApolloPhase1Unit2ForPersistence →
 * serializeProjectForPersistence の共通 serialize チェーンを通るため、
 * 本境界は persisted 表現という単一の正本に対して検証する (経路非依存)。
 *
 * runtime 形式 (domainDraft 含む) は検証対象にしない。意図的 non-identity。
 */

export type BoundaryViolation = {
  readonly path: string;
  readonly message: string;
};

export type SaveBoundaryResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | {
      readonly ok: false;
      readonly reason: "serialization-failed" | "schema-invalid";
      readonly diagnostics: readonly string[];
      readonly violations: readonly BoundaryViolation[];
    };

export type LoadBoundaryResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | {
      readonly ok: false;
      readonly reason: "invalid-json" | "schema-invalid";
      readonly diagnostics: readonly string[];
      readonly violations: readonly BoundaryViolation[];
    };

function schemaViolations(project: unknown): { violations: BoundaryViolation[]; diagnostics: string[] } {
  const result = validateProjectAgainstSchema(project);
  const violations = result.errors.map((error) => ({ path: error.path, message: error.message }));
  return {
    violations,
    diagnostics: violations.map((entry) => `${entry.path}: ${entry.message}`),
  };
}

/**
 * SAVE 境界: serialize 済み persisted 表現を公式 Schema で検証する (fail-closed)。
 * 不適合なら {ok:false} を返し、書込みしてはならないことを表明する。
 */
export function validatePersistedProjectForSave(persisted: unknown): SaveBoundaryResult {
  const { violations, diagnostics } = schemaViolations(persisted);
  if (violations.length > 0) {
    return {
      ok: false,
      reason: "schema-invalid",
      diagnostics,
      violations,
    };
  }
  return { ok: true, project: persisted as ProjectModel };
}

/**
 * SAVE 境界 (canonical chain 一体版): runtime ProjectModel を公式 serialize
 * チェーン (unit2 → liner) で persisted 表現へ変換し、書込み前検証までを実施する。
 * runCanonicalRoundtrip が利用する。
 */
export function validateCanonicalProjectForSave(project: ProjectModel): SaveBoundaryResult {
  const apolloSerialized = serializeApolloPhase1Unit2ForPersistence(project);
  if (!apolloSerialized.ok) {
    return {
      ok: false,
      reason: "serialization-failed",
      diagnostics: apolloSerialized.diagnostics,
      violations: [],
    };
  }
  const serialized = serializeProjectForPersistence(apolloSerialized.project);
  if (!serialized.ok) {
    return {
      ok: false,
      reason: "serialization-failed",
      diagnostics: serialized.diagnostics,
      violations: [],
    };
  }
  return validatePersistedProjectForSave(serialized.project);
}

/**
 * LOAD 境界: JSON.parse 済み raw persisted 表現に対し
 * migrateProject → 公式 Schema validation → (呼び出し側で hydration) の順序を保証する。
 * 不適合なら {ok:false} を返し、hydration してはならないことを表明する。
 */
export function validateLoadedProjectBeforeHydrate(raw: unknown): LoadBoundaryResult {
  const migrated = migrateProject(raw);
  const { violations, diagnostics } = schemaViolations(migrated);
  if (violations.length > 0) {
    return {
      ok: false,
      reason: "schema-invalid",
      diagnostics,
      violations,
    };
  }
  return { ok: true, project: migrated };
}

/**
 * LOAD 境界 (JSON text 版): JSON.parse → migrateProject → 公式 Schema validation。
 * invalid-json は structured failure として返す。
 */
export function validateLoadedProjectJsonBeforeHydrate(jsonText: string): LoadBoundaryResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return {
      ok: false,
      reason: "invalid-json",
      diagnostics: [`Project JSON is not valid JSON: ${message}`],
      violations: [],
    };
  }
  return validateLoadedProjectBeforeHydrate(parsed);
}
