import {
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
} from "../../contractVersionRegistry";
import {
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND,
  validateBridgeFrameAnalysisDocument,
  type BridgeFrameAnalysisDocument,
  type FrameMaterialEntry,
  type FrameMemberEntry,
  type FrameNodeEntry,
  type FrameSectionEntry,
  type FrameSupportEntry,
  type LoadDefinitionEntry,
  type LoadKind,
} from "../../bridgeFrameAnalysisDocument";
import {
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  type CoordinateContext,
} from "../../coordinateContext";
import type { Extensions } from "../../extensions";
import type { JsonValue } from "../../jsonValue";
import type { MigrationIdMapping } from "../../migrationRecord";
import type { Provenance } from "../../provenance";
import { REVISION_METADATA_SCHEMA_VERSION, requireRevisionId } from "../../revision";
import {
  UNIT_CONTEXT_SCHEMA_VERSION,
  type AreaUnit,
  type ForceUnit,
  type InertiaUnit,
  type LengthUnit,
  type ModulusUnit,
  type MomentUnit,
  type UnitContext,
} from "../../unitContext";
import type { UuidString } from "../../uuid";
import {
  createValidationIssue,
  hasValidationErrors,
  type ValidationIssue,
} from "../../validation";
import { computeContentChecksum } from "../checksum";
import { classifyLegacyInput, isPlainLegacyObject } from "../classify";
import { cloneLegacyValue } from "../clone";
import {
  createLegacyAmbiguousUnitError,
  createLegacyBrokenIdError,
  createLegacyInvalidShapeError,
  createLegacyMissingVersionError,
  createLegacyMixedOwnershipError,
  createLegacyUnresolvedReferenceError,
  createLegacyUnsupportedFormatError,
  createLegacyUnsupportedVersionError,
  createLegacyValidationFailedError,
} from "../errors";
import { deriveStableUuid } from "../idStability";
import {
  defaultLegacyAdapterClock,
  LEGACY_ADAPTER_VERSION,
  LEGACY_FRAME_ADAPTER_ID,
  LEGACY_FRAME_FORMAT_ID,
  type LegacyAdapterOptions,
  type LegacyAdapterResult,
} from "../types";

const SUPPORTED_PROJECT_MODEL_VERSIONS = ["1"] as const;

const LENGTH_ALIASES: Readonly<Record<string, LengthUnit>> = {
  m: "m",
  mm: "mm",
  ft: "ft",
  in: "in",
};

const FORCE_ALIASES: Readonly<Record<string, ForceUnit>> = {
  N: "N",
  kN: "kN",
  lbf: "lbf",
};

const MOMENT_ALIASES: Readonly<Record<string, MomentUnit>> = {
  "N·m": "N·m",
  N_m: "N·m",
  "kN·m": "kN·m",
  kN_m: "kN·m",
  "lbf·ft": "lbf·ft",
  lbf_ft: "lbf·ft",
};

const AREA_ALIASES: Readonly<Record<string, AreaUnit>> = {
  "m²": "m²",
  m2: "m²",
  "mm²": "mm²",
  mm2: "mm²",
  "ft²": "ft²",
  ft2: "ft²",
  "in²": "in²",
  in2: "in²",
};

const INERTIA_ALIASES: Readonly<Record<string, InertiaUnit>> = {
  "m⁴": "m⁴",
  m4: "m⁴",
  "mm⁴": "mm⁴",
  mm4: "mm⁴",
  "ft⁴": "ft⁴",
  ft4: "ft⁴",
  "in⁴": "in⁴",
  in4: "in⁴",
};

const MODULUS_ALIASES: Readonly<Record<string, ModulusUnit>> = {
  Pa: "Pa",
  kPa: "kPa",
  MPa: "MPa",
  GPa: "GPa",
  kN_per_m2: "kPa",
  "kN/m2": "kPa",
  "kN/m²": "kPa",
};

function requireNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mapAsJsonValue(value: unknown): JsonValue | undefined {
  if (value === null) {
    return null;
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return value as string | boolean;
  }
  if (valueType === "number" && Number.isFinite(value)) {
    return value as number;
  }
  if (valueType === "undefined") {
    return undefined;
  }
  if (Array.isArray(value)) {
    const mapped: JsonValue[] = [];
    for (const entry of value) {
      if (entry === undefined) {
        return undefined;
      }
      const child = mapAsJsonValue(entry);
      if (child === undefined) {
        return undefined;
      }
      mapped.push(child);
    }
    return mapped;
  }
  if (isPlainLegacyObject(value)) {
    const mapped: { [key: string]: JsonValue } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) {
        continue;
      }
      const child = mapAsJsonValue(entry);
      if (child === undefined) {
        return undefined;
      }
      mapped[key] = child;
    }
    return mapped;
  }
  return undefined;
}

function mapUnit<T extends string>(
  aliases: Readonly<Record<string, T>>,
  field: string,
  rawValue: unknown,
):
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly raw: string } {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return { ok: false, raw: String(rawValue) };
  }
  const mapped = aliases[rawValue];
  if (mapped === undefined) {
    return { ok: false, raw: rawValue };
  }
  return { ok: true, value: mapped };
}

function classifyLoadKind(name: string): LoadKind {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes("dead")) {
    return "dead";
  }
  if (normalized.includes("live")) {
    return "live";
  }
  if (normalized.includes("wind")) {
    return "wind";
  }
  if (normalized.includes("temp")) {
    return "temperature";
  }
  return "other";
}

/**
 * Adapts an evidenced ProjectModel JSON document into BridgeFrameAnalysisDocument v0.1.0.
 * Mixed liner ownership is rejected. Numeric material/section/load payloads are preserved in extensions.
 */
