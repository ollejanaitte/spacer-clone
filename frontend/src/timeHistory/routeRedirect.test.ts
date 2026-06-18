import { describe, expect, it } from "vitest";
import {
  legacyOutputTargetPath,
  resolveTimeHistoryPath,
  timeHistoryRunPath,
} from "./routeRedirect";

describe("time-history legacy route", () => {
  it("redirects the removed output target route to run", () => {
    expect(resolveTimeHistoryPath(legacyOutputTargetPath)).toBe(timeHistoryRunPath);
  });

  it("leaves unrelated routes unchanged", () => {
    expect(resolveTimeHistoryPath("/compare")).toBe("/compare");
  });
});
