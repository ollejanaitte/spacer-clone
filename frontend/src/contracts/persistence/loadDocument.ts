import {
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
  ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
} from "../contractVersionRegistry";
import type { BridgeFrameAnalysisDocument } from "../bridgeFrameAnalysisDocument";
import {
  adaptLegacyFrameInput,
  adaptLegacyRoadInput,
  classifyLegacyInput,
  type LegacyAdapterClock,
} from "../legacy";
import {
  createMigrationRegistry,
  type MigrationRegistry,
} from "../migration";
import type { RoadDesignDocument } from "../roadDesignDocument";
import {
  parseBridgeFrameAnalysisDocumentValue,
  parseRoadDesignDocumentValue,
} from "../runtime";
import { parseSchemaId, requireSchemaVersion, type SchemaIdentity } from "../schemaIdentity";
import { createValidationResult } from "../validation";
import { parseRawJson } from "./atomicStore";
import {
  createPersistenceAdapterFailedError,
  createPersistenceMalformedJsonError,
  createPersistenceMigrationFailedError,
  createPersistenceMissingVersionError,
  createPersistenceUnsupportedFormatError,
  createPersistenceUnsupportedVersionError,
  createPersistenceValidationFailedError,
} from "./errors";
import type { DocumentLoadResult } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Array.isArray(value) === false;
}

function asSchemaIdentity(
  schemaId: string,
  schemaVersion: string,
): SchemaIdentity | undefined {
  const parsedId = parseSchemaId(schemaId);
  if (parsedId === undefined) {
    return undefined;
  }
  try {
    return {
      schemaId: parsedId,
      schemaVersion: requireSchemaVersion(schemaVersion),
    };
  } catch {
    return undefined;
  }
}

function ensureMigrationRegistry(registry?: MigrationRegistry): MigrationRegistry {
  return registry ?? createMigrationRegistry();
}

export function normalizeRawInput(raw: unknown):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: ReturnType<typeof createPersistenceMalformedJsonError> } {
  if (typeof raw === "string") {
    const parsed = parseRawJson(raw);
    if (!parsed.ok) {
      return { ok: false, error: createPersistenceMalformedJsonError(parsed.causeMessage) };
    }
    return { ok: true, value: parsed.value };
  }
  return { ok: true, value: raw };
}

export function isTargetRoadDocument(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    value.schemaId === ROAD_DESIGN_DOCUMENT_SCHEMA_ID &&
    value.documentKind === "road-design"
  );
}

export function isTargetFrameDocument(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    value.schemaId === BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID &&
    value.documentKind === "bridge-frame-analysis"
  );
}

export interface LoadDocumentDependencies {
  readonly migrationRegistry?: MigrationRegistry;
  readonly clock?: LegacyAdapterClock;
  readonly createdAt?: string;
}

export function loadRoadDesignDocument(
  raw: unknown,
  options: LoadDocumentDependencies = {},
): DocumentLoadResult<RoadDesignDocument> {
  const normalized = normalizeRawInput(raw);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  const value = normalized.value;
  if (isTargetRoadDocument(value)) {
    return loadTargetRoad(value as Record<string, unknown>, options);
  }

  const classification = classifyLegacyInput(value);
  if (classification.formatId === "jip-liner-importer") {
    return loadLegacyRoad(value, classification.sourceVersion, options);
  }

  return {
    ok: false,
    error: createPersistenceUnsupportedFormatError(
      "Input is neither a target RoadDesignDocument nor a supported legacy road format.",
      classification.hints,
    ),
  };
}

export function loadBridgeFrameAnalysisDocument(
  raw: unknown,
  options: LoadDocumentDependencies = {},
): DocumentLoadResult<BridgeFrameAnalysisDocument> {
  const normalized = normalizeRawInput(raw);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  const value = normalized.value;
  if (isTargetFrameDocument(value)) {
    return loadTargetFrame(value as Record<string, unknown>, options);
  }

  const classification = classifyLegacyInput(value);
  if (classification.formatId === "project-model") {
    return loadLegacyFrame(value, classification.sourceVersion, options);
  }

  return {
    ok: false,
    error: createPersistenceUnsupportedFormatError(
      "Input is neither a target BridgeFrameAnalysisDocument nor a supported legacy frame format.",
      classification.hints,
    ),
  };
}

