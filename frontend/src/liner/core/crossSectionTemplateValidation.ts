import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type { ValidationIssue } from "./types";
import type {
  CrossSectionTemplateDraft,
  GridDefinitionDraft,
} from "../schema/types";

export type CrossSectionValidationInput = {
  crossSections?: readonly CrossSectionTemplateDraft[];
  gridDefinitions?: readonly GridDefinitionDraft[];
  alignmentTotalLength?: number;
};

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= DEFAULT_TOLERANCES.station;
}

function sortGridDefinitions(
  definitions: readonly GridDefinitionDraft[],
): GridDefinitionDraft[] {
  return [...definitions].sort((left, right) => {
    if (left.stationRange.startPhysicalDistance !== right.stationRange.startPhysicalDistance) {
      return left.stationRange.startPhysicalDistance - right.stationRange.startPhysicalDistance;
    }
    if (left.stationRange.endPhysicalDistance !== right.stationRange.endPhysicalDistance) {
      return left.stationRange.endPhysicalDistance - right.stationRange.endPhysicalDistance;
    }
    return left.id.localeCompare(right.id);
  });
}

function validateTemplateIdentity(
  templates: readonly CrossSectionTemplateDraft[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenTemplateIds = new Set<string>();

  for (const template of templates) {
    const templateId = template.id?.trim();
    if (!templateId) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionTemplateMissingId, {
          entityType: "crossSectionTemplate",
          detail: "Cross-section template id is required.",
        }),
      );
      continue;
    }
    if (seenTemplateIds.has(templateId)) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionTemplateDuplicateId, {
          entityType: "crossSectionTemplate",
          entityId: templateId,
          detail: "Cross-section template ids must be unique.",
        }),
      );
      continue;
    }
    seenTemplateIds.add(templateId);
  }

  return issues;
}

function validateTemplateOffsetLines(
  template: CrossSectionTemplateDraft,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const templateId = template.id?.trim() || "(missing)";
  if (template.offsetLines.length === 0) {
    issues.push(
      createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineMissing, {
        entityType: "crossSectionTemplate",
        entityId: templateId,
        detail: "Cross-section template must contain at least one offset line.",
      }),
    );
    return issues;
  }

  const seenOffsetLineIds = new Set<string>();
  for (const line of template.offsetLines) {
    const lineId = line.id?.trim();
    if (!lineId) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineMissingId, {
          entityType: "crossSectionOffsetLine",
          entityId: templateId,
          detail: "Cross-section offset line id is required.",
        }),
      );
      continue;
    }
    if (seenOffsetLineIds.has(lineId)) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineDuplicateId, {
          entityType: "crossSectionOffsetLine",
          entityId: `${templateId}:${lineId}`,
          detail: "Offset line ids must be unique within a cross-section template.",
        }),
      );
      continue;
    }
    seenOffsetLineIds.add(lineId);
  }

  return issues;
}

function validateGridDefinitions(
  input: CrossSectionValidationInput,
  templatesById: ReadonlyMap<string, CrossSectionTemplateDraft>,
): ValidationIssue[] {
  const gridDefinitions = input.gridDefinitions;
  if (!gridDefinitions || gridDefinitions.length === 0) {
    return [];
  }

  const issues: ValidationIssue[] = [];
  const seenGridDefinitionIds = new Set<string>();
  const ordered = sortGridDefinitions(gridDefinitions);

  for (const definition of ordered) {
    const definitionId = definition.id?.trim();
    if (!definitionId) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionMissingId, {
          entityType: "gridDefinition",
          detail: "Grid definition id is required.",
        }),
      );
      continue;
    }
    if (seenGridDefinitionIds.has(definitionId)) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionDuplicateId, {
          entityType: "gridDefinition",
          entityId: definitionId,
          detail: "Grid definition ids must be unique.",
        }),
      );
      continue;
    }
    seenGridDefinitionIds.add(definitionId);

    const { startPhysicalDistance, endPhysicalDistance } = definition.stationRange;
    if (
      !Number.isFinite(startPhysicalDistance)
      || !Number.isFinite(endPhysicalDistance)
      || endPhysicalDistance + DEFAULT_TOLERANCES.station < startPhysicalDistance
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionInvalidRange, {
          entityType: "gridDefinition",
          entityId: definitionId,
          physicalDistance: startPhysicalDistance,
          detail: "Grid definition end station must be at or after the start station.",
        }),
      );
    }
    if (
      input.alignmentTotalLength !== undefined
      && (
        startPhysicalDistance < -DEFAULT_TOLERANCES.station
        || endPhysicalDistance > input.alignmentTotalLength + DEFAULT_TOLERANCES.station
      )
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionInvalidRange, {
          entityType: "gridDefinition",
          entityId: definitionId,
          physicalDistance: startPhysicalDistance,
          detail: "Grid definition station range is outside the alignment length.",
        }),
      );
    }

    const templateId = definition.crossSectionTemplateId?.trim();
    if (!templateId) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionTemplateReferenceMissing, {
          entityType: "gridDefinition",
          entityId: definitionId,
          detail: "Grid definition must reference a cross-section template id.",
        }),
      );
      continue;
    }

    const template = templatesById.get(templateId);
    if (!template) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionTemplateReferenceMissing, {
          entityType: "gridDefinition",
          entityId: definitionId,
          field: "crossSectionTemplateId",
          detail: `Grid definition references unknown cross-section template "${templateId}".`,
        }),
      );
      continue;
    }

    if (definition.offsetLineIds && definition.offsetLineIds.length > 0) {
      const offsetLineIds = new Set(template.offsetLines.map((line) => line.id));
      for (const offsetLineId of definition.offsetLineIds) {
        if (!offsetLineId?.trim() || !offsetLineIds.has(offsetLineId)) {
          issues.push(
            createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineReferenceMissing, {
              entityType: "gridDefinition",
              entityId: definitionId,
              field: "offsetLineIds",
              detail: `Grid definition references unknown offset line "${offsetLineId}".`,
            }),
          );
        }
      }
    }
  }

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index]!;
    const next = ordered[index + 1]!;
    if (
      next.stationRange.startPhysicalDistance < current.stationRange.endPhysicalDistance
      && !nearlyEqual(next.stationRange.startPhysicalDistance, current.stationRange.endPhysicalDistance)
    ) {
      issues.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionOverlap, {
          entityType: "gridDefinition",
          entityId: `${current.id}:${next.id}`,
          physicalDistance: next.stationRange.startPhysicalDistance,
          detail: "Grid definition station ranges overlap; touching boundaries are allowed but overlap is not.",
        }),
      );
    }
  }

  return issues;
}

export function validateCrossSectionTemplates(
  input: CrossSectionValidationInput,
): ValidationIssue[] {
  const templates = input.crossSections ?? [];
  if (templates.length === 0) {
    return [];
  }

  const issues = validateTemplateIdentity(templates);
  const templatesById = new Map<string, CrossSectionTemplateDraft>();
  for (const template of templates) {
    const templateId = template.id?.trim();
    if (!templateId || templatesById.has(templateId)) {
      continue;
    }
    templatesById.set(templateId, template);
    issues.push(...validateTemplateOffsetLines(template));
  }

  issues.push(...validateGridDefinitions(input, templatesById));
  return issues;
}
