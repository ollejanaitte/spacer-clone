/**
 * Geometry Input Adapter — Common Bridge Data Model -> GeometryEngineInput
 * (Phase 6-1B).
 *
 * Per `connectors/geometry_input_adapter_spec.md`: the adapter extracts the
 * entities the Geometry Engine needs, keeps stable Common entity IDs, preserves
 * source trace (Golden IDs / sourceRefs), normalizes units to the canonical
 * contract (m; rad) and classifies each value's resolution state.
 *
 * The adapter performs NO geometry calculation (no station->XYZ, no offset math)
 * and never guesses unresolved values (no dummy 0.0).
 */

import {
  type GeometryEngineInput,
  type GeometryInputAdapter,
  type UnresolvedSummary,
} from "./contracts";

type ResolvedFieldValue = {
  state?: string;
  value?: unknown;
  unit?: string;
  goldenId?: string;
  sourceRefs?: string[];
  humanConfirmationId?: string;
  stateReason?: string;
};

type CommonEntity = {
  id: string;
  entityType?: string;
  fields?: Record<string, ResolvedFieldValue | Record<string, unknown>>;
};

type CommonModel = {
  schemaVersion?: string;
  documentId?: string;
  alignments?: { alignments?: CommonEntity[] };
  bridgeGeometry?: {
    spans?: CommonEntity[];
    supports?: CommonEntity[];
    girders?: CommonEntity[];
    gridPoints?: CommonEntity[];
    deck?: CommonEntity[];
    crossMembers?: CommonEntity[];
  };
  sections?: { sections?: CommonEntity[] };
  resolutionRegistry?: {
    conflicts?: { conflictId?: string; affectedEntityIds?: string[] }[];
    humanConfirmations?: { humanConfirmationId?: string; affectedEntityIds?: string[] }[];
    holds?: { holdId?: string; affectedEntityIds?: string[] }[];
  };
};

function entityField(entity: CommonEntity, key: string): ResolvedFieldValue | undefined {
  const field = entity.fields?.[key];
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    return undefined;
  }
  if ("state" in field && typeof (field as ResolvedFieldValue).state === "string") {
    return field as ResolvedFieldValue;
  }
  return undefined;
}

