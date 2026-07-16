import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import DxfParser from "dxf-parser";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import {
  buildDrawingDocument,
  createCrossSectionDrawingBuilder,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../../drawing";
import { exportFormalDrawingDxf } from "../export/exportFormalDrawingDxf";
import { ja } from "../../../i18n/ja";

const OUT_DIR = "/tmp/phase5-japanese-drawing-remediation";

function buildDocs() {
  const draft = createDefaultLinerDraft();
  const straight = draft.alignment.elements[0];
  if (straight && straight.type === "straight") {
    straight.length = 120;
  }
  draft.offsets = [-5.5, -3.25, 0, 3.25, 5.5];
  draft.crossSections = [
    {
      id: "CS-verify",
      name: "Verify",
      offsetLines: draft.offsets.map((offset, index) => ({
        id: `OL-${index}`,
        offset,
        elevation: index === 2 ? 0 : -0.02 * Math.abs(offset),
        role: "custom" as const,
      })),
    },
  ];
  if (draft.verticalAlignment) {
    draft.verticalAlignment = {
      ...draft.verticalAlignment,
      elements: [
        {
          type: "grade",
          id: "VG1",
          startStation: 0,
          endStation: 40,
          startElevation: 10,
          grade: 0.02,
          length: 40,
        },
        {
          type: "parabolic",
          id: "VP1",
          startStation: 40,
          endStation: 80,
          startElevation: 10.8,
          startGrade: 0.02,
          endGrade: -0.01,
          length: 40,
        },
        {
          type: "grade",
          id: "VG2",
          startStation: 80,
          endStation: 120,
          startElevation: 11,
          grade: -0.01,
          length: 40,
        },
      ],
    };
  }
  const result = buildIntermediateResult(draft);
  const baseSettings = createDrawingSettingsFromDraft(result, draft.drawingSettings);
  const planA = createPlanDrawingBuilder().build({
    result,
    settings: { ...baseSettings, planType: "road_shape" },
  });
  const planB = createPlanDrawingBuilder().build({
    result,
    settings: { ...baseSettings, planType: "centerline_only" },
  });
  const profile = createProfileDrawingBuilder().build({ result, settings: baseSettings });
  const cross = createCrossSectionDrawingBuilder(baseSettings.selectedCrossSectionStation).build({
    result,
    settings: baseSettings,
  });
  return {
    planA: buildDrawingDocument(planA.sheet, { ...baseSettings, planType: "road_shape" }, planA.diagnostics),
    planB: buildDrawingDocument(
      planB.sheet,
      { ...baseSettings, planType: "centerline_only" },
      planB.diagnostics,
    ),
    profile: buildDrawingDocument(profile.sheet, baseSettings, profile.diagnostics),
    cross: buildDrawingDocument(cross.sheet, baseSettings, cross.diagnostics),
    result,
  };
}

describe("Phase 5 Japanese remediation DXF artifacts", () => {
  it("writes Type A/B plan, profile, and cross-section DXF with parser round-trip", () => {
    mkdirSync(OUT_DIR, { recursive: true });
    const docs = buildDocs();
    expect(docs.result.vertical.segments.some((segment) => segment.pvcPhysicalDistance !== undefined)).toBe(
      true,
    );

    const cases = [
      { kind: "plan-type-a" as const, document: docs.planA, file: "plan-type-a.dxf" },
      { kind: "plan-type-b-centerline" as const, document: docs.planB, file: "plan-type-b-centerline.dxf" },
      { kind: "profile-band" as const, document: docs.profile, file: "profile-band.dxf" },
      { kind: "cross-section" as const, document: docs.cross, file: "cross-section.dxf" },
    ];

    for (const entry of cases) {
      const exported = exportFormalDrawingDxf(entry.kind, entry.document, {
        timestamp: new Date("2026-07-14T06:00:00Z"),
        projectId: "remediation",
      });
      const path = join(OUT_DIR, entry.file);
      writeFileSync(path, exported.dxf, "utf8");
      expect(exported.fileName).toContain(entry.kind);
      expect(statSync(path).size).toBeGreaterThan(0);
      expect(exported.dxf.trimEnd().endsWith("0\nEOF")).toBe(true);
      expect(exported.dxf).not.toMatch(/NaN|Infinity/);

      const parsed = new DxfParser().parseSync(exported.dxf);
      expect(parsed).toBeTruthy();
      const entities = Object.values(parsed?.entities ?? {});
      expect(entities.length).toBeGreaterThan(0);

      if (entry.kind === "plan-type-b-centerline") {
        const circles = entities.filter((entity) => (entity as { type?: string }).type === "CIRCLE");
        expect(circles.length).toBeGreaterThan(0);
        const centers = new Map<string, number>();
        for (const circle of circles as Array<{ center?: { x: number; y: number } }>) {
          const key = `${circle.center?.x.toFixed(3)},${circle.center?.y.toFixed(3)}`;
          centers.set(key, (centers.get(key) ?? 0) + 1);
        }
        expect([...centers.values()].some((count) => count >= 2)).toBe(true);
      }

      if (entry.kind === "plan-type-a" || entry.kind === "plan-type-b-centerline") {
        expect(exported.dxf).toContain("座標表");
      }

      if (entry.kind === "profile-band") {
        expect(exported.dxf).toContain(ja.liner.formalDrawing.bandRows.additionalDistance);
        expect(exported.dxf).toContain(ja.liner.formalDrawing.bandRows.designElevation);
        expect(exported.dxf).toContain(ja.liner.formalDrawing.bandRows.crossfall);
      }
    }
  });
});