export function adaptLegacyFrameInput(
  rawInput: unknown,
  options: LegacyAdapterOptions = {},
): LegacyAdapterResult<BridgeFrameAnalysisDocument> {
  const diagnostics: ValidationIssue[] = [];
  const notes: {
    readonly jsonPointer: string;
    readonly message: string;
    readonly criticality?: "critical" | "optional" | "informational";
  }[] = [];
  const provenanceNotes: {
    readonly path: string;
    readonly message: string;
    readonly code?: string;
  }[] = [];
  const idMappings: MigrationIdMapping[] = [];

  const sourceCopy = cloneLegacyValue(rawInput);
  const classification = classifyLegacyInput(sourceCopy);

  if (classification.formatId !== LEGACY_FRAME_FORMAT_ID) {
    return {
      ok: false,
      error: createLegacyUnsupportedFormatError(
        "Input is not a supported legacy frame (ProjectModel) document.",
        classification.hints,
      ),
      diagnostics,
    };
  }

  if (!isPlainLegacyObject(sourceCopy)) {
    return {
      ok: false,
      error: createLegacyInvalidShapeError(
        LEGACY_FRAME_FORMAT_ID,
        "Legacy frame input must be an object.",
      ),
      diagnostics,
    };
  }

  if (sourceCopy.liner !== undefined || sourceCopy.linerTrace !== undefined) {
    const conflicting = [
      ...(sourceCopy.liner !== undefined ? ["liner"] : []),
      ...(sourceCopy.linerTrace !== undefined ? ["linerTrace"] : []),
    ];
    return {
      ok: false,
      error: createLegacyMixedOwnershipError(LEGACY_FRAME_FORMAT_ID, conflicting),
      diagnostics: [
        createValidationIssue({
          code: "LEGACY_FRAME_MIXED_OWNERSHIP",
          severity: "error",
          message:
            "ProjectModel with liner/linerTrace requires an atomic road/frame split adapter.",
          path: sourceCopy.liner !== undefined ? "/liner" : "/linerTrace",
        }),
      ],
    };
  }

  if (classification.sourceVersion === undefined) {
    return {
      ok: false,
      error: createLegacyMissingVersionError(
        LEGACY_FRAME_FORMAT_ID,
        "Top-level schemaVersion is required; missing versions are not defaulted to current.",
      ),
      diagnostics: [
        createValidationIssue({
          code: "LEGACY_FRAME_VERSION_MISSING",
          severity: "error",
          message: "schemaVersion is required on ProjectModel inputs.",
          path: "/schemaVersion",
        }),
      ],
    };
  }

  if (
    !(SUPPORTED_PROJECT_MODEL_VERSIONS as readonly string[]).includes(
      classification.sourceVersion,
    )
  ) {
    return {
      ok: false,
      error: createLegacyUnsupportedVersionError(
        LEGACY_FRAME_FORMAT_ID,
        classification.sourceVersion,
        SUPPORTED_PROJECT_MODEL_VERSIONS,
      ),
      diagnostics,
    };
  }

  if (!isPlainLegacyObject(sourceCopy.project) || !isPlainLegacyObject(sourceCopy.units)) {
    return {
      ok: false,
      error: createLegacyInvalidShapeError(
        LEGACY_FRAME_FORMAT_ID,
        "project and units objects are required.",
      ),
      diagnostics,
    };
  }

  const projectInfo = sourceCopy.project;
  const projectId = requireNonEmptyString(projectInfo.id);
  if (projectId === undefined) {
    return {
      ok: false,
      error: createLegacyBrokenIdError(LEGACY_FRAME_FORMAT_ID, "/project/id"),
      diagnostics,
    };
  }

  const collections = {
    nodes: sourceCopy.nodes,
    materials: sourceCopy.materials,
    sections: sourceCopy.sections,
    members: sourceCopy.members,
    supports: sourceCopy.supports,
    loadCases: sourceCopy.loadCases,
    nodalLoads: sourceCopy.nodalLoads,
    memberLoads: sourceCopy.memberLoads,
    analysisSettings: sourceCopy.analysisSettings,
  };

  for (const [key, value] of Object.entries(collections)) {
    if (key === "analysisSettings") {
      if (!isPlainLegacyObject(value)) {
        return {
          ok: false,
          error: createLegacyInvalidShapeError(
            LEGACY_FRAME_FORMAT_ID,
            "analysisSettings must be an object.",
            "/analysisSettings",
          ),
          diagnostics,
        };
      }
      continue;
    }
    if (!Array.isArray(value)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          `${key} must be an array.`,
          `/${key}`,
        ),
        diagnostics,
      };
    }
  }

  const units = sourceCopy.units;
  const length = mapUnit(LENGTH_ALIASES, "units.length", units.length);
  const force = mapUnit(FORCE_ALIASES, "units.force", units.force);
  const moment = mapUnit(MOMENT_ALIASES, "units.moment", units.moment);
  const area = mapUnit(AREA_ALIASES, "units.area", units.area);
  const inertia = mapUnit(INERTIA_ALIASES, "units.inertia", units.inertia);
  const modulus = mapUnit(MODULUS_ALIASES, "units.modulus", units.modulus);

  for (const mapped of [
    ["units.length", length] as const,
    ["units.force", force] as const,
    ["units.moment", moment] as const,
    ["units.area", area] as const,
    ["units.inertia", inertia] as const,
    ["units.modulus", modulus] as const,
  ]) {
    const [field, result] = mapped;
    if (!result.ok) {
      return {
        ok: false,
        error: createLegacyAmbiguousUnitError(LEGACY_FRAME_FORMAT_ID, field, result.raw),
        diagnostics,
      };
    }
  }

  const nodeIdToUuid = new Map<string, UuidString>();
  const materialIdToUuid = new Map<string, UuidString>();
  const sectionIdToUuid = new Map<string, UuidString>();
  const memberIdToUuid = new Map<string, UuidString>();
  const loadCaseIdToUuid = new Map<string, UuidString>();

  const nodes: FrameNodeEntry[] = [];
  for (const [index, entry] of (collections.nodes as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Each node must be an object.",
          `/nodes/${index}`,
        ),
        diagnostics,
      };
    }
    const legacyId = requireNonEmptyString(entry.id);
    if (legacyId === undefined) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(LEGACY_FRAME_FORMAT_ID, `/nodes/${index}/id`),
        diagnostics,
      };
    }
    if (nodeIdToUuid.has(legacyId)) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(
          LEGACY_FRAME_FORMAT_ID,
          `/nodes/${index}/id`,
          `Duplicate node id "${legacyId}".`,
        ),
        diagnostics,
      };
    }
    if (!isFiniteNumber(entry.x) || !isFiniteNumber(entry.y) || !isFiniteNumber(entry.z)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Node coordinates must be finite numbers.",
          `/nodes/${index}`,
        ),
        diagnostics,
      };
    }
    const entityId = deriveStableUuid("legacy.frame.node", legacyId);
    nodeIdToUuid.set(legacyId, entityId);
    idMappings.push({ sourceId: legacyId, targetId: entityId, disposition: "committed" });
    nodes.push({
      entityId,
      coordinateContextId: deriveStableUuid("legacy.frame.coordinate-context", `${projectId}:crs`),
      x: entry.x,
      y: entry.y,
      z: entry.z,
    });
  }

  const contextId = deriveStableUuid("legacy.frame.coordinate-context", `${projectId}:crs`);
  for (let index = 0; index < nodes.length; index += 1) {
    nodes[index] = { ...nodes[index]!, coordinateContextId: contextId };
  }

  const materials: FrameMaterialEntry[] = [];
  const materialProps: Record<string, JsonValue> = {};
  for (const [index, entry] of (collections.materials as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Each material must be an object.",
          `/materials/${index}`,
        ),
        diagnostics,
      };
    }
    const legacyId = requireNonEmptyString(entry.id);
    const label = requireNonEmptyString(entry.name) ?? legacyId;
    if (legacyId === undefined) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(LEGACY_FRAME_FORMAT_ID, `/materials/${index}/id`),
        diagnostics,
      };
    }
    if (materialIdToUuid.has(legacyId)) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(
          LEGACY_FRAME_FORMAT_ID,
          `/materials/${index}/id`,
          `Duplicate material id "${legacyId}".`,
        ),
        diagnostics,
      };
    }
    const entityId = deriveStableUuid("legacy.frame.material", legacyId);
    materialIdToUuid.set(legacyId, entityId);
    idMappings.push({ sourceId: legacyId, targetId: entityId, disposition: "committed" });
    materials.push({ entityId, label: label! });
    const props = mapAsJsonValue({
      elasticModulus: entry.elasticModulus,
      shearModulus: entry.shearModulus,
      poissonRatio: entry.poissonRatio,
      density: entry.density,
    });
    if (props !== undefined) {
      materialProps[legacyId] = props;
    }
  }

  const sections: FrameSectionEntry[] = [];
  const sectionProps: Record<string, JsonValue> = {};
  for (const [index, entry] of (collections.sections as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Each section must be an object.",
          `/sections/${index}`,
        ),
        diagnostics,
      };
    }
    const legacyId = requireNonEmptyString(entry.id);
    const label = requireNonEmptyString(entry.name) ?? legacyId;
    if (legacyId === undefined) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(LEGACY_FRAME_FORMAT_ID, `/sections/${index}/id`),
        diagnostics,
      };
    }
    if (sectionIdToUuid.has(legacyId)) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(
          LEGACY_FRAME_FORMAT_ID,
          `/sections/${index}/id`,
          `Duplicate section id "${legacyId}".`,
        ),
        diagnostics,
      };
    }
    const entityId = deriveStableUuid("legacy.frame.section", legacyId);
    sectionIdToUuid.set(legacyId, entityId);
    idMappings.push({ sourceId: legacyId, targetId: entityId, disposition: "committed" });
    sections.push({ entityId, label: label! });
    const props = mapAsJsonValue({
      area: entry.area,
      iy: entry.iy,
      iz: entry.iz,
      j: entry.j,
    });
    if (props !== undefined) {
      sectionProps[legacyId] = props;
    }
  }

  const members: FrameMemberEntry[] = [];
  for (const [index, entry] of (collections.members as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Each member must be an object.",
          `/members/${index}`,
        ),
        diagnostics,
      };
    }
    const legacyId = requireNonEmptyString(entry.id);
    const nodeI = requireNonEmptyString(entry.nodeI);
    const nodeJ = requireNonEmptyString(entry.nodeJ);
    const materialId = requireNonEmptyString(entry.materialId);
    const sectionId = requireNonEmptyString(entry.sectionId);
    if (
      legacyId === undefined ||
      nodeI === undefined ||
      nodeJ === undefined ||
      materialId === undefined ||
      sectionId === undefined
    ) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(LEGACY_FRAME_FORMAT_ID, `/members/${index}`),
        diagnostics,
      };
    }
    if (memberIdToUuid.has(legacyId)) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(
          LEGACY_FRAME_FORMAT_ID,
          `/members/${index}/id`,
          `Duplicate member id "${legacyId}".`,
        ),
        diagnostics,
      };
    }
    const nodeIId = nodeIdToUuid.get(nodeI);
    const nodeJId = nodeIdToUuid.get(nodeJ);
    const materialUuid = materialIdToUuid.get(materialId);
    const sectionUuid = sectionIdToUuid.get(sectionId);
    if (nodeIId === undefined) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/members/${index}/nodeI`,
          nodeI,
        ),
        diagnostics,
      };
    }
    if (nodeJId === undefined) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/members/${index}/nodeJ`,
          nodeJ,
        ),
        diagnostics,
      };
    }
    if (materialUuid === undefined) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/members/${index}/materialId`,
          materialId,
        ),
        diagnostics,
      };
    }
    if (sectionUuid === undefined) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/members/${index}/sectionId`,
          sectionId,
        ),
        diagnostics,
      };
    }
    if (nodeIId === nodeJId) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Zero-length members (identical nodeI/nodeJ) are rejected.",
          `/members/${index}`,
        ),
        diagnostics,
      };
    }
    const entityId = deriveStableUuid("legacy.frame.member", legacyId);
    memberIdToUuid.set(legacyId, entityId);
    idMappings.push({ sourceId: legacyId, targetId: entityId, disposition: "committed" });
    members.push({
      entityId,
      nodeIId,
      nodeJId,
      materialId: materialUuid,
      sectionId: sectionUuid,
    });
  }

  const supports: FrameSupportEntry[] = [];
  const supportProps: Record<string, JsonValue> = {};
  for (const [index, entry] of (collections.supports as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Each support must be an object.",
          `/supports/${index}`,
        ),
        diagnostics,
      };
    }
    const nodeId = requireNonEmptyString(entry.nodeId);
    if (nodeId === undefined) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(LEGACY_FRAME_FORMAT_ID, `/supports/${index}/nodeId`),
        diagnostics,
      };
    }
    const nodeUuid = nodeIdToUuid.get(nodeId);
    if (nodeUuid === undefined) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/supports/${index}/nodeId`,
          nodeId,
        ),
        diagnostics,
      };
    }
    const entityId = deriveStableUuid("legacy.frame.support", `${projectId}:support:${nodeId}`);
    idMappings.push({
      sourceId: `support:${nodeId}`,
      targetId: entityId,
      disposition: "committed",
    });
    supports.push({
      entityId,
      nodeId: nodeUuid,
      label: `Support ${nodeId}`,
    });
    const props = mapAsJsonValue({
      ux: entry.ux,
      uy: entry.uy,
      uz: entry.uz,
      rx: entry.rx,
      ry: entry.ry,
      rz: entry.rz,
    });
    if (props !== undefined) {
      supportProps[nodeId] = props;
    }
  }

  const loadDefinitions: LoadDefinitionEntry[] = [];
  for (const [index, entry] of (collections.loadCases as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      return {
        ok: false,
        error: createLegacyInvalidShapeError(
          LEGACY_FRAME_FORMAT_ID,
          "Each load case must be an object.",
          `/loadCases/${index}`,
        ),
        diagnostics,
      };
    }
    const legacyId = requireNonEmptyString(entry.id);
    const label = requireNonEmptyString(entry.name) ?? legacyId;
    if (legacyId === undefined) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(LEGACY_FRAME_FORMAT_ID, `/loadCases/${index}/id`),
        diagnostics,
      };
    }
    if (loadCaseIdToUuid.has(legacyId)) {
      return {
        ok: false,
        error: createLegacyBrokenIdError(
          LEGACY_FRAME_FORMAT_ID,
          `/loadCases/${index}/id`,
          `Duplicate load case id "${legacyId}".`,
        ),
        diagnostics,
      };
    }
    const entityId = deriveStableUuid("legacy.frame.load-case", legacyId);
    loadCaseIdToUuid.set(legacyId, entityId);
    idMappings.push({ sourceId: legacyId, targetId: entityId, disposition: "committed" });
    loadDefinitions.push({
      entityId,
      label: label!,
      loadKind: classifyLoadKind(label!),
    });
  }

  for (const [index, entry] of (collections.nodalLoads as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      continue;
    }
    const loadCaseId = requireNonEmptyString(entry.loadCaseId);
    const nodeId = requireNonEmptyString(entry.nodeId);
    if (loadCaseId !== undefined && !loadCaseIdToUuid.has(loadCaseId)) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/nodalLoads/${index}/loadCaseId`,
          loadCaseId,
        ),
        diagnostics,
      };
    }
    if (nodeId !== undefined && !nodeIdToUuid.has(nodeId)) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/nodalLoads/${index}/nodeId`,
          nodeId,
        ),
        diagnostics,
      };
    }
  }

  for (const [index, entry] of (collections.memberLoads as unknown[]).entries()) {
    if (!isPlainLegacyObject(entry)) {
      continue;
    }
    const loadCaseId = requireNonEmptyString(entry.loadCaseId);
    const memberId = requireNonEmptyString(entry.memberId);
    if (loadCaseId !== undefined && !loadCaseIdToUuid.has(loadCaseId)) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/memberLoads/${index}/loadCaseId`,
          loadCaseId,
        ),
        diagnostics,
      };
    }
    if (memberId !== undefined && !memberIdToUuid.has(memberId)) {
      return {
        ok: false,
        error: createLegacyUnresolvedReferenceError(
          LEGACY_FRAME_FORMAT_ID,
          `/memberLoads/${index}/memberId`,
          memberId,
        ),
        diagnostics,
      };
    }
  }

  const analysisSettingsRaw = collections.analysisSettings as Record<string, unknown>;
  const solverFamily =
    typeof analysisSettingsRaw.solver === "string" && analysisSettingsRaw.solver.trim().length > 0
      ? analysisSettingsRaw.solver
      : typeof analysisSettingsRaw.analysisType === "string" &&
          analysisSettingsRaw.analysisType.trim().length > 0
        ? analysisSettingsRaw.analysisType
        : "legacy-project-model";

  const clock = options.clock ?? defaultLegacyAdapterClock();
  const createdAt = options.createdAt ?? clock.now();
  const documentId = deriveStableUuid("legacy.frame.document", projectId);
  idMappings.push({
    sourceId: projectId,
    targetId: documentId,
    disposition: "committed",
  });

  const settingsId = deriveStableUuid("legacy.frame.analysis-settings", `${projectId}:settings`);
  idMappings.push({
    sourceId: `${projectId}:settings`,
    targetId: settingsId,
    disposition: "committed",
  });

  const coordinateContext: CoordinateContext = {
    schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
    contextId,
    referenceType: "local",
    referenceName: "legacy-project-model-local",
    origin: { x: 0, y: 0, z: 0 },
    axisOrder: ["x", "y", "z"],
    axisDirections: { x: "+x", y: "+y", z: "+z" },
    handedness: "right",
    verticalAxis: "z",
    orientation: {
      rotations: [0, 0, 0],
      rotationOrder: "xyz",
      rotationConvention: "intrinsic",
    },
    transformToCanonical: {
      transformVersion: "legacy-project-model-unverified-v1",
      status: "unknown",
    },
    angleUnit: "rad",
    confidenceStatus: "unknown",
  };

  provenanceNotes.push({
    path: "/coordinateContexts/0",
    message:
      "Legacy ProjectModel has no explicit CRS; local context is emitted with confidenceStatus unknown.",
    code: "LEGACY_FRAME_CRS_UNKNOWN",
  });

  const unitContext: UnitContext = {
    schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
    contextId: deriveStableUuid("legacy.frame.unit-context", `${projectId}:units`),
    length: (length as { ok: true; value: LengthUnit }).value,
    angle: "rad",
    force: (force as { ok: true; value: ForceUnit }).value,
    moment: (moment as { ok: true; value: MomentUnit }).value,
    mass: "kg",
    temperature: "°C",
    stress: "MPa",
    area: (area as { ok: true; value: AreaUnit }).value,
    inertia: (inertia as { ok: true; value: InertiaUnit }).value,
    modulus: (modulus as { ok: true; value: ModulusUnit }).value,
    time: "s",
    conversionVersion: "legacy-project-model-unit-aliases-v1",
  };

  provenanceNotes.push({
    path: "/unitContext",
    message:
      "mass/temperature/stress/time are SI defaults because ProjectModel never persisted them; length/force/moment/area/inertia/modulus use evidenced alias mapping.",
    code: "LEGACY_FRAME_UNIT_DEFAULTS",
  });

  const mechanicsPayload = mapAsJsonValue({
    materials: materialProps,
    sections: sectionProps,
    supports: supportProps,
    nodalLoads: collections.nodalLoads,
    memberLoads: collections.memberLoads,
    analysisSettings: analysisSettingsRaw,
    massCases: sourceCopy.massCases,
    groundMotions: sourceCopy.groundMotions,
    analysisResults: sourceCopy.analysisResults,
  });
  if (mechanicsPayload === undefined) {
    return {
      ok: false,
      error: createLegacyInvalidShapeError(
        LEGACY_FRAME_FORMAT_ID,
        "Legacy mechanics payload contains non-JSON values.",
      ),
      diagnostics,
    };
  }

  const extensions: Extensions = {
    "spacer.legacy/project-model-mechanics": {
      json: mechanicsPayload,
    },
  };
  notes.push({
    jsonPointer: "/extensions/spacer.legacy~1project-model-mechanics",
    message:
      "Numeric material/section/support/load payloads are preserved in extensions; BridgeFrameAnalysisDocument v0.1.0 is an ID/label skeleton.",
    criticality: "critical",
  });

  const provenance: Provenance = {
    createdAt,
    createdBy: { actorId: LEGACY_FRAME_ADAPTER_ID, actorType: "tool" },
    producer: {
      toolId: LEGACY_FRAME_ADAPTER_ID,
      toolVersion: LEGACY_ADAPTER_VERSION,
      algorithmVersion: classification.sourceVersion,
    },
  };

  const validationRefId = deriveStableUuid(
    "legacy.frame.validation-ref",
    `${projectId}:validation`,
  );
  const placeholderChecksum = computeContentChecksum({
    documentKind: BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND,
    documentId,
    revisionId: 1,
  });

  const draftWithoutChecksum = {
    schemaId: BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
    schemaVersion: BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_VERSION,
    documentKind: BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND,
    documentId,
    revisionId: requireRevisionId(1),
    provenance,
    coordinateContexts: [coordinateContext],
    unitContext,
    structuralModel: {
      nodes,
      members,
      materials,
      sections,
      supports,
    },
    loadDefinitions,
    analysisSettings: {
      settingsId,
      solverFamily,
      settingsVersion: "0.1.0",
    },
    transferBindings: [],
    validation: {
      documentKind: "validation-result" as const,
      documentId: validationRefId,
      revisionId: requireRevisionId(1),
      contentChecksum: placeholderChecksum,
    },
    extensions,
    springsCapability: { state: "absent" as const },
  };

  const contentChecksum = computeContentChecksum(draftWithoutChecksum);
  const document: BridgeFrameAnalysisDocument = {
    ...draftWithoutChecksum,
    contentChecksum,
    revision: {
      schemaVersion: REVISION_METADATA_SCHEMA_VERSION,
      documentId,
      revisionId: requireRevisionId(1),
      createdAt,
      contentChecksum,
      reason: "legacy-frame-adapter",
      tool: {
        toolId: LEGACY_FRAME_ADAPTER_ID,
        toolVersion: LEGACY_ADAPTER_VERSION,
      },
    },
  };

  const validation = validateBridgeFrameAnalysisDocument(document);
  if (hasValidationErrors(validation)) {
    return {
      ok: false,
      error: createLegacyValidationFailedError(validation),
      diagnostics: [...diagnostics, ...validation.issues],
    };
  }

  return {
    ok: true,
    document,
    formatId: LEGACY_FRAME_FORMAT_ID,
    sourceVersion: classification.sourceVersion,
    adapterId: LEGACY_FRAME_ADAPTER_ID,
    adapterVersion: LEGACY_ADAPTER_VERSION,
    idMappings,
    diagnostics,
    unknownFieldNotes: notes,
    provenanceNotes,
  };
}

export function isLegacyFrameInput(raw: unknown): boolean {
  return classifyLegacyInput(raw).formatId === LEGACY_FRAME_FORMAT_ID;
}
