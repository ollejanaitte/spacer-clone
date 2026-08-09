import { BUSINESS_PROJECT_SCHEMA_VERSION } from "../../contracts/contractVersionRegistry";
import {
  validateBusinessProjectManifest,
  type BusinessProjectManifest,
  type BusinessProjectRef,
} from "../../contracts/businessProject";
import { contentChecksumsEqual } from "../../contracts/contentChecksum";
import type { ContentChecksum } from "../../contracts/contentChecksum";
import {
  createPersistenceStoreFailedError,
  createPersistenceValidationFailedError,
  type PersistenceError,
} from "../../contracts/persistence";
import type { AtomicJsonStorePort } from "../../contracts/persistence/types";
import { generateUuid, isValidUuid } from "../../contracts/uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationResult,
} from "../../contracts/validation";

export const BUSINESS_PROJECT_MANIFEST_FILE = "business-project.json";

export interface BusinessProjectChildDocument {
  readonly kind: "road-design" | "bridge-project" | "bridge-frame-analysis";
  readonly ref: BusinessProjectRef;
  readonly payload: unknown;
}

export interface BusinessProjectSaveRequest {
  readonly manifest: BusinessProjectManifest;
  readonly childDocuments: readonly BusinessProjectChildDocument[];
}

export interface BusinessProjectSaveResult {
  readonly ok: true;
  readonly manifestChecksum: ContentChecksum;
  readonly manifestRevision: number;
}

export type BusinessProjectSaveOutcome =
  | BusinessProjectSaveResult
  | {
      readonly ok: false;
      readonly error: PersistenceError;
      readonly reason:
        | "validation"
        | "store"
        | "readback-mismatch"
        | "missing"
        | "manifest-conflict";
    };

export type BusinessProjectOpenOutcome =
  | {
      readonly ok: true;
      readonly manifest: BusinessProjectManifest;
      readonly childUris: readonly string[];
    }
  | {
      readonly ok: false;
      readonly error: PersistenceError;
      readonly reason: "validation" | "store" | "missing" | "child-mismatch";
    };

export interface BusinessProjectFolderStore {
  readonly projectId: string;
  save(request: BusinessProjectSaveRequest): BusinessProjectSaveOutcome;
  open(): BusinessProjectOpenOutcome;
  exists(): boolean;
}

export interface BusinessProjectFolderStoreOptions {
  readonly store: AtomicJsonStorePort;
  readonly basePath: string;
}

function manifestPath(basePath: string): string {
  return `${basePath}/${BUSINESS_PROJECT_MANIFEST_FILE}`;
}

function childPath(basePath: string, uri: string): string {
  return `${basePath}/${uri}`;
}

function readRaw(store: AtomicJsonStorePort, path: string): unknown {
  try {
    return store.read(path);
  } catch {
    return undefined;
  }
}

function allChildRefs(manifest: BusinessProjectManifest): readonly BusinessProjectRef[] {
  return [
    ...manifest.roadRefs,
    ...manifest.bridgeProjectRefs,
    ...manifest.analysisRefs,
    ...manifest.sharedDatasetRefs,
    ...manifest.deliverableRefs,
  ];
}

function buildManifestValidation(manifest: BusinessProjectManifest): ValidationResult {
  return validateBusinessProjectManifest(manifest);
}

function verifyChildRefAgainstStore(
  store: AtomicJsonStorePort,
  basePath: string,
  ref: BusinessProjectRef,
): boolean {
  const raw = readRaw(store, childPath(basePath, ref.uri));
  if (raw === undefined) {
    return false;
  }
  try {
    const checksum = store.checksumForPath(childPath(basePath, ref.uri));
    return contentChecksumsEqual(
      { algorithm: "sha256", hexDigest: checksum },
      ref.contentChecksum,
    );
  } catch {
    return false;
  }
}

/**
 * BusinessProject folder store backed by an atomic JSON store.
 *
 * Save is children-first + manifest-last:
 *   1. validate all child documents + manifest (fail-closed)
 *   2. atomically publish each child (create-only new revision)
 *   3. atomically publish manifest last (expectedChecksum = old manifest checksum,
 *      optimistic concurrency; missing manifest on first save uses createOnly)
 *   4. readback verify each child checksum + manifest checksum
 */
