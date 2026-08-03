import { describe, expect, it } from "vitest";
import {
  WORKFLOW_STEP_DEFINITIONS,
  assertWorkflowRegistryShape,
  getWorkflowStepDefinition,
} from "../registry";
import {
  WORKFLOW_DEPENDENCY_EDGES,
  assertEdgesMatchRegistry,
  assertNoDependencyCycles,
  downstreamOf,
  topologicalOrder,
} from "../dependencies";
import { WORKFLOW_CAPABILITIES, getWorkflowCapability, isFutureCapability } from "../capabilityRegistry";
import { WORKFLOW_STEP_IDS } from "../types";

describe("workflow registry", () => {
  it("defines WF-01..WF-15 with unique ids and sequential order", () => {
    expect(WORKFLOW_STEP_DEFINITIONS).toHaveLength(15);
    assertWorkflowRegistryShape();
    const ids = WORKFLOW_STEP_DEFINITIONS.map((entry) => entry.workflowStepId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(WORKFLOW_STEP_IDS);
  });

  it("covers every capability exactly once", () => {
    expect(WORKFLOW_CAPABILITIES).toHaveLength(15);
    const keys = WORKFLOW_CAPABILITIES.map((entry) => entry.capabilityKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps WF-01/WF-06 as future (non-gating) capabilities; WF-03/WF-05 are IMPLEMENTED", () => {
    expect(getWorkflowCapability("WF-01").status).toBe("PLANNED");
    expect(getWorkflowCapability("WF-03").status).toBe("IMPLEMENTED");
    expect(getWorkflowCapability("WF-05").status).toBe("IMPLEMENTED");
    expect(getWorkflowCapability("WF-06").status).toBe("PLANNED");
    expect(isFutureCapability("WF-01")).toBe(true);
    expect(isFutureCapability("WF-03")).toBe(false);
    expect(isFutureCapability("WF-05")).toBe(false);
    expect(isFutureCapability("WF-02")).toBe(false);
  });

  it("has no dependency cycles and edges match the registry", () => {
    expect(() => assertNoDependencyCycles()).not.toThrow();
    expect(() => assertEdgesMatchRegistry()).not.toThrow();
  });

  it("declares the frozen dependency edges", () => {
    const edges = WORKFLOW_DEPENDENCY_EDGES.map(([from, to]) => `${from}->${to}`);
    expect(edges).toContain("WF-01->WF-02");
    expect(edges).toContain("WF-02->WF-04");
    expect(edges).toContain("WF-07->WF-08");
    expect(edges).toContain("WF-08->WF-09");
    expect(edges).toContain("WF-10->WF-12");
    expect(edges).toContain("WF-12->WF-14");
    expect(edges).toContain("WF-14->WF-15");
  });

  it("topologically sorts and propagates downstream", () => {
    const order = topologicalOrder();
    expect(order[0]).toBe("WF-01");
    expect(order.at(-1)).toBe("WF-15");
    for (const [from, to] of WORKFLOW_DEPENDENCY_EDGES) {
      expect(order.indexOf(from)).toBeLessThan(order.indexOf(to));
    }
    expect(downstreamOf("WF-08")).toContain("WF-09");
    expect(downstreamOf("WF-10")).toEqual(expect.arrayContaining(["WF-12", "WF-13"]));
  });

  it("exposes navigation targets for every step", () => {
    for (const def of WORKFLOW_STEP_DEFINITIONS) {
      expect(def.navigationTarget.path.length).toBeGreaterThan(0);
      expect(def.navigationTarget.label.length).toBeGreaterThan(0);
    }
  });

  it("getWorkflowStepDefinition throws for unknown id", () => {
    expect(() => getWorkflowStepDefinition("WF-99" as never)).toThrow();
  });
});
