// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APOLLO_PHASE1_FLAG_NAME } from "../featureFlag";
import {
  APOLLO_DENIED_REDIRECT_PATH,
  redirectDeniedApolloRoute,
  resolveApolloEntryAccess,
  shouldShowApolloPhase1Entry,
} from "../entryGuard";
import { APOLLO_PHASE1_ROUTE_PATH } from "../routes";

describe("apollo entry guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState(null, "", "/pro");
  });

  it("hides entry when flag OFF", () => {
    vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "");
    expect(shouldShowApolloPhase1Entry()).toBe(false);
    expect(resolveApolloEntryAccess(APOLLO_PHASE1_ROUTE_PATH)).toBe("deny");
  });

  it("allows guarded shell only when flag ON", () => {
    vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "true");
    expect(shouldShowApolloPhase1Entry()).toBe(true);
    expect(resolveApolloEntryAccess(APOLLO_PHASE1_ROUTE_PATH)).toBe("shell");
    expect(resolveApolloEntryAccess("/pro")).toBe("none");
  });

  it("denies invalid flag values", () => {
    vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "1");
    expect(resolveApolloEntryAccess(APOLLO_PHASE1_ROUTE_PATH)).toBe("deny");
  });

  describe("redirectDeniedApolloRoute", () => {
    beforeEach(() => {
      window.history.replaceState(null, "", APOLLO_PHASE1_ROUTE_PATH);
    });

    it("redirects denied routes to /pro", () => {
      vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "");
      expect(redirectDeniedApolloRoute()).toBe(true);
      expect(window.location.pathname).toBe(APOLLO_DENIED_REDIRECT_PATH);
    });

    it("does not redirect when flag ON", () => {
      vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "true");
      expect(redirectDeniedApolloRoute()).toBe(false);
      expect(window.location.pathname).toBe(APOLLO_PHASE1_ROUTE_PATH);
    });

    it("has no side effects on unrelated routes when OFF", () => {
      vi.stubEnv(APOLLO_PHASE1_FLAG_NAME, "");
      window.history.replaceState(null, "", "/pro/compare");
      expect(redirectDeniedApolloRoute()).toBe(false);
      expect(window.location.pathname).toBe("/pro/compare");
    });
  });
});
