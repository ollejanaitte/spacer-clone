import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APOLLO_PHASE1_FLAG_NAME,
  isApolloPhase1Enabled,
  parseApolloPhase1Flag,
} from "../featureFlag";

describe("apollo feature flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults OFF when unset", () => {
    vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "");
    expect(isApolloPhase1Enabled()).toBe(false);
  });

  it("is ON only for literal true", () => {
    vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "true");
    expect(isApolloPhase1Enabled()).toBe(true);
  });

  it("treats invalid values as OFF (fail-closed)", () => {
    expect(parseApolloPhase1Flag(undefined)).toBe(false);
    expect(parseApolloPhase1Flag("false")).toBe(false);
    expect(parseApolloPhase1Flag("TRUE")).toBe(false);
    expect(parseApolloPhase1Flag("1")).toBe(false);
    expect(parseApolloPhase1Flag("yes")).toBe(false);
    expect(parseApolloPhase1Flag("")).toBe(false);
  });
});
