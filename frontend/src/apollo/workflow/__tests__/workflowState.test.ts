import { afterEach, describe, expect, it } from "vitest";
import { createDefaultProject } from "../../../data/defaultProject";
import type { ProjectModel } from "../../../types";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../../bridgeStructure";
import { fillContinuousBridgeStructureInput, fillSimpleSingleBridgeStructureInput } from "../../testing/bridgeStructureFixtures";
import { createApollo200mContinuousBridgeSample } from "../../sampleProjects";
import { buildWorkflowStateModel } from "../index";
import { evaluateStep, resolveBaseStatus } from "../evaluators";
import { resolveRecommendedStep } from "../recommendedAction";
import type { StepEvidence } from "../selectors";
import { writeWorkflowAck } from "../selectors";

const STORAGE = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= {
  getItem: (key: string) => STORAGE.get(key) ?? null,
  setItem: (key: string, value: string) => {
    STORAGE.set(key, String(value));
  },
  removeItem: (key: string) => {
    STORAGE.delete(key);
  },
  clear: () => STORAGE.clear(),
  key: () => null,
  length: 0,
};

function statusOf(project: ProjectModel, stepId: string) {
  const model = buildWorkflowStateModel(project);
  const step = model.steps.find((entry) => entry.workflowStepId === stepId);
  if (!step) throw new Error(`Missing step ${stepId}`);
  return step;
}

function generatedProject(): ProjectModel {
  let project = createDefaultProject();
  project = fillSimpleSingleBridgeStructureInput(project);
  const result = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!result.ok) throw new Error(`generate failed: ${result.diagnostics.join("; ")}`);
  return result.project;
}

function generatedContinuousProject(): ProjectModel {
  let project = createDefaultProject();
  project = fillContinuousBridgeStructureInput(project);
  const result = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!result.ok) throw new Error(`generate failed: ${result.diagnostics.join("; ")}`);
  return result.project;
}

function partialProject(): ProjectModel {
  let project = createDefaultProject();
  project = fillContinuousBridgeStructureInput(project);
  project = withBridgeStructureField(project, "width", null);
  return project;
}

function invalidProject(): ProjectModel {
  let project = createDefaultProject();
  project = fillContinuousBridgeStructureInput(project);
  project = withBridgeStructureField(project, "width", -5);
  return project;
}

function corruptProject(): ProjectModel {
  return {
    ...createDefaultProject(),
    apolloBridgeStructureInput: { schemaVersion: "1.0.0", generatedAt: null, spans: "broken" } as never,
  };
}

const sample = () => createApollo200mContinuousBridgeSample();

afterEach(() => {
  STORAGE.clear();
});

describe("workflow state model — registry & progress shape", () => {
  it("produces all 15 steps in registry order", () => {
    const model = buildWorkflowStateModel(sample());
    expect(model.steps.map((step) => step.workflowStepId)).toEqual([
      "WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07",
      "WF-08", "WF-09", "WF-10", "WF-11", "WF-12", "WF-13", "WF-14", "WF-15",
    ]);
    expect(model.currentRecommendedStepId).toBeTruthy();
    expect(model.progress.total).toBe(15);
  });

  it("carries NOT_GRANTED authorization summary", () => {
    const model = buildWorkflowStateModel(sample());
    expect(model.authorizationSummary.numericDesignAuthorization).toBe("NOT_GRANTED");
    expect(model.authorizationSummary.formalReleaseReadiness).toBe("NO_GO_PENDING_HUMAN_VALIDATION");
    expect(model.authorizationSummary.designOrConstructionUse).toBe("PROHIBITED");
  });
});

