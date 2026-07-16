import type { LinerDraft } from "../adapters/linerUiAdapter";
import type { CanonicalLinerIntermediateResult } from "../core/types";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import type { LinerDrawingWorkspaceKind } from "../uiPreparation";
import { createDrawingSettingsFromDraft } from "./builders/formalBuilders";
import type { DrawingSettings, FormalPlanType } from "./builders/types";
import type { DrawingDocument } from "./model/document";
import { buildMultiPageDrawingDocument, selectDrawingDocumentSheet } from "./sheet/multiPageDocument";
import { resolveFormalDrawingPageByRoute } from "./sheet/formalDrawingPages";
import { resolvePrintFormalDrawingDocument } from "./print/printFormalDrawing";

export type FormalDrawingWorkspaceDocuments = {
  intermediate: CanonicalLinerIntermediateResult;
  settings: DrawingSettings;
  multiPageDocument: DrawingDocument;
  previewDocument: DrawingDocument;
  dxfDocument: DrawingDocument;
  printDocument: DrawingDocument;
};

export function buildFormalDrawingWorkspaceDocuments(
  draft: LinerDraft,
  kind: LinerDrawingWorkspaceKind,
  planType: FormalPlanType = "road_shape",
): FormalDrawingWorkspaceDocuments {
  const intermediate = buildIntermediateResult(draft);
  const baseSettings = createDrawingSettingsFromDraft(intermediate, draft.drawingSettings);
  const settings: DrawingSettings = {
    ...baseSettings,
    selectedCrossSectionStation: draft.selectedCrossSectionStation,
    planType: kind === "plan" ? planType : baseSettings.planType,
  };
  const multiPageDocument = buildMultiPageDrawingDocument({ result: intermediate, settings });
  const activePage = resolveFormalDrawingPageByRoute(kind);
  const previewDocument = selectDrawingDocumentSheet(multiPageDocument, activePage.sheetId);
  const printDocument = resolvePrintFormalDrawingDocument(previewDocument);

  return {
    intermediate,
    settings,
    multiPageDocument,
    previewDocument,
    dxfDocument: previewDocument,
    printDocument,
  };
}
