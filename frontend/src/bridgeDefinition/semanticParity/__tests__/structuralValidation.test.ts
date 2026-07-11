import { describe, expect, it } from "vitest";
import { DEFAULT_SEMANTIC_TOLERANCE } from "../tolerance";
import { validateStructuralModel } from "../structuralValidation";
import { normalizeProjectModelForSemanticParity } from "../normalize";
import { project } from "./fixtures/semanticParityFixtures";

describe("structural validation", () => {
  it("accepts a connected valid model", () => {
    const model = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
        ],
        [{ id: "m", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" }],
      ),
    );
    const result = validateStructuralModel(model, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("flags zero-length members", () => {
    const model = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 6e-7, y: 0, z: 0 },
        ],
        [{ id: "m", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" }],
      ),
    );
    const result = validateStructuralModel(model, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.valid).toBe(false);
    expect(result.summary.zeroLengthMemberCount).toBe(1);
    expect(result.errors.some((error) => error.code === "SEMANTIC_MEMBER_ZERO_LENGTH")).toBe(true);
  });

  it("flags self-loops", () => {
    const model = normalizeProjectModelForSemanticParity(
      project(
        [{ id: "a", x: 0, y: 0, z: 0 }],
        [{ id: "m", nodeI: "a", nodeJ: "a", materialId: "mat", sectionId: "sec" }],
      ),
    );
    const result = validateStructuralModel(model, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.selfLoopCount).toBe(1);
    expect(result.errors.some((error) => error.code === "SEMANTIC_MEMBER_SELF_LOOP")).toBe(true);
  });

  it("flags disconnected models", () => {
    const model = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
          { id: "c", x: 10, y: 0, z: 0 },
        ],
        [
          { id: "m1", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );
    const result = validateStructuralModel(model, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.disconnectedComponentCount).toBe(2);
    expect(result.errors.some((error) => error.code === "SEMANTIC_MODEL_DISCONNECTED")).toBe(true);
    expect(result.errors.some((error) => error.code === "SEMANTIC_NODE_ISOLATED")).toBe(true);
  });
});
