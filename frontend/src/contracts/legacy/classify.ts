import {
  LEGACY_FRAME_FORMAT_ID,
  LEGACY_ROAD_FORMAT_ID,
  type LegacyFormatClassification,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/**
 * Classifies raw input against evidenced legacy formats without mutating input.
 * Does not default missing versions to current; version is reported as undefined when absent.
 */
export function classifyLegacyInput(raw: unknown): LegacyFormatClassification {
  if (!isPlainObject(raw)) {
    return { formatId: "unknown", sourceVersion: undefined, hints: ["non-object"] };
  }

  const hints: string[] = [];

  if (
    hasOwn(raw, "liner") &&
    isPlainObject(raw.liner) &&
    hasOwn(raw, "bridges") &&
    Array.isArray(raw.bridges) &&
    hasOwn(raw, "coordinateSystem")
  ) {
    const liner = raw.liner;
    const sourceVersion =
      typeof liner.importerSchemaVersion === "string"
        ? liner.importerSchemaVersion
        : undefined;
    hints.push("liner.importerSchemaVersion", "bridges", "coordinateSystem");
    return {
      formatId: LEGACY_ROAD_FORMAT_ID,
      sourceVersion,
      hints,
    };
  }

  if (
    hasOwn(raw, "project") &&
    hasOwn(raw, "units") &&
    hasOwn(raw, "nodes") &&
    hasOwn(raw, "members") &&
    hasOwn(raw, "materials") &&
    hasOwn(raw, "sections") &&
    hasOwn(raw, "supports") &&
    hasOwn(raw, "analysisSettings")
  ) {
    hints.push("project", "units", "nodes", "members", "analysisSettings");
    const sourceVersion =
      typeof raw.schemaVersion === "number" && Number.isInteger(raw.schemaVersion)
        ? String(raw.schemaVersion)
        : undefined;
    return {
      formatId: LEGACY_FRAME_FORMAT_ID,
      sourceVersion,
      hints,
    };
  }

  if (hasOwn(raw, "crossSection") && hasOwn(raw, "spans") && hasOwn(raw, "lines")) {
    hints.push("bridge-project-shape");
  }
  if (hasOwn(raw, "schemaId") && typeof raw.schemaId === "string") {
    hints.push(`schemaId:${raw.schemaId}`);
  }

  return { formatId: "unknown", sourceVersion: undefined, hints };
}

export function isPlainLegacyObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}
