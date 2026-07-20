import type {
  AlignmentBundleDraft,
  HosoAnchorDraft,
  HosoDefinitionDraft,
  HosoOffsetBandDraft,
} from "../../schema/types";
import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";
import {
  createHosoDiagnostic,
  LINER_HOSO_DIAGNOSTIC_CODES,
} from "./diagnostics";

const MVP_VARIANTS = new Set([
  "auto_converge_pipeline",
  "longitudinal_only",
  "both_gradients",
  "transverse_only",
  "two_point_girder_end",
  "three_point_non_collinear",
]);

export interface HosoValidationContext {
  alignmentIds: ReadonlySet<string>;
  lineIdsByAlignment: ReadonlyMap<string, ReadonlySet<string>>;
  intermediate?: CanonicalLinerIntermediateResult;
}

export function buildHosoValidationContext(
  linerAlignments: readonly AlignmentBundleDraft[],
  intermediate?: CanonicalLinerIntermediateResult,
): HosoValidationContext {
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

  return {
    alignmentIds,
    lineIdsByAlignment,
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
  anchor: HosoAnchorDraft,
  context: HosoValidationContext,
  entityPath: string,
  definitionId: string,
): void {
  if (isNonEmptyString(anchor.lineId)) {
    const lineIds = context.lineIdsByAlignment.get(alignmentId);
    if (!lineIds?.has(anchor.lineId)) {
      diagnostics.push(
        createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.invalidReference, {
          entityId: definitionId,
          entityPath: `${entityPath}.lineId`,
        }),
      );
    }
  }
}

function validateOffsetBands(
  diagnostics: ComputationDiagnostic[],
  definition: HosoDefinitionDraft,
  context: HosoValidationContext,
): void {
  const bands = definition.offsetBands;
  if (!bands?.length) {
    return;
  }
  if (bands.length > 3) {
    diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
        entityId: definition.id,
        entityPath: "offsetBands",
      }),
    );
    return;
  }
  const lineIds = context.lineIdsByAlignment.get(definition.alignmentId);
  for (const band of bands) {
    if (!lineIds?.has(band.upperLineId) || !lineIds?.has(band.lowerLineId)) {
      diagnostics.push(
        createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.invalidReference, {
          entityId: definition.id,
          entityPath: `offsetBands.${band.id}`,
        }),
      );
    }
  }
  for (let i = 0; i < bands.length; i += 1) {
    for (let j = i + 1; j < bands.length; j += 1) {
      if (bandsOverlap(bands[i]!, bands[j]!)) {
        diagnostics.push(
          createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.overlappingBand, {
            entityId: definition.id,
            entityPath: "offsetBands",
          }),
        );
      }
    }
  }
}

function bandsOverlap(left: HosoOffsetBandDraft, right: HosoOffsetBandDraft): boolean {
  if (left.id === right.id) {
    return false;
  }
  const sameLines =
    (left.upperLineId === right.upperLineId && left.lowerLineId === right.lowerLineId)
    || (left.upperLineId === right.lowerLineId && left.lowerLineId === right.upperLineId);
  return sameLines;
}

function validateStationRange(
  diagnostics: ComputationDiagnostic[],
  definition: HosoDefinitionDraft,
): void {
  if (definition.stationRange.fromM > definition.stationRange.toM) {
    diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.stationOutOfRange, {
        entityId: definition.id,
        entityPath: "stationRange",
      }),
    );
  }
}

function validateDefinitionShape(
  diagnostics: ComputationDiagnostic[],
  definition: unknown,
  index: number,
): definition is HosoDefinitionDraft {
  if (!isRecord(definition)) {
    diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
        entityPath: `hosoDefinitions[${index}]`,
      }),
    );
    return false;
  }
  if (!isNonEmptyString(definition.id)) {
    diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
        entityPath: `hosoDefinitions[${index}].id`,
      }),
    );
    return false;
  }
  if (!isNonEmptyString(definition.family) || !isNonEmptyString(definition.variant)) {
    diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.definitionSchemaInvalid, {
        entityId: definition.id as string,
        entityPath: "family/variant",
      }),
    );
    return false;
  }
  if (!MVP_VARIANTS.has(definition.variant as string)) {
    diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.unsupportedType, {
        entityId: definition.id as string,
        entityPath: "variant",
      }),
    );
    return false;
  }
  if (definition.jipType !== undefined) {
    diagnostics.push(
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.unsupportedType, {
        entityId: definition.id as string,
        entityPath: "jipType",
      }),
    );
    return false;
  }
  return true;
}

export function validateHosoDefinitions(
  definitions: readonly HosoDefinitionDraft[],
  context: HosoValidationContext,
): ComputationDiagnostic[] {
  const diagnostics: ComputationDiagnostic[] = [];

  definitions.forEach((rawDefinition, index) => {
    if (!validateDefinitionShape(diagnostics, rawDefinition, index)) {
      return;
    }
    const definition = rawDefinition;

    if (!context.alignmentIds.has(definition.alignmentId)) {
      diagnostics.push(
        createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.invalidReference, {
          entityId: definition.id,
          entityPath: "alignmentId",
        }),
      );
    }

    validateStationRange(diagnostics, definition);
    validateOffsetBands(diagnostics, definition, context);

    if (definition.family === "longitudinal" && definition.variant === "longitudinal_only") {
      for (const [anchorIndex, anchor] of definition.anchors.entries()) {
        validateAnchorReference(
          diagnostics,
          definition.alignmentId,
          anchor,
          context,
          `anchors[${anchorIndex}]`,
          definition.id,
        );
      }
      if (
        Math.abs(
          definition.anchors[0].stationPhysicalDistanceM
          - definition.anchors[1].stationPhysicalDistanceM,
        ) <= DEFAULT_TOLERANCES.station
      ) {
        diagnostics.push(
          createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.degenerateGeometry, {
            entityId: definition.id,
            entityPath: "anchors",
          }),
        );
      }
    }

    if (definition.family === "longitudinal" && definition.variant === "both_gradients") {
      validateAnchorReference(
        diagnostics,
        definition.alignmentId,
        definition.anchor,
        context,
        "anchor",
        definition.id,
      );
    }

    if (definition.family === "transverse") {
      for (const [anchorIndex, anchor] of definition.anchors.entries()) {
        validateAnchorReference(
          diagnostics,
          definition.alignmentId,
          anchor,
          context,
          `anchors[${anchorIndex}]`,
          definition.id,
        );
      }
    }

    if (definition.family === "two_point") {
      for (const [anchorIndex, anchor] of definition.anchors.entries()) {
        validateAnchorReference(
          diagnostics,
          definition.alignmentId,
          anchor,
          context,
          `anchors[${anchorIndex}]`,
          definition.id,
        );
      }
      const [a1, a2] = definition.anchors;
      const sameStation =
        Math.abs(a1.stationPhysicalDistanceM - a2.stationPhysicalDistanceM)
        <= DEFAULT_TOLERANCES.station;
      const sameOffset =
        Math.abs((a1.lateralOffsetM ?? 0) - (a2.lateralOffsetM ?? 0))
        <= DEFAULT_TOLERANCES.offset;
      if (sameStation && sameOffset) {
        diagnostics.push(
          createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.degenerateGeometry, {
            entityId: definition.id,
            entityPath: "anchors",
          }),
        );
      }
    }

    if (definition.family === "three_point") {
      for (const [anchorIndex, anchor] of definition.anchors.entries()) {
        validateAnchorReference(
          diagnostics,
          definition.alignmentId,
          anchor,
          context,
          `anchors[${anchorIndex}]`,
          definition.id,
        );
      }
    }
  });

  return diagnostics;
}
