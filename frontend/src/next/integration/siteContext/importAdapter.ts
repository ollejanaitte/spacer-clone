import {
  TARGET_PDC_SCHEMA_VERSION,
  type SiteContextImportAdapter,
  type SiteContextImportErrorCode,
  type SiteContextImportInput,
  type SiteContextImportReport,
  type SiteContextImportResult,
  type SiteContextInspectResult,
} from "./adapterContract";
import { validateExistingConditionsData } from "../../modules/existingConditions";
import { validateTerrainData } from "../../modules/terrainModule";
import { parseProject } from "../../project/projectDataCore";
import type { Project } from "../../project/schema";
import { buildMappingOutcome, buildSkeletonReport, analyzePrimaryCrs } from "./siteContextMapping";
import type { MappingOutcome } from "./siteContextMapping";
import {
  SiteContextPackageError,
  isRecord,
  validateEnvelopeCompatibility,
  verifyInlineProjectMatchesFile,
  verifyPackageFileIntegrity,
} from "./siteContextPackage";
import {
  migrateProjectV1ToV2,
  projectV1Schema,
  projectV2Schema,
  validateProjectV2Invariants,
  classifyEpsg,
  isTokyoDatumEpsg,
  type ProjectV1Source,
  type ProjectV2Source,
} from "./siteContextSourceSchema";

/**
 * `.sitecontext` → `.spacerproj` Import Adapter (B-4).
 *
 * Implements the frozen `SiteContextImportAdapter` surface behind
 * adapterContract.ts. The adapter is a pure mapper + validator: it never
 * writes to localStorage or any project store (Lane U wires storage).
 *
 * Fail-closed error mapping (adapterContract.ts / adapter-interface.md §5):
 *   SC-ERR-UNSUPPORTED-CRS       primary CRS geographic / unknown / Tokyo datum
 *   SC-ERR-CORRUPT-SOURCE        malformed envelope / checksum or size mismatch
 *   SC-ERR-MISSING-REQUIRED      coordinateContexts / projectCoordinateContextId / siteContext missing
 *   SC-ERR-INCOMPATIBLE-VERSION  schemaVersion ∉ {1,2} / envelope format/version/profile mismatch
 *   SC-ERR-INVALID-TERRAIN-REF   elevation resource or existing-condition asset missing
 *   SC-ERR-SCHEMA-FAILED         V1→V2 migration failure / V2 schema or invariant violation
 *   SC-ERR-TARGET-INVALID        generated PDC Project fails parseProject / module validation
 */

export interface NormalizedSource {
  readonly project: ProjectV2Source;
  readonly migratedV1ToV2: boolean;
  readonly selectionAreaMigrated: boolean;
  readonly sourceSchemaVersion: string;
}

type AnalyzeResult =
  | { readonly kind: "ok"; readonly normalized: NormalizedSource; readonly outcome: MappingOutcome }
  | {
      readonly kind: "error";
      readonly errorCode: SiteContextImportErrorCode;
      readonly message: string;
      readonly report?: SiteContextImportReport;
    };

function sourceProjectIdentity(project: unknown): { projectId: string; name: string } {
  if (isRecord(project) && isRecord(project.project)) {
    return {
      projectId: typeof project.project.projectId === "string" ? project.project.projectId : "",
      name: typeof project.project.name === "string" ? project.project.name : "",
    };
  }
  return { projectId: "", name: "" };
}

/**
 * Pre-check the primary (project) CRS before schema parsing so that the
 * documented SC-ERR-UNSUPPORTED-CRS conditions (Tokyo datum 30161-30179 /
 * unknown EPSG / geographic) are reported with the dedicated code instead of
 * surfacing as a schema failure (adapter-interface.md §5).
 */
function precheckPrimaryCrs(rawProject: Record<string, unknown>): { unsupported?: string } {
  const projectCtxId = rawProject.projectCoordinateContextId;
  const contexts = rawProject.coordinateContexts;
  if (!Array.isArray(contexts) || typeof projectCtxId !== "string") {
    return {};
  }
  const ctx = (contexts as Record<string, unknown>[]).find((c) => isRecord(c) && c.id === projectCtxId);
  if (!isRecord(ctx)) return {};
  const crs = ctx.crs;
  if (!isRecord(crs) || crs.kind !== "known" || typeof crs.epsg !== "number") {
    return {};
  }
  if (isTokyoDatumEpsg(crs.epsg)) {
    return { unsupported: `Tokyo datum EPSG:${crs.epsg} (30161-30179) is not supported` };
  }
  let projection: string;
  try {
    projection = classifyEpsg(crs.epsg).projection;
  } catch {
    return { unsupported: `CRS-UNKNOWN-EPSG: ${crs.epsg}` };
  }
  if (projection === "geographic") {
    return { unsupported: `project CRS EPSG:${crs.epsg} is geographic; a projected CRS is required` };
  }
  return {};
}

