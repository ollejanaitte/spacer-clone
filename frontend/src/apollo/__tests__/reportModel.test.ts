import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import {
  REPORT_CHAPTER_REGISTRY,
  assertDevelopmentReportExportable,
  assertFormalReportRejected,
  buildReportModel,
  renderReportModelHtml,
  reportModelToCalculationCsv,
  reportModelToJson,
} from "../report/reportModel";

function generatedProject() {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  project = withBridgeStructureField(project, "steelUnitWeight", 77);
  project = withBridgeStructureField(project, "rcUnitWeight", 24.5);
  const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!generated.ok) throw new Error(generated.diagnostics.join("; "));
  return generated.project;
}

describe("reportModel development", () => {
  it("builds all registry chapters in order without formal OK/NG", () => {
    const model = buildReportModel(generatedProject());
    expect(model.mode).toBe("DEVELOPMENT");
    expect(model.authorizationStatus).toBe("NOT_GRANTED");
    expect(model.audit.formalOkNgEmitted).toBe(false);
    expect(model.chapters.map((c) => c.id)).toEqual(REPORT_CHAPTER_REGISTRY.map((c) => c.id));
    expect(model.warnings.join(" ")).toMatch(/UNVERIFIED/);
    const html = renderReportModelHtml(model);
    expect(html).toContain("UNVERIFIED DEVELOPMENT OUTPUT");
    expect(html).toContain("CH-QUANTITY");
    expect(html).not.toMatch(/正式OK|正式NG|PASS_FORMAL/);
  });

  it("does not zero-fill missing calculation series", () => {
    const model = buildReportModel(generatedProject());
    const csv = reportModelToCalculationCsv(model);
    expect(csv).toContain("NOT_AVAILABLE");
    expect(csv.split("\n")[1]).not.toMatch(/^LC1,0,0,0,0/);
    const reaction = model.chapters.find((c) => c.id === "CH-REACTIONS")?.rows[0];
    expect(reaction?.value).toBe("NOT_AVAILABLE");
  });

  it("rejects STALE and FORMAL export", () => {
    const generated = generatedProject();
    const stale = withBridgeStructureField(generated, "girderCount", 5);
    const model = buildReportModel(stale);
    expect(model.stale).toBe(true);
    expect(() => assertDevelopmentReportExportable(model)).toThrow(/STALE/);
    expect(() => assertFormalReportRejected(generated)).toThrow(/FORMAL report export rejected/);
  });

  it("JSON includes checksums and quantity chapter values", () => {
    const model = buildReportModel(generatedProject());
    const parsed = JSON.parse(reportModelToJson(model));
    expect(parsed.inputChecksum).toBe(model.inputChecksum);
    expect(parsed.resultChecksum).toBe(model.resultChecksum);
    expect(parsed.chapters.find((c: { id: string }) => c.id === "CH-QUANTITY").rows.length).toBeGreaterThan(0);
  });
});
