import { describe, expect, it } from "vitest";
import { validatePhase1Scope } from "../phase1ScopeGuard";
import { validateNumericRecord, validateNumericAuthority } from "../numericAuthorityGuard";
import { Phase1ScopeStatus, Phase1SpanSystem } from "../types";
import {
  assertGuardFailsClosed,
  assertGuardIssueCodes,
  assertGuardOk,
  buildInScopePhase1Archetype,
  buildPhase1ArchetypePreset,
  buildPlaceholderNumericRecord,
  buildSemanticOnlyRegistration,
  buildUserProvidedNumericRecord,
  NOT_SELECTED_NUMERIC_CONTEXT,
} from "../testing";
import { validateGoldenExpectedRegistration } from "../numericAuthorityGuard";

describe("apollo testing helpers", () => {
  describe("phase1Fixtures", () => {
    it("buildInScopePhase1Archetype satisfies scope guard", () => {
      const input = buildInScopePhase1Archetype();
      const result = validatePhase1Scope(input);
      assertGuardOk(result);
      expect(result.scopeStatus).toBe(Phase1ScopeStatus.IN_SCOPE);
    });

    it("buildPhase1ArchetypePreset produces fail-closed negatives", () => {
      const continuous = buildPhase1ArchetypePreset("CONTINUOUS_SPAN");
      const result = validatePhase1Scope(continuous);
      assertGuardFailsClosed(result, { codes: ["AP00_SCOPE_CONTINUOUS"] });
      expect(result.scopeStatus).toBe(Phase1ScopeStatus.OUT_OF_SCOPE);
      expect(continuous.spanSystem).toBe(Phase1SpanSystem.CONTINUOUS);
    });
  });

  describe("numericFixtures", () => {
    it("buildPlaceholderNumericRecord passes authority guard", () => {
      const record = buildPlaceholderNumericRecord();
      assertGuardOk(validateNumericRecord(record, NOT_SELECTED_NUMERIC_CONTEXT));
    });

    it("buildUserProvidedNumericRecord remains non-authoritative", () => {
      const record = buildUserProvidedNumericRecord({ quantityKind: "shell.preview" });
      assertGuardOk(validateNumericAuthority(record, NOT_SELECTED_NUMERIC_CONTEXT));
    });

    it("buildSemanticOnlyRegistration is allowed", () => {
      assertGuardOk(validateGoldenExpectedRegistration(buildSemanticOnlyRegistration()));
    });
  });

  describe("assertGuardResult", () => {
    it("assertGuardIssueCodes matches stable codes", () => {
      const result = validatePhase1Scope(buildPhase1ArchetypePreset("UNKNOWN_DECK"));
      assertGuardIssueCodes(result, ["AP00_SCOPE_DECK_UNKNOWN"]);
    });
  });
});
