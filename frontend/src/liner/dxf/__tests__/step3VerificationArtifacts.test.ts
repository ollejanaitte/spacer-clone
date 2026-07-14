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
import { exportFormalDrawingDxf, type FormalDrawingDxfKind } from "../export/exportFormalDrawingDxf";

const OUT_DIR = "/tmp/phase5-step3-dxf-verification";

function buildDocument(kind: "plan" | "profile" | "cross-section") {
  const draft = createDefaultLinerDraft();
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
  const result = buildIntermediateResult(draft);
  const settings = createDrawingSettingsFromDraft(result, draft.drawingSettings);
  const builder =
    kind === "plan"
      ? createPlanDrawingBuilder()
      : kind === "profile"
        ? createProfileDrawingBuilder()
        : createCrossSectionDrawingBuilder(settings.selectedCrossSectionStation);
  const output = builder.build({ result: result, settings });
  return buildDrawingDocument(output.sheet, settings, output.diagnostics);
}

describe("Phase 5 Step 3 DXF file generation for LibreCAD", () => {
  it("writes plan, profile-band, and cross-section DXF files with parser round-trip", () => {
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(join(OUT_DIR, "librecad"), { recursive: true });

    const cases: Array<{ kind: FormalDrawingDxfKind; source: "plan" | "profile" | "cross-section"; file: string }> = [
      { kind: "plan", source: "plan", file: "plan.dxf" },
      { kind: "profile-band", source: "profile", file: "profile-band.dxf" },
      { kind: "cross-section", source: "cross-section", file: "cross-section.dxf" },
    ];

    for (const entry of cases) {
      const document = buildDocument(entry.source);
      const exported = exportFormalDrawingDxf(entry.kind, document, {
        timestamp: new Date("2026-07-14T04:00:00Z"),
        projectId: "verify",
      });
      const path = join(OUT_DIR, entry.file);
      writeFileSync(path, exported.dxf, "utf8");

      expect(exported.dxf.startsWith("0\nSECTION")).toBe(true);
      expect(exported.dxf.trimEnd().endsWith("0\nEOF")).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(0);
      expect(exported.entityCount).toBeGreaterThan(0);

      const parsed = new DxfParser().parseSync(exported.dxf);
      expect(parsed).toBeTruthy();
      const entities = Object.values(parsed?.entities ?? {});
      expect(entities.length).toBeGreaterThan(0);

      for (const entity of entities as unknown as Array<Record<string, unknown>>) {
        const vertices = (entity.vertices as Array<{ x: number; y: number }> | undefined) ?? [];
        for (const vertex of vertices) {
          expect(Number.isFinite(vertex.x)).toBe(true);
          expect(Number.isFinite(vertex.y)).toBe(true);
        }
        if (typeof entity.x === "number") {
          expect(Number.isFinite(entity.x)).toBe(true);
        }
        if (typeof entity.y === "number") {
          expect(Number.isFinite(entity.y)).toBe(true);
        }
        if (typeof entity.text === "string" && /[^\x00-\x7F]/.test(entity.text)) {
          expect(entity.text.length).toBeGreaterThan(0);
        }
      }

      const layers = Object.keys(parsed?.tables?.layer?.layers ?? {});
      expect(layers.length).toBeGreaterThan(0);
      expect(exported.dxf).toContain("9\n$ACADVER\n1\nAC1021");
      expect(exported.dxf).toContain("9\n$DWGCODEPAGE\n3\nUTF-8");
    }
  });
});
