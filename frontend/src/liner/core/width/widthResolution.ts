import { createIssue, LINER_DIAGNOSTIC_CODES } from "../diagnostics";
import { DEFAULT_TOLERANCES } from "../tolerances";
import type { ValidationIssue } from "../types";
import type {
  CrossSectionOffsetLineDraft,
  CrossSectionTemplateDraft,
  WidthChangePointDraft,
} from "../../schema/types";

export type ResolvedWidthExtents = {
  leftHalfWidth: number;
  rightHalfWidth: number;
  source: "template" | "width_change_point";
  widthChangePointId?: string;
};

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= DEFAULT_TOLERANCES.station;
}

function sortedWidthChangePoints(
  points: readonly WidthChangePointDraft[],
): WidthChangePointDraft[] {
  return [...points].sort((left, right) => {
    if (left.physicalDistance !== right.physicalDistance) {
      return left.physicalDistance - right.physicalDistance;
    }
    return left.id.localeCompare(right.id);
  });
}

function laneOffsetLines(
  template: CrossSectionTemplateDraft,
): readonly CrossSectionOffsetLineDraft[] {
  const laneLines = template.offsetLines.filter((line) => line.role === "lane");
  if (laneLines.length > 0) {
    return laneLines;
  }
  const edgeLines = template.offsetLines.filter((line) => line.role === "edge");
  if (edgeLines.length > 0) {
    return edgeLines;
  }
  return template.offsetLines;
}

export function deriveTemplateLaneExtents(
  template: CrossSectionTemplateDraft | undefined,
): ResolvedWidthExtents {
  if (!template || template.offsetLines.length === 0) {
    return {
      leftHalfWidth: 0,
      rightHalfWidth: 0,
      source: "template",
    };
  }

  const offsets = laneOffsetLines(template)
    .map((line) => line.offset)
    .filter((offset) => Number.isFinite(offset));
  if (offsets.length === 0) {
    return {
      leftHalfWidth: 0,
      rightHalfWidth: 0,
      source: "template",
    };
  }

  const negativeOffsets = offsets.filter((offset) => offset < -DEFAULT_TOLERANCES.offset);
  const positiveOffsets = offsets.filter((offset) => offset > DEFAULT_TOLERANCES.offset);
  const leftHalfWidth = negativeOffsets.length > 0
    ? Math.max(...negativeOffsets.map((offset) => Math.abs(offset)))
    : 0;
  const rightHalfWidth = positiveOffsets.length > 0
    ? Math.max(...positiveOffsets)
    : 0;

  return {
    leftHalfWidth,
    rightHalfWidth,
    source: "template",
  };
}

export function validateWidthChangePoints(
  points: readonly WidthChangePointDraft[] | undefined,
  totalLength: number,
): ValidationIssue[] {
  if (!points || points.length === 0) {
    return [];
  }

  const issues: ValidationIssue[] = [];
  const ordered = sortedWidthChangePoints(points);
  for (const point of ordered) {
    if (!Number.isFinite(point.physicalDistance)) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.widthChangePointInvalid, {
          entityType: "widthChangePoint",
          entityId: point.id,
          detail: "Width change point station must be a finite number.",
        }),
      );
      continue;
    }
    if (
      point.physicalDistance < -DEFAULT_TOLERANCES.station
      || point.physicalDistance > totalLength + DEFAULT_TOLERANCES.station
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.widthChangePointOutOfRange, {
          entityType: "widthChangePoint",
          entityId: point.id,
          physicalDistance: point.physicalDistance,
          detail: "Width change point station is outside the alignment length.",
        }),
      );
    }
    if (
      !Number.isFinite(point.leftOffset)
      || !Number.isFinite(point.rightOffset)
      || point.leftOffset < 0
      || point.rightOffset < 0
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.widthChangePointInvalid, {
          entityType: "widthChangePoint",
          entityId: point.id,
          detail: "Width change point offsets must be finite non-negative values.",
        }),
      );
    }
  }

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index]!;
    const next = ordered[index + 1]!;
    if (nearlyEqual(current.physicalDistance, next.physicalDistance)) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.widthChangePointOverlap, {
          entityType: "widthChangePoint",
          entityId: `${current.id}:${next.id}`,
          physicalDistance: next.physicalDistance,
          detail: "Width change points cannot share the same station.",
        }),
      );
    }
  }

  return issues;
}

export function resolveWidthAtDistance(
  template: CrossSectionTemplateDraft | undefined,
  widthChangePoints: readonly WidthChangePointDraft[] | undefined,
  physicalDistance: number,
): ResolvedWidthExtents {
  const templateExtents = deriveTemplateLaneExtents(template);
  if (!widthChangePoints || widthChangePoints.length === 0) {
    return templateExtents;
  }

  const ordered = sortedWidthChangePoints(widthChangePoints);
  let activePoint: WidthChangePointDraft | undefined;
  for (const point of ordered) {
    if (point.physicalDistance <= physicalDistance + DEFAULT_TOLERANCES.station) {
      activePoint = point;
      continue;
    }
    break;
  }

  if (!activePoint) {
    return templateExtents;
  }

  return {
    leftHalfWidth: activePoint.leftOffset,
    rightHalfWidth: activePoint.rightOffset,
    source: "width_change_point",
    widthChangePointId: activePoint.id,
  };
}

export function applyWidthExtentsToOffsetLines(
  template: CrossSectionTemplateDraft,
  resolvedExtents: ResolvedWidthExtents,
): CrossSectionOffsetLineDraft[] {
  const templateExtents = deriveTemplateLaneExtents(template);
  if (
    resolvedExtents.source === "template"
    && nearlyEqual(templateExtents.leftHalfWidth, resolvedExtents.leftHalfWidth)
    && nearlyEqual(templateExtents.rightHalfWidth, resolvedExtents.rightHalfWidth)
  ) {
    return [...template.offsetLines];
  }

  const leftScale = templateExtents.leftHalfWidth > DEFAULT_TOLERANCES.offset
    ? resolvedExtents.leftHalfWidth / templateExtents.leftHalfWidth
    : 1;
  const rightScale = templateExtents.rightHalfWidth > DEFAULT_TOLERANCES.offset
    ? resolvedExtents.rightHalfWidth / templateExtents.rightHalfWidth
    : 1;

  return template.offsetLines.map((line) => {
    if (!Number.isFinite(line.offset) || Math.abs(line.offset) <= DEFAULT_TOLERANCES.offset) {
      return { ...line };
    }
    if (line.offset < 0) {
      return {
        ...line,
        offset: line.offset * leftScale,
      };
    }
    return {
      ...line,
      offset: line.offset * rightScale,
    };
  });
}

export function resolveStationOffsetLines(
  template: CrossSectionTemplateDraft | undefined,
  widthChangePoints: readonly WidthChangePointDraft[] | undefined,
  physicalDistance: number,
): CrossSectionOffsetLineDraft[] {
  if (!template || template.offsetLines.length === 0) {
    return [];
  }
  const resolvedExtents = resolveWidthAtDistance(template, widthChangePoints, physicalDistance);
  return applyWidthExtentsToOffsetLines(template, resolvedExtents);
}
