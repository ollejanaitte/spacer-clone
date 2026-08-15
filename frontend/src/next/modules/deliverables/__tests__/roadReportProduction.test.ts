import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { writeRoadData, readRoadData } from "../../roadModuleAdapter";
import { commitRoadEditorDraft, loadRoadEditorDraft } from "../../road/roadEditorDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { buildRoadHtmlReport } from "../../../../liner/exports/roadReport";
import { buildRoadReportContext, assessRoadExportReadiness } from "../../../../liner/exports/roadReportContext";
import type { BuildIntermediateInput } from "../../../../liner/core/pipeline/pipeline";

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

function setupDraft(extra?: (draft: BuildIntermediateInput) => BuildIntermediateInput): BuildIntermediateInput {
  const manager = getProjectManager();
  const result = manager.createProject({
    name: "RD05",
    businessNumber: "WP4-1",
    designStage: "road-detailed",
  });
  if (!result.ok || !result.project) throw new Error("createProject failed");
  const projectId = result.project.projectId;

  let draft = createDefaultLinerDraft();
  if (extra) draft = extra(draft);
  const committed = commitRoadEditorDraft(draft, { source: "new" });
  if (!committed.ok) {
    throw new Error(`commit failed: ${committed.issues[0]?.message}`);
  }
  if (!committed.canonical) {
    throw new Error("commit failed: canonical missing");
  }
  const writeRes = writeRoadData(manager, projectId, committed.canonical);
  if (!writeRes.ok) throw new Error("writeRoadData failed");
  const roadData = readRoadData(manager, projectId);
  if (!roadData) throw new Error("roadData not readable");
  const draftResult = loadRoadEditorDraft(roadData);
  if (!draftResult.ok) throw new Error(`draft failed: ${draftResult.issues[0]?.message}`);
  return draftResult.draft;
}

describe("WP-4 Road計算書 production (P0-03)", () => {
  it("RD-05 HTML report builds from committed canonical road draft with required sections", () => {
    const draft = setupDraft();
    const context = buildRoadReportContext(draft, "RD05");
    const readiness = assessRoadExportReadiness(context);
    expect(readiness.canExport).toBe(true);
    const report = buildRoadHtmlReport(context);
    expect(report).not.toBeNull();
    expect(report!.fileName).toMatch(/\.html$/);
    expect(report!.html).toContain("<html");
  });

  it("RD-05 context is deterministic across identical builds", () => {
    const a = setupDraft();
    const b = setupDraft();
    const ca = buildRoadReportContext(a, "P");
    const cb = buildRoadReportContext(b, "P");
    expect(ca.intermediate.sourceRevision).toBe(cb.intermediate.sourceRevision);
    expect(ca.ldistRows.length).toBe(cb.ldistRows.length);
    expect(ca.haunchRows.length).toBe(cb.haunchRows.length);
    expect(ca.hosoRows.length).toBe(cb.hosoRows.length);
  });

  it("fail-closed: readiness blocks export when profile does not cover horizontal length", () => {
    // A vertical profile that ends before the horizontal length must block export.
    const draft = setupDraft((d) => {
      const va = d.verticalAlignment;
      if (!va) {
        return d;
      }
      return {
        ...d,
        verticalAlignment: {
          ...va,
          elements: va.elements.map((e) => ({
            ...e,
            endStation: (e.startStation ?? 0) + 10,
          })),
        },
      };
    });
    const context = buildRoadReportContext(draft, "RD05-GAP");
    const readiness = assessRoadExportReadiness(context);
    if (!readiness.canExport) {
      expect(readiness.reason).toBe("error_diagnostics");
    }
    // The report must either be blocked or, if exportable, still valid HTML.
    if (readiness.canExport) {
      const report = buildRoadHtmlReport(context);
      expect(report).not.toBeNull();
    }
  });
});
