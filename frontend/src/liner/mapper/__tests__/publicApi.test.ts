import { describe, expect, it } from "vitest";
import * as linerPublicApi from "../../index";

describe("liner public API surface", () => {
  it("exposes canonical pipeline and mapper entry points without legacy preview helpers", () => {
    expect(linerPublicApi).toHaveProperty("buildIntermediateResult");
    expect(linerPublicApi).toHaveProperty("elevationAtStation");
    expect(linerPublicApi).toHaveProperty("pointAtStationOffset");
    expect(linerPublicApi).toHaveProperty("crossSectionAtStation");
    expect(linerPublicApi).toHaveProperty("mapToFrameModel");
    expect(linerPublicApi).toHaveProperty("createHeadlessLinerFrameProject");
    expect(linerPublicApi).not.toHaveProperty("prepareFrameNodes");
    expect(linerPublicApi).not.toHaveProperty("prepareStationPairMember");
  });
});
