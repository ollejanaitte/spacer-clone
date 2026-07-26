import { describe, expect, it } from "vitest";
import {
  assertNoNullCoercion,
  isTreatableAsAdopted,
  rejectPlaceholderAsAdopted,
  resolveNumericValue,
  validateGoldenExpectedRegistration,
  validateNumericAuthority,
  validateNumericRecord,
  validateNumericRecordForAdoption,
} from "../numericAuthorityGuard";
import {
  GoldenRegistrationKind,
  NumericAuthority,
  TargetStandardStatus,
  type NumericAuthorityContext,
  type NumericValueRecord,
} from "../types";

const NOT_SELECTED_CONTEXT: NumericAuthorityContext = {
  targetStandardStatus: TargetStandardStatus.NOT_SELECTED,
};

const SELECTED_CONTEXT: NumericAuthorityContext = {
  targetStandardStatus: TargetStandardStatus.SELECTED,
};

const ADOPTED_RECORD: NumericValueRecord = {
  value: 25,
  authority: NumericAuthority.ADOPTED,
  sourceLocator: "道示Ⅰ p.42 Table 3.2",
  decisionId: "DEC-S1-0099",
};

describe("numericAuthorityGuard", () => {
  describe("isTreatableAsAdopted", () => {
    it.each([
      [NumericAuthority.ADOPTED, true],
      [NumericAuthority.PLACEHOLDER, false],
      [NumericAuthority.USER_PROVIDED_UNVERIFIED, false],
      [NumericAuthority.SOURCE_TRACED, false],
    ])("%s → %s", (authority, expected) => {
      expect(isTreatableAsAdopted(authority)).toBe(expected);
    });
  });

  describe("resolveNumericValue / null coercion", () => {
    it("returns null for null and undefined without coercing to zero", () => {
      expect(resolveNumericValue(null)).toBeNull();
      expect(resolveNumericValue(undefined)).toBeNull();
      expect(resolveNumericValue(0)).toBe(0);
    });

    it("assertNoNullCoercion rejects null and undefined", () => {
      expect(assertNoNullCoercion(null).ok).toBe(false);
      expect(assertNoNullCoercion(undefined).ok).toBe(false);
      expect(assertNoNullCoercion(0).ok).toBe(true);
    });
  });

  describe("validateNumericAuthority", () => {
  const negativeCases: Array<{
    label: string;
    record: NumericValueRecord;
    context: NumericAuthorityContext;
    codes: string[];
  }> = [
    {
      label: "ADOPTED while NOT_SELECTED",
      record: ADOPTED_RECORD,
      context: NOT_SELECTED_CONTEXT,
      codes: ["AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD"],
    },
    {
      label: "ADOPTED missing source_locator",
      record: { ...ADOPTED_RECORD, sourceLocator: "" },
      context: SELECTED_CONTEXT,
      codes: ["AP00_NUMERIC_ADOPTED_MISSING_SOURCE"],
    },
    {
      label: "ADOPTED missing decision_id",
      record: { ...ADOPTED_RECORD, decisionId: null },
      context: SELECTED_CONTEXT,
      codes: ["AP00_NUMERIC_ADOPTED_MISSING_DECISION"],
    },
    {
      label: "ADOPTED missing both metadata fields",
      record: {
        value: 1.2,
        authority: NumericAuthority.ADOPTED,
        sourceLocator: "  ",
        decisionId: undefined,
      },
      context: SELECTED_CONTEXT,
      codes: [
        "AP00_NUMERIC_ADOPTED_MISSING_SOURCE",
        "AP00_NUMERIC_ADOPTED_MISSING_DECISION",
      ],
    },
  ];

    it.each(negativeCases)("$label fails closed", ({ record, context, codes }) => {
      const result = validateNumericAuthority(record, context);
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(codes));
    });

    it("accepts ADOPTED with full metadata when Target Standard is SELECTED", () => {
      const result = validateNumericAuthority(ADOPTED_RECORD, SELECTED_CONTEXT);
      expect(result.ok).toBe(true);
    });

    it("accepts PLACEHOLDER without adoption metadata", () => {
      const result = validateNumericAuthority(
        { value: null, authority: NumericAuthority.PLACEHOLDER },
        NOT_SELECTED_CONTEXT,
      );
      expect(result.ok).toBe(true);
    });

    it("accepts USER_PROVIDED_UNVERIFIED without adoption metadata", () => {
      const result = validateNumericAuthority(
        { value: 10, authority: NumericAuthority.USER_PROVIDED_UNVERIFIED },
        NOT_SELECTED_CONTEXT,
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("rejectPlaceholderAsAdopted", () => {
    it("rejects PLACEHOLDER treated as adopted", () => {
      const result = rejectPlaceholderAsAdopted(NumericAuthority.PLACEHOLDER);
      expect(result.ok).toBe(false);
      expect(result.issues[0]?.code).toBe("AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED");
    });

    it("allows non-placeholder authorities", () => {
      expect(rejectPlaceholderAsAdopted(NumericAuthority.SOURCE_TRACED).ok).toBe(true);
    });
  });

  describe("validateGoldenExpectedRegistration", () => {
    it("rejects GOLDEN_EXPECTED registration", () => {
      const result = validateGoldenExpectedRegistration({
        registrationKind: GoldenRegistrationKind.GOLDEN_EXPECTED,
        fixtureId: "RB-P1-001",
      });
      expect(result.ok).toBe(false);
      expect(result.issues[0]?.code).toBe("AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN");
      expect(result.issues[0]?.path).toBe("fixtureId:RB-P1-001");
    });

    it("allows semantic-only registration", () => {
      const result = validateGoldenExpectedRegistration({
        registrationKind: GoldenRegistrationKind.SEMANTIC_ONLY,
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("validateNumericRecord", () => {
    it("allows PLACEHOLDER records without adoption metadata", () => {
      const result = validateNumericRecord(
        { value: null, authority: NumericAuthority.PLACEHOLDER },
        NOT_SELECTED_CONTEXT,
      );
      expect(result.ok).toBe(true);
    });

    it("flags null value for non-placeholder authority", () => {
      const result = validateNumericRecord(
        {
          value: null,
          authority: NumericAuthority.USER_PROVIDED_UNVERIFIED,
        },
        NOT_SELECTED_CONTEXT,
      );
      expect(result.ok).toBe(false);
      expect(result.issues[0]?.code).toBe("AP00_NUMERIC_NULL_COERCION");
    });
  });

  describe("validateNumericRecordForAdoption", () => {
    it("rejects PLACEHOLDER consumed as adopted", () => {
      const result = validateNumericRecordForAdoption(
        { value: null, authority: NumericAuthority.PLACEHOLDER },
        NOT_SELECTED_CONTEXT,
      );
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain(
        "AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED",
      );
    });

    it("aggregates adoption violations for ADOPTED under NOT_SELECTED", () => {
      const result = validateNumericRecordForAdoption(ADOPTED_RECORD, NOT_SELECTED_CONTEXT);
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain(
        "AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD",
      );
    });
  });
});
