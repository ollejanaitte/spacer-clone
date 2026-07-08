import type {
  BridgeLine,
  BridgeLoad,
  BridgeProject,
  CrossSection,
} from "../../bridge/types";
import { totalLength, yPositionsFor } from "../../bridge/BridgeWizardState";
import type {
  BridgeDefinition,
  BridgeDefinitionAlignmentRef,
  BridgeDefinitionGirder,
  BridgeDefinitionLoad,
  BridgeDefinitionSpan,
  BridgeDefinitionStation,
  BridgeDefinitionSupport,
} from "../types";
import { BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL } from "../types";

/** Options for deterministic BridgeProject → BridgeDefinition conversion. */
export interface BridgeProjectToBridgeDefinitionOptions {
  id?: string;
  name?: string;
  generatedAt?: string;
  schemaVersion?: string;
  sourceProjectId?: string;
  coordinatePolicyId?: string;
}

const DEFAULT_BRIDGE_NAME = "Bridge Project";
const DEFAULT_BRIDGE_ID = "bridge-project-default";
const DEFAULT_COORDINATE_POLICY_ID = "wizard-bridge-local-default";
const DEFAULT_DECK_ID = "deck-default";
const DEFAULT_DECK_WIDTH_M = 10.0;
const DEFAULT_LOAD_CASE_ID = "LC1";

/** Non-fatal adapter warnings for missing or incomplete BridgeProject data. */
export function validateBridgeProjectForBridgeDefinition(
  bridgeProject: BridgeProject,
): string[] {
  const warnings: string[] = [];

  if (!bridgeProject.id?.trim()) {
    warnings.push(
      "BridgeProject.id is missing; adapter requires options.id or deterministic fallback.",
    );
  }
  if (!bridgeProject.name?.trim()) {
    warnings.push("BridgeProject.name is missing; default name will be used.");
  }
  if (bridgeProject.spans.length === 0) {
    warnings.push("BridgeProject.spans is empty; adapter cannot produce BridgeDefinition.");
  }
  for (const span of bridgeProject.spans) {
    if (span.length <= 0) {
      warnings.push(`Span index ${span.index} has non-positive length.`);
    }
  }
  if (bridgeProject.lines.length === 0) {
    warnings.push(
      "BridgeProject.lines is empty; girders will be derived from crossSection only.",
    );
  }
  if (bridgeProject.loads.length === 0) {
    warnings.push("BridgeProject.loads is empty.");
  }
  if (!bridgeProject.generationSettings) {
    warnings.push("BridgeProject.generationSettings is missing; defaults will be used.");
  }
  if (!hasPositiveDeckWidth(bridgeProject.crossSection)) {
    warnings.push(
      "CrossSection yields no positive deck width; default deck width will be used.",
    );
  }

  return warnings;
}

/**
 * Converts a Bridge Wizard `BridgeProject` into a canonical `BridgeDefinition`.
 * Pure function — does not mutate input or generate non-deterministic values.
 */
export function createBridgeDefinitionFromBridgeProject(
  bridgeProject: BridgeProject,
  options?: BridgeProjectToBridgeDefinitionOptions,
): BridgeDefinition {
  const warnings = validateBridgeProjectForBridgeDefinition(bridgeProject);

  const id = resolveId(bridgeProject, options);
  const name = resolveName(bridgeProject, options);
  const schemaVersion =
    (options?.schemaVersion as BridgeDefinition["schemaVersion"] | undefined) ??
    BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL;

  if (bridgeProject.spans.length === 0) {
    throw new Error(
      "createBridgeDefinitionFromBridgeProject: BridgeProject.spans must contain at least one span.",
    );
  }

  const spans = mapSpans(bridgeProject.spans);
  if (spans.length === 0) {
    throw new Error(
      "createBridgeDefinitionFromBridgeProject: no span could be mapped with a positive length.",
    );
  }

  const spanIds = spans.map((span) => span.id);
  const bridgeLength = totalLength(bridgeProject.spans);
  const deck = mapDeck(bridgeProject.crossSection);
  const alignmentRefs = mapAlignmentRefs(bridgeProject, bridgeLength);
  const stations = mapStations(spans);
  const supports = mapSupports(spans);
  const girders = mapGirders(bridgeProject, spanIds);
  const loads = mapLoads(bridgeProject.loads, deck.id, bridgeProject.impactFactor);
  const generationSettings = mapGenerationSettings(bridgeProject.generationSettings);
  const superstructure = mapSuperstructure(bridgeProject);
  const generatedAt = options?.generatedAt;
  const metadataNotes = buildMetadataNotes(warnings);

  return {
    schemaVersion,
    id,
    name,
    source: {
      kind: "bridgeProject",
      bridgeProjectId: options?.sourceProjectId ?? bridgeProject.id ?? id,
    },
    coordinatePolicy: {
      policyId: options?.coordinatePolicyId ?? DEFAULT_COORDINATE_POLICY_ID,
      frame: "bridge-local",
      axisConvention: "x-longitudinal-y-transverse-z-up",
      units: { length: "m", angle: "deg" },
    },
    alignmentRefs,
    stations,
    spans,
    supports,
    superstructure,
    girders,
    crossBeams: [],
    bearings: [],
    deck,
    loads,
    generationSettings,
    metadata: {
      ...(generatedAt ? { createdAt: generatedAt, updatedAt: generatedAt } : {}),
      ...(metadataNotes ? { notes: metadataNotes } : {}),
    },
  };
}

