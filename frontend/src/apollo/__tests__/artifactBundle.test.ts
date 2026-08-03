import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { SIMPLE_SINGLE_SPAN_SAMPLE_INPUT } from "../bridgeStructure/sampleInputs";
import { withBridgeStructureInputDraft } from "../bridgeStructure/generateBsdd";
import {
  assertBundleExportAllowed,
  buildDevelopmentArtifactBundle,
  renderMultiSheetDrawingSetHtml,
} from "../drawing/artifactBundle";
import { buildGeneralArrangementDrawingSet } from "../drawing/drawingSetModel";
import { buildStoreZip, textToBytes } from "../drawing/storeZip";

function generated() {
  let project = withBridgeStructureInputDraft(createDefaultProject(), () => ({
    ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
    generatedAt: null,
  }));
  const g = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!g.ok) throw new Error(g.diagnostics.join("; "));
  return g.project;
}

describe("storeZip", () => {
  it("builds ZIP with local/central headers", () => {
    const zip = buildStoreZip([
      { name: "a.txt", data: textToBytes("hello") },
      { name: "b/c.txt", data: textToBytes("world") },
    ]);
    expect(zip[0]).toBe(0x50); // PK
    expect(zip[1]).toBe(0x4b);
    expect(zip.length).toBeGreaterThan(40);
  });
});

describe("artifactBundle", () => {
  it("builds complete sheet set and ZIP with manifest/SHA256", () => {
    const project = generated();
    const generatedAt = "2026-08-03T01:00:00.000Z";
    const bundle = buildDevelopmentArtifactBundle(project, { generatedAt, appCommitSha: "testsha" });
    expect(bundle.authorizationStatus).toBe("NOT_GRANTED");
    expect(bundle.filename).toContain("apollo-development-deliverables_");
    expect(bundle.zipBytes[0]).toBe(0x50);
    expect(bundle.files.some((f) => f.path === "00_README.txt")).toBe(true);
    expect(bundle.files.some((f) => f.path === "01_manifest.json")).toBe(true);
    expect(bundle.files.some((f) => f.path === "SHA256SUMS.txt")).toBe(true);
    expect(bundle.files.some((f) => f.path.includes("G-01_general_arrangement.svg"))).toBe(true);
    expect(bundle.files.some((f) => f.path.includes("G-07_member_schedule.dxf"))).toBe(true);
    expect(bundle.files.some((f) => f.path.includes("S-01_standard_section.svg"))).toBe(true);
    expect(bundle.files.some((f) => f.path === "member_schedule.csv")).toBe(true);
    const manifest = JSON.parse(bundle.files.find((f) => f.path === "01_manifest.json")!.content as string);
    expect(manifest.files.length).toBeGreaterThan(10);
    expect(manifest.inputChecksum).toBe(bundle.inputChecksum);
    expect(new Set(manifest.files.map((f: { path: string }) => f.path)).size).toBe(manifest.files.length);

    const set = buildGeneralArrangementDrawingSet(project, { generatedAt });
    expect(set.sheets).toHaveLength(7);
    const multi = renderMultiSheetDrawingSetHtml(set);
    expect(multi).toContain("G-01");
    expect(multi).toContain("G-07");
    expect(multi).toContain("page-break-after");
    expect(multi).toContain("NOT FOR DESIGN");
  });

  it("rejects STALE and checksum mismatch for bundle", () => {
    const project = generated();
    const set = buildGeneralArrangementDrawingSet(project);
    expect(() => assertBundleExportAllowed(project, set)).not.toThrow();
    const stale = withBridgeStructureField(project, "width", 11);
    const staleSet = buildGeneralArrangementDrawingSet(stale);
    expect(() => assertBundleExportAllowed(stale, staleSet)).toThrow(/STALE/);
    expect(() => buildDevelopmentArtifactBundle(stale)).toThrow(/STALE/);
  });
});
