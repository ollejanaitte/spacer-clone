import type { LinerDraft } from "../adapters/linerUiAdapter";
import { exportFormalDrawingDxf } from "../dxf";
import { buildProfileDrawingDocumentFromDraft } from "./formalDrawingFromDraft";

/**
 * Legacy App toolbar entry point. Routes through DrawingDocument → formal DXF export.
 * @deprecated Prefer `buildProfileDrawingDocumentFromDraft` + `exportFormalDrawingDxf`.
 */
export function buildLinerProfileDxf(draft: LinerDraft): string {
  const document = buildProfileDrawingDocumentFromDraft(draft);
  return exportFormalDrawingDxf("profile-band", document).dxf;
}
