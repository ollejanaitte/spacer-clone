import { describe, expect, it } from "vitest";
import {
  buildSectionPayload,
  sectionError,
  sectionWarning,
} from "../visual/crossSection";
import type { CrossSectionTemplateDraft } from "../../schema/types";

const template: CrossSectionTemplateDraft = {
  id: "t1",
  name: "標準",
  offsetLines: [
    { id: "L0", offset: -3.0, elevation: 10.0, role: "shoulder" },
    { id: "R0", offset: 3.0, elevation: 10.0, role: "shoulder" },
  ],
};

describe("crossSection visual", () => {
  it("builds objects and mappings from template", () => {
    const payload = buildSectionPayload({ template });
    expect(payload.plane).toBe("SECTION");
    expect(payload.objects.map((o) => o.objectId)).toEqual(["s-L0", "s-R0"]);
    expect(payload.mappings).toContainEqual(
      expect.objectContaining({ fieldName: "width", objectId: "s-L0" }),
    );
    expect(payload.mappings).toContainEqual(
      expect.objectContaining({ fieldName: "crossfall", objectId: "s-R0" }),
    );
  });

  it("selects line", () => {
    const payload = buildSectionPayload({ template, selectedLineId: "R0" });
    expect(payload.selectedObjectId).toBe("s-R0");
  });

  it("carries rule warnings and errors", () => {
    const payload = buildSectionPayload({
      template,
      warnings: [sectionWarning("L0", "X2-R-023", "clearance")],
      errors: [sectionError("R0", "width < 0")],
    });
    expect(payload.warnings[0].objectId).toBe("s-L0");
    expect(payload.errors[0].objectId).toBe("s-R0");
    expect(payload.errors[0].errorType).toBe("FIELD_ERROR");
  });

  it("uses offsetLines when provided", () => {
    const payload = buildSectionPayload({ offsetLines: [{ id: "X", offset: 0, elevation: 0 }] });
    expect(payload.objects).toHaveLength(1);
    expect(payload.geometryRef.offsetLineCount).toBe(1);
  });
});
