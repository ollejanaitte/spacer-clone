import type { LinerBridge } from "../../liner/importer/types";
import type {
  BridgeDefinition,
  BridgeDefinitionAlignmentRef,
  BridgeDefinitionCrossBeam,
  BridgeDefinitionDeck,
  BridgeDefinitionGirder,
  BridgeDefinitionSpan,
  BridgeDefinitionStation,
  BridgeDefinitionSuperstructure,
  BridgeDefinitionSupport,
} from "../types";
import {
  BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL,
} from "../types";
import type { GirderLineMaster, GirderLineRole, GirderLineSet, Span } from "../../liner/importer/types";

/** Options for deterministic LinerBridge → BridgeDefinition conversion. */
export interface LinerBridgeToBridgeDefinitionOptions {
  id?: string;
  name?: string;
  generatedAt?: string;
  schemaVersion?: string;
  coordinatePolicyId?: string;
  sourceDocumentId?: string;
}

const DEFAULT_BRIDGE_NAME = "LINER Bridge";
const DEFAULT_COORDINATE_POLICY_ID = "liner-bridge-local-default";
const DEFAULT_DECK_WIDTH_M = 10.0;
const DEFAULT_DECK_ID = "deck-default";
const DEFAULT_GENERATION_SETTINGS = {
  meshDivision: 4,
  meshDensity: "standard" as const,
};

/** Non-fatal adapter warnings for missing or incomplete LinerBridge data. */
export function validateLinerBridgeForBridgeDefinition(
  linerBridge: LinerBridge,
): string[] {
  const warnings: string[] = [];

  if (!linerBridge.id?.trim()) {
    warnings.push("LinerBridge.id is missing; adapter requires options.id as fallback.");
  }
  if (!linerBridge.name?.trim()) {
    warnings.push("LinerBridge.name is missing; default name will be used.");
  }
  if (linerBridge.spans.length === 0) {
    warnings.push("LinerBridge.spans is empty; adapter cannot produce BridgeDefinition.");
  }
  for (const span of linerBridge.spans) {
    if (!hasPositiveSpanLength(span)) {
      warnings.push(
        `Span "${span.id}" lacks a positive start/end station range; adapter cannot derive length.`,
      );
    }
  }
  if (!linerBridge.substructure) {
    warnings.push("LinerBridge.substructure is missing; supports and crossBeams will be empty.");
  }
  if (linerBridge.girderLineSets.length === 0) {
    warnings.push("LinerBridge.girderLineSets is empty; girders will be empty.");
  }
  if (!linerBridge.alignmentMetadata?.plan?.elements?.length) {
    warnings.push("LinerBridge.alignmentMetadata.plan is missing; alignmentRefs may be empty.");
  }
  if (!hasDeckWidthHint(linerBridge)) {
    warnings.push(
      "No deck width hint from substructure.widthChangePoints or sections; default deck width will be used.",
    );
  }
  if (!linerBridge.bridgeType) {
    warnings.push("LinerBridge.bridgeType is missing; superstructure params will omit bridgeType.");
  }
  if (linerBridge.sections.length === 0) {
    warnings.push("LinerBridge.sections is empty; station labels from sections are unavailable.");
  }

  return warnings;
}

/**
 * Converts an importer `LinerBridge` into a canonical `BridgeDefinition`.
 * Pure function — does not mutate input or generate non-deterministic values.
 */
