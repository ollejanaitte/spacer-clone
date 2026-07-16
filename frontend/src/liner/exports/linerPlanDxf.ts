import type { LinerDraft } from "../adapters/linerUiAdapter";
import { exportFormalDrawingDxf } from "../dxf";
import { buildPlanDrawingDocumentFromDraft } from "./formalDrawingFromDraft";

/**
 * Legacy App toolbar entry point. Routes through DrawingDocument → formal DXF export.
 * @deprecated Prefer `buildPlanDrawingDocumentFromDraft` + `exportFormalDrawingDxf`.
 */
export function buildLinerPlanDxf(draft: LinerDraft): string {
  const document = buildPlanDrawingDocumentFromDraft(draft);
  return exportFormalDrawingDxf("plan", document).dxf;
}
