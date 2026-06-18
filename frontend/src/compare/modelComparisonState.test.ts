import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { copyModelAToB, createModelComparisonState } from "./modelComparisonState";

describe("model comparison state", () => {
  it("deep-copies A into B without shared nested state", () => {
    const state = copyModelAToB(createModelComparisonState(createDefaultProject()));
    expect(state.modelB).toEqual(state.modelA);
    state.modelB!.nodes[0].x += 10;
    expect(state.modelB!.nodes[0].x).not.toBe(state.modelA.nodes[0].x);
  });
});