describe("workflow state — empty project", () => {
  const project = createDefaultProject();

  it("shows WF-01 as BLOCKED stub and WF-02 as AVAILABLE", () => {
    const wf01 = statusOf(project, "WF-01");
    expect(wf01.status).toBe("BLOCKED");
    expect(wf01.badges).toContain("CAPABILITY_PLANNED");
    expect(wf01.diagnostics.some((d) => d.code === "WF_CAPABILITY_PLANNED")).toBe(true);

    const wf02 = statusOf(project, "WF-02");
    expect(wf02.status).toBe("RECOMMENDED");
    expect(wf02.prerequisitesSatisfied).toBe(true);
  });

  it("keeps future stubs BLOCKED but does not block WF-02+", () => {
    const model = buildWorkflowStateModel(project);
    expect(statusOf(project, "WF-03").status).toBe("BLOCKED");
    expect(statusOf(project, "WF-05").status).toBe("BLOCKED");
    expect(statusOf(project, "WF-06").status).toBe("BLOCKED");
    expect(statusOf(project, "WF-02").status).toBe("RECOMMENDED");
  });

  it("does not mark un-generated steps as STALE", () => {
    const wf10 = statusOf(project, "WF-10");
    expect(wf10.status).not.toBe("STALE");
    expect(wf10.status).toBe("NOT_STARTED");
  });

  it("recommends exactly one step (WF-02, the first actionable)", () => {
    const model = buildWorkflowStateModel(project);
    expect(model.currentRecommendedStepId).toBe("WF-02");
    const recommended = model.steps.filter((step) => step.isRecommended);
    expect(recommended).toHaveLength(1);
  });
});

describe("workflow state — partial / invalid / corrupt input", () => {
  it("classifies partial input as INCOMPLETE (promoted to RECOMMENDED when recommended)", () => {
    const step = statusOf(partialProject(), "WF-02");
    expect(["INCOMPLETE", "RECOMMENDED"]).toContain(step.status);
    expect(step.isRecommended).toBe(true);
  });

  it("classifies invalid input as BLOCKED with WF_INPUT_INVALID", () => {
    const step = statusOf(invalidProject(), "WF-02");
    expect(step.status).toBe("BLOCKED");
    expect(step.diagnostics.some((d) => d.code === "WF_INPUT_INVALID" && d.blocking)).toBe(true);
  });

  it("classifies corrupted persisted data as ERROR", () => {
    const step = statusOf(corruptProject(), "WF-02");
    expect(step.status).toBe("ERROR");
    expect(step.diagnostics.some((d) => d.code === "WF_EXECUTION_ERROR")).toBe(true);
  });
});

describe("workflow state — valid generated project", () => {
  const project = generatedProject();

  it("marks input/section/quantity/report/drawing/output COMPLETE + NOT_AUTHORIZED", () => {
    for (const stepId of ["WF-02", "WF-04", "WF-10", "WF-12", "WF-13", "WF-14"]) {
      const step = statusOf(project, stepId);
      expect(step.status, stepId).toBe("COMPLETE");
      expect(step.badges, stepId).toContain("NOT_AUTHORIZED");
    }
  });

  it("keeps development PARTIAL steps from false COMPLETE (analysis/demand)", () => {
    const wf08 = statusOf(project, "WF-08");
    expect(["READY", "RECOMMENDED"]).toContain(wf08.status);
    expect(wf08.badges).toContain("PARTIAL");
    const wf09 = statusOf(project, "WF-09");
    expect(["AVAILABLE", "READY", "RECOMMENDED", "NOT_STARTED"]).toContain(wf09.status);
  });

  it("keeps WF-03/WF-05/WF-06 as future BLOCKED stubs (no false complete)", () => {
    for (const stepId of ["WF-03", "WF-05", "WF-06"]) {
      const step = statusOf(project, stepId);
      expect(step.status, stepId).toBe("BLOCKED");
      expect(step.diagnostics.some((d) => d.code === "WF_CAPABILITY_PLANNED")).toBe(true);
    }
  });

  it("attaches LOCAL_CRS_LEGACY warning to non-governance steps", () => {
    const wf10 = statusOf(project, "WF-10");
    expect(wf10.badges).toContain("LOCAL_CRS_LEGACY");
    expect(wf10.warnings.some((d) => d.code === "WF_LOCAL_CRS_WARNING")).toBe(true);
  });

  it("reports progress counts", () => {
    const model = buildWorkflowStateModel(project);
    expect(model.progress.complete).toBeGreaterThanOrEqual(6);
    expect(model.progress.notAuthorized).toBeGreaterThanOrEqual(6);
    expect(model.progress.blocked).toBeGreaterThanOrEqual(4);
  });
});