function reportForFailure(
  sourceSchemaVersion: string | undefined,
  project: unknown,
  options: SiteContextImportInput["options"],
): SiteContextImportReport | undefined {
  const { projectId, name } = sourceProjectIdentity(project);
  if (sourceSchemaVersion === undefined) return undefined;
  return buildSkeletonReport(
    { sourceSchemaVersion, options },
    { projectId, name: name.length > 0 ? name : projectId },
  );
}

async function analyzeImport(input: SiteContextImportInput): Promise<AnalyzeResult> {
  const envelope = input.package.envelope;
  const options = input.options ?? {};
  const packageFiles = input.package.files;

  try {
    validateEnvelopeCompatibility(envelope);
  } catch (err) {
    if (err instanceof SiteContextPackageError) {
      return {
        kind: "error",
        errorCode: err.errorCode,
        message: err.message,
        report: reportForFailure(
          typeof envelope.schemaVersion === "string" ? envelope.schemaVersion : undefined,
          envelope.project,
          options,
        ),
      };
    }
    throw err;
  }

  try {
    await verifyPackageFileIntegrity(envelope, packageFiles);
    await verifyInlineProjectMatchesFile(envelope, packageFiles);
  } catch (err) {
    if (err instanceof SiteContextPackageError) {
      return {
        kind: "error",
        errorCode: err.errorCode,
        message: err.message,
        report: reportForFailure(String(envelope.schemaVersion), envelope.project, options),
      };
    }
    throw err;
  }

  const sourceSchemaVersion = String(envelope.schemaVersion);

  // Required concept presence (SC-ERR-MISSING-REQUIRED) before parsing.
  const rawProject = envelope.project;
  if (!isRecord(rawProject)) {
    return {
      kind: "error",
      errorCode: "SC-ERR-MISSING-REQUIRED",
      message: "envelope.project is required",
      report: reportForFailure(sourceSchemaVersion, envelope.project, options),
    };
  }
  if (!Array.isArray(rawProject.coordinateContexts) || rawProject.coordinateContexts.length === 0) {
    return {
      kind: "error",
      errorCode: "SC-ERR-MISSING-REQUIRED",
      message: "coordinateContexts is required",
      report: reportForFailure(sourceSchemaVersion, envelope.project, options),
    };
  }
  if (typeof rawProject.projectCoordinateContextId !== "string" || rawProject.projectCoordinateContextId.length === 0) {
    return {
      kind: "error",
      errorCode: "SC-ERR-MISSING-REQUIRED",
      message: "projectCoordinateContextId is required",
      report: reportForFailure(sourceSchemaVersion, envelope.project, options),
    };
  }
  // `siteContext` is a ProjectV2-only concept (V1 carries terrain/sources/extent
  // at the top level and synthesizes siteContext during migration), so the
  // required check is version-aware.
  if (sourceSchemaVersion === "2" && !isRecord(rawProject.siteContext)) {
    return {
      kind: "error",
      errorCode: "SC-ERR-MISSING-REQUIRED",
      message: "siteContext is required",
      report: reportForFailure(sourceSchemaVersion, envelope.project, options),
    };
  }

  const crsPrecheck = precheckPrimaryCrs(rawProject);
  if (crsPrecheck.unsupported !== undefined) {
    return {
      kind: "error",
      errorCode: "SC-ERR-UNSUPPORTED-CRS",
      message: crsPrecheck.unsupported,
      report: reportForFailure(sourceSchemaVersion, envelope.project, options),
    };
  }

  let normalized: ProjectV2Source;
  let migratedV1ToV2: boolean;
  let selectionAreaMigrated: boolean;

  try {
    if (sourceSchemaVersion === "1") {
      const v1Parsed = projectV1Schema.safeParse(rawProject);
      if (!v1Parsed.success) {
        const issues = v1Parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}:${i.message}`).join("; ");
        return {
          kind: "error",
          errorCode: "SC-ERR-SCHEMA-FAILED",
          message: `ProjectV1 schema validation failed: ${issues}`,
          report: reportForFailure(sourceSchemaVersion, envelope.project, options),
        };
      }
      const v1 = v1Parsed.data as ProjectV1Source;
      const migration = await migrateProjectV1ToV2(v1);
      normalized = migration.project;
      migratedV1ToV2 = migration.migrated;
      selectionAreaMigrated = migration.selectionAreaMigrated;
    } else {
      const v2Parsed = projectV2Schema.safeParse(rawProject);
      if (!v2Parsed.success) {
        const issues = v2Parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}:${i.message}`).join("; ");
        return {
          kind: "error",
          errorCode: "SC-ERR-SCHEMA-FAILED",
          message: `ProjectV2 schema validation failed: ${issues}`,
          report: reportForFailure(sourceSchemaVersion, envelope.project, options),
        };
      }
      normalized = v2Parsed.data as ProjectV2Source;
      migratedV1ToV2 = false;
      selectionAreaMigrated = false;
      const invariantErrors = validateProjectV2Invariants(normalized);
      if (invariantErrors.length > 0) {
        return {
          kind: "error",
          errorCode: "SC-ERR-SCHEMA-FAILED",
          message: `ProjectV2 invariant violation: ${invariantErrors.join("; ")}`,
          report: reportForFailure(sourceSchemaVersion, envelope.project, options),
        };
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("MIG-")) {
      return {
        kind: "error",
        errorCode: "SC-ERR-SCHEMA-FAILED",
        message: `V1→V2 migration failed: ${err.message}`,
        report: reportForFailure(sourceSchemaVersion, envelope.project, options),
      };
    }
    throw err;
  }

  // CRS gate (fail-closed before mapping).
  const crs = analyzePrimaryCrs(normalized);
  if (crs.unsupported !== undefined) {
    return {
      kind: "error",
      errorCode: "SC-ERR-UNSUPPORTED-CRS",
      message: crs.unsupported,
      report: reportForFailure(sourceSchemaVersion, envelope.project, options),
    };
  }

  // Mapping (may throw INVALID-TERRAIN-REF / CORRUPT-SOURCE for asset issues).
  let outcome: MappingOutcome;
  try {
    const envelopeExcluded = Array.isArray(envelope.excludedSources)
      ? envelope.excludedSources.map((e) => ({ sourceId: e.sourceDatasetId, reason: e.reason }))
      : [];
    outcome = buildMappingOutcome({
      normalized,
      sourceSchemaVersion,
      migratedV1ToV2,
      selectionAreaMigrated,
      options,
      packageFiles,
      excludedSources: envelopeExcluded,
    });
  } catch (err) {
    if (err instanceof SiteContextPackageError) {
      return {
        kind: "error",
        errorCode: err.errorCode,
        message: err.message,
        report: reportForFailure(sourceSchemaVersion, envelope.project, options),
      };
    }
    throw err;
  }

  return {
    kind: "ok",
    normalized: {
      project: normalized,
      migratedV1ToV2,
      selectionAreaMigrated,
      sourceSchemaVersion,
    },
    outcome,
  };
}