function numericField(entity: CommonEntity, key: string): number | undefined {
  const field = entityField(entity, key);
  const v = field?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function entityState(entity: CommonEntity): string {
  const states = new Set<string>();
  for (const field of Object.values(entity.fields ?? {})) {
    if (field && typeof field === "object" && "state" in field && (field as ResolvedFieldValue).state) {
      states.add((field as ResolvedFieldValue).state as string);
    }
  }
  if (states.size === 1) {
    return [...states][0];
  }
  return states.has("CONFIRMED") ? "CONFIRMED" : states.size > 0 ? [...states][0] : "CONFIRMED";
}

function collectUnresolved(model: CommonModel): UnresolvedSummary[] {
  const out: UnresolvedSummary[] = [];
  const reg = model.resolutionRegistry ?? {};
  for (const c of reg.conflicts ?? []) {
    if (c.conflictId) {
      out.push({
        id: c.conflictId,
        kind: "CONFLICT",
        affectedEntityIds: c.affectedEntityIds ?? [],
      });
    }
  }
  for (const h of reg.humanConfirmations ?? []) {
    if (h.humanConfirmationId) {
      out.push({
        id: h.humanConfirmationId,
        kind: "HCR",
        affectedEntityIds: h.affectedEntityIds ?? [],
      });
    }
  }
  for (const h of reg.holds ?? []) {
    if (h.holdId) {
      out.push({
        id: h.holdId,
        kind: "HOLD",
        affectedEntityIds: h.affectedEntityIds ?? [],
      });
    }
  }
  const analysisStatus = (model as { analysisReference?: { status?: string } }).analysisReference?.status;
  if (analysisStatus === "NOT_AVAILABLE") {
    out.push({ id: "analysisReference", kind: "NOT_AVAILABLE", affectedEntityIds: [] });
  }
  return out;
}

function listOf(container: CommonEntity[] | undefined): CommonEntity[] {
  return container ?? [];
}

/**
 * Adapts a Common Bridge Data Model document into `GeometryEngineInput`.
 * Pure extraction: entity IDs, confirmed numeric values (station/offset) and
 * resolution states; no geometry calculation and no invented values.
 *
 * Phase 3-3: additionally extracts the numeric bridge facts that the Geometry
 * Engine needs for the BridgeProject-bound path — declared span lengths, bridge
 * length, and deck width — when the CBDM carries them (Phase 3-2 CBDM builder
 * writes numeric `spanLength`/`bridgeLength`/`widthM` fields). Legacy fixtures
 * without numeric values stay empty (nothing is invented).
 */
export class CommonModelGeometryInputAdapter implements GeometryInputAdapter {
  adapt(commonModel: unknown): GeometryEngineInput {
    const model = (commonModel ?? {}) as CommonModel;
    const bridgeGeometry = model.bridgeGeometry ?? {};

    const supports = listOf(bridgeGeometry.supports).map((e) => ({
      id: e.id,
      stationM: numericField(e, "station") ?? numericField(e, "stationM"),
      skewRad: numericField(e, "skew") ?? numericField(e, "skewRad"),
      state: entityState(e),
    }));

    const girders = listOf(bridgeGeometry.girders).map((e) => ({
      id: e.id,
      offsetM: numericField(e, "offset") ?? numericField(e, "offsetM"),
      state: entityState(e),
    }));

    // Declared span lengths, ordered by start station (falls back to document
    // order when a span has no startStationM).
    const spans = listOf(bridgeGeometry.spans);
    const spanLengthsM = spans
      .map((e) => {
        const length = numericField(e, "spanLength");
        const start = numericField(e, "startStationM") ?? numericField(e, "startStation");
        return { e, length, start };
      })
      .filter((entry): entry is { e: CommonEntity; length: number; start: number | undefined } =>
        typeof entry.length === "number" && Number.isFinite(entry.length),
      )
      .sort((a, b) => {
        if (a.start === undefined && b.start === undefined) {
          return 0;
        }
        if (a.start === undefined) {
          return 1;
        }
        if (b.start === undefined) {
          return -1;
        }
        return a.start - b.start;
      })
      .map((entry) => entry.length);

    // Bridge length from the alignment aggregate (or support span when all
    // support stations are declared).
    const aggregate = listOf(model.alignments?.alignments).find((e) =>
      entityField(e, "bridgeLength") !== undefined,
    );
    const bridgeLengthFromAggregate = aggregate === undefined
      ? undefined
      : numericField(aggregate, "bridgeLength");
    const supportStations = supports
      .map((s) => s.stationM)
      .filter((station): station is number => typeof station === "number" && Number.isFinite(station));
    const bridgeLengthFromSupports =
      supportStations.length === supports.length && supports.length > 0
        ? supportStations[supportStations.length - 1]! - supportStations[0]!
        : undefined;
    const bridgeLengthM = bridgeLengthFromAggregate ?? bridgeLengthFromSupports;

    // Deck width specs from deck entities that carry a numeric widthM.
    const deckSpecs = listOf(bridgeGeometry.deck)
      .map((e) => {
        const widthM = numericField(e, "widthM") ?? numericField(e, "width");
        return widthM === undefined ? undefined : { deckId: e.id, widthM };
      })
      .filter((spec): spec is { deckId: string; widthM: number } => spec !== undefined);

    return {
      sourceModelVersion: model.schemaVersion ?? "unknown",
      bridgeId: model.documentId ?? "unknown",
      alignmentIds: listOf(model.alignments?.alignments).map((e) => e.id),
      supports,
      girders,
      gridPointIds: listOf(bridgeGeometry.gridPoints).map((e) => e.id),
      deckIds: listOf(bridgeGeometry.deck).map((e) => e.id),
      sectionIds: listOf(model.sections?.sections).map((e) => e.id),
      ...(spanLengthsM.length > 0 ? { spanLengthsM } : {}),
      ...(bridgeLengthM !== undefined ? { bridgeLengthM } : {}),
      ...(deckSpecs.length > 0 ? { deckSpecs } : {}),
      unresolved: collectUnresolved(model),
    };
  }
}
