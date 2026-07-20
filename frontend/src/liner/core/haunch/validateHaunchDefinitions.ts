import type {
  AlignmentBundleDraft,
  HaunchAnchorDraft,
  HaunchDefinitionDraft,
} from "../../schema/types";
import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../types";
import {
  createHaunchDiagnostic,
  LINER_HAUNCH_DIAGNOSTIC_CODES,
} from "./diagnostics";

const MVP_VARIANTS = new Set([
  "two_support_points",
  "one_point_longitudinal_gradient",
  "affine_plane_three_points",
  "parabola_three_points",
  "one_point_two_gradients",
  "section_range_modifier",
]);

const REFERENCE_GIRDER_JIP_TYPES = new Set([4, 5, 10, 15]);

export interface HaunchValidationContext {
  alignmentIds: ReadonlySet<string>;
  lineIdsByAlignment: ReadonlyMap<string, ReadonlySet<string>>;
  sectionIds: ReadonlySet<string>;
  intermediate?: CanonicalLinerIntermediateResult;
}

export function buildHaunchValidationContext(
  linerAlignments: readonly AlignmentBundleDraft[],
  intermediate?: CanonicalLinerIntermediateResult,
): HaunchValidationContext {
  const alignmentIds = new Set<string>();
  const lineIdsByAlignment = new Map<string, Set<string>>();

  for (const bundle of linerAlignments) {
    alignmentIds.add(bundle.id);
    const lineIds = new Set<string>();
    for (const template of bundle.crossSections) {
      for (const line of template.offsetLines) {
        lineIds.add(line.id);
      }
    }
    lineIdsByAlignment.set(bundle.id, lineIds);
  }

  const sectionIds = new Set<string>();
  if (intermediate) {
    for (const section of intermediate.sections) {
      sectionIds.add(section.id);
    }
  }

  return {
    alignmentIds,
    lineIdsByAlignment,
    sectionIds,
    intermediate,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateAnchorReference(
  diagnostics: ComputationDiagnostic[],
  alignmentId: string,
  anchor: HaunchAnchorDraft,
  context: HaunchValidationContext,
  entityPath: string,
  definitionId: string,
): void {
  if (isNonEmptyString(anchor.lineId)) {
    const lineIds = context.lineIdsByAlignment.get(alignmentId);
    if (!lineIds?.has(anchor.lineId)) {
      diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
          entityId: definitionId,
          entityPath: `${entityPath}.lineId`,
        }),
      );
    }
  }
  if (isNonEmptyString(anchor.supportSectionId) && !context.sectionIds.has(anchor.supportSectionId)) {
    diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
        entityId: definitionId,
        entityPath: `${entityPath}.supportSectionId`,
      }),
    );
  }
}

function validateLegacyJipType(
  diagnostics: ComputationDiagnostic[],
  definition: HaunchDefinitionBaseLike,
): boolean {
  if (definition.jipType === 12) {
    diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.linerHeightRequired, {
        entityId: definition.id,
        entityPath: "jipType",
      }),
    );
    return true;
  }
  if (definition.jipType !== undefined && REFERENCE_GIRDER_JIP_TYPES.has(definition.jipType)) {
    diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.referenceGirderRequired, {
        entityId: definition.id,
        entityPath: "jipType",
      }),
    );
    return true;
  }
  if (definition.jipType !== undefined && definition.jipType >= 1 && definition.jipType <= 17) {
    const nativeVariant = mapJipTypeToVariant(definition.jipType);
    if (!nativeVariant || !MVP_VARIANTS.has(nativeVariant)) {
      diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.unsupportedType, {
          entityId: definition.id,
          entityPath: "jipType",
        }),
      );
      return true;
    }
  }
  return false;
}

type HaunchDefinitionBaseLike = {
  id: string;
  alignmentId: string;
  jipType?: number;
  stationRange?: { fromM: number; toM: number };
  lineIds?: string[];
  deckRefId?: string;
  family?: string;
  variant?: string;
};

function mapJipTypeToVariant(jipType: number): string | null {
  switch (jipType) {
    case 1:
      return "two_support_points";
    case 2:
      return "one_point_longitudinal_gradient";
    case 6:
      return "affine_plane_three_points";
    case 7:
      return "one_point_two_gradients";
    case 8:
      return "section_range_modifier";
    case 9:
      return "parabola_three_points";
    case 14:
      return "two_points_normal_gradient";
    default:
      return null;
  }
}