export function createBridgeDefinitionFromLinerBridge(
  linerBridge: LinerBridge,
  options?: LinerBridgeToBridgeDefinitionOptions,
): BridgeDefinition {
  const warnings = validateLinerBridgeForBridgeDefinition(linerBridge);

  const id = resolveId(linerBridge, options);
  const name = resolveName(linerBridge, options);
  const schemaVersion =
    (options?.schemaVersion as BridgeDefinition["schemaVersion"] | undefined) ??
    BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL;

  if (linerBridge.spans.length === 0) {
    throw new Error(
      "createBridgeDefinitionFromLinerBridge: LinerBridge.spans must contain at least one span.",
    );
  }

  const spans = mapSpans(linerBridge.spans);
  if (spans.length === 0) {
    throw new Error(
      "createBridgeDefinitionFromLinerBridge: no span could be mapped with a positive length.",
    );
  }

  const alignmentRefs = mapAlignmentRefs(linerBridge, spans);
  const stations = mapStations(linerBridge, spans);
  const supports = mapSupports(linerBridge);
  const girders = mapGirders(linerBridge);
  const crossBeams = mapCrossBeams(linerBridge);
  const deck = mapDeck(linerBridge);
  const superstructure = mapSuperstructure(linerBridge);
  const generatedAt = options?.generatedAt;
  const metadataNotes = buildMetadataNotes(warnings);

  return {
    schemaVersion,
    id,
    name,
    source: {
      kind: "liner",
      linerModelId: options?.sourceDocumentId ?? linerBridge.id,
      importerBridgeId: linerBridge.id,
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
    crossBeams,
    bearings: [],
    deck,
    loads: [],
    generationSettings: { ...DEFAULT_GENERATION_SETTINGS },
    metadata: {
      ...(generatedAt ? { createdAt: generatedAt, updatedAt: generatedAt } : {}),
      ...(metadataNotes ? { notes: metadataNotes } : {}),
    },
  };
}

function resolveId(
  linerBridge: LinerBridge,
  options?: LinerBridgeToBridgeDefinitionOptions,
): string {
  const id = options?.id ?? linerBridge.id;
  if (!id?.trim()) {
    throw new Error(
      "createBridgeDefinitionFromLinerBridge: id is required via options.id or LinerBridge.id.",
    );
  }
  return id;
}

function resolveName(
  linerBridge: LinerBridge,
  options?: LinerBridgeToBridgeDefinitionOptions,
): string {
  const name = options?.name ?? linerBridge.name ?? DEFAULT_BRIDGE_NAME;
  if (!name.trim()) {
    return DEFAULT_BRIDGE_NAME;
  }
  return name;
}

function hasPositiveSpanLength(span: Span): boolean {
  if (span.startStation == null || span.endStation == null) {
    return false;
  }
  return span.endStation > span.startStation;
}

function mapSpans(spans: Span[]): BridgeDefinitionSpan[] {
  const mapped: BridgeDefinitionSpan[] = [];

  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index]!;
    if (!hasPositiveSpanLength(span)) {
      continue;
    }
    const startStation = span.startStation!;
    const endStation = span.endStation!;
    mapped.push({
      id: span.id,
      index: index + 1,
      startStation,
      endStation,
      length: endStation - startStation,
      ...(span.girderLineSetId ? { girderLineSetId: span.girderLineSetId } : {}),
    });
  }

  return mapped;
}

function mapAlignmentRefs(
  linerBridge: LinerBridge,
  spans: BridgeDefinitionSpan[],
): BridgeDefinitionAlignmentRef[] {
  const planElements = linerBridge.alignmentMetadata?.plan?.elements ?? [];
  if (planElements.length === 0) {
    return [];
  }

  const totalLengthFromPlan = planElements.reduce((sum, element) => sum + element.length, 0);
  const totalLength =
    totalLengthFromPlan > 0
      ? totalLengthFromPlan
      : spans.reduce((max, span) => Math.max(max, span.endStation), 0);

  const originStation = spans.length > 0 ? spans[0]!.startStation : 0;

  return [
    {
      alignmentId: `${linerBridge.id}-plan`,
      originStation,
      totalLength,
    },
  ];
}

function mapStations(
  linerBridge: LinerBridge,
  spans: BridgeDefinitionSpan[],
): BridgeDefinitionStation[] {
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
      role: span.index === 1 ? "origin" : "custom",
    });
    addStation({
      id: `${span.id}-end`,
      station: span.endStation,
      role: "custom",
    });
  }

  for (const support of linerBridge.substructure?.supports ?? []) {
    addStation({
      id: `station-support-${support.id}`,
      station: support.station,
      label: support.label,
      role: supportSubstructureRoleToStationRole(support.kind),
    });
  }

  for (const section of linerBridge.sections) {
    const stationValue = section.stationingRef.stationValue;
    if (stationValue == null) {
      continue;
    }
    addStation({
      id: `station-section-${section.id}`,
      station: stationValue,
      label: section.stationingRef.stationLabel ?? section.stationingRef.notation ?? undefined,
      cumulativeDistance: section.stationingRef.cumulativeDistance ?? undefined,
      role: "custom",
    });
  }

  return [...byKey.values()].sort((a, b) => a.station - b.station);
}

function supportSubstructureRoleToStationRole(
  kind: "abutment" | "pier" | "virtual_pier",
): BridgeDefinitionStation["role"] {
  if (kind === "pier" || kind === "virtual_pier") {
    return "pier";
  }
  return "custom";
}