export function createBusinessProjectFolderStore(
  options: BusinessProjectFolderStoreOptions,
): BusinessProjectFolderStore {
  const { store, basePath } = options;
  const manifestFile = manifestPath(basePath);

  function readManifest(): BusinessProjectManifest | undefined {
    const raw = readRaw(store, manifestFile);
    if (raw === undefined) {
      return undefined;
    }
    const value = raw as Partial<BusinessProjectManifest>;
    if (typeof value.documentId !== "string") {
      return undefined;
    }
    return value as BusinessProjectManifest;
  }

  function open(): BusinessProjectOpenOutcome {
    const manifest = readManifest();
    if (manifest === undefined) {
      return {
        ok: false,
        error: createPersistenceStoreFailedError(
          "BusinessProject folder does not contain a readable manifest.",
        ),
        reason: "missing",
      };
    }

    const validation = buildManifestValidation(manifest);
    if (validation.status !== "valid") {
      return {
        ok: false,
        error: createPersistenceValidationFailedError(validation),
        reason: "validation",
      };
    }

    const childUris = [
      ...manifest.roadRefs.map((ref) => ref.uri),
      ...manifest.bridgeProjectRefs.map((ref) => ref.uri),
      ...manifest.analysisRefs.map((ref) => ref.uri),
      ...manifest.sharedDatasetRefs.map((ref) => ref.uri),
      ...manifest.deliverableRefs.map((ref) => ref.uri),
    ];

    for (const ref of allChildRefs(manifest)) {
      if (!verifyChildRefAgainstStore(store, basePath, ref)) {
        return {
          ok: false,
          error: createPersistenceStoreFailedError(
            `Child document is missing or corrupted (checksum mismatch): ${ref.uri}`,
          ),
          reason: "child-mismatch",
        };
      }
    }

    return { ok: true, manifest, childUris };
  }

  function exists(): boolean {
    return readManifest() !== undefined;
  }

  function save(request: BusinessProjectSaveRequest): BusinessProjectSaveOutcome {
    const manifestValidation = buildManifestValidation(request.manifest);
    if (manifestValidation.status !== "valid") {
      return {
        ok: false,
        error: createPersistenceValidationFailedError(manifestValidation),
        reason: "validation",
      };
    }

    for (const child of request.childDocuments) {
      const childValidation = validateChildDocument(child);
      if (childValidation.status !== "valid") {
        return {
          ok: false,
          error: createPersistenceValidationFailedError(childValidation),
          reason: "validation",
        };
      }
    }

    const oldChecksum = (() => {
      const existing = readRaw(store, manifestFile);
      if (existing === undefined) {
        return undefined;
      }
      try {
        return store.checksumForPath(manifestFile);
      } catch {
        return undefined;
      }
    })();

    try {
      for (const child of request.childDocuments) {
        store.store(childPath(basePath, child.ref.uri), child.payload, {
          createOnly: true,
        });
      }
    } catch (cause) {
      return {
        ok: false,
        error: createPersistenceStoreFailedError(
          cause instanceof Error ? cause.message : String(cause),
        ),
        reason: "store",
      };
    }

    try {
      const manifestOptions =
        oldChecksum === undefined
          ? { createOnly: true }
          : { expectedChecksum: oldChecksum };
      store.store(manifestFile, request.manifest, manifestOptions);
    } catch (cause) {
      return {
        ok: false,
        error: createPersistenceStoreFailedError(
          cause instanceof Error ? cause.message : String(cause),
        ),
        reason: "manifest-conflict",
      };
    }

    for (const child of request.childDocuments) {
      if (!verifyChildRefAgainstStore(store, basePath, child.ref)) {
        return {
          ok: false,
          error: createPersistenceStoreFailedError(
            `Child document readback checksum mismatch: ${child.ref.uri}`,
          ),
          reason: "readback-mismatch",
        };
      }
    }

    const readbackManifest = readManifest();
    if (readbackManifest === undefined) {
      return {
        ok: false,
        error: createPersistenceStoreFailedError(
          "Manifest readback failed after commit.",
        ),
        reason: "readback-mismatch",
      };
    }

    let manifestChecksum: ContentChecksum;
    try {
      const hex = store.checksumForPath(manifestFile);
      manifestChecksum = { algorithm: "sha256", hexDigest: hex };
    } catch (cause) {
      return {
        ok: false,
        error: createPersistenceStoreFailedError(
          cause instanceof Error ? cause.message : String(cause),
        ),
        reason: "readback-mismatch",
      };
    }

    return {
      ok: true,
      manifestChecksum,
      manifestRevision: request.manifest.revisionId,
    };
  }

  return { projectId: parseProjectIdFromBasePath(basePath), save, open, exists };
}

function parseProjectIdFromBasePath(basePath: string): string {
  const segments = basePath.split("/").filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  return last !== undefined && isValidUuid(last) ? last : "";
}

function validateChildDocument(child: BusinessProjectChildDocument): ValidationResult {
  if (child.payload === undefined || child.payload === null) {
    return createValidationResult([
      createValidationIssue({
        code: "BUSINESS_PROJECT_CHILD_PAYLOAD_MISSING",
        severity: "error",
        message: "Child document payload must be provided.",
        path: child.ref.uri,
      }),
    ]);
  }
  return createValidationResult([]);
}

export function resolveBusinessProjectFolderBasePath(projectId: string): string {
  if (!isValidUuid(projectId)) {
    throw new Error("projectId must be a valid UUID to resolve a folder path.");
  }
  return `businesses/${projectId}`;
}

export function createBusinessProjectId(): string {
  return generateUuid();
}
