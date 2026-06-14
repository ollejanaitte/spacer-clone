import { describe, expect, it } from "vitest";
import {
  APP_NAME_FALLBACK,
  RELEASES_URL,
  REPO_URL,
  buildAboutDetail,
  describeReleaseCheckStatus,
} from "./aboutConfig";

describe("about config", () => {
  it("exposes a stable repository URL", () => {
    expect(REPO_URL).toMatch(/^https:\/\/github\.com\//);
    expect(RELEASES_URL).toBe(`${REPO_URL}/releases`);
  });

  it("has a sensible fallback app name", () => {
    expect(APP_NAME_FALLBACK.length).toBeGreaterThan(0);
  });

  it("builds the about dialog detail body", () => {
    const detail = buildAboutDetail("0.1.0", "Spacer Clone", REPO_URL);
    expect(detail).toContain("Version: 0.1.0");
    expect(detail).toContain(`Repository: ${REPO_URL}`);
    expect(detail).toContain("応答スペクトル解析");
  });

  it("describes a successful release check", () => {
    const message = describeReleaseCheckStatus(true, 200, null, RELEASES_URL);
    expect(message).toContain("最新リリース情報");
  });

  it("describes a non-2xx response with the status code", () => {
    const message = describeReleaseCheckStatus(false, 503, null, RELEASES_URL);
    expect(message).toContain("HTTP 503");
  });

  it("describes a network failure with the underlying error", () => {
    const message = describeReleaseCheckStatus(false, 0, "ECONNREFUSED", RELEASES_URL);
    expect(message).toContain("ECONNREFUSED");
  });
});
