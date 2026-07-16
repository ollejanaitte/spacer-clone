import { describe, expect, it } from "vitest";
import {
  createIssue,
  LINER_DIAGNOSTIC_CODES,
  LINER_DIAGNOSTIC_MESSAGE_KEYS,
} from "../diagnostics";
import { validateAlignment } from "../geometry/horizontal";
import type { LinearAlignment } from "../types";

describe("liner diagnostics message keys", () => {
  it("maps every core diagnostic code to a stable liner.errors messageKey", () => {
    for (const code of Object.values(LINER_DIAGNOSTIC_CODES)) {
      expect(LINER_DIAGNOSTIC_MESSAGE_KEYS[code]).toMatch(/^liner\.errors\./);
    }
  });

  it("adds a default messageKey to fail-closed geometry diagnostics", () => {
    const alignment: LinearAlignment = {
      id: "bad",
      linerModelId: "bad",
      coordinatePolicyId: "global",
      elements: [
        {
          type: "straight",
          id: "zero",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 0,
        },
      ],
    };

    expect(validateAlignment(alignment)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: "LINER_GEOM_ZERO_LENGTH_SEGMENT",
          messageKey: "liner.errors.geom_zero_length",
        }),
      ]),
    );
  });

  it("preserves explicit messageKey overrides from call sites", () => {
    expect(
      createIssue("error", LINER_DIAGNOSTIC_CODES.gridSpacingInvalid, {
        messageKey: "liner.errors.custom_grid_spacing",
      }),
    ).toMatchObject({
      code: "LINER_GRID_SPACING_INVALID",
      messageKey: "liner.errors.custom_grid_spacing",
    });
  });
});
