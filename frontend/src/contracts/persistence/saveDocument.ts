import {
  createValidationIssue,
  createValidationResult,
} from "../validation";
import {
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
} from "../contractVersionRegistry";
import type { BridgeFrameAnalysisDocument } from "../bridgeFrameAnalysisDocument";
import { classifyLegacyInput } from "../legacy";
import type { RoadDesignDocument } from "../roadDesignDocument";
import {
  parseBridgeFrameAnalysisDocumentValue,
  parseRoadDesignDocumentValue,
} from "../runtime";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  parseContentChecksum,
} from "../contentChecksum";
import {
  createPersistenceLegacyWriteForbiddenError,
  createPersistenceStoreFailedError,
  createPersistenceValidationFailedError,
} from "./errors";
import type { AtomicJsonStorePort, DocumentSaveResult } from "./types";

function rejectLegacyPayload(value: unknown): DocumentSaveResult | undefined {
  const classification = classifyLegacyInput(value);
  if (
    classification.formatId === "jip-liner-importer" ||
    classification.formatId === "project-model"
  ) {
    return {
      ok: false,
      error: createPersistenceLegacyWriteForbiddenError(
        `Refusing to write legacy format "${classification.formatId}"; write-target only.`,
      ),
    };
  }
  return undefined;
}

function targetVersionMismatch(path: string) {
  return createPersistenceValidationFailedError(
    createValidationResult([
      createValidationIssue({
        code: "PERSISTENCE_TARGET_VERSION_MISMATCH",
        severity: "error",
        message: "Only current target schemaVersion may be saved.",
        path,
      }),
    ]),
  );
}

export function saveRoadDesignDocument(
  document: RoadDesignDocument,
  path: string,
  store: AtomicJsonStorePort,
  options: { readonly createOnly?: boolean; readonly expectedChecksum?: string } = {},
): DocumentSaveResult {
  const legacyRejection = rejectLegacyPayload(document);
  if (legacyRejection !== undefined) {
    return legacyRejection;
  }

  if (document.schemaVersion !== ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION) {
    return { ok: false, error: targetVersionMismatch("/schemaVersion") };
  }

  const parsed = parseRoadDesignDocumentValue(document);
  if (!parsed.success) {
    return { ok: false, error: createPersistenceValidationFailedError(parsed.validation) };
  }

  try {
    const stored = store.store(path, parsed.data, options);
    const checksum = parseContentChecksum({
      algorithm: CONTENT_CHECKSUM_ALGORITHM,
      hexDigest: stored.checksum,
    });
    if (checksum === undefined) {
      return {
        ok: false,
        error: createPersistenceStoreFailedError("Store returned an invalid checksum."),
      };
    }
    return {
      ok: true,
      path: stored.path,
      checksum,
      bytesWritten: stored.bytesWritten,
    };
  } catch (cause) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: createPersistenceStoreFailedError(causeMessage) };
  }
}

export function saveBridgeFrameAnalysisDocument(
  document: BridgeFrameAnalysisDocument,
  path: string,
  store: AtomicJsonStorePort,
  options: { readonly createOnly?: boolean; readonly expectedChecksum?: string } = {},
): DocumentSaveResult {
  const legacyRejection = rejectLegacyPayload(document);
  if (legacyRejection !== undefined) {
    return legacyRejection;
  }

  if (document.schemaVersion !== BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION) {
    return { ok: false, error: targetVersionMismatch("/schemaVersion") };
  }

  const parsed = parseBridgeFrameAnalysisDocumentValue(document);
  if (!parsed.success) {
    return { ok: false, error: createPersistenceValidationFailedError(parsed.validation) };
  }

  try {
    const stored = store.store(path, parsed.data, options);
    const checksum = parseContentChecksum({
      algorithm: CONTENT_CHECKSUM_ALGORITHM,
      hexDigest: stored.checksum,
    });
    if (checksum === undefined) {
      return {
        ok: false,
        error: createPersistenceStoreFailedError("Store returned an invalid checksum."),
      };
    }
    return {
      ok: true,
      path: stored.path,
      checksum,
      bytesWritten: stored.bytesWritten,
    };
  } catch (cause) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: createPersistenceStoreFailedError(causeMessage) };
  }
}
