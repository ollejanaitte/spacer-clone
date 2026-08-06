import { describe, expect, it } from "vitest";
import type { ProjectModel } from "../../types";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
} from "../bridgeStructure";
import { fillContinuousBridgeStructureInput, fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { EMITTED_CHAPTER_IDS, FORBIDDEN_CHAPTER_IDS } from "../report/reportModelTypes";
import { buildContinuousReportModel, continuousReportModelToJson } from "../report/reportModelContinuous";

function generate(project: ProjectModel) {
  const draft = getBridgeStructureInputDraft(project);
  const result = generateBridgeStructureFromInput(project, draft);
  if (!result.ok) throw new Error(result.diagnostics.join("; "));
  return result.project;
}

describe("buildContinuousReportModel (CONTINUOUS)", () => {
  it("emits canonical CP-* chapters, no forbidden/CH-* chapters, with CONTINUOUS rules", () => {
    const model = buildContinuousReportModel(generate(fillContinuousBridgeStructureInput(createDefaultProject())));

    expect(model.mode).toBe("DEVELOPMENT");
    expect(model.authorizationStatus).toBe("NOT_GRANTED");
    expect(model.designOrConstructionUse).toBe("PROHIBITED");
    expect(model.developmentLabel).toBe("UNVERIFIED_DEVELOPMENT_ONLY");
    expect(model.audit.formalOkNgEmitted).toBe(false);
    expect(model.warnings).toContain("UNVERIFIED DEVELOPMENT OUTPUT");
    expect(typeof model.resultChecksum).toBe("string");
    expect(model.resultChecksum.length).toBeGreaterThan(0);

    const ids = model.chapters.map((c) => c.id);
    expect(ids).toEqual(EMITTED_CHAPTER_IDS);
    expect(ids.every((id) => !id.startsWith("CH-"))).toBe(true);
    for (const forbidden of FORBIDDEN_CHAPTER_IDS) {
      expect(ids).not.toContain(forbidden);
    }

    const cp06 = model.chapters.find((c) => c.id === "CP-06")!.summary;
    expect(cp06.some((r) => r.value === "CONTINUOUS")).toBe(true);

    const cp07 = model.chapters.find((c) => c.id === "CP-07")!;
    expect(cp07.summary.some((r) => r.missingReason === "NOT_AVAILABLE")).toBe(true); // spanLength NOT_AVAILABLE for CONTINUOUS
    expect(cp07.detail?.some((r) => r.value !== "NOT_AVAILABLE")).toBe(true); // per-span lengths present

    const cp13 = model.chapters.find((c) => c.id === "CP-13")!.summary[0]!;
    expect(cp13.value).toBe("NOT_AVAILABLE");
    expect(cp13.missingReason).toBe("NOT_AVAILABLE");

    const cp25 = model.chapters.find((c) => c.id === "CP-25")!;
    expect(cp25.summary.some((r) => r.source === "resultChecksum (CP-chapters+checksums)")).toBe(true);

    // No numeric analysis result payloads emitted.
    const json = JSON.parse(continuousReportModelToJson(model));
    expect(json.audit.formalOkNgEmitted).toBe(false);
    expect(json.authorizationStatus).toBe("NOT_GRANTED");
  });

  it("produces a non-stale model for a freshly generated continuous project", () => {
    const model = buildContinuousReportModel(generate(fillContinuousBridgeStructureInput(createDefaultProject())));
    expect(model.stale).toBe(false);
    expect(model.bridge.spanSystem).toBe("continuous");
    expect(model.validation.valid).toBe(true);
  });
});

describe("buildContinuousReportModel (SIMPLE_SINGLE regression)", () => {
  it("emits canonical chapters with section properties computed (not NOT_AVAILABLE)", () => {
    const model = buildContinuousReportModel(generate(fillSimpleSingleBridgeStructureInput(createDefaultProject())));
    const ids = model.chapters.map((c) => c.id);
    expect(ids).toEqual(EMITTED_CHAPTER_IDS);
    expect(model.validation.valid).toBe(true);
    const cp13 = model.chapters.find((c) => c.id === "CP-13")!.summary[0]!;
    expect(cp13.value).not.toBe("NOT_AVAILABLE");
    expect(model.section.properties).not.toBeNull();
  });
});
