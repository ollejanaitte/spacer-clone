import { describe, test, expect } from "vitest";
import { getLocationLabels, getLocationLabel } from "../services/locationLabeler";

const mockPresentationNodes = {
  N001: { kind: "abutment_left", label_level0: "左の橋の土台" },
  N005: { kind: "pier_top_p1", label_level0: "左がわの橋脚の上" },
  N009: { kind: "pier_top_p2", label_level0: "右がわの橋脚の上" },
  N013: { kind: "abutment_right", label_level0: "右の橋の土台" },
};

describe("locationLabeler", () => {
  test("getLocationLabels: 全ノードのラベルを返す", () => {
    const labels = getLocationLabels(mockPresentationNodes);
    expect(labels).toHaveLength(4);
    expect(labels.map((l) => l.nodeId)).toEqual(["N001", "N005", "N009", "N013"]);
  });

  test("getLocationLabels: 各ラベルにkindとlabelLevel0が含まれる", () => {
    const labels = getLocationLabels(mockPresentationNodes);
    const n001 = labels.find((l) => l.nodeId === "N001");
    expect(n001?.kind).toBe("abutment_left");
    expect(n001?.labelLevel0).toBe("左の橋の土台");
  });

  test("getLocationLabel: 特定ノードのラベルを返す", () => {
    const label = getLocationLabel("N005", mockPresentationNodes);
    expect(label?.kind).toBe("pier_top_p1");
    expect(label?.labelLevel0).toBe("左がわの橋脚の上");
  });

  test("getLocationLabel: 存在しないノードはnullを返す", () => {
    const label = getLocationLabel("N999", mockPresentationNodes);
    expect(label).toBeNull();
  });
});
