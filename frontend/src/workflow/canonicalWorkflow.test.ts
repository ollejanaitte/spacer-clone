import { describe, expect, it } from "vitest";
import {
  CANONICAL_WORKFLOW_STEP_IDS,
  CANONICAL_WORKFLOW_TOTAL_STEPS,
  canonicalWorkflowSteps,
  isCanonicalWorkflowStepId,
  isWorkflowConnected,
  isWorkflowStepEntryEnabled,
  resolveWorkflowNavigation,
  resolveWorkflowStep,
  workflowProgress,
} from "./canonicalWorkflow";
import { SITE_CONTEXT_ROUTE_PATH } from "./routes";

describe("canonicalWorkflow", () => {
  it("defines the canonical 10-step workflow in order", () => {
    expect(canonicalWorkflowSteps()).toHaveLength(10);
    expect(CANONICAL_WORKFLOW_TOTAL_STEPS).toBe(10);
    expect(CANONICAL_WORKFLOW_STEP_IDS).toEqual([
      "project",
      "siteContext",
      "road",
      "bridgePlacement",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
      "deliverables",
      "saveClose",
    ]);
  });

  it("orders every step 1-based and unique", () => {
    const steps = canonicalWorkflowSteps();
    steps.forEach((step, index) => {
      expect(step.order).toBe(index + 1);
    });
    expect(new Set(steps.map((s) => s.order)).size).toBe(steps.length);
  });

  it("exposes the Site Context entry at step 2 (site conditions)", () => {
    const step = resolveWorkflowStep("siteContext");
    expect(step).not.toBeNull();
    expect(step?.route).toBe(SITE_CONTEXT_ROUTE_PATH);
    expect(step?.order).toBe(2);
  });

  it("flags only genuinely connected steps as connected", () => {
    expect(isWorkflowConnected("project")).toBe(true);
    expect(isWorkflowConnected("road")).toBe(true);
    expect(isWorkflowConnected("analysis")).toBe(true);
    expect(isWorkflowConnected("saveClose")).toBe(true);
    expect(isWorkflowConnected("siteContext")).toBe(false);
    expect(isWorkflowConnected("deliverables")).toBe(false);
  });

  it("resolves guided prev/next navigation", () => {
    const project = resolveWorkflowNavigation("project");
    expect(project).toEqual({
      hasPrev: false,
      hasNext: true,
      prev: null,
      next: "siteContext",
      index: 0,
    });
    const siteContext = resolveWorkflowNavigation("siteContext");
    expect(siteContext).toEqual({
      hasPrev: true,
      hasNext: true,
      prev: "project",
      next: "road",
      index: 1,
    });
    const saveClose = resolveWorkflowNavigation("saveClose");
    expect(saveClose.hasNext).toBe(false);
    expect(saveClose.next).toBeNull();
    expect(saveClose.index).toBe(9);
  });

  it("computes 1-based progress", () => {
    expect(workflowProgress("project")).toBe(1);
    expect(workflowProgress("siteContext")).toBe(2);
    expect(workflowProgress("saveClose")).toBe(10);
  });

  it("validates step ids", () => {
    expect(isCanonicalWorkflowStepId("road")).toBe(true);
    expect(isCanonicalWorkflowStepId("roadAndBridge")).toBe(false);
  });

  it("enables steps that have an entry route and are not pending", () => {
    for (const step of canonicalWorkflowSteps()) {
      expect(isWorkflowStepEntryEnabled(step)).toBe(true);
    }
    const siteContext = resolveWorkflowStep("siteContext");
    expect(siteContext).not.toBeNull();
    expect(isWorkflowStepEntryEnabled({ ...siteContext!, route: null })).toBe(false);
    expect(isWorkflowStepEntryEnabled({ ...siteContext!, connectionStatus: "pending" })).toBe(false);
  });
});