describe("workflow state — STALE propagation (OutputIntegration parity)", () => {
  it("mutating bridge input after generation makes dependent steps STALE", () => {
    let project = generatedProject();
    project = withBridgeStructureField(project, "width", 13);
    for (const stepId of ["WF-02", "WF-04", "WF-07", "WF-10", "WF-11", "WF-12", "WF-13", "WF-14"]) {
      const step = statusOf(project, stepId);
      expect(step.status, `${stepId} should be STALE`).toBe("STALE");
      expect(step.diagnostics.some((d) => d.code === "WF_RESULT_STALE")).toBe(true);
    }
  });

  it("prefers STALE regeneration in the recommended step", () => {
    let project = generatedProject();
    project = withBridgeStructureField(project, "width", 13);
    const model = buildWorkflowStateModel(project);
    expect(model.currentRecommendedStepId).toBe("WF-02");
    const recommended = model.steps.filter((step) => step.isRecommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0].workflowStepId).toBe("WF-02");
  });

  it("regeneration restores current state", () => {
    let project = generatedProject();
    project = withBridgeStructureField(project, "width", 13);
    const regenerated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    if (!regenerated.ok) throw new Error("regenerate failed");
    const step = statusOf(regenerated.project, "WF-02");
    expect(step.status).toBe("COMPLETE");
    expect(step.badges).toContain("NOT_AUTHORIZED");
  });
});

describe("workflow state — WF-15 user acknowledgment", () => {
  it("requires explicit human acknowledgment; never auto-completes", () => {
    const project = generatedProject();
    expect(statusOf(project, "WF-15").status).not.toBe("COMPLETE");
  });

  it("ack is checksum-bound: input mutation invalidates it", () => {
    let project = generatedProject();
    const before = statusOf(project, "WF-02");
    writeWorkflowAck(project.project.id, {
      acknowledgedAt: "2026-08-03T00:00:00.000Z",
      inputChecksum: before.currentChecksum ?? "unknown",
    });
    expect(statusOf(project, "WF-15").status).toBe("COMPLETE");

    project = withBridgeStructureField(project, "width", 14);
    expect(statusOf(project, "WF-15").status).toBe("STALE");
  });
});

