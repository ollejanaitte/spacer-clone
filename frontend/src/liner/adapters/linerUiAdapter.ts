import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import { evaluateElementEndState } from "../core/geometry/horizontal";
import type {
  AlignmentElement,
  CircularArcElement,
  ClothoidElement,
  LinearAlignment,
  StationDefinition,
  StationEquation,
  StraightElement,
} from "../core/types";
import type {
  AlignmentBundleDraft,
  CrossSectionOffsetLineDraft,
  CrossSectionTemplateDraft,
  CrossSlopeIntervalDraft,
  CrossSlopeDraft,
  CrossfallMode,
  LinerDrawingSettingsDraft,
  PierDraft,
  SpanDraft,
  VerticalAlignmentDraft,
  WidthChangePointDraft,
  HorizontalElementDraft,
  StationDefinitionDraft,
} from "../schema/types";
import {
  deriveLinerCenterlineId,
} from "./linerDomainDraftRoadDesignMapper";

export type LinerDraft = BuildIntermediateInput;
export type LinerDraftAlignmentElement = AlignmentElement;
export type LinerDraftUpdate = LinerDraft | ((current: LinerDraft) => LinerDraft);

export type LinerDraftSummary = {
  elementCount: number;
  offsetCount: number;
  totalDeclaredLength: number;
};

export type LinerAlignmentMetadataPatch = Partial<Pick<LinearAlignment, "id" | "linerModelId" | "coordinatePolicyId">>;

export type LinerDraftSettingsPatch = Partial<Pick<BuildIntermediateInput, "offsets" | "sampleInterval" | "z">>;

export type LinerStraightElementPatch = Partial<{
  id: string;
  length: number;
  startX: number;
  startY: number;
  azimuth: number;
}>;

export type LinerArcElementPatch = LinerStraightElementPatch &
  Partial<{
    radius: number;
    turn: "left" | "right";
  }>;

export type LinerClothoidElementPatch = LinerStraightElementPatch &
  Partial<{
    clothoidParameter: number;
    startRadius: number | null;
    endRadius: number | null;
    turn: "left" | "right";
  }>;

export type LinerAlignmentElementPatch = LinerStraightElementPatch &
  Partial<{
    radius: number;
    turn: "left" | "right";
    clothoidParameter: number;
    startRadius: number | null;
    endRadius: number | null;
  }>;

export type LinerStationEquationPatch = Partial<
  Pick<StationEquation, "id" | "physicalDistance" | "type" | "value" | "sortIndex">
>;

export function createDefaultVerticalAlignment(
  totalLength: number,
  z = 0,
  alignmentId?: string,
): VerticalAlignmentDraft {
  return {
    id: alignmentId ? `VA-${alignmentId}` : "VA-default",
    elements: [
      {
        type: "grade",
        id: "VG-default",
        startStation: 0,
        endStation: totalLength,
        startElevation: z,
        grade: 0,
        length: totalLength,
      },
    ],
  };
}

function offsetLinesFromOffsets(
  offsets: readonly number[],
  existingOffsetLines: readonly CrossSectionOffsetLineDraft[] = [],
  alignmentId?: string,
): CrossSectionOffsetLineDraft[] {
  return offsets.map((offset, index) => {
    const existingLine = existingOffsetLines[index];
    return {
      id: existingLine?.id ?? (alignmentId ? `OL-${alignmentId}-${index}` : `OL-${index}`),
      offset,
      elevation: existingLine?.elevation ?? 0,
      role: existingLine?.role ?? "custom",
      enabled: existingLine?.enabled ?? true,
      sortIndex: existingLine?.sortIndex ?? index,
      ...(existingLine?.baseLineId
        ? { baseLineId: existingLine.baseLineId }
        : alignmentId
          ? { baseLineId: deriveLinerCenterlineId(alignmentId) }
          : {}),
      ...(existingLine?.label ? { label: existingLine.label } : {}),
    };
  });
}

export function createDefaultCrossSectionTemplate(
  offsets: readonly number[] = [0],
  alignmentId?: string,
): CrossSectionTemplateDraft {
  return {
    id: alignmentId ? `CS-${alignmentId}` : "CS-default",
    name: "Default",
    offsetLines: offsetLinesFromOffsets(offsets, [], alignmentId),
  };
}

function toHorizontalElementDraft(element: AlignmentElement): HorizontalElementDraft {
  if (element.type === "straight") {
    return {
      type: "straight",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      length: element.length,
    };
  }
  if (element.type === "arc") {
    return {
      type: "arc",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      radius: element.radius,
      turn: element.turn,
      length: element.length,
    };
  }
  return {
    type: "clothoid",
    id: element.id,
    start: element.start,
    azimuth: element.azimuth,
    clothoidParameter: element.clothoidParameter,
    startRadius: element.startRadius,
    endRadius: element.endRadius,
    turn: element.turn ?? "left",
    length: element.length,
  };
}