function mapSupports(linerBridge: LinerBridge): BridgeDefinitionSupport[] {
  return (linerBridge.substructure?.supports ?? []).map((support) => ({
    id: support.id,
    station: support.station,
    kind: "custom" as const,
    substructureKind: support.kind,
    ...(support.skewAngleDeg != null ? { skewAngleDeg: support.skewAngleDeg } : {}),
  }));
}

function mapGirderRole(role?: GirderLineRole): BridgeDefinitionGirder["role"] {
  switch (role) {
    case "edge":
      return "edge";
    case "barrier":
      return "barrier";
    case "center":
    case "girder":
      return "main";
    default:
      return "custom";
  }
}

function mapGirders(linerBridge: LinerBridge): BridgeDefinitionGirder[] {
  const girders: BridgeDefinitionGirder[] = [];

  for (const lineSet of linerBridge.girderLineSets) {
    girders.push(...mapGirderLineSet(lineSet));
  }

  return girders;
}

function mapGirderLineSet(lineSet: GirderLineSet): BridgeDefinitionGirder[] {
  return lineSet.lines.map((line: GirderLineMaster) => ({
    id: line.id,
    label: line.label,
    role: mapGirderRole(line.role),
    offset: line.nominalOffset ?? 0,
    spanIds: [...lineSet.appliesToSpanIds],
  }));
}

function mapCrossBeams(linerBridge: LinerBridge): BridgeDefinitionCrossBeam[] {
  return (linerBridge.substructure?.crossBeams ?? []).map((crossBeam) => ({
    id: crossBeam.id,
    station: crossBeam.station,
  }));
}

function hasDeckWidthHint(linerBridge: LinerBridge): boolean {
  const widthPoints = linerBridge.substructure?.widthChangePoints ?? [];
  if (widthPoints.length > 0) {
    return true;
  }
  return linerBridge.sections.some((section) =>
    section.points.some(
      (point) =>
        point.cumulativeWidth.value != null &&
        point.cumulativeWidth.value > 0,
    ),
  );
}

function mapDeck(linerBridge: LinerBridge): BridgeDefinitionDeck {
  const widthFromSubstructure = deriveDeckWidthFromWidthPoints(linerBridge);
  if (widthFromSubstructure != null && widthFromSubstructure > 0) {
    return {
      id: DEFAULT_DECK_ID,
      width: widthFromSubstructure,
    };
  }

  const widthFromSections = deriveDeckWidthFromSections(linerBridge);
  if (widthFromSections != null && widthFromSections > 0) {
    return {
      id: DEFAULT_DECK_ID,
      width: widthFromSections,
    };
  }

  return {
    id: DEFAULT_DECK_ID,
    width: DEFAULT_DECK_WIDTH_M,
  };
}

function deriveDeckWidthFromWidthPoints(linerBridge: LinerBridge): number | null {
  const widthPoints = linerBridge.substructure?.widthChangePoints ?? [];
  if (widthPoints.length === 0) {
    return null;
  }
  const widths = widthPoints.map((point) => point.leftOffset + point.rightOffset);
  return Math.max(...widths);
}

function deriveDeckWidthFromSections(linerBridge: LinerBridge): number | null {
  let maxHalfWidth = 0;
  for (const section of linerBridge.sections) {
    for (const point of section.points) {
      const cumulativeWidth = point.cumulativeWidth.value;
      if (cumulativeWidth == null) {
        continue;
      }
      maxHalfWidth = Math.max(maxHalfWidth, Math.abs(cumulativeWidth));
    }
  }
  if (maxHalfWidth <= 0) {
    return null;
  }
  return maxHalfWidth * 2;
}

function mapSuperstructure(linerBridge: LinerBridge): BridgeDefinitionSuperstructure {
  const params: Record<string, unknown> = {};
  if (linerBridge.bridgeType) {
    params.linerBridgeType = linerBridge.bridgeType;
  }
  if (linerBridge.routeName) {
    params.routeName = linerBridge.routeName;
  }

  return {
    kind: "slab_girder_grid",
    ...(Object.keys(params).length > 0 ? { params } : {}),
  };
}

function buildMetadataNotes(warnings: string[]): string | undefined {
  if (warnings.length === 0) {
    return "Converted from LinerBridge (Phase 4.5 Step 3 adapter).";
  }
  return [
    "Converted from LinerBridge (Phase 4.5 Step 3 adapter).",
    "Warnings:",
    ...warnings.map((warning) => `- ${warning}`),
  ].join("\n");
}
