import type { BusinessProjectManifest } from "../../contracts/businessProject";
import { createBusinessProjectId } from "../storage/businessProjectFolderStore";
import type { UuidString } from "../../contracts/uuid";

/**
 * Migration dry-run for legacy formats -> BusinessProject (non-destructive).
 * Produces a preview + validation + plan; never writes or overwrites source data.
 */

export interface LegacyPreviewInput {
  readonly format: "project-json" | "substructure-project" | "apollo-workspace";
  readonly name: string;
  readonly raw: unknown;
}

export interface LegacyMigrationPlan {
  readonly targetBusinessId: string;
  readonly targetBusinessName: string;
  readonly designStage: string;
  readonly plannedChildKinds: readonly string[];
}

export interface MigrationDryRunResult {
  readonly ok: true;
  readonly plan: LegacyMigrationPlan;
  readonly warnings: readonly string[];
  readonly missing: readonly string[];
  readonly manifest: BusinessProjectManifest;
}

export interface MigrationDryRunFailure {
  readonly ok: false;
  readonly reason: string;
  readonly warnings: readonly string[];
}

export type MigrationDryRunOutcome = MigrationDryRunResult | MigrationDryRunFailure;

export interface BusinessProjectMigrationDryRun {
  readonly preview: (input: LegacyPreviewInput) => MigrationDryRunOutcome;
  readonly isSourceOverwritten: () => false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function detectChildKinds(raw: unknown): readonly string[] {
  if (!isRecord(raw)) {
    return [];
  }
  const kinds: string[] = [];
  if (raw.roads !== undefined || raw.roadDesign !== undefined || raw.liner !== undefined) {
    kinds.push("road-design");
  }
  if (raw.bridges !== undefined || raw.bridgeProject !== undefined || raw.cbdm !== undefined) {
    kinds.push("bridge-project");
  }
  if (raw.analyses !== undefined || raw.analysis !== undefined || raw.frameAnalysis !== undefined) {
    kinds.push("bridge-frame-analysis");
  }
  return kinds;
}

export function createBusinessProjectMigrationDryRun(): BusinessProjectMigrationDryRun {
  const preview = (input: LegacyPreviewInput): MigrationDryRunOutcome => {
    const warnings: string[] = [];
    const missing: string[] = [];

    if (!isRecord(input.raw)) {
      return {
        ok: false,
        reason: "Legacy payload is not an object; migration cannot preview.",
        warnings,
      };
    }

    if (input.format === "project-json" && input.raw.name === undefined) {
      missing.push("name");
    }
    if (input.format === "substructure-project" && input.raw.schemaId === undefined) {
      warnings.push("substructure-project payload has no schemaId; treated as best-effort preview.");
    }

    const projectName =
      readStringField(input.raw, ["name", "projectName", "businessName"]) ?? input.name;
    const projectNumber =
      readStringField(input.raw, ["projectNumber", "projectNumber", "件番"]) ?? "";
    const designStage = readStringField(input.raw, ["designStage"]) ?? "road_design";

    const plannedChildKinds = detectChildKinds(input.raw);
    if (plannedChildKinds.length === 0) {
      warnings.push("No recognized child entities found; manifest will start empty.");
    }

    const businessId = createBusinessProjectId() as UuidString;

    const manifest: BusinessProjectManifest = {
      schemaId: "spacer.contracts.engineering-project" as BusinessProjectManifest["schemaId"],
      schemaVersion: "0.2.0" as BusinessProjectManifest["schemaVersion"],
      documentKind: "engineering-project" as const,
      documentId: businessId,
      revisionId: 1 as BusinessProjectManifest["revisionId"],
      contentChecksum: { algorithm: "sha256" as const, hexDigest: "0".repeat(64) },
      provenance: {
        createdAt: new Date().toISOString(),
        createdBy: { actorId: "migration-dry-run", actorType: "tool" as const },
        producer: { toolId: "spacer-migration", toolVersion: "0.1.0" },
      },
      projectId: businessId,
      projectNumber,
      projectName,
      designStage: designStage as BusinessProjectManifest["designStage"],
      projectStatus: "draft" as const,
      coordinateReference: null,
      roadRefs: [],
      bridgeProjectRefs: [],
      analysisRefs: [],
      sharedDatasetRefs: [],
      deliverableRefs: [],
      projectRevisionMetadata: {
        schemaVersion: "0.1.0" as BusinessProjectManifest["projectRevisionMetadata"]["schemaVersion"],
        documentId: businessId,
        revisionId: 1 as BusinessProjectManifest["revisionId"],
        createdAt: new Date().toISOString(),
        contentChecksum: { algorithm: "sha256" as const, hexDigest: "0".repeat(64) },
      },
      status: {
        phase: designStage,
        sections: {
          road: plannedChildKinds.includes("road-design") ? "MISSING" : "MISSING",
          bridge: plannedChildKinds.includes("bridge-project") ? "MISSING" : "MISSING",
        },
      },
      migrationProvenanceRef: null,
    };

    return {
      ok: true,
      plan: {
        targetBusinessId: businessId,
        targetBusinessName: projectName,
        designStage,
        plannedChildKinds,
      },
      warnings,
      missing,
      manifest,
    };
  };

  return {
    preview,
    isSourceOverwritten: () => false,
  };
}