function remapCrossSectionsForBundle(
  sections: readonly CrossSectionTemplateDraft[],
  bundleId: string,
): CrossSectionTemplateDraft[] {
  const centerlineId = deriveLinerCenterlineId(bundleId);
  return sections.map((section) => ({
    ...section,
    id: `CS-${bundleId}`,
    offsetLines: section.offsetLines.map((line, index) => ({
      ...line,
      id: `OL-${bundleId}-${index}`,
      baseLineId: centerlineId,
      enabled: line.enabled ?? true,
      sortIndex: line.sortIndex ?? index,
    })),
  }));
}

export function createAlignmentBundleFromDraft(
  draft: BuildIntermediateInput,
  bundleId?: string,
  name?: string,
  sortIndex = 0,
): AlignmentBundleDraft {
  const id = bundleId ?? draft.alignment.id;
  const totalLength = totalDraftLength(draft);
  const stationInterval = draft.sampleInterval ?? draft.stationDefinition.interval;
  const crossSections = draft.crossSections?.length
    ? id !== draft.alignment.id
      ? remapCrossSectionsForBundle(draft.crossSections, id)
      : structuredClone(draft.crossSections)
    : [createDefaultCrossSectionTemplate(draft.offsets ?? [0], id)];
  const defaultTemplate = crossSections[0];
  const offsetLines = defaultTemplate?.offsetLines ?? offsetLinesFromOffsets(draft.offsets ?? [0], [], id);
  const crossSectionTemplateIds = new Set(crossSections.map((section) => section.id));
  const gridDefinitions =
    draft.gridDefinitions?.length
    && draft.gridDefinitions.every((definition) =>
      crossSectionTemplateIds.has(definition.crossSectionTemplateId),
    )
      ? draft.gridDefinitions.map((definition) =>
          definition.crossSectionTemplateId === defaultTemplate?.id
            ? {
                ...definition,
                offsetLineIds: offsetLines.map((line) => line.id),
              }
            : definition,
        )
      : [
          {
            id: `GRID-${id}`,
            crossSectionTemplateId: defaultTemplate?.id ?? (id ? `CS-${id}` : "CS-default"),
            stationRange: { startPhysicalDistance: 0, endPhysicalDistance: totalLength },
            stationInterval,
            offsetLineIds: offsetLines.map((line) => line.id),
          },
        ];

  return {
    id,
    name: name ?? id,
    enabled: true,
    sortIndex,
    alignment: {
      id: draft.alignment.id,
      elements: draft.alignment.elements.map(toHorizontalElementDraft),
    },
    stationDefinition: structuredClone(draft.stationDefinition),
    verticalAlignment: structuredClone({
      ...(draft.verticalAlignment ?? createDefaultVerticalAlignment(totalLength, draft.z ?? 0, id)),
      id:
        draft.verticalAlignment?.id && id === draft.alignment.id
          ? draft.verticalAlignment.id
          : `VA-${id}`,
    }),
    crossSections: structuredClone(crossSections),
    ...(draft.crossSlopeIntervals?.length
      ? { crossSlopeIntervals: structuredClone(draft.crossSlopeIntervals) }
      : {}),
    gridDefinitions,
    spans: draft.spans?.length ? [...draft.spans] : [],
    piers: draft.piers?.length ? [...draft.piers] : [],
    ...(draft.widthChangePoints?.length
      ? { widthChangePoints: structuredClone(draft.widthChangePoints) }
      : {}),
  };
}

export function loadActiveBundleIntoDraft(
  draft: BuildIntermediateInput,
  bundle: AlignmentBundleDraft,
): BuildIntermediateInput {
  const defaultTemplate = bundle.crossSections[0];
  const offsets = defaultTemplate?.offsetLines.map((line) => line.offset) ?? [0];
  const gradeElement = bundle.verticalAlignment.elements.find((element) => element.type === "grade");
  const z = gradeElement?.type === "grade" ? gradeElement.startElevation : draft.z ?? 0;

  return {
    ...draft,
    alignment: {
      id: bundle.id,
      linerModelId: draft.alignment.linerModelId,
      coordinatePolicyId: draft.alignment.coordinatePolicyId,
      elements: bundle.alignment.elements.map((element) => {
        if (element.type === "straight") {
          return {
            type: "straight" as const,
            id: element.id,
            start: element.start,
            azimuth: element.azimuth,
            length: element.length,
          };
        }
        if (element.type === "arc") {
          return {
            type: "arc" as const,
            id: element.id,
            start: element.start,
            azimuth: element.azimuth,
            radius: element.radius,
            turn: element.turn,
            length: element.length,
          };
        }
        return {
          type: "clothoid" as const,
          id: element.id,
          start: element.start,
          azimuth: element.azimuth,
          clothoidParameter: element.clothoidParameter,
          startRadius: element.startRadius,
          endRadius: element.endRadius,
          turn: element.turn,
          length: element.length,
        };
      }),
    },
    stationDefinition: structuredClone(bundle.stationDefinition),
    verticalAlignment: structuredClone(bundle.verticalAlignment),
    crossSections: structuredClone(bundle.crossSections),
    crossSlopeIntervals: bundle.crossSlopeIntervals
      ? structuredClone(bundle.crossSlopeIntervals)
      : draft.crossSlopeIntervals,
    gridDefinitions: structuredClone(bundle.gridDefinitions),
    spans: bundle.spans.length ? [...bundle.spans] : undefined,
    piers: bundle.piers.length ? [...bundle.piers] : undefined,
    widthChangePoints: bundle.widthChangePoints?.length
      ? structuredClone(bundle.widthChangePoints)
      : undefined,
    offsets,
    z,
    activeAlignmentId: bundle.id,
    activeLineId: draft.activeLineId ?? deriveLinerCenterlineId(bundle.id),
    linerAlignments: draft.linerAlignments,
  };
}

