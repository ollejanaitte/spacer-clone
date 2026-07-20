// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  syncActiveBundleToAlignments,
  updateLinerCrossSectionTemplate,
} from "../adapters/linerUiAdapter";
import { createLdistDiagnostic, LINER_LDIST_DIAGNOSTIC_CODES } from "../core/ldist/diagnostics";
import { buildRoadCsvExports, buildGridPointsCsv, GRID_POINTS_CSV_COLUMNS } from "./roadCsvExport";
import { buildRoadHtmlReport } from "./roadReport";
import {
  assessRoadExportReadiness,
  buildRoadReportContext,
  type RoadReportContext,
} from "./roadReportContext";

function buildExportContextWithLdistJob(): RoadReportContext {
  let draft = addLinerOffset(createDefaultLinerDraft());
  const template = draft.crossSections?.[0];
  draft = updateLinerCrossSectionTemplate(draft, {
    id: template?.id ?? `CS-${draft.alignment.id}`,
    name: template?.name ?? "Test",
    offsetLines: [
      { id: "OL-left", offset: -5, elevation: 0, role: "custom" },
      { id: "OL-right", offset: 5, elevation: 0, role: "custom" },
    ],
  });
  draft = syncActiveBundleToAlignments({
    ...draft,
    ldistJobs: [
      {
        id: "ldist-job-1",
        kind: "grid_distance",
        distanceMode: "mode_a",
        stationScope: "all_generated",
        pairs: [{ fromLineId: "OL-left", toLineId: "OL-right" }],
        alignmentId: draft.alignment.id,
      },
    ],
  });
  return buildRoadReportContext(draft, "test-project");
}

describe("roadCsvExport", () => {
  it("builds grid_points.csv with English column keys (D06-C02)", () => {
    const context = buildRoadReportContext(createDefaultLinerDraft(), "test-project");
    const csv = buildGridPointsCsv(context.intermediate.grid.points);
    const [header] = csv.split("\n");
    expect(header).toBe(GRID_POINTS_CSV_COLUMNS.join(","));
    expect(context.intermediate.grid.points.length).toBeGreaterThan(0);
    const lines = csv.split("\n");
    expect(lines.length).toBe(context.intermediate.grid.points.length + 1);
    for (const value of lines.slice(1).join(",").match(/-?\d+(\.\d+)?/g) ?? []) {
      expect(Number.isFinite(Number(value))).toBe(true);
    }
  });

  it("includes P4 CSV files when data is present (D06-C03)", () => {
    const context = buildExportContextWithLdistJob();
    expect(context.ldistRows.length).toBeGreaterThan(0);

    const exports = buildRoadCsvExports(context);
    expect(exports).not.toBeNull();
    expect(exports?.["grid_points.csv"]).toBeTruthy();
    expect(exports?.["ldist_results.csv"]).toBeTruthy();
    expect(exports?.["ldist_results.csv"]).toContain("ldist-job-1");
  });

  it("returns null when error-level diagnostics block export (D06-C04)", () => {
    const context = buildExportContextWithLdistJob();
    const diagnostics = [
      createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.pairsEmpty, { entityId: "job-1" }),
    ];
    expect(buildRoadCsvExports({ ...context, diagnostics })).toBeNull();
    expect(assessRoadExportReadiness({ ...context, diagnostics }).canExport).toBe(false);
  });
});

describe("roadReport", () => {
  it("includes extended HTML sections for ldist/haunch/hoso/diagnostics (D06-C01)", () => {
    const context = buildExportContextWithLdistJob();
    const report = buildRoadHtmlReport(context, new Date("2026-07-21T00:00:00.000Z"));
    expect(report).not.toBeNull();

    const parser = new DOMParser();
    const document = parser.parseFromString(report!.html, "text/html");

    for (const sectionKey of [
      "projectInfo",
      "alignmentSegments",
      "stationCoordinates",
      "profileElevations",
      "gridPoints",
      "ldistResults",
    ]) {
      expect(document.querySelector(`[data-section-key="${sectionKey}"]`)).not.toBeNull();
    }

    if (context.diagnostics.length > 0) {
      expect(document.querySelector('[data-section-key="diagnostics"]')).not.toBeNull();
    }
  });

  it("blocks HTML export when error-level diagnostics are present (D06-C04)", () => {
    const context = buildExportContextWithLdistJob();
    const blocked = {
      ...context,
      diagnostics: [
        ...context.diagnostics,
        createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.pairsEmpty, { entityId: "job-1" }),
      ],
    };
    expect(buildRoadHtmlReport(blocked)).toBeNull();
  });

  it("blocks export when P4 rows carry stale sourceRevision (D06-C04)", () => {
    const context = buildExportContextWithLdistJob();
    const stale = {
      ...context,
      ldistRows: context.ldistRows.map((row) => ({ ...row, sourceRevision: "stale-revision" })),
    };
    expect(assessRoadExportReadiness(stale).canExport).toBe(false);
    expect(buildRoadHtmlReport(stale)).toBeNull();
  });
});
