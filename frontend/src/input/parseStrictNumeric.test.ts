import { describe, expect, it } from "vitest";
import { parseStrictNumericDraft, trimNumericDraft } from "./parseStrictNumeric";

describe("trimNumericDraft", () => {
  it("trims ASCII and full-width spaces", () => {
    expect(trimNumericDraft("  \u3000 12.3 \u3000 ")).toBe("12.3");
  });
});

describe("parseStrictNumericDraft", () => {
  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["\u3000", "empty"],
    ["  \u3000  ", "empty"],
  ] as const)("'%s' => %s", (raw, kind) => {
    expect(parseStrictNumericDraft(raw).kind).toBe(kind);
  });

  it.each([
    ["0", 0],
    ["-1", -1],
    ["12.34", 12.34],
    [".5", 0.5],
    ["1.", 1],
    ["-0.5", -0.5],
  ] as const)("'%s' => valid %s", (raw, value) => {
    const result = parseStrictNumericDraft(raw);
    expect(result).toEqual({ kind: "valid", value });
  });

  it.each([
    "１２３",
    "－１２．３",
    "12abc",
    "abc",
    "12 34",
    "--",
    "..",
    "1.2.3",
    "NaN",
    "Infinity",
    "-Infinity",
    "+1",
    "1e3",
    ".",
    "-",
  ])("rejects '%s' as invalid", (raw) => {
    expect(parseStrictNumericDraft(raw).kind).toBe("invalid");
  });

  it("never coerces empty input to zero", () => {
    const result = parseStrictNumericDraft("");
    expect(result.kind).toBe("empty");
    if (result.kind === "valid") {
      throw new Error("empty must not become valid");
    }
    expect(result.kind).not.toBe("valid");
  });
});