export function syncActiveBundleToAlignments(draft: BuildIntermediateInput): BuildIntermediateInput {
  if (!draft.linerAlignments?.length) {
    return draft;
  }
  const activeId = draft.activeAlignmentId ?? draft.alignment.id;
  const updatedBundle = createAlignmentBundleFromDraft(
    draft,
    activeId,
    draft.linerAlignments.find((entry) => entry.id === activeId)?.name,
    draft.linerAlignments.find((entry) => entry.id === activeId)?.sortIndex ?? 0,
  );
  const existingBundle = draft.linerAlignments.find((entry) => entry.id === activeId);
  const activeBundle: AlignmentBundleDraft = {
    ...updatedBundle,
    enabled: existingBundle?.enabled ?? true,
    sortIndex: existingBundle?.sortIndex ?? 0,
    name: existingBundle?.name ?? updatedBundle.name,
  };
  return {
    ...draft,
    linerAlignments: draft.linerAlignments.map((bundle) =>
      bundle.id === activeId ? activeBundle : bundle,
    ),
    crossSections: activeBundle.crossSections,
    gridDefinitions: activeBundle.gridDefinitions,
    verticalAlignment: activeBundle.verticalAlignment,
    stationDefinition: activeBundle.stationDefinition,
    ...(activeBundle.spans.length ? { spans: activeBundle.spans } : { spans: undefined }),
    ...(activeBundle.piers.length ? { piers: activeBundle.piers } : { piers: undefined }),
    ...(activeBundle.crossSlopeIntervals?.length
      ? { crossSlopeIntervals: activeBundle.crossSlopeIntervals }
      : {}),
    ...(activeBundle.widthChangePoints?.length
      ? { widthChangePoints: activeBundle.widthChangePoints }
      : {}),
  };
}

function withActiveBundleSync(
  draft: BuildIntermediateInput,
  updater: (current: BuildIntermediateInput) => BuildIntermediateInput,
): BuildIntermediateInput {
  const next = updater(draft);
  return syncActiveBundleToAlignments(next);
}

export function switchActiveAlignment(
  draft: BuildIntermediateInput,
  alignmentId: string,
): BuildIntermediateInput {
  const synced = syncActiveBundleToAlignments(draft);
  const bundles = synced.linerAlignments ?? [];
  const target = bundles.find((entry) => entry.id === alignmentId);
  if (!target) {
    return synced;
  }
  const loaded = loadActiveBundleIntoDraft(synced, target);
  return {
    ...loaded,
    activeAlignmentId: alignmentId,
    activeLineId: deriveLinerCenterlineId(alignmentId),
    linerAlignments: bundles,
  };
}

export function setActiveLineId(draft: BuildIntermediateInput, lineId: string): BuildIntermediateInput {
  return withActiveBundleSync(draft, (current) => ({
    ...current,
    activeLineId: lineId,
  }));
}

