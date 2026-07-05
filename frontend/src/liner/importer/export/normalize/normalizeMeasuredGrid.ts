import type {
  MeasuredGridDraft,
  MeasuredGridLineDraft,
  MeasuredGridPointDraft,
  MeasuredGridSectionDraft,
} from "../../../schema/types";
import type { Bridge, GirderLineMaster, Point, Section } from "../../types";
import { createUniqueId } from "../../utils/importerUtils";
import type { NormalizationContext } from "./normalizationContext";

function isFiniteNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function resolveSectionStation(section: Section, ctx: NormalizationContext): number | null {
  const ref = section.stationingRef;
  const raw =
    ref.cumulativeDistance != null
      ? ref.cumulativeDistance
      : ref.stationValue != null
        ? ref.stationValue
        : null;
  if (raw == null) {
    return null;
  }
  return ctx.toNormalized(raw, `measuredGrid.sections.${section.id}.station`);
}

function resolveGirderLines(bridge: Bridge): GirderLineMaster[] {
  const primarySpan = bridge.spans[0];
  const lineSet =
    bridge.girderLineSets.find((set) => set.id === primarySpan?.girderLineSetId) ??
    bridge.girderLineSets[0];
  return [...(lineSet?.lines ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
}

function buildMeasuredGridLines(girderLines: GirderLineMaster[]): MeasuredGridLineDraft[] {
  return girderLines.map((line, index) => ({
    id: line.id,
    label: line.label,
    role: line.role,
    sortIndex: index,
  }));
}

function buildMeasuredGridSections(
  bridge: Bridge,
  ctx: NormalizationContext,
): MeasuredGridSectionDraft[] {
  const sections = [...bridge.sections]
    .map((section) => {
      const station = resolveSectionStation(section, ctx);
      if (station == null) {
        return null;
      }
      return {
        section,
        station,
      };
    })
    .filter((entry): entry is { section: Section; station: number } => entry != null)
    .sort((a, b) => a.station - b.station);

  return sections.map(({ section, station }, sortIndex) => ({
    id: section.id,
    label: section.title ?? section.sectionNo ?? section.id,
    station,
    sortIndex,
  }));
}

function buildMeasuredGridPoints(
  bridge: Bridge,
  ctx: NormalizationContext,
  sections: MeasuredGridSectionDraft[],
  lines: MeasuredGridLineDraft[],
): MeasuredGridPointDraft[] {
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const points: MeasuredGridPointDraft[] = [];

  for (const section of bridge.sections) {
    const sectionDraft = sectionById.get(section.id);
    if (!sectionDraft) {
      continue;
    }

    for (const point of section.points) {
      const line = lineById.get(point.girderLineId);
      if (!line) {
        continue;
      }

      const x = point.x.value;
      const y = point.y.value;
      const z = point.designElevation.value;
      const cumulativeWidth = point.cumulativeWidth.value;
      if (
        !isFiniteNumber(x) ||
        !isFiniteNumber(y) ||
        !isFiniteNumber(z) ||
        !isFiniteNumber(cumulativeWidth)
      ) {
        continue;
      }

      const station = resolveSectionStation(section, ctx);
      if (station == null) {
        continue;
      }

      points.push({
        id: point.id,
        sectionId: section.id,
        lineId: line.id,
        station,
        x,
        y,
        z,
        cumulativeWidth,
        sortIndex: line.sortIndex,
      });
    }
  }

  return points;
}

export function normalizeMeasuredGrid(
  bridge: Bridge,
  ctx: NormalizationContext,
): MeasuredGridDraft | undefined {
  const girderLines = resolveGirderLines(bridge);
  if (girderLines.length === 0 || bridge.sections.length === 0) {
    return undefined;
  }

  const lines = buildMeasuredGridLines(girderLines);
  const sections = buildMeasuredGridSections(bridge, ctx);
  if (sections.length === 0) {
    return undefined;
  }

  const points = buildMeasuredGridPoints(bridge, ctx, sections, lines);
  if (points.length === 0) {
    return undefined;
  }

  return {
    id: createUniqueId("measured-grid"),
    source: "importer.sectionPoints",
    sections,
    lines,
    points,
  };
}