function validateTargetProject(project: Project): { ok: true } | { ok: false; issues: string[] } {
  const parsed = parseProject(project);
  if (!parsed.ok) {
    return { ok: false, issues: parsed.issues };
  }
  const terrainModule = parsed.project.modules.terrain;
  if (isRecord(terrainModule) && isRecord(terrainModule.data)) {
    const issues = validateTerrainData(terrainModule.data as Record<string, unknown>);
    if (issues.length > 0) {
      return { ok: false, issues: issues.map((i) => `modules.terrain.data.${i.path}: ${i.message}`) };
    }
  }
  const existing = parsed.project.metadata?.["existingConditions"];
  if (existing !== undefined) {
    const issues = validateExistingConditionsData({ existingConditionsDocument: existing });
    if (issues.length > 0) {
      return { ok: false, issues: issues.map((i) => `metadata.existingConditions.${i.path}: ${i.message}`) };
    }
  }
  return { ok: true };
}

export function createSiteContextImportAdapter(): SiteContextImportAdapter {
  return {
    async inspect(input: SiteContextImportInput): Promise<SiteContextInspectResult> {
      const analyzed = await analyzeImport(input);
      if (analyzed.kind === "error") {
        return {
          ok: false,
          errorCode: analyzed.errorCode,
          message: analyzed.message,
          ...(analyzed.report !== undefined ? { report: analyzed.report } : {}),
        };
      }
      const validated = validateTargetProject(analyzed.outcome.project);
      if (!validated.ok) {
        return {
          ok: false,
          errorCode: "SC-ERR-TARGET-INVALID",
          message: `mapped target project is invalid: ${validated.issues.join("; ")}`,
          report: analyzed.outcome.report,
        };
      }
      return { ok: true, report: analyzed.outcome.report };
    },

    async import(input: SiteContextImportInput): Promise<SiteContextImportResult> {
      const analyzed = await analyzeImport(input);
      if (analyzed.kind === "error") {
        return {
          ok: false,
          errorCode: analyzed.errorCode,
          message: analyzed.message,
          ...(analyzed.report !== undefined ? { report: analyzed.report } : {}),
        };
      }
      const validated = validateTargetProject(analyzed.outcome.project);
      if (!validated.ok) {
        return {
          ok: false,
          errorCode: "SC-ERR-TARGET-INVALID",
          message: `mapped target project is invalid: ${validated.issues.join("; ")}`,
          report: analyzed.outcome.report,
        };
      }
      return { ok: true, projectId: analyzed.outcome.report.projectId, report: analyzed.outcome.report };
    },
  };
}

/**
 * Pure mapper: returns the fully mapped PDC Project object without touching
 * any store. Exposed for downstream lanes (U) and adapter contract tests.
 */
export async function mapSiteContextPackageToProject(input: SiteContextImportInput): Promise<Project> {
  const analyzed = await analyzeImport(input);
  if (analyzed.kind === "error") {
    throw new SiteContextPackageError(analyzed.errorCode, analyzed.message);
  }
  return analyzed.outcome.project;
}

export const siteContextImportAdapter: SiteContextImportAdapter = createSiteContextImportAdapter();

export { TARGET_PDC_SCHEMA_VERSION };
