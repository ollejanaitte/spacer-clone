// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AnalysisDevelopmentProbePanel } from "../components/AnalysisDevelopmentProbePanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    act(() => entry.root.unmount());
    entry.container.remove();
  }
  vi.unstubAllGlobals();
});

describe("AnalysisDevelopmentProbePanel", () => {
  it("shows development warning and runs GOLD-AN-001 against mocked solver", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          result: {
            analysisSummary: { status: "success" },
            displacements: [
              { nodeId: "N1", uy: 0 },
              { nodeId: "N2", uy: -0.0003252032520325203 },
              { nodeId: "N3", uy: 0 },
            ],
            reactions: [
              { nodeId: "N1", fy: 4 },
              { nodeId: "N3", fy: 4 },
            ],
            memberEndForces: [
              { i: { mz: 0 }, j: { mz: 4 } },
              { i: { mz: 4 }, j: { mz: 0 } },
            ],
            errors: [],
          },
        }),
      })),
    );

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mounted.push({ root, container });
    act(() => {
      root.render(<AnalysisDevelopmentProbePanel />);
    });

    expect(container.querySelector("[data-testid='apollo-analysis-development-warning']")?.textContent).toContain(
      "正式認可なし",
    );

    await act(async () => {
      (container.querySelector("[data-testid='apollo-analysis-run-gold-an-001']") as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-testid='apollo-analysis-development-status']")?.textContent).toContain(
      "success",
    );
    expect(container.querySelector("[data-testid='apollo-analysis-development-table']")).not.toBeNull();
  });
});
