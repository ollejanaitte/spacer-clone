import { describe, expect, it } from "vitest";
import {
  legacyOutputTargetPath,
  legacyTimeHistoryRunPath,
  legacyComparePath,
  resolveTimeHistoryPath,
  proTimeHistoryRunPath,
  proComparePath,
} from "./routeRedirect";

describe("time-history legacy route", () => {
  it("redirects the removed output target route to pro/th/run", () => {
    expect(resolveTimeHistoryPath(legacyOutputTargetPath)).toBe(proTimeHistoryRunPath);
  });

  it("redirects /th/run to /pro/th/run", () => {
    expect(resolveTimeHistoryPath(legacyTimeHistoryRunPath)).toBe(proTimeHistoryRunPath);
  });

  it("redirects /compare to /pro/compare", () => {
    expect(resolveTimeHistoryPath(legacyComparePath)).toBe(proComparePath);
  });

  it("leaves unrelated routes unchanged", () => {
    expect(resolveTimeHistoryPath("/level0")).toBe("/level0");
  });
});
