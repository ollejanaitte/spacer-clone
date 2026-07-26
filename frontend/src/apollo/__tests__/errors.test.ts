import { describe, expect, it } from "vitest";
import {
  AP00_GUARD_ERROR_CODES,
  AP00_GUARD_ERROR_MESSAGES,
  createGuardIssue,
  createGuardResult,
} from "../errors";

describe("apollo guard error catalog", () => {
  it("exposes stable scope error codes", () => {
    expect(AP00_GUARD_ERROR_CODES.AP00_SCOPE_MULTI_SPAN).toBe("AP00_SCOPE_MULTI_SPAN");
    expect(AP00_GUARD_ERROR_CODES.AP00_SCOPE_CURVED_ALIGNMENT).toBe(
      "AP00_SCOPE_CURVED_ALIGNMENT",
    );
    expect(AP00_GUARD_ERROR_CODES.AP00_SCOPE_SKEW_NOT_90).toBe("AP00_SCOPE_SKEW_NOT_90");
  });

  it("exposes stable numeric error codes", () => {
    expect(AP00_GUARD_ERROR_CODES.AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD).toBe(
      "AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD",
    );
    expect(AP00_GUARD_ERROR_CODES.AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN).toBe(
      "AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN",
    );
  });

  it("maps every code to a non-empty message", () => {
    for (const code of Object.values(AP00_GUARD_ERROR_CODES)) {
      expect(AP00_GUARD_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it("createGuardIssue attaches optional path", () => {
    const issue = createGuardIssue("AP00_SCOPE_MULTI_SPAN", "spanSystem");
    expect(issue).toEqual({
      code: "AP00_SCOPE_MULTI_SPAN",
      message: AP00_GUARD_ERROR_MESSAGES.AP00_SCOPE_MULTI_SPAN,
      path: "spanSystem",
    });
  });

  it("createGuardResult is ok only when issues empty", () => {
    expect(createGuardResult([])).toEqual({ ok: true, issues: [] });
    expect(createGuardResult([createGuardIssue("AP00_SCOPE_CONTINUOUS")])).toEqual({
      ok: false,
      issues: [createGuardIssue("AP00_SCOPE_CONTINUOUS")],
    });
  });
});
