import { describe, test, expect, vi, beforeEach } from "vitest";
import { measureHomeRender, measureTemplateLoad, measureAnalysisStart, measureAnimationFps, measureResultCard, getMetrics, logMetrics, checkTargets } from "../services/level0Performance";

describe("level0Performance", () => {
  beforeEach(() => {
    // Reset metrics by measuring with a fixed start time
    const now = performance.now();
    measureHomeRender(now);
    measureTemplateLoad(now);
    measureAnalysisStart(now);
    measureAnimationFps(60);
    measureResultCard(now);
  });

  test("getMetrics: メトリクスを返す", () => {
    const m = getMetrics();
    expect(typeof m.homeRenderMs).toBe("number");
    expect(typeof m.templateLoadMs).toBe("number");
    expect(typeof m.analysisStartMs).toBe("number");
    expect(typeof m.animationFps).toBe("number");
    expect(typeof m.resultCardMs).toBe("number");
  });

  test("measureHomeRender: ホームレンダリング時間を計測", () => {
    const start = performance.now();
    measureHomeRender(start);
    const m = getMetrics();
    expect(m.homeRenderMs).toBeGreaterThanOrEqual(0);
  });

  test("measureAnimationFps: FPSを記録", () => {
    measureAnimationFps(45);
    const m = getMetrics();
    expect(m.animationFps).toBe(45);
  });

  test("checkTargets: 全指标が目標内ならpassed=true", () => {
    measureHomeRender(performance.now() - 100);
    measureTemplateLoad(performance.now() - 200);
    measureAnalysisStart(performance.now() - 50);
    measureAnimationFps(60);
    measureResultCard(performance.now() - 100);
    const result = checkTargets();
    expect(result.passed).toBe(true);
  });

  test("logMetrics: console.infoを呼ぶ", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logMetrics();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