function validateStationRange(
  diagnostics: ComputationDiagnostic[],
  definition: HaunchDefinitionDraft,
): void {
  const { fromM, toM } = definition.stationRange;
  if (!Number.isFinite(fromM) || !Number.isFinite(toM)) {
    diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
        entityId: definition.id,
        entityPath: "stationRange",
      }),
    );
    return;
  }
  if (fromM > toM) {
    diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.rangeInvalid, {
        entityId: definition.id,
        entityPath: "stationRange",
      }),
    );
  }
}

export function validateHaunchDefinitions(
  definitions: readonly HaunchDefinitionDraft[],
  context: HaunchValidationContext,
): ComputationDiagnostic[] {
  const diagnostics: ComputationDiagnostic[] = [];

  for (const definition of definitions) {
    const definitionId = isRecord(definition) && typeof definition.id === "string" ? definition.id : undefined;

    if (!isRecord(definition) || !isNonEmptyString(definition.id) || !isNonEmptyString(definition.alignmentId)) {
      diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
          entityId: definitionId,
        }),
      );
      continue;
    }

    if (validateLegacyJipType(diagnostics, definition)) {
      continue;
    }

    if (!context.alignmentIds.has(definition.alignmentId)) {
      diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
          entityId: definition.id,
          entityPath: "alignmentId",
        }),
      );
      continue;
    }

    if (!isNonEmptyString(definition.family) || !isNonEmptyString(definition.variant)) {
      diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.unsupportedType, {
          entityId: definition.id,
        }),
      );
      continue;
    }

    if (!MVP_VARIANTS.has(definition.variant)) {
      diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.unsupportedType, {
          entityId: definition.id,
          entityPath: "variant",
        }),
      );
      continue;
    }

    validateStationRange(diagnostics, definition);

    if (definition.lineIds) {
      const lineIds = context.lineIdsByAlignment.get(definition.alignmentId);
      for (const lineId of definition.lineIds) {
        if (!lineIds?.has(lineId)) {
          diagnostics.push(
            createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
              entityId: definition.id,
              entityPath: "lineIds",
            }),
          );
        }
      }
    }

    if (definition.family === "two_point" && definition.variant === "two_support_points") {
      for (const [index, anchor] of definition.anchors.entries()) {
        validateAnchorReference(diagnostics, definition.alignmentId, anchor, context, `anchors[${index}]`, definition.id);
      }
    } else if (definition.family === "two_point" && definition.variant === "one_point_longitudinal_gradient") {
      validateAnchorReference(diagnostics, definition.alignmentId, definition.anchor, context, "anchor", definition.id);
      if (!Number.isFinite(definition.longitudinalGradient)) {
        diagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
            entityId: definition.id,
            entityPath: "longitudinalGradient",
          }),
        );
      }
    } else if (definition.family === "three_point" && definition.variant === "affine_plane_three_points") {
      for (const [index, anchor] of definition.anchors.entries()) {
        validateAnchorReference(diagnostics, definition.alignmentId, anchor, context, `anchors[${index}]`, definition.id);
      }
    } else if (definition.family === "three_point" && definition.variant === "parabola_three_points") {
      const lineIds = context.lineIdsByAlignment.get(definition.alignmentId);
      if (!lineIds?.has(definition.girderLineId)) {
        diagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
            entityId: definition.id,
            entityPath: "girderLineId",
          }),
        );
      }
      for (const [index, anchor] of definition.anchors.entries()) {
        validateAnchorReference(diagnostics, definition.alignmentId, anchor, context, `anchors[${index}]`, definition.id);
      }
    } else if (definition.family === "plane" && definition.variant === "one_point_two_gradients") {
      validateAnchorReference(diagnostics, definition.alignmentId, definition.anchor, context, "anchor", definition.id);
      if (!Number.isFinite(definition.longitudinalGradient) || !Number.isFinite(definition.transverseGradient)) {
        diagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
            entityId: definition.id,
            entityPath: "gradients",
          }),
        );
      }
      if (isNonEmptyString(definition.referenceLineId)) {
        const lineIds = context.lineIdsByAlignment.get(definition.alignmentId);
        if (!lineIds?.has(definition.referenceLineId)) {
          diagnostics.push(
            createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
              entityId: definition.id,
              entityPath: "referenceLineId",
            }),
          );
        }
      }
    } else if (definition.family === "range" && definition.variant === "section_range_modifier") {
      if (isNonEmptyString(definition.supportSectionFromId) && !context.sectionIds.has(definition.supportSectionFromId)) {
        diagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
            entityId: definition.id,
            entityPath: "supportSectionFromId",
          }),
        );
      }
      if (isNonEmptyString(definition.supportSectionToId) && !context.sectionIds.has(definition.supportSectionToId)) {
        diagnostics.push(
          createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference, {
            entityId: definition.id,
            entityPath: "supportSectionToId",
          }),
        );
      }
    }
  }

  return diagnostics;
}
