import {
  BUSINESS_PROJECT_SCHEMA_VERSION,
  validateBusinessProjectManifest,
  type BusinessProjectManifest,
} from "../../contracts/businessProject";
import { requireRevisionId } from "../../contracts/revision";
import { generateUuid, parseUuid, type UuidString } from "../../contracts/uuid";
import type { BusinessSummary, NewBusinessInput } from "../business/businessRegistry";
import {
  createBusinessProjectPersistence,
  type BusinessProjectPersistencePort,
} from "../storage/businessProjectPersistence";

export const SAMPLE_BUSINESS_NAME = "サンプル業務 - 道路・鋼鈑桁橋";
export const SAMPLE_BUSINESS_NUMBER = "SAMPLE-001";

/**
 * Read-only sample business template. Calling createSampleBusiness clones it
 * into a new BusinessProject (new id), never overwriting user data.
 */
export interface SampleBusinessTemplate {
  readonly name: string;
  readonly projectNumber: string;
  readonly designStage: "road_design";
  readonly sampleKind: "road-bridge";
}

export const SAMPLE_BUSINESS_TEMPLATE: SampleBusinessTemplate = {
  name: SAMPLE_BUSINESS_NAME,
  projectNumber: SAMPLE_BUSINESS_NUMBER,
  designStage: "road_design",
  sampleKind: "road-bridge",
};

export function buildSampleBusinessInput(): NewBusinessInput {
  return {
    projectNumber: SAMPLE_BUSINESS_NUMBER,
    projectName: SAMPLE_BUSINESS_NAME,
    designStage: "road_design",
  };
}

/**
 * Clones the sample template into a fresh BusinessProject with a new id.
 * Returns the created business summary and persists the sample manifest.
 */
export function createSampleBusiness(
  registry: {
    create(input: NewBusinessInput): BusinessSummary;
  },
  persistence: BusinessProjectPersistencePort = createBusinessProjectPersistence(),
): BusinessSummary {
  const business = registry.create(buildSampleBusinessInput());

  const projectId = parseUuid(business.businessId) ?? (business.businessId as UuidString);
  const sampleRoadId = parseUuid("99999999-9999-4999-8999-999999999901")!;
  const sampleBridgeId = parseUuid("99999999-9999-4999-8999-999999999902")!;
  const sampleAnalysisId = parseUuid("99999999-9999-4999-8999-999999999903")!;
  const revisionId = requireRevisionId(1);
  const now = new Date().toISOString();
  const checksum = { algorithm: "sha256" as const, hexDigest: "0".repeat(64) };

  const manifest: BusinessProjectManifest = {
    schemaId: "spacer.contracts.engineering-project" as BusinessProjectManifest["schemaId"],
    schemaVersion: BUSINESS_PROJECT_SCHEMA_VERSION,
    documentKind: "engineering-project" as const,
    documentId: projectId,
    revisionId,
    contentChecksum: checksum,
    provenance: {
      createdAt: now,
      createdBy: { actorId: "user", actorType: "user" as const },
      producer: { toolId: "spacer-design-platform", toolVersion: "0.1.0" },
    },
    projectId,
    projectNumber: SAMPLE_BUSINESS_NUMBER,
    projectName: SAMPLE_BUSINESS_NAME,
    designStage: "road_design" as const,
    projectStatus: "active" as const,
    coordinateReference: null,
    roadRefs: [
      {
        documentKind: "road-design",
        documentId: sampleRoadId,
        revisionId: requireRevisionId(1),
        contentChecksum: checksum,
        uri: "roads/sample-road.road.json",
      },
    ],
    bridgeProjectRefs: [
      {
        documentKind: "bridge-project",
        documentId: sampleBridgeId,
        revisionId: requireRevisionId(1),
        contentChecksum: checksum,
        uri: "bridges/sample-bridge/manifest.json",
      },
    ],
    analysisRefs: [
      {
        documentKind: "bridge-frame-analysis",
        documentId: sampleAnalysisId,
        revisionId: requireRevisionId(1),
        contentChecksum: checksum,
        uri: "analyses/sample-analysis/document.json",
      },
    ],
    sharedDatasetRefs: [],
    deliverableRefs: [],
    projectRevisionMetadata: {
      schemaVersion: "0.1.0" as BusinessProjectManifest["projectRevisionMetadata"]["schemaVersion"],
      documentId: projectId,
      revisionId,
      createdAt: now,
      contentChecksum: checksum,
    },
    status: {
      phase: "road_design",
      sections: { road: "MISSING", bridge: "MISSING", analysis: "MISSING" },
    },
    migrationProvenanceRef: null,
  };

  const validation = validateBusinessProjectManifest(manifest);
  if (validation.status === "valid") {
    persistence.saveManifest(manifest);
  }

  return business;
}

export function isSampleBusiness(business: BusinessSummary): boolean {
  return business.projectNumber === SAMPLE_BUSINESS_NUMBER;
}

export function createSampleBusinessId(): string {
  return generateUuid();
}
