import type { ProjectModel } from "../types";
import projectSchema from "../../../schemas/project.schema.json";

/**
 * A-02 Schema Drift Guard — ProjectModel top-level key ⇔ official JSON Schema
 * properties の不整合を機械検知する純関数群。
 *
 * 正本:
 * - canonical ProjectModel: `frontend/src/types.ts` (ProjectModel 型)
 * - canonical JSON Schema: `schemas/project.schema.json` (persisted 形式の唯一の正本)
 *
 * 既知の schema-only key は明示 allowlist (`SCHEMA_ONLY_ALLOWLIST`) として契約化する。
 * `additionalProperties:false` を維持し、schema / types.ts は変更しない。
 */

/** schema-only key の正式 allowlist。追加する場合は phase-a-persistence-automation-plan.md §5 と同期すること。 */
export const SCHEMA_ONLY_ALLOWLIST: readonly string[] = ["substructure"];

/** ProjectModel の top-level key をコンパイル時完全列挙で導出する。 */
export function projectModelTopLevelKeys(): Array<keyof ProjectModel> {
  const keys: Record<keyof ProjectModel, true> = {
    schemaVersion: true,
    project: true,
    units: true,
    nodes: true,
    materials: true,
    sections: true,
    members: true,
    supports: true,
    loadCases: true,
    nodalLoads: true,
    memberLoads: true,
    massCases: true,
    groundMotions: true,
    analysisSettings: true,
    analysisResults: true,
    liner: true,
    linerTrace: true,
    apolloPhase1Unit2: true,
    apolloBsdd: true,
    apolloBridgeStructureInput: true,
    apolloBridgeProjectSuperstructure: true,
  };
  return Object.keys(keys) as Array<keyof ProjectModel>;
}

/** 公式 Schema の top-level properties を列挙する。 */
export function projectSchemaTopLevelKeys(): string[] {
  const properties = (projectSchema as { properties?: Record<string, unknown> }).properties ?? {};
  return Object.keys(properties);
}

export type SchemaDriftReport = {
  /** schema-only key (allowlist 前) */
  schemaOnly: string[];
  /** model-only key */
  modelOnly: Array<keyof ProjectModel>;
  /** schema-only key のうち allowlist 済みのもの */
  allowlisted: string[];
  /** schema-only key のうち allowlist に無いもの (drift) */
  violation: string[];
};

/** ProjectModel と公式 Schema の top-level key 差分を報告する。 */
export function analyzeSchemaDrift(): SchemaDriftReport {
  const modelKeys = projectModelTopLevelKeys();
  const schemaKeys = projectSchemaTopLevelKeys();

  const modelSet = new Set<string>(modelKeys);
  const schemaSet = new Set<string>(schemaKeys);

  const schemaOnly = schemaKeys.filter((key) => !modelSet.has(key));
  const modelOnly = modelKeys.filter((key) => !schemaSet.has(key));
  const allowlisted = schemaOnly.filter((key) => SCHEMA_ONLY_ALLOWLIST.includes(key));
  const violation = schemaOnly.filter((key) => !SCHEMA_ONLY_ALLOWLIST.includes(key));

  return { schemaOnly, modelOnly, allowlisted, violation };
}
