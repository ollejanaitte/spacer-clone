import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APOLLO_PHASE1_FLAG_NAME,
  APOLLO_PHASE1_DISABLE_NUMERIC_EXECUTION_FLAG_NAME,
  APOLLO_PHASE1_DISABLE_RESULT_PUBLICATION_FLAG_NAME,
  APOLLO_PHASE1_NN_ENABLED_FLAG_NAME,
  APOLLO_PHASE1_NUMERIC_RELEASE_BLOCKED_FLAG_NAME,
  APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME,
  isApolloPhase1Enabled,
  parseApolloPhase1Flag,
  resolveApolloPhase1FeatureFlags,
} from "../featureFlag";

describe("apollo feature flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults OFF when unset", () => {
    vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "");
    expect(isApolloPhase1Enabled()).toBe(false);
  });

  it("defaults ON in apollo mode while keeping blocking guards ON", () => {
    vi.stubEnv("MODE", "apollo");
    const flags = resolveApolloPhase1FeatureFlags();
    expect(flags.nnEnabled).toBe(true);
    expect(flags.numericReleaseBlocked).toBe(true);
    expect(flags.disableResultPublication).toBe(true);
    expect(flags.disableNumericExecution).toBe(true);
  });

  it("is ON only for literal true", () => {
    vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "true");
    expect(isApolloPhase1Enabled()).toBe(true);
  });

  it("accepts the dedicated NN flag", () => {
    vi.stubEnv(APOLLO_PHASE1_NN_ENABLED_FLAG_NAME, "true");
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

  it("defaults blocking guards ON when unset", () => {
    const flags = resolveApolloPhase1FeatureFlags();
    expect(flags.nnEnabled).toBe(false);
    expect(flags.numericReleaseBlocked).toBe(true);
    expect(flags.showProvisionalStatus).toBe(true);
    expect(flags.disableResultPublication).toBe(true);
    expect(flags.disableNumericExecution).toBe(true);
  });

  it("allows explicit false for guard overrides", () => {
    vi.stubEnv(APOLLO_PHASE1_NUMERIC_RELEASE_BLOCKED_FLAG_NAME, "false");
    vi.stubEnv(APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME, "false");
    vi.stubEnv(APOLLO_PHASE1_DISABLE_RESULT_PUBLICATION_FLAG_NAME, "false");
    vi.stubEnv(APOLLO_PHASE1_DISABLE_NUMERIC_EXECUTION_FLAG_NAME, "false");
    const flags = resolveApolloPhase1FeatureFlags();
    expect(flags.numericReleaseBlocked).toBe(false);
    expect(flags.showProvisionalStatus).toBe(false);
    expect(flags.disableResultPublication).toBe(false);
    expect(flags.disableNumericExecution).toBe(false);
  });

  it("treats invalid guard values as fail-closed", () => {
    vi.stubEnv(APOLLO_PHASE1_DISABLE_RESULT_PUBLICATION_FLAG_NAME, "1");
    vi.stubEnv(APOLLO_PHASE1_DISABLE_NUMERIC_EXECUTION_FLAG_NAME, "TRUE");
    const flags = resolveApolloPhase1FeatureFlags();
    expect(flags.disableResultPublication).toBe(true);
    expect(flags.disableNumericExecution).toBe(true);
  });
});