function loadTargetRoad(
  value: Record<string, unknown>,
  options: LoadDocumentDependencies,
): DocumentLoadResult<RoadDesignDocument> {
  const schemaVersion =
    typeof value.schemaVersion === "string" ? value.schemaVersion : undefined;
  if (schemaVersion === undefined) {
    return {
      ok: false,
      error: createPersistenceMissingVersionError("road-design-document"),
    };
  }

  const sourceSchema = asSchemaIdentity(ROAD_DESIGN_DOCUMENT_SCHEMA_ID, schemaVersion);
  const targetSchema = asSchemaIdentity(
    ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
    ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION,
  );
  if (sourceSchema === undefined || targetSchema === undefined) {
    return {
      ok: false,
      error: createPersistenceUnsupportedVersionError("road-design-document", schemaVersion),
    };
  }

  if (schemaVersion !== ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: createPersistenceUnsupportedVersionError("road-design-document", schemaVersion),
    };
  }

  const registry = ensureMigrationRegistry(options.migrationRegistry);
  const migrated = registry.migrate({
    source: value,
    sourceSchema,
    targetSchema,
    validateTarget: (candidate) => {
      const parsed = parseRoadDesignDocumentValue(candidate);
      return parsed.success ? createValidationResult([]) : parsed.validation;
    },
  });

  if (!migrated.ok) {
    if (migrated.error.code === "validation-failed") {
      return {
        ok: false,
        error: createPersistenceValidationFailedError(migrated.error.validation),
      };
    }
    return {
      ok: false,
      error: createPersistenceMigrationFailedError(migrated.error.message),
    };
  }

  const parsed = parseRoadDesignDocumentValue(migrated.value);
  if (!parsed.success) {
    return { ok: false, error: createPersistenceValidationFailedError(parsed.validation) };
  }

  return {
    ok: true,
    document: parsed.data,
    sourceKind: "target",
    sourceFormatId: "road-design-document",
    sourceVersion: schemaVersion,
    migrationReport:
      migrated.report as unknown as import("../migration").MigrationReport<RoadDesignDocument>,
  };
}

function loadTargetFrame(
  value: Record<string, unknown>,
  options: LoadDocumentDependencies,
): DocumentLoadResult<BridgeFrameAnalysisDocument> {
  const schemaVersion =
    typeof value.schemaVersion === "string" ? value.schemaVersion : undefined;
  if (schemaVersion === undefined) {
    return {
      ok: false,
      error: createPersistenceMissingVersionError("bridge-frame-analysis-document"),
    };
  }

  const sourceSchema = asSchemaIdentity(
    BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
    schemaVersion,
  );
  const targetSchema = asSchemaIdentity(
    BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
    BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  );
  if (sourceSchema === undefined || targetSchema === undefined) {
    return {
      ok: false,
      error: createPersistenceUnsupportedVersionError(
        "bridge-frame-analysis-document",
        schemaVersion,
      ),
    };
  }

  if (schemaVersion !== BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: createPersistenceUnsupportedVersionError(
        "bridge-frame-analysis-document",
        schemaVersion,
      ),
    };
  }

  const registry = ensureMigrationRegistry(options.migrationRegistry);
  const migrated = registry.migrate({
    source: value,
    sourceSchema,
    targetSchema,
    validateTarget: (candidate) => {
      const parsed = parseBridgeFrameAnalysisDocumentValue(candidate);
      return parsed.success ? createValidationResult([]) : parsed.validation;
    },
  });

  if (!migrated.ok) {
    if (migrated.error.code === "validation-failed") {
      return {
        ok: false,
        error: createPersistenceValidationFailedError(migrated.error.validation),
      };
    }
    return {
      ok: false,
      error: createPersistenceMigrationFailedError(migrated.error.message),
    };
  }

  const parsed = parseBridgeFrameAnalysisDocumentValue(migrated.value);
  if (!parsed.success) {
    return { ok: false, error: createPersistenceValidationFailedError(parsed.validation) };
  }

  return {
    ok: true,
    document: parsed.data,
    sourceKind: "target",
    sourceFormatId: "bridge-frame-analysis-document",
    sourceVersion: schemaVersion,
    migrationReport:
      migrated.report as unknown as import("../migration").MigrationReport<BridgeFrameAnalysisDocument>,
  };
}

function loadLegacyRoad(
  value: unknown,
  sourceVersion: string | undefined,
  options: LoadDocumentDependencies,
): DocumentLoadResult<RoadDesignDocument> {
  if (sourceVersion === undefined) {
    return {
      ok: false,
      error: createPersistenceMissingVersionError("jip-liner-importer"),
    };
  }

  const adapted = adaptLegacyRoadInput(value, {
    clock: options.clock,
    createdAt: options.createdAt,
  });
  if (!adapted.ok) {
    return {
      ok: false,
      error: createPersistenceAdapterFailedError(adapted.error.code, adapted.error.message),
    };
  }

  return {
    ok: true,
    document: adapted.document,
    sourceKind: "legacy",
    sourceFormatId: adapted.formatId,
    sourceVersion: adapted.sourceVersion,
  };
}

function loadLegacyFrame(
  value: unknown,
  sourceVersion: string | undefined,
  options: LoadDocumentDependencies,
): DocumentLoadResult<BridgeFrameAnalysisDocument> {
  if (sourceVersion === undefined) {
    return {
      ok: false,
      error: createPersistenceMissingVersionError("project-model"),
    };
  }

  const adapted = adaptLegacyFrameInput(value, {
    clock: options.clock,
    createdAt: options.createdAt,
  });
  if (!adapted.ok) {
    return {
      ok: false,
      error: createPersistenceAdapterFailedError(adapted.error.code, adapted.error.message),
    };
  }

  return {
    ok: true,
    document: adapted.document,
    sourceKind: "legacy",
    sourceFormatId: adapted.formatId,
    sourceVersion: adapted.sourceVersion,
  };
}
