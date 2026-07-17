import { describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerCrossSectionTemplate,
} from "../../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../pipeline/pipeline";
import { LINER_LDIST_DIAGNOSTIC_CODES } from "../diagnostics";
import { buildLdistValidationContext, validateLdistJobs } from "../validateLdistJobs";
import type { LdistJobDraft } from "../../../schema/types";

function baseJob(overrides: Partial<LdistJobDraft> = {}): LdistJobDraft {
  return {
    id: "job-1",
    alignmentId: "alignment-1",
    kind: "grid_distance",
    stationScope: "all_generated",
    pairs: [{ fromLineId: "OL-left", toLineId: "OL-right" }],
    ...overrides,
  };
}

function buildContext() {
  let draft = addLinerOffset(createDefaultLinerDraft());
  draft = updateLinerCrossSectionTemplate(draft, {
    id: draft.crossSections?.[0]?.id ?? `CS-${draft.alignment.id}`,
    name: draft.crossSections?.[0]?.name ?? "Test",
    offsetLines: [
      { id: "OL-left", offset: -3, elevation: 0, role: "custom" },
      { id: "OL-right", offset: 3, elevation: 0, role: "custom" },
    ],
  });
  const intermediate = buildIntermediateResult(draft);
  return buildLdistValidationContext(draft.linerAlignments ?? [], intermediate);
}

describe("validateLdistJobs fail-closed", () => {
  it("rejects unknown alignmentId", () => {
    const diagnostics = validateLdistJobs(
      [baseJob({ alignmentId: "missing-alignment" })],
      buildContext(),
    );
    expect(diagnostics.some((entry) => entry.code === LINER_LDIST_DIAGNOSTIC_CODES.alignmentReferenceMissing)).toBe(
      true,
    );
  });

  it("rejects unknown line references", () => {
    const diagnostics = validateLdistJobs(
      [baseJob({ pairs: [{ fromLineId: "missing", toLineId: "OL-right" }] })],
      buildContext(),
    );
    expect(diagnostics.some((entry) => entry.code === LINER_LDIST_DIAGNOSTIC_CODES.lineReferenceMissing)).toBe(true);
  });

  it("requires referenceLineId for mode_b", () => {
    const diagnostics = validateLdistJobs(
      [baseJob({ distanceMode: "mode_b", referenceLineId: undefined })],
      buildContext(),
    );
    expect(diagnostics.some((entry) => entry.code === LINER_LDIST_DIAGNOSTIC_CODES.referenceLineRequired)).toBe(
      true,
    );
  });

  it("rejects empty pairs for grid_distance", () => {
    const diagnostics = validateLdistJobs([baseJob({ pairs: [] })], buildContext());
    expect(diagnostics.some((entry) => entry.code === LINER_LDIST_DIAGNOSTIC_CODES.pairsEmpty)).toBe(true);
  });

  it("rejects invalid pierId on overhang jobs", () => {
    const diagnostics = validateLdistJobs(
      [
        baseJob({
          kind: "overhang",
          leftLineId: "OL-left",
          rightLineId: "OL-right",
          pierId: "missing-pier",
          pairs: [],
        }),
      ],
      buildContext(),
    );
    expect(diagnostics.some((entry) => entry.code === LINER_LDIST_DIAGNOSTIC_CODES.pierReferenceInvalid)).toBe(
      true,
    );
  });

  it("rejects missing job schema fields", () => {
    const diagnostics = validateLdistJobs(
      [baseJob({ id: "", alignmentId: "" })],
      buildContext(),
    );
    expect(diagnostics.some((entry) => entry.code === LINER_LDIST_DIAGNOSTIC_CODES.jobSchemaInvalid)).toBe(true);
  });
});