describe("pure evaluator — statuses & priority", () => {
  const evidence = (partial: Partial<StepEvidence>): StepEvidence => ({
    workflowStepId: "WF-02",
    capability: "IMPLEMENTED",
    inputState: "EMPTY",
    resultState: "NONE",
    complete: false,
    corrupted: false,
    currentRevision: null,
    generatedRevision: null,
    currentChecksum: null,
    generatedChecksum: null,
    diagnostics: [],
    warnings: [],
    ...partial,
  });

  it("resolves COMPLETE with NOT_AUTHORIZED badge without overriding", () => {
    const result = evaluateStep({
      stepId: "WF-02",
      evidence: evidence({ inputState: "VALID", resultState: "CURRENT", complete: true }),
      prerequisitesSatisfied: true,
    });
    expect(result.status).toBe("COMPLETE");
    expect(result.badges).toContain("NOT_AUTHORIZED");
  });

  it("resolves BLOCKED for PLANNED capability", () => {
    const result = evaluateStep({
      stepId: "WF-03",
      evidence: evidence({ capability: "PLANNED" }),
      prerequisitesSatisfied: true,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.badges).toContain("CAPABILITY_PLANNED");
  });

  it("resolves ERROR for corrupted data", () => {
    const result = evaluateStep({
      stepId: "WF-02",
      evidence: evidence({ corrupted: true }),
      prerequisitesSatisfied: true,
    });
    expect(result.status).toBe("ERROR");
  });

  it("resolves OUT_OF_SCOPE for out-of-scope capability", () => {
    const result = evaluateStep({
      stepId: "WF-02",
      evidence: evidence({ capability: "OUT_OF_SCOPE" }),
      prerequisitesSatisfied: true,
    });
    expect(result.status).toBe("OUT_OF_SCOPE");
  });

  it("resolves NOT_STARTED when prerequisites are not satisfied", () => {
    const result = evaluateStep({
      stepId: "WF-10",
      evidence: evidence({ inputState: "VALID", resultState: "CURRENT", complete: true }),
      prerequisitesSatisfied: false,
    });
    expect(result.status).toBe("NOT_STARTED");
  });

  it("resolves STALE over READY (priority)", () => {
    const result = evaluateStep({
      stepId: "WF-10",
      evidence: evidence({ inputState: "VALID", resultState: "STALE" }),
      prerequisitesSatisfied: true,
    });
    expect(result.status).toBe("STALE");
  });

  it("resolves BLOCKED over STALE for invalid input (priority)", () => {
    const result = evaluateStep({
      stepId: "WF-02",
      evidence: evidence({ inputState: "INVALID", resultState: "STALE" }),
      prerequisitesSatisfied: true,
    });
    expect(result.status).toBe("BLOCKED");
  });

  it("resolves WARNING badge when non-blocking warnings exist", () => {
    const result = evaluateStep({
      stepId: "WF-07",
      evidence: evidence({
        capability: "PARTIAL",
        inputState: "VALID",
        resultState: "NOT_GENERATED",
        warnings: [
          {
            diagnosticId: "DIAG-X",
            workflowStepId: "WF-07",
            severity: "warning",
            code: "WF_PARTIAL_SCOPE_WARNING",
            message: "w",
            technicalDetail: "d",
            blocking: false,
            source: "test",
            remediation: "r",
            navigationTarget: null,
          },
        ],
      }),
      prerequisitesSatisfied: true,
    });
    expect(result.status).toBe("READY");
    expect(result.badges).toContain("PARTIAL");
    expect(result.badges).toContain("WARNING");
  });
});

describe("recommended action", () => {
  const steps = [
    { workflowStepId: "WF-01" as const, status: "BLOCKED" as const },
    { workflowStepId: "WF-02" as const, status: "AVAILABLE" as const },
    { workflowStepId: "WF-03" as const, status: "BLOCKED" as const },
    { workflowStepId: "WF-04" as const, status: "NOT_STARTED" as const },
  ];

  it("returns at most one recommended step", () => {
    expect(resolveRecommendedStep(steps)).toBe("WF-02");
  });

  it("prefers STALE upstream regeneration", () => {
    const result = resolveRecommendedStep([
      { workflowStepId: "WF-02", status: "COMPLETE" },
      { workflowStepId: "WF-08", status: "STALE" },
      { workflowStepId: "WF-09", status: "AVAILABLE" },
    ]);
    expect(result).toBe("WF-08");
  });

  it("returns null when nothing is actionable", () => {
    expect(
      resolveRecommendedStep([
        { workflowStepId: "WF-02", status: "COMPLETE" },
        { workflowStepId: "WF-03", status: "BLOCKED" },
        { workflowStepId: "WF-04", status: "NOT_STARTED" },
      ]),
    ).toBeNull();
  });

  it("skips ERROR / BLOCKED / OUT_OF_SCOPE", () => {
    expect(
      resolveRecommendedStep([
        { workflowStepId: "WF-02", status: "ERROR" },
        { workflowStepId: "WF-04", status: "BLOCKED" },
        { workflowStepId: "WF-05", status: "OUT_OF_SCOPE" },
        { workflowStepId: "WF-06", status: "INCOMPLETE" },
      ]),
    ).toBe("WF-06");
  });
});

describe("resolveBaseStatus — fixture matrix parity", () => {
  it("does not report un-generated as STALE (false STALE guard)", () => {
    const base = resolveBaseStatus(
      "WF-10",
      {
        workflowStepId: "WF-10",
        capability: "IMPLEMENTED",
        inputState: "VALID",
        resultState: "NOT_GENERATED",
        complete: false,
        corrupted: false,
        currentRevision: "r1",
        generatedRevision: null,
        currentChecksum: "c1",
        generatedChecksum: null,
        diagnostics: [],
        warnings: [],
      },
      true,
    );
    expect(base.status).toBe("READY");
  });
});
