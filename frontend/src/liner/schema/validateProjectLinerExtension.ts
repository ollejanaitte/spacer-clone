import type {
  PersistedLinerTraceEntry,
  ProjectLinerMetadata,
  ProjectLinerValidationDiagnostic,
} from "./types";

const FRAME_ENTITY_TYPES = new Set(["node", "member", "support"]);
const MEMBER_DIRECTIONS = new Set(["longitudinal", "transverse"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function pushError(
  diagnostics: ProjectLinerValidationDiagnostic[],
  path: string,
  message: string,
): void {
  diagnostics.push({
    level: "error",
    code: "LINER_SCHEMA_INVALID",
    path,
    message,
  });
}

function validateLinerMetadata(
  value: unknown,
  path: string,
  diagnostics: ProjectLinerValidationDiagnostic[],
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    pushError(diagnostics, path, "liner must be an object.");
    return;
  }

  const liner = value as Record<string, unknown>;
  const requiredStringFields: Array<[keyof ProjectLinerMetadata, string]> = [
    ["schemaVersion", "schemaVersion"],
    ["sourceRevision", "sourceRevision"],
    ["linerModelId", "linerModelId"],
    ["coordinatePolicyId", "coordinatePolicyId"],
  ];

  for (const [field, label] of requiredStringFields) {
    if (!isNonEmptyString(liner[field])) {
      pushError(diagnostics, `${path}/${label}`, `${label} must be a non-empty string.`);
    }
  }

  if (liner.intermediateSchemaVersion !== "0.2.0") {
    pushError(
      diagnostics,
      `${path}/intermediateSchemaVersion`,
      'intermediateSchemaVersion must be "0.2.0".',
    );
  }

  if (liner.generatedAt !== undefined && !isNonEmptyString(liner.generatedAt)) {
    pushError(diagnostics, `${path}/generatedAt`, "generatedAt must be a non-empty string when present.");
  }

  if (liner.source !== undefined) {
    if (typeof liner.source !== "object" || liner.source === null || Array.isArray(liner.source)) {
      pushError(diagnostics, `${path}/source`, "source must be an object when present.");
    } else {
      const source = liner.source as Record<string, unknown>;
      if (source.alignmentId !== undefined && !isNonEmptyString(source.alignmentId)) {
        pushError(diagnostics, `${path}/source/alignmentId`, "alignmentId must be a non-empty string when present.");
      }
      if (source.gridDefinitionId !== undefined && !isNonEmptyString(source.gridDefinitionId)) {
        pushError(
          diagnostics,
          `${path}/source/gridDefinitionId`,
          "gridDefinitionId must be a non-empty string when present.",
        );
      }
    }
  }
}

function validateTraceEntry(
  value: unknown,
  path: string,
  diagnostics: ProjectLinerValidationDiagnostic[],
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    pushError(diagnostics, path, "linerTrace entry must be an object.");
    return;
  }

  const entry = value as Record<string, unknown>;
  if (!isNonEmptyString(entry.frameEntityId)) {
    pushError(diagnostics, `${path}/frameEntityId`, "frameEntityId must be a non-empty string.");
  }
  if (!isNonEmptyString(entry.sourceRevision)) {
    pushError(diagnostics, `${path}/sourceRevision`, "sourceRevision must be a non-empty string.");
  }
  if (!isNonEmptyString(entry.linerModelId)) {
    pushError(diagnostics, `${path}/linerModelId`, "linerModelId must be a non-empty string.");
  }
  if (!isNonEmptyString(entry.coordinatePolicyId)) {
    pushError(diagnostics, `${path}/coordinatePolicyId`, "coordinatePolicyId must be a non-empty string.");
  }
  if (!isNonEmptyString(entry.frameEntityType) || !FRAME_ENTITY_TYPES.has(entry.frameEntityType)) {
    pushError(
      diagnostics,
      `${path}/frameEntityType`,
      'frameEntityType must be one of "node", "member", or "support".',
    );
  }

  if (entry.memberDirection !== undefined) {
    if (!isNonEmptyString(entry.memberDirection) || !MEMBER_DIRECTIONS.has(entry.memberDirection)) {
      pushError(
        diagnostics,
        `${path}/memberDirection`,
        'memberDirection must be "longitudinal" or "transverse" when present.',
      );
    }
  }

  if (entry.gridPointIds !== undefined) {
    if (!Array.isArray(entry.gridPointIds)) {
      pushError(diagnostics, `${path}/gridPointIds`, "gridPointIds must be an array when present.");
    } else {
      entry.gridPointIds.forEach((item, index) => {
        if (!isNonEmptyString(item)) {
          pushError(
            diagnostics,
            `${path}/gridPointIds/${index}`,
            "gridPointIds items must be non-empty strings.",
          );
        }
      });
    }
  }
}

function validateLinerTrace(
  value: unknown,
  path: string,
  diagnostics: ProjectLinerValidationDiagnostic[],
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    pushError(diagnostics, path, "linerTrace must be an array when present.");
    return;
  }

  value.forEach((entry, index) => {
    validateTraceEntry(entry, `${path}/${index}`, diagnostics);
  });
}

export function validateProjectLinerExtension(project: {
  liner?: unknown;
  linerTrace?: unknown;
}): ProjectLinerValidationDiagnostic[] {
  const diagnostics: ProjectLinerValidationDiagnostic[] = [];
  validateLinerMetadata(project.liner, "/liner", diagnostics);
  validateLinerTrace(project.linerTrace, "/linerTrace", diagnostics);
  return diagnostics;
}

export function isValidProjectLinerExtension(project: {
  liner?: unknown;
  linerTrace?: unknown;
}): boolean {
  return validateProjectLinerExtension(project).length === 0;
}

export function assertValidPersistedLinerTrace(
  linerTrace: PersistedLinerTraceEntry[],
): ProjectLinerValidationDiagnostic[] {
  return validateProjectLinerExtension({ linerTrace });
}
