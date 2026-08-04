// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DemandCheckDevelopmentPanel } from "../components/DemandCheckDevelopmentPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    act(() => entry.root.unmount());
    entry.container.remove();
  }
});

describe("DemandCheckDevelopmentPanel", () => {
  it("shows development warning and candidate-only labels without formal OK/NG", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mounted.push({ root, container });
    act(() => {
      root.render(<DemandCheckDevelopmentPanel />);
    });

    expect(container.querySelector("[data-testid='apollo-demand-development-warning']")?.textContent).toContain(
      "開発確認用・未検証",
    );
    expect(container.querySelector("[data-testid='apollo-demand-development-provenance']")?.textContent).toContain(
      "候補値",
    );
    expect(container.querySelector("[data-testid='apollo-demand-development-provenance']")?.textContent).not.toContain(
      "NOT_EMITTED",
    );

    act(() => {
      (container.querySelector("[data-testid='apollo-demand-reveal-candidates']") as HTMLButtonElement).click();
    });

    expect(container.querySelector("[data-testid='apollo-demand-development-table']")).not.toBeNull();
    const statuses = Array.from(container.querySelectorAll("[data-testid='apollo-demand-development-table'] tbody tr td:nth-child(4)")).map(
      (el) => el.textContent,
    );
    expect(statuses.every((s) => s === "CANDIDATE")).toBe(true);
    expect(container.querySelector("[data-testid='apollo-demand-tech-panel']")).toBeNull();
  });
});
