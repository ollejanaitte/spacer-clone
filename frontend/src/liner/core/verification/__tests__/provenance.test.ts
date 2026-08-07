import { describe, expect, it } from "vitest";
import type { ReferenceProvenance } from "../types";
import {
  isAuthoritativeProvenance,
  isUnresolvedProvenance,
  validateProvenance,
} from "../provenance";

describe("validateProvenance", () => {
  it("rejects missing provenance (fail-closed)", () => {
    expect(validateProvenance(undefined).length).toBeGreaterThan(0);
    expect(validateProvenance(null as never).length).toBeGreaterThan(0);
  });

  it("accepts valid provenance", () => {
    const p: ReferenceProvenance = {
      source_document: "SRC-005",
      source_page: "12",
      source_table: "T-3",
      source_row: "5",
      source_column: "X",
      source_value: 123.45,
      source_unit: "m",
      extraction_method: "MANUAL_TRANSCRIPTION",
      review_status: "REVIEWED",
    };
    expect(validateProvenance(p)).toEqual([]);
  });

  it("rejects missing review_status", () => {
    const p = { source_document: "SRC-005" } as ReferenceProvenance;
    const errors = validateProvenance(p);
    expect(errors.join()).toContain("review_status");
  });

  it("rejects unknown review_status", () => {
    const p = { review_status: "APPROVED" } as unknown as ReferenceProvenance;
    expect(validateProvenance(p).join()).toContain("review_status");
  });

  it("rejects unknown source_unit", () => {
    const p: ReferenceProvenance = { review_status: "REVIEWED", source_unit: "furlong" as never };
    expect(validateProvenance(p).join()).toContain("source_unit");
  });

  it("rejects non-finite source_value", () => {
    const p: ReferenceProvenance = { review_status: "REVIEWED", source_value: Number.NaN };
    expect(validateProvenance(p).join()).toContain("source_value");
  });
});

describe("provenance status helpers", () => {
  it("authoritative only when REVIEWED", () => {
    expect(isAuthoritativeProvenance({ review_status: "REVIEWED" })).toBe(true);
    expect(isAuthoritativeProvenance({ review_status: "UNREVIEWED" })).toBe(false);
  });

  it("unresolved when UNRESOLVED or REJECTED", () => {
    expect(isUnresolvedProvenance({ review_status: "UNRESOLVED" })).toBe(true);
    expect(isUnresolvedProvenance({ review_status: "REJECTED" })).toBe(true);
    expect(isUnresolvedProvenance({ review_status: "REVIEWED" })).toBe(false);
  });
});
