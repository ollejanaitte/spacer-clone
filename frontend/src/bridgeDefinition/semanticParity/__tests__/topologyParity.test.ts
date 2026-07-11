import { describe, expect, it } from "vitest";
import { computeTopologyMetrics } from "../topologyParity";
import { normalizeProjectModelForSemanticParity } from "../normalize";
import { project } from "./fixtures/semanticParityFixtures";

describe("topology parity", () => {
  it("computes degree histogram for a line graph", () => {
    const model = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
          { id: "c", x: 2, y: 0, z: 0 },
        ],
        [
          { id: "m1", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" },
          { id: "m2", nodeI: "b", nodeJ: "c", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );
    const metrics = computeTopologyMetrics(model);

    expect(metrics.degreeHistogram).toEqual({ "1": 2, "2": 1 });
    expect(metrics.isolatedNodeCount).toBe(0);
    expect(metrics.connectedComponentCount).toBe(1);
  });

  it("detects isolated nodes", () => {
    const model = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
          { id: "lonely", x: 5, y: 0, z: 0 },
        ],
        [{ id: "m", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" }],
      ),
    );
    const metrics = computeTopologyMetrics(model);

    expect(metrics.isolatedNodeCount).toBe(1);
    expect(metrics.connectedComponentCount).toBe(2);
  });

  it("counts parallel edge and self-loop candidates", () => {
    const model = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
        ],
        [
          { id: "m1", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" },
          { id: "m2", nodeI: "b", nodeJ: "a", materialId: "mat", sectionId: "sec" },
          { id: "loop", nodeI: "a", nodeJ: "a", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );
    const metrics = computeTopologyMetrics(model);

    expect(metrics.parallelEdgeCandidateCount).toBe(2);
    expect(metrics.selfLoopCandidateCount).toBe(1);
  });

  it("is stable when input order changes", () => {
    const left = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
          { id: "c", x: 2, y: 0, z: 0 },
        ],
        [
          { id: "m1", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" },
          { id: "m2", nodeI: "b", nodeJ: "c", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );
    const right = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "c", x: 2, y: 0, z: 0 },
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
        ],
        [
          { id: "m2", nodeI: "b", nodeJ: "c", materialId: "mat", sectionId: "sec" },
          { id: "m1", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );

    expect(computeTopologyMetrics(left)).toEqual(computeTopologyMetrics(right));
  });
});