function resolveId(
  bridgeProject: BridgeProject,
  options?: BridgeProjectToBridgeDefinitionOptions,
): string {
  const id = options?.id ?? bridgeProject.id ?? DEFAULT_BRIDGE_ID;
  if (!id.trim()) {
    throw new Error(
      "createBridgeDefinitionFromBridgeProject: id is required via options.id, BridgeProject.id, or deterministic fallback.",
    );
  }
  return id;
}

function resolveName(
  bridgeProject: BridgeProject,
  options?: BridgeProjectToBridgeDefinitionOptions,
): string {
  const name = options?.name ?? bridgeProject.name ?? DEFAULT_BRIDGE_NAME;
  if (!name.trim()) {
    return DEFAULT_BRIDGE_NAME;
  }
  return name;
}

function mapSpans(spans: BridgeProject["spans"]): BridgeDefinitionSpan[] {
  const mapped: BridgeDefinitionSpan[] = [];
  let cumulativeStation = 0;

  for (const span of spans) {
    if (span.length <= 0) {
      continue;
    }
    const startStation = cumulativeStation;
    const endStation = startStation + span.length;
    mapped.push({
      id: `span-${span.index}`,
      index: span.index,
      startStation,
      endStation,
      length: span.length,
    });
    cumulativeStation = endStation;
  }

  return mapped;
}

function mapAlignmentRefs(
  bridgeProject: BridgeProject,
  totalLen: number,
): BridgeDefinitionAlignmentRef[] {
  const referenceLines = bridgeProject.lines.filter((line) => line.type === "reference");
  if (referenceLines.length > 0) {
    const refLine = referenceLines[0]!;
    const lineLength = computeLineLongitudinalExtent(refLine);
    return [
      {
        alignmentId: `${bridgeProject.id || DEFAULT_BRIDGE_ID}-ref-${refLine.id}`,
        originStation: 0,
        totalLength: lineLength > 0 ? lineLength : totalLen,
      },
    ];
  }

  return [
    {
      alignmentId: `${bridgeProject.id || DEFAULT_BRIDGE_ID}-longitudinal`,
      originStation: 0,
      totalLength: totalLen,
    },
  ];
}

function computeLineLongitudinalExtent(line: BridgeLine): number {
  if (line.points.length === 0) {
    return 0;
  }
  const xs = line.points.map((point) => point[0]);
  return Math.max(...xs) - Math.min(...xs);
}

function mapStations(spans: BridgeDefinitionSpan[]): BridgeDefinitionStation[] {
  const byKey = new Map<string, BridgeDefinitionStation>();

  const addStation = (station: BridgeDefinitionStation) => {
    const key = `${station.station}:${station.id}`;
    if (!byKey.has(key)) {
      byKey.set(key, station);
    }
  };

  for (const span of spans) {
    addStation({
      id: `${span.id}-start`,
      station: span.startStation,
      role: span.index === 1 ? "origin" : "pier",
    });
    addStation({
      id: `${span.id}-end`,
      station: span.endStation,
      role: span.index === spans.length ? "custom" : "pier",
    });
  }

  return [...byKey.values()].sort((a, b) => a.station - b.station);
}

function mapSupports(spans: BridgeDefinitionSpan[]): BridgeDefinitionSupport[] {
  if (spans.length === 0) {
    return [];
  }

  const supports: BridgeDefinitionSupport[] = [
    {
      id: "support-start",
      station: spans[0]!.startStation,
      kind: "fixed",
      substructureKind: "abutment",
    },
  ];

  for (let index = 0; index < spans.length - 1; index += 1) {
    supports.push({
      id: `support-pier-${index + 1}`,
      station: spans[index]!.endStation,
      kind: "pinned",
      substructureKind: "pier",
    });
  }

  supports.push({
    id: "support-end",
    station: spans[spans.length - 1]!.endStation,
    kind: "pinned",
    substructureKind: "abutment",
  });

  return supports;
}

function mapGirders(bridgeProject: BridgeProject, spanIds: string[]): BridgeDefinitionGirder[] {
  const candidateLines = bridgeProject.lines.filter(
    (line) =>
      line.type === "traffic" || line.type === "load" || line.type === "reference",
  );

  if (candidateLines.length > 0) {
    return candidateLines.map((line) =>
      mapLineToGirder(line, spanIds, bridgeProject.generationSettings),
    );
  }

  return mapGirdersFromCrossSection(
    bridgeProject.crossSection,
    spanIds,
    bridgeProject.generationSettings,
  );
}

