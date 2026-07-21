import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../../data/defaultProject";
import { createDefaultLinerDraft, updateLinerDrawingSettings } from "../../adapters/linerUiAdapter";
import {
  hydrateProjectLinerFromPersistence,
  linerDraftFromProject,
  serializeProjectForPersistence,
  withProjectLinerDraft,
} from "../../adapters/linerProjectDraft";
import type { LinerDrawingSettingsDraft } from "../../schema/types";
import { buildFormalDrawingWorkspaceDocuments } from "../formalDrawingWorkspaceDocuments";
import type { DrawingDocument } from "../model/document";
import { canExportFormalDrawingDxf, exportFormalDrawingDxf } from "../../dxf/export/exportFormalDrawingDxf";

const DRAWING_SETTINGS: LinerDrawingSettingsDraft = {
  version: "0.1.0",
  planPaperSize: "A1",
  profilePaperSize: "A2",
  crossSectionPaperSize: "A3",
  bandPaperSize: "A4",
  paperOrientation: "landscape",
  marginMm: 12,
};

function createDraft(settings: LinerDrawingSettingsDraft = DRAWING_SETTINGS) {
  return updateLinerDrawingSettings(createDefaultLinerDraft(), settings);
}

function containsKey(value: unknown, keyName: string): boolean {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsKey(entry, keyName));
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, entry]) => key === keyName || containsKey(entry, keyName),
  );
}

describe("P5-D04 drawing persistence and fail-closed gates", () => {
  it("persists drawingSettings without persisting DrawingDocument and regenerates the same route documents", () => {
    const draft = createDraft();
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    expect(containsKey(serialized.project, "drawingDocument")).toBe(false);

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }
    const reloadedDraft = linerDraftFromProject(hydrated.project);
    expect(reloadedDraft?.drawingSettings).toEqual(DRAWING_SETTINGS);

    const before = buildFormalDrawingWorkspaceDocuments(draft, "plan");
    const after = buildFormalDrawingWorkspaceDocuments(reloadedDraft!, "plan");
    expect(after.previewDocument).toEqual(before.previewDocument);
    expect(after.previewDocument).toBe(after.dxfDocument);
    expect(after.printDocument).toBe(after.previewDocument);
  });

  it("includes drawingSettings in sourceRevision so stale formal drawing settings cannot be reused", () => {
    const baseProject = withProjectLinerDraft(createDefaultProject(), createDraft());
    const changedProject = withProjectLinerDraft(
      createDefaultProject(),
      createDraft({ ...DRAWING_SETTINGS, marginMm: 16 }),
    );

    expect(baseProject.liner?.sourceRevision).toHaveLength(64);
    expect(changedProject.liner?.sourceRevision).toHaveLength(64);
    expect(baseProject.liner?.sourceRevision).not.toBe(changedProject.liner?.sourceRevision);
  });

  it("blocks export availability when a DrawingDocument carries error diagnostics", () => {
    const bundle = buildFormalDrawingWorkspaceDocuments(createDraft(), "plan");
    const blockedDocument: DrawingDocument = {
      ...bundle.previewDocument,
      diagnostics: [
        ...bundle.previewDocument.diagnostics,
        {
          severity: "error",
          code: "P5_D04_DRAWING_ERROR",
          message: "Synthetic P5-D04 drawing error",
        },
      ],
    };
    const exported = exportFormalDrawingDxf("plan-type-a", blockedDocument, {
      timestamp: new Date("2026-07-22T00:00:00Z"),
    });

    expect(canExportFormalDrawingDxf(bundle.previewDocument)).toBe(true);
    expect(canExportFormalDrawingDxf(blockedDocument)).toBe(false);
    expect(exported.diagnostics.map((diagnostic) => diagnostic.code)).toContain("P5_D04_DRAWING_ERROR");
  });
});
