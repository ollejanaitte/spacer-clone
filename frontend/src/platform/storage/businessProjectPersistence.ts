import {
  BUSINESS_PROJECT_SCHEMA_VERSION,
  validateBusinessProjectManifest,
  type BusinessProjectManifest,
} from "../../contracts/businessProject";
import { requireRevisionId } from "../../contracts/revision";
import { generateUuid, parseUuid, type UuidString } from "../../contracts/uuid";
import type { BusinessSummary } from "../business/businessRegistry";

export const BUSINESS_PROJECT_STORAGE_PREFIX = "spacer.designPlatform.projects.";

export interface BusinessProjectSaveResult {
  readonly ok: true;
  readonly lastSavedAt: string;
  readonly revisionId: number;
}

export interface BusinessProjectSaveFailure {
  readonly ok: false;
  readonly reason: string;
}

export type BusinessProjectSaveOutcome = BusinessProjectSaveResult | BusinessProjectSaveFailure;

export interface BusinessProjectPersistencePort {
  save(business: BusinessSummary): BusinessProjectSaveOutcome;
  load(businessId: string): BusinessProjectManifest | null;
  lastSavedAt(businessId: string): string | null;
}

function storageKey(businessId: string): string {
  return `${BUSINESS_PROJECT_STORAGE_PREFIX}${businessId}`;
}

/**
 * Builds the BusinessProject manifest (engineering-project 0.2.0) from the
 * runtime business registry summary. The manifest is a ToC only; child entity
 * payloads live in child documents (not embedded). Reuses the protected
 * engineering-project contract schema for validation.
 */
export function buildBusinessProjectManifest(business: BusinessSummary): BusinessProjectManifest {
  const projectId = parseUuid(business.businessId) ?? (business.businessId as UuidString);
  const revisionId = requireRevisionId(1);
  const now = new Date().toISOString();
  const checksum = { algorithm: "sha256" as const, hexDigest: "0".repeat(64) };

  return {
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
    projectNumber: business.projectNumber,
    projectName: business.projectName,
    designStage: business.designStage,
    projectStatus: "active" as const,
    coordinateReference: null,
    roadRefs: [],
    bridgeProjectRefs: [],
    analysisRefs: [],
    sharedDatasetRefs: [],
    deliverableRefs: [],
    projectRevisionMetadata: {
      schemaVersion: "0.1.0" as BusinessProjectManifest["projectRevisionMetadata"]["schemaVersion"],
      documentId: projectId,
      revisionId,
      createdAt: now,
      contentChecksum: checksum,
    },
    status: { phase: business.designStage, sections: {} },
    migrationProvenanceRef: null,
  };
}

export function createBusinessProjectPersistence(
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
): BusinessProjectPersistencePort {
  const now = () => new Date().toISOString();

  return {
    save(business: BusinessSummary): BusinessProjectSaveOutcome {
      try {
        const manifest = buildBusinessProjectManifest(business);
        const validation = validateBusinessProjectManifest(manifest);
        if (validation.status !== "valid") {
          return { ok: false, reason: "BusinessProject manifest validation failed." };
        }
        const lastSavedAt = now();
        storage.setItem(
          storageKey(business.businessId),
          JSON.stringify({ manifest, lastSavedAt }, null, 2),
        );
        return { ok: true, lastSavedAt, revisionId: manifest.revisionId };
      } catch (cause) {
        return {
          ok: false,
          reason: cause instanceof Error ? cause.message : String(cause),
        };
      }
    },

    load(businessId: string): BusinessProjectManifest | null {
      try {
        const raw = storage.getItem(storageKey(businessId));
        if (raw === null) {
          return null;
        }
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) {
          return null;
        }
        const manifest = (parsed as { manifest?: unknown }).manifest;
        const validation = validateBusinessProjectManifest(
          manifest as Partial<BusinessProjectManifest> | undefined,
        );
        return validation.status === "valid"
          ? (manifest as BusinessProjectManifest)
          : null;
      } catch {
        return null;
      }
    },

    lastSavedAt(businessId: string): string | null {
      try {
        const raw = storage.getItem(storageKey(businessId));
        if (raw === null) {
          return null;
        }
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) {
          return null;
        }
        const value = (parsed as { lastSavedAt?: unknown }).lastSavedAt;
        return typeof value === "string" ? value : null;
      } catch {
        return null;
      }
    },
  };
}

export function createSampleBusinessId(): string {
  return generateUuid();
}
