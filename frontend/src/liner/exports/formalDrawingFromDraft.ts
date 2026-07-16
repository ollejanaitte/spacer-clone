import type { LinerDraft } from "../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import {
  buildDrawingDocument,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../drawing";
import type { DrawingDocument } from "../drawing/model/document";
import type { FormalPlanType } from "../drawing/builders/types";

/**
 * Builds the formal plan DrawingDocument used by preview and DXF export.
 */
export function buildPlanDrawingDocumentFromDraft(
  draft: LinerDraft,
  planType: FormalPlanType = "road_shape",
): DrawingDocument {
  const intermediate = buildIntermediateResult(draft);
  const settings = {
    ...createDrawingSettingsFromDraft(intermediate, draft.drawingSettings),
    selectedCrossSectionStation: draft.selectedCrossSectionStation,
    planType,
  };
  const output = createPlanDrawingBuilder().build({ result: intermediate, settings });
  return buildDrawingDocument(output.sheet, settings, output.diagnostics);
}

/**
 * Builds the formal profile DrawingDocument used by preview and DXF export.
 */
export function buildProfileDrawingDocumentFromDraft(draft: LinerDraft): DrawingDocument {
  const intermediate = buildIntermediateResult(draft);
  const settings = createDrawingSettingsFromDraft(intermediate, draft.drawingSettings);
  const output = createProfileDrawingBuilder().build({ result: intermediate, settings });
  return buildDrawingDocument(output.sheet, settings, output.diagnostics);
}