function nextAlignmentBundleId(bundles: readonly AlignmentBundleDraft[]): string {
  const ids = new Set(bundles.map((bundle) => bundle.id));
  let index = bundles.length + 1;
  let candidate = `alignment-${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `alignment-${index}`;
  }
  return candidate;
}

export function addLinerAlignmentBundle(draft: BuildIntermediateInput): BuildIntermediateInput {
  const synced = syncActiveBundleToAlignments(draft);
  const bundles = synced.linerAlignments ?? [
    createAlignmentBundleFromDraft(synced, synced.alignment.id, synced.alignment.id, 0),
  ];
  const newId = nextAlignmentBundleId(bundles);
  const seed = createDefaultLinerDraft();
  const newBundle: AlignmentBundleDraft = {
    ...createAlignmentBundleFromDraft(
      {
        ...seed,
        crossSections: undefined,
        gridDefinitions: undefined,
      },
      newId,
      newId,
      bundles.length,
    ),
    id: newId,
    name: newId,
    sortIndex: bundles.length,
  };
  const nextBundles = [...bundles, newBundle];
  return switchActiveAlignment({ ...synced, linerAlignments: nextBundles }, newId);
}

export function removeLinerAlignmentBundle(
  draft: BuildIntermediateInput,
  alignmentId: string,
): BuildIntermediateInput {
  const synced = syncActiveBundleToAlignments(draft);
  const bundles = synced.linerAlignments ?? [];
  if (bundles.length <= 1) {
    return synced;
  }
  const nextBundles = bundles
    .filter((bundle) => bundle.id !== alignmentId)
    .map((bundle, index) => ({ ...bundle, sortIndex: index }));
  const wasActive = (synced.activeAlignmentId ?? synced.alignment.id) === alignmentId;
  const next: BuildIntermediateInput = {
    ...synced,
    linerAlignments: nextBundles,
    ...(wasActive
      ? {
          activeAlignmentId: undefined,
          activeLineId: undefined,
        }
      : {}),
  };
  if (wasActive) {
    return next;
  }
  return next;
}

export function renameLinerAlignmentBundle(
  draft: BuildIntermediateInput,
  alignmentId: string,
  name: string,
): BuildIntermediateInput {
  return withActiveBundleSync(draft, (current) => ({
    ...current,
    linerAlignments: (current.linerAlignments ?? []).map((bundle) =>
      bundle.id === alignmentId ? { ...bundle, name } : bundle,
    ),
  }));
}

export function setLinerAlignmentEnabled(
  draft: BuildIntermediateInput,
  alignmentId: string,
  enabled: boolean,
): BuildIntermediateInput {
  return withActiveBundleSync(draft, (current) => ({
    ...current,
    linerAlignments: (current.linerAlignments ?? []).map((bundle) =>
      bundle.id === alignmentId ? { ...bundle, enabled } : bundle,
    ),
  }));
}

export function reorderLinerAlignmentBundles(
  draft: BuildIntermediateInput,
  orderedIds: readonly string[],
): BuildIntermediateInput {
  const synced = syncActiveBundleToAlignments(draft);
  const bundleById = new Map((synced.linerAlignments ?? []).map((bundle) => [bundle.id, bundle]));
  const nextBundles = orderedIds
    .map((id, index) => {
      const bundle = bundleById.get(id);
      return bundle ? { ...bundle, sortIndex: index } : null;
    })
    .filter((bundle): bundle is AlignmentBundleDraft => bundle !== null);
  return { ...synced, linerAlignments: nextBundles };
}

export function listOffsetLinesForActiveAlignment(
  draft: BuildIntermediateInput,
): CrossSectionOffsetLineDraft[] {
  const template = draft.crossSections?.[0];
  if (!template) {
    return [];
  }
  return [...template.offsetLines].sort(
    (left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0),
  );
}

export function updateActiveAlignmentOffsetLines(
  draft: BuildIntermediateInput,
  offsetLines: readonly CrossSectionOffsetLineDraft[],
): BuildIntermediateInput {
  const template = draft.crossSections?.[0] ?? createDefaultCrossSectionTemplate(draft.offsets ?? [0], draft.alignment.id);
  return withActiveBundleSync(draft, (current) =>
    updateLinerCrossSectionTemplate(current, {
      ...template,
      offsetLines: offsetLines.map((line, index) => ({
        ...line,
        sortIndex: line.sortIndex ?? index,
        enabled: line.enabled ?? true,
      })),
    }),
  );
}

function totalDraftLength(draft: BuildIntermediateInput): number {
  return draft.alignment.elements.reduce((total, element) => total + element.length, 0);
}

function defaultCrossfallModeForSlope(valuePercent: number): CrossfallMode {
  if (valuePercent > 0) {
    return "one_way_right";
  }
  if (valuePercent < 0) {
    return "one_way_left";
  }
  return "flat";
}

export function createDefaultCrossSlopeInterval(
  draft: BuildIntermediateInput,
  patch: Partial<CrossSlopeIntervalDraft> = {},
): CrossSlopeIntervalDraft {
  const scalarSlope = draft.crossSections?.[0]?.crossSlope?.valuePercent ?? 0;
  const endPhysicalDistance = patch.endPhysicalDistance ?? totalDraftLength(draft);
  return {
    id: patch.id ?? `CF-${(draft.crossSlopeIntervals?.length ?? 0) + 1}`,
    startPhysicalDistance: patch.startPhysicalDistance ?? 0,
    endPhysicalDistance,
    mode: patch.mode ?? defaultCrossfallModeForSlope(scalarSlope),
    leftSlopePercent: patch.leftSlopePercent ?? scalarSlope,
    rightSlopePercent: patch.rightSlopePercent ?? scalarSlope,
    ...(patch.pivotDistance !== undefined ? { pivotDistance: patch.pivotDistance } : {}),
  };
}

export function createDefaultLinerDraft(): BuildIntermediateInput {
  const alignment: LinearAlignment = {
    id: "alignment-1",
    linerModelId: "liner-model-1",
    coordinatePolicyId: "global",
    elements: [
      {
        id: "S1",
        type: "straight",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 100,
      },
    ],
  };
  const offsets = [0];
  const totalLength = alignment.elements.reduce((total, element) => total + element.length, 0);
  const draft: BuildIntermediateInput = {
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    verticalAlignment: createDefaultVerticalAlignment(totalLength, 0, alignment.id),
    crossSections: [createDefaultCrossSectionTemplate(offsets, alignment.id)],
    offsets,
    sampleInterval: 10,
    z: 0,
  };

  const withIntervals = {
    ...draft,
    crossSlopeIntervals: [createDefaultCrossSlopeInterval(draft)],
    selectedCrossSectionStation: 0,
  };
  const bundle = createAlignmentBundleFromDraft(withIntervals, alignment.id, alignment.id, 0);
  return {
    ...withIntervals,
    linerAlignments: [bundle],
    activeAlignmentId: alignment.id,
    activeLineId: deriveLinerCenterlineId(alignment.id),
  };
}

export function updateLinerAlignmentMetadata(
  draft: BuildIntermediateInput,
  patch: LinerAlignmentMetadataPatch,
): BuildIntermediateInput {
  const nextAlignment = { ...draft.alignment, ...patch };
  if (patch.id !== undefined && patch.id.trim().length === 0) {
    return {
      ...draft,
      alignment: nextAlignment,
    };
  }

  return withActiveBundleSync(draft, (current) => {
    const activeId = current.activeAlignmentId ?? current.alignment.id;
    const renamed = patch.id !== undefined && patch.id !== activeId;
    const nextLinerAlignments = (current.linerAlignments ?? []).map((bundle) => {
      if (bundle.id !== activeId) {
        return bundle;
      }
      return renamed
        ? {
            ...bundle,
            id: patch.id!,
            name: bundle.name === activeId ? patch.id! : bundle.name,
            crossSections: remapCrossSectionsForBundle(bundle.crossSections, patch.id!),
            verticalAlignment: {
              ...bundle.verticalAlignment,
              id: `VA-${patch.id!}`,
            },
            gridDefinitions: bundle.gridDefinitions.map((definition) => ({
              ...definition,
              id: definition.id === `GRID-${activeId}` ? `GRID-${patch.id!}` : definition.id,
              crossSectionTemplateId: `CS-${patch.id!}`,
              offsetLineIds: remapCrossSectionsForBundle(bundle.crossSections, patch.id!)[0]?.offsetLines.map(
                (line) => line.id,
              ) ?? definition.offsetLineIds,
            })),
          }
        : bundle;
    });
    return {
      ...current,
      alignment: nextAlignment,
      activeAlignmentId: patch.id ?? activeId,
      ...(renamed ? { activeLineId: deriveLinerCenterlineId(patch.id!) } : {}),
      linerAlignments: nextLinerAlignments,
    };
  });
}

export function updateLinerStationDefinition(
  draft: BuildIntermediateInput,
  patch: Partial<StationDefinition>,
): BuildIntermediateInput {
  return withActiveBundleSync(draft, (current) => ({
    ...current,
    stationDefinition: {
      ...current.stationDefinition,
      ...patch,
    },
  }));
}

export function updateLinerDraftSettings(
  draft: BuildIntermediateInput,
  patch: LinerDraftSettingsPatch,
): BuildIntermediateInput {
  const nextDraft: BuildIntermediateInput = {
    ...draft,
    ...patch,
  };
  if (patch.offsets === undefined) {
    return nextDraft;
  }

  const alignmentId = draft.activeAlignmentId ?? draft.alignment.id;
  const currentTemplates = draft.crossSections?.length
    ? draft.crossSections
    : [createDefaultCrossSectionTemplate(draft.offsets ?? [0], alignmentId)];
  const firstTemplate = currentTemplates[0] ?? createDefaultCrossSectionTemplate(patch.offsets, alignmentId);
  return {
    ...nextDraft,
    crossSections: [
      {
        ...firstTemplate,
        offsetLines: offsetLinesFromOffsets(patch.offsets, firstTemplate.offsetLines, alignmentId),
      },
      ...currentTemplates.slice(1),
    ],
  };
}

export function updateLinerVerticalAlignment(
  draft: BuildIntermediateInput,
  verticalAlignment: VerticalAlignmentDraft,
): BuildIntermediateInput {
  const firstGrade = verticalAlignment.elements.find((element) => element.type === "grade");
  return {
    ...draft,
    verticalAlignment,
    z: firstGrade?.type === "grade" ? firstGrade.startElevation : draft.z,
  };
}

export function updateLinerCrossSectionTemplate(
  draft: BuildIntermediateInput,
  template: CrossSectionTemplateDraft,
  templateIndex = 0,
): BuildIntermediateInput {
  const currentTemplates = draft.crossSections?.length
    ? draft.crossSections
    : [createDefaultCrossSectionTemplate(draft.offsets ?? [0])];
  const nextTemplates = currentTemplates.map((currentTemplate, index) =>
    index === templateIndex ? template : currentTemplate,
  );
  if (templateIndex >= nextTemplates.length) {
    nextTemplates.push(template);
  }

  return {
    ...draft,
    crossSections: nextTemplates,
    offsets: nextTemplates[0]?.offsetLines.map((line) => line.offset) ?? draft.offsets,
  };
}

export function updateLinerCrossSlope(
  draft: BuildIntermediateInput,
  crossSlope: CrossSlopeDraft | undefined,
  templateIndex = 0,
): BuildIntermediateInput {
  const currentTemplates = draft.crossSections?.length
    ? draft.crossSections
    : [createDefaultCrossSectionTemplate(draft.offsets ?? [0])];
  const targetTemplate =
    currentTemplates[templateIndex] ?? createDefaultCrossSectionTemplate(draft.offsets ?? [0]);
  const nextTemplate: CrossSectionTemplateDraft = {
    ...targetTemplate,
    crossSlope,
  };
  if (crossSlope === undefined) {
    delete nextTemplate.crossSlope;
  }
  return updateLinerCrossSectionTemplate(draft, nextTemplate, templateIndex);
}

export function updateLinerCrossSlopeIntervals(
  draft: BuildIntermediateInput,
  crossSlopeIntervals: readonly CrossSlopeIntervalDraft[],
): BuildIntermediateInput {
  return {
    ...draft,
    ...(crossSlopeIntervals.length > 0
      ? { crossSlopeIntervals: [...crossSlopeIntervals] }
      : { crossSlopeIntervals: undefined }),
  };
}

export function createDefaultWidthChangePoint(
  draft: BuildIntermediateInput,
  patch: Partial<WidthChangePointDraft> = {},
): WidthChangePointDraft {
  return {
    id: patch.id ?? `WP-${(draft.widthChangePoints?.length ?? 0) + 1}`,
    physicalDistance: patch.physicalDistance ?? 0,
    leftOffset: patch.leftOffset ?? 0,
    rightOffset: patch.rightOffset ?? 0,
  };
}

export function updateLinerWidthChangePoints(
  draft: BuildIntermediateInput,
  widthChangePoints: readonly WidthChangePointDraft[],
): BuildIntermediateInput {
  return {
    ...draft,
    ...(widthChangePoints.length > 0
      ? { widthChangePoints: [...widthChangePoints] }
      : { widthChangePoints: undefined }),
  };
}

export function updateLinerSelectedCrossSectionStation(
  draft: BuildIntermediateInput,
  selectedCrossSectionStation: number | undefined,
): BuildIntermediateInput {
  return {
    ...draft,
    ...(Number.isFinite(selectedCrossSectionStation)
      ? { selectedCrossSectionStation }
      : { selectedCrossSectionStation: undefined }),
  };
}

export function createDefaultPier(
  draft: BuildIntermediateInput,
  patch: Partial<PierDraft> = {},
): PierDraft {
  const piers = draft.piers ?? [];
  return {
    id: patch.id ?? nextPierId(piers),
    physicalDistance: patch.physicalDistance ?? piers.at(-1)?.physicalDistance ?? 0,
    kind: patch.kind ?? "pier",
    ...(patch.skewAngleRad !== undefined ? { skewAngleRad: patch.skewAngleRad } : {}),
    ...(patch.bearingOffsets !== undefined ? { bearingOffsets: patch.bearingOffsets } : {}),
  };
}

export function createDefaultSpan(
  draft: BuildIntermediateInput,
  patch: Partial<SpanDraft> = {},
): SpanDraft {
  const spans = draft.spans ?? [];
  const totalLength = totalDraftLength(draft);
  const lastSpan = spans.at(-1);
  const startPhysicalDistance =
    patch.startPhysicalDistance ?? lastSpan?.endPhysicalDistance ?? 0;
  const endPhysicalDistance = patch.endPhysicalDistance ?? totalLength;
  return {
    id: patch.id ?? nextSpanId(spans),
    startPhysicalDistance,
    endPhysicalDistance,
    ...(patch.pierIdStart !== undefined ? { pierIdStart: patch.pierIdStart } : {}),
    ...(patch.pierIdEnd !== undefined ? { pierIdEnd: patch.pierIdEnd } : {}),
  };
}

export function updateLinerPiers(
  draft: BuildIntermediateInput,
  piers: readonly PierDraft[],
): BuildIntermediateInput {
  return withActiveBundleSync(draft, (current) => ({
    ...current,
    ...(piers.length > 0 ? { piers: [...piers] } : { piers: undefined }),
  }));
}

export function updateLinerSpans(
  draft: BuildIntermediateInput,
  spans: readonly SpanDraft[],
): BuildIntermediateInput {
  return withActiveBundleSync(draft, (current) => ({
    ...current,
    ...(spans.length > 0 ? { spans: [...spans] } : { spans: undefined }),
  }));
}

export function updateLinerDrawingSettings(
  draft: BuildIntermediateInput,
  drawingSettings: LinerDrawingSettingsDraft | undefined,
): BuildIntermediateInput {
  return {
    ...draft,
    ...(drawingSettings ? { drawingSettings: structuredClone(drawingSettings) } : { drawingSettings: undefined }),
  };
}

export function updateLinerAlignmentElement(
  draft: BuildIntermediateInput,
  targetElementId: string,
  patch: LinerAlignmentElementPatch,
): BuildIntermediateInput {
  return withActiveBundleSync(draft, (current) => ({
    ...current,
    alignment: {
      ...current.alignment,
      elements: current.alignment.elements.map((element): AlignmentElement => {
        if (element.id !== targetElementId) {
          return element;
        }

        const nextStart = {
          x: patch.startX ?? element.start.x,
          y: patch.startY ?? element.start.y,
        };
        const nextId = patch.id ?? element.id;
        const nextLength = patch.length ?? element.length;
        const nextAzimuth = patch.azimuth ?? element.azimuth;

        if (element.type === "straight") {
          return {
            ...element,
            id: nextId,
            length: nextLength,
            start: nextStart,
            azimuth: nextAzimuth,
          };
        }

        if (element.type === "arc") {
          return {
            ...element,
            id: nextId,
            length: nextLength,
            start: nextStart,
            azimuth: nextAzimuth,
            radius: patch.radius ?? element.radius,
            turn: patch.turn ?? element.turn,
          };
        }

        return {
          ...element,
          id: nextId,
          length: nextLength,
          start: nextStart,
          azimuth: nextAzimuth,
          clothoidParameter: patch.clothoidParameter ?? element.clothoidParameter,
          startRadius: patch.startRadius !== undefined ? patch.startRadius : element.startRadius,
          endRadius: patch.endRadius !== undefined ? patch.endRadius : element.endRadius,
          turn: patch.turn ?? element.turn,
        };
      }),
    },
  }));
}

export function updateLinerAlignmentElementAtIndex(
  draft: BuildIntermediateInput,
  targetElementIndex: number,
  patch: LinerAlignmentElementPatch,
): BuildIntermediateInput {
  const target = draft.alignment.elements[targetElementIndex];
  if (!target) {
    return draft;
  }
  return updateLinerAlignmentElement(draft, target.id, patch);
}

export function updateLinerStraightElement(
  draft: BuildIntermediateInput,
  targetElementId: string,
  patch: LinerStraightElementPatch,
): BuildIntermediateInput {
  return updateLinerAlignmentElement(draft, targetElementId, patch);
}

export function addLinerExplicitStation(draft: BuildIntermediateInput): BuildIntermediateInput {
  const explicitStations = draft.stationDefinition.explicitStations ?? [];

  return updateLinerStationDefinition(draft, {
    explicitStations: [...explicitStations, 0],
  });
}

export function updateLinerExplicitStation(
  draft: BuildIntermediateInput,
  index: number,
  physicalDistance: number,
): BuildIntermediateInput {
  const explicitStations = draft.stationDefinition.explicitStations ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= explicitStations.length) {
    return draft;
  }

  return updateLinerStationDefinition(draft, {
    explicitStations: explicitStations.map((station, stationIndex) =>
      stationIndex === index ? physicalDistance : station,
    ),
  });
}

export function removeLinerExplicitStation(draft: BuildIntermediateInput, index: number): BuildIntermediateInput {
  const explicitStations = draft.stationDefinition.explicitStations ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= explicitStations.length) {
    return draft;
  }

  return updateLinerStationDefinition(draft, {
    explicitStations: explicitStations.filter((_, stationIndex) => stationIndex !== index),
  });
}

export function addLinerStationEquation(draft: BuildIntermediateInput): BuildIntermediateInput {
  const equations = draft.stationDefinition.equations ?? [];
  const sortIndex = equations.length + 1;
  const nextEquation: StationEquation = {
    id: nextStationEquationId(equations),
    physicalDistance: 0,
    type: "add_constant",
    value: 0,
    sortIndex,
  };

  return updateLinerStationDefinition(draft, {
    equations: [...equations, nextEquation],
  });
}

export function updateLinerStationEquation(
  draft: BuildIntermediateInput,
  targetEquationId: string,
  patch: LinerStationEquationPatch,
): BuildIntermediateInput {
  const equations = draft.stationDefinition.equations ?? [];

  return updateLinerStationDefinition(draft, {
    equations: equations.map((equation) =>
      equation.id === targetEquationId
        ? {
            ...equation,
            ...patch,
          }
        : equation,
    ),
  });
}

export function removeLinerStationEquation(
  draft: BuildIntermediateInput,
  targetEquationId: string,
): BuildIntermediateInput {
  const equations = draft.stationDefinition.equations ?? [];

  return updateLinerStationDefinition(draft, {
    equations: equations.filter((equation) => equation.id !== targetEquationId),
  });
}

export function addLinerOffset(draft: BuildIntermediateInput): BuildIntermediateInput {
  const offsets = draft.offsets ?? [];
  return syncActiveBundleToAlignments(
    updateLinerDraftSettings(draft, { offsets: [...offsets, 0] }),
  );
}

export function updateLinerOffset(draft: BuildIntermediateInput, index: number, value: number): BuildIntermediateInput {
  const offsets = draft.offsets ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= offsets.length) {
    return draft;
  }

  return updateLinerDraftSettings(draft, {
    offsets: offsets.map((offset, offsetIndex) => (offsetIndex === index ? value : offset)),
  });
}

export function removeLinerOffset(draft: BuildIntermediateInput, index: number): BuildIntermediateInput {
  const offsets = draft.offsets ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= offsets.length || offsets.length <= 1) {
    return draft;
  }

  return updateLinerDraftSettings(draft, {
    offsets: offsets.filter((_, offsetIndex) => offsetIndex !== index),
  });
}

export function addLinerStraightElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const elements = draft.alignment.elements;
  const lastElement = elements[elements.length - 1];
  const endState = lastElement ? evaluateElementEndState(lastElement) : null;
  const nextElement: StraightElement = {
    id: nextAlignmentElementId("S", elements),
    type: "straight",
    start: endState?.point ?? { x: 0, y: 0 },
    azimuth: endState?.azimuth ?? 0,
    length: 50,
  };

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: [...draft.alignment.elements, nextElement],
    },
  };
}

export function addLinerArcElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const elements = draft.alignment.elements;
  const lastElement = elements[elements.length - 1];
  const endState = lastElement ? evaluateElementEndState(lastElement) : null;
  const nextElement: CircularArcElement = {
    id: nextAlignmentElementId("A", elements),
    type: "arc",
    start: endState?.point ?? { x: 0, y: 0 },
    azimuth: endState?.azimuth ?? 0,
    radius: endState?.endRadius ?? 100,
    turn: endState?.turnDirection ?? "left",
    length: 50,
  };

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: [...draft.alignment.elements, nextElement],
    },
  };
}

export function addLinerClothoidElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const elements = draft.alignment.elements;
  const lastElement = elements[elements.length - 1];
  const endState = lastElement ? evaluateElementEndState(lastElement) : null;
  const nextElement: ClothoidElement = {
    id: nextAlignmentElementId("C", elements),
    type: "clothoid",
    start: endState?.point ?? { x: 0, y: 0 },
    azimuth: endState?.azimuth ?? 0,
    clothoidParameter: 100,
    startRadius: endState?.endRadius ?? null,
    endRadius: 100,
    turn: endState?.turnDirection ?? "left",
    length: 50,
  };

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: [...draft.alignment.elements, nextElement],
    },
  };
}

export function removeLinerAlignmentElement(
  draft: BuildIntermediateInput,
  targetElementId: string,
): BuildIntermediateInput {
  if (draft.alignment.elements.length <= 1) {
    return draft;
  }

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: draft.alignment.elements.filter((element) => element.id !== targetElementId),
    },
  };
}

export function removeLinerAlignmentElementAtIndex(
  draft: BuildIntermediateInput,
  targetElementIndex: number,
): BuildIntermediateInput {
  if (draft.alignment.elements.length <= 1) {
    return draft;
  }
  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: draft.alignment.elements.filter((_, elementIndex) => elementIndex !== targetElementIndex),
    },
  };
}

export function summarizeLinerDraft(draft: BuildIntermediateInput): LinerDraftSummary {
  return {
    elementCount: draft.alignment.elements.length,
    offsetCount: draft.offsets?.length ?? 0,
    totalDeclaredLength: draft.alignment.elements.reduce((total, element) => total + element.length, 0),
  };
}

function nextAlignmentElementId(prefix: string, elements: readonly AlignmentElement[]): string {
  const ids = new Set(elements.map((element) => element.id));
  let index = elements.length + 1;
  let candidate = `${prefix}${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `${prefix}${index}`;
  }
  return candidate;
}

function nextStationEquationId(equations: readonly StationEquation[]): string {
  const ids = new Set(equations.map((equation) => equation.id));
  let index = equations.length + 1;
  let candidate = `EQ${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `EQ${index}`;
  }
  return candidate;
}

function nextPierId(piers: readonly PierDraft[]): string {
  const ids = new Set(piers.map((pier) => pier.id));
  let index = piers.length + 1;
  let candidate = `P${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `P${index}`;
  }
  return candidate;
}

function nextSpanId(spans: readonly SpanDraft[]): string {
  const ids = new Set(spans.map((span) => span.id));
  let index = spans.length + 1;
  let candidate = `SP${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `SP${index}`;
  }
  return candidate;
}
