import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import projectSchema from "../../../../../schemas/project.schema.json";
import { createDefaultProject } from "../../../data/defaultProject";
import {
  buildIntermediateInputFromDomainDraft,
  withProjectLinerDomainDraft,
} from "../../adapters/linerProjectDraft";
import { buildLinerViewerReviewFromDraft } from "../../adapters/linerViewerAdapter";
import type { LinerDraft } from "../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";
import { LINER_DIAGNOSTIC_CODES } from "../../core/diagnostics";
import {
  applyLinerHeadlessFixtureMemberRules,
  createHeadlessLinerFrameProject,
  LINER_HEADLESS_ANALYSIS_SETTINGS,
  LINER_HEADLESS_PLACEHOLDER_LOAD_CASE,
  validateGeneratedLinerProject,
} from "../../headless";
import { convertImporterToPhase35Draft } from "../export/ImporterToPhase35Adapter";
import { buildBuiltInSampleProject } from "./builtInSampleDataset";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

function compileProjectValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(projectSchema);
}

function builtInDomainDraft() {
  const conversion = convertImporterToPhase35Draft(buildBuiltInSampleProject());
  expect(conversion.draft).not.toBeNull();
  return conversion.draft!;
}

function builtInLinerDraft(): LinerDraft {
  return buildIntermediateInputFromDomainDraft(builtInDomainDraft());
}

function mappingReviewBaseProject() {
  const project = withProjectLinerDomainDraft(createDefaultProject(), builtInDomainDraft());
  return {
    ...project,
    loadCases:
      project.loadCases.length > 0
        ? project.loadCases
        : [{ ...LINER_HEADLESS_PLACEHOLDER_LOAD_CASE }],
    analysisSettings: {
      ...LINER_HEADLESS_ANALYSIS_SETTINGS,
      ...project.analysisSettings,
      solver: project.analysisSettings.solver ?? LINER_HEADLESS_ANALYSIS_SETTINGS.solver,
    },
  };
}

describe("built-in sample Mapping Review", () => {
  it("produces no LINER_FRAME_ZERO_LENGTH_MEMBER diagnostics", () => {
    const intermediate = applyLinerHeadlessFixtureMemberRules(
      buildIntermediateResult(builtInLinerDraft()),
    );
    const headless = createHeadlessLinerFrameProject({
      intermediate,
      baseProject: createDefaultProject(),
    });

    expect(
      headless.diagnostics.filter(
        (diagnostic) => diagnostic.code === LINER_DIAGNOSTIC_CODES.zeroLengthMember,
      ),
    ).toEqual([]);
    expect(headless.mappingResult.members).toHaveLength(416);
  });

  it("does not double-count mapper diagnostics in headless output", () => {
    const intermediate = applyLinerHeadlessFixtureMemberRules(
      buildIntermediateResult(builtInLinerDraft()),
    );
    const headless = createHeadlessLinerFrameProject({
      intermediate,
      baseProject: createDefaultProject(),
    });

    const mapperZeroLengthCount = headless.mappingResult.diagnostics.filter(
      (diagnostic) => diagnostic.code === LINER_DIAGNOSTIC_CODES.zeroLengthMember,
    ).length;
    const headlessZeroLengthCount = headless.diagnostics.filter(
      (diagnostic) => diagnostic.code === LINER_DIAGNOSTIC_CODES.zeroLengthMember,
    ).length;

    expect(headlessZeroLengthCount).toBe(mapperZeroLengthCount);
  });

  it("produces no LINER_FRAME_SCHEMA_INVALID diagnostics", () => {
    const project = mappingReviewBaseProject();
    const intermediate = applyLinerHeadlessFixtureMemberRules(
      buildIntermediateResult(builtInLinerDraft()),
    );
    const headless = createHeadlessLinerFrameProject({
      intermediate,
      baseProject: project,
    });

    expect(headless.validationReady).toBe(true);
    expect(
      headless.diagnostics.filter(
        (diagnostic) => diagnostic.code === LINER_DIAGNOSTIC_CODES.invalidFrameSchema,
      ),
    ).toEqual([]);
    expect(validateGeneratedLinerProject(headless.project!)).toEqual([]);
  });

  it("keeps measuredGrid preview at 225 points and intermediate grid at 34 lines", () => {
    const domainDraft = builtInDomainDraft();
    expect(domainDraft.measuredGrid?.points).toHaveLength(225);

    const intermediate = applyLinerHeadlessFixtureMemberRules(
      buildIntermediateResult(buildIntermediateInputFromDomainDraft(domainDraft)),
    );
    expect(intermediate.grid.points).toHaveLength(225);
    expect(intermediate.grid.lines).toHaveLength(34);
  });

  it("keeps frame at 225 nodes and 416 members", () => {
    const review = buildLinerViewerReviewFromDraft(
      builtInLinerDraft(),
      mappingReviewBaseProject(),
    );

    expect(review.summary.nodeCount).toBe(225);
    expect(review.summary.memberCount).toBe(416);
    expect(review.summary.validationReady).toBe(true);
  });

  it("passes project schema validation before and after apply", () => {
    const validate = compileProjectValidator();
    const beforeApply = mappingReviewBaseProject();

    expect(validate(beforeApply)).toBe(true);

    const review = buildLinerViewerReviewFromDraft(
      builtInLinerDraft(),
      beforeApply,
    );
    expect(review.headless.project).not.toBeNull();
    expect(validate(review.headless.project)).toBe(true);
    expect(review.headless.project?.liner?.domainDraft).toBeDefined();
  });

  it("still works without measuredGrid via nominalOffset fallback path", async () => {
    const { buildIntermediateResult } = await import("../../core/pipeline/pipeline");
    const withoutMeasured = buildIntermediateResult({
      alignment: {
        id: "alignment-fallback",
        linerModelId: "fallback-model",
        coordinatePolicyId: "global",
        elements: [
          {
            type: "straight",
            id: "L1",
            start: { x: 0, y: 0 },
            azimuth: 0,
            length: 20,
          },
        ],
      },
      stationDefinition: { originDisplayedStation: 0, interval: 10 },
      offsets: [-5, 0, 5],
      z: 10,
    });

    expect(withoutMeasured.grid.points).toHaveLength(9);
    expect(withoutMeasured.grid.points[4]?.x).toBeCloseTo(10, 1);
  });

  it("matches examples/project.json schema when liner metadata is absent", () => {
    const validate = compileProjectValidator();
    const exampleProject = JSON.parse(
      readFileSync(join(repoRoot, "examples/project.json"), "utf8"),
    );
    expect(validate(exampleProject)).toBe(true);
  });
});