function mapLineToGirder(
  line: BridgeLine,
  spanIds: string[],
  generationSettings: BridgeProject["generationSettings"],
): BridgeDefinitionGirder {
  return {
    id: line.id,
    label: line.name,
    role: mapLineTypeToGirderRole(line.type),
    offset: lineTransverseOffset(line),
    spanIds: [...spanIds],
    ...(generationSettings.sectionId ? { sectionRefId: generationSettings.sectionId } : {}),
    ...(generationSettings.materialId ? { materialRefId: generationSettings.materialId } : {}),
  };
}

function mapLineTypeToGirderRole(lineType: BridgeLine["type"]): BridgeDefinitionGirder["role"] {
  switch (lineType) {
    case "traffic":
    case "load":
      return "main";
    case "reference":
      return "custom";
    default:
      return "custom";
  }
}

function lineTransverseOffset(line: BridgeLine): number {
  if (line.points.length === 0) {
    return 0;
  }
  const sum = line.points.reduce((acc, point) => acc + point[1], 0);
  return sum / line.points.length;
}

function mapGirdersFromCrossSection(
  crossSection: CrossSection,
  spanIds: string[],
  generationSettings: BridgeProject["generationSettings"],
): BridgeDefinitionGirder[] {
  const offsets = yPositionsFor(crossSection);
  if (offsets.length === 0) {
    return [];
  }

  const minOffset = offsets[0]!;
  const maxOffset = offsets[offsets.length - 1]!;

  return offsets.map((offset, index) => ({
    id: `girder-y-${index + 1}`,
    label: `G${index + 1}`,
    role: girderRoleForOffset(offset, minOffset, maxOffset),
    offset,
    spanIds: [...spanIds],
    ...(generationSettings.sectionId ? { sectionRefId: generationSettings.sectionId } : {}),
    ...(generationSettings.materialId ? { materialRefId: generationSettings.materialId } : {}),
  }));
}

function girderRoleForOffset(
  offset: number,
  minOffset: number,
  maxOffset: number,
): BridgeDefinitionGirder["role"] {
  if (offset === minOffset || offset === maxOffset) {
    return "edge";
  }
  return "main";
}

function hasPositiveDeckWidth(crossSection: CrossSection): boolean {
  const ys = yPositionsFor(crossSection);
  if (ys.length < 2) {
    return false;
  }
  return ys[ys.length - 1]! - ys[0]! > 0;
}

function mapDeck(crossSection: CrossSection): BridgeDefinition["deck"] {
  const ys = yPositionsFor(crossSection);
  const width = ys.length >= 2 ? ys[ys.length - 1]! - ys[0]! : 0;

  if (width > 0) {
    return {
      id: DEFAULT_DECK_ID,
      width,
    };
  }

  return {
    id: DEFAULT_DECK_ID,
    width: DEFAULT_DECK_WIDTH_M,
  };
}

function mapLoads(
  loads: BridgeLoad[],
  deckId: string,
  impactFactor: BridgeProject["impactFactor"],
): BridgeDefinitionLoad[] {
  return loads.map((load) => ({
    id: load.id,
    caseId: load.loadCaseId ?? DEFAULT_LOAD_CASE_ID,
    type: load.type,
    magnitude: load.magnitude,
    direction: load.direction,
    target: load.line_id
      ? { kind: "line" as const, refId: load.line_id }
      : { kind: "deck" as const, refId: deckId },
    ...(shouldApplyImpactFactor(load, impactFactor)
      ? { impactFactor: impactFactor.value }
      : {}),
  }));
}

function shouldApplyImpactFactor(
  load: BridgeLoad,
  impactFactor: BridgeProject["impactFactor"],
): boolean {
  if (impactFactor.value <= 0) {
    return false;
  }
  return load.type === "vehicle" || load.type === "distributed";
}

function mapGenerationSettings(
  settings: BridgeProject["generationSettings"],
): BridgeDefinition["generationSettings"] {
  return {
    meshDivision: settings?.mesh_division ?? 4,
    meshDensity: settings?.mesh_density ?? "standard",
    ...(settings?.girder_spacing_override != null
      ? { girderSpacingOverride: settings.girder_spacing_override }
      : {}),
    ...(settings?.materialId ? { defaultMaterialId: settings.materialId } : {}),
    ...(settings?.sectionId ? { defaultSectionId: settings.sectionId } : {}),
  };
}

function mapSuperstructure(bridgeProject: BridgeProject): BridgeDefinition["superstructure"] {
  const params: Record<string, unknown> = {
    crossSection: bridgeProject.crossSection,
  };
  if (bridgeProject.impactFactor) {
    params.impactFactor = bridgeProject.impactFactor;
  }
  if (bridgeProject.description) {
    params.description = bridgeProject.description;
  }

  return {
    kind: "slab_girder_grid",
    params,
  };
}

function buildMetadataNotes(warnings: string[]): string | undefined {
  if (warnings.length === 0) {
    return "Converted from BridgeProject (Phase 4.5 Step 4 adapter).";
  }
  return [
    "Converted from BridgeProject (Phase 4.5 Step 4 adapter).",
    "Warnings:",
    ...warnings.map((warning) => `- ${warning}`),
  ].join("\n");
}
