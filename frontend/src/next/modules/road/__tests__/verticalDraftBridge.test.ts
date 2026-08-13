import { describe, expect, it } from "vitest";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import {
  verticalDraftToElements,
  verticalElementsToDraft,
  verticalDraftAlignmentToElements,
} from "../verticalDraftBridge";

describe("verticalDraftBridge (Phase 7.4)", () => {
  it("round-trips reference mountain vertical elements via the draft format", () => {
    const ref = createReferenceMountain();
    const draft = verticalElementsToDraft(ref.roadVertical);
    const back = verticalDraftToElements(draft);

    expect(back.length).toBe(ref.roadVertical.length);
    const first = ref.roadVertical[0];
    expect(first.type).toBe("grade");
    expect(back[0]).toMatchObject({
      type: "grade",
      id: first.id,
      startPhysicalDistance: first.startPhysicalDistance,
      startElevation: first.startElevation,
      grade: first.type === "grade" ? first.grade : undefined,
      length: first.length,
    });
    // parabolic: draft startGrade/endGrade -> core gradeIn/gradeOut
    const parabolic = back.find((el) => el.type === "parabolic");
    if (parabolic && parabolic.type === "parabolic") {
      expect(parabolic.gradeIn).toBe((ref.roadVertical.find((e) => e.type === "parabolic") as { gradeIn: number }).gradeIn);
      expect(parabolic.gradeOut).toBe((ref.roadVertical.find((e) => e.type === "parabolic") as { gradeOut: number }).gradeOut);
    }
  });

  it("derives core elements from a draft verticalAlignment", () => {
    const ref = createReferenceMountain();
    const draft = verticalElementsToDraft(ref.roadVertical);
    const elements = verticalDraftAlignmentToElements({ id: "V", elements: draft });
    expect(elements.length).toBe(ref.roadVertical.length);
  });

  it("returns empty when verticalAlignment is undefined", () => {
    expect(verticalDraftAlignmentToElements(undefined)).toEqual([]);
  });
});
