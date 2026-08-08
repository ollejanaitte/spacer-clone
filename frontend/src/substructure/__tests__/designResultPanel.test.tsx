// @vitest-environment jsdom
// Phase C1 (M3-05) 設計計算結果パネル テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { DesignResultPanel } from "../planning/DesignResultPanel";
import { runDesign } from "../design/designEngine";
import { generateCombo } from "../planning/samples/sampleGenerator";

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

describe("DesignResultPanel", () => {
  const results = generateCombo("combo-standard").map((s) =>
    runDesign({ support: s, projectId: "ui" }),
  );

  it("shows empty-state hint without results", () => {
    const { container } = render(<DesignResultPanel results={[]} />);
    expect(container.querySelector('[data-testid="design-result-panel"]')).not.toBeNull();
    expect(container.textContent).toContain("設計計算を実行すると");
  });

  it("renders summary counts (all HOLD in framework mode)", () => {
    const { container } = render(<DesignResultPanel results={results} />);
    const summary = container.querySelector('[data-testid="design-summary"]')?.textContent ?? "";
    expect(summary).toContain("HOLD 4");
    expect(summary).toContain("OK 0");
    expect(summary).toContain("NG 0");
  });

  it("renders per-support tabs and selects the first", () => {
    const { container } = render(<DesignResultPanel results={results} />);
    expect(container.querySelector('[data-testid="design-tab-P1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="design-tab-A2"]')).not.toBeNull();
    const badge = container.querySelector('[data-testid="design-status-badge"]')?.textContent ?? "";
    expect(badge).toBe("HOLD");
  });

  it("switches selected support on tab click", () => {
    const onSelectSupport = vi.fn();
    const { container } = render(
      <DesignResultPanel results={results} onSelectSupport={onSelectSupport} />,
    );
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="design-tab-A2"]')!.click();
    });
    expect(onSelectSupport).toHaveBeenCalledWith("A2");
  });

  it("renders the calculation sheet table", () => {
    const { container } = render(<DesignResultPanel results={results} />);
    expect(container.querySelector('[data-testid="design-sheet"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid^="design-row-"]').length).toBeGreaterThan(10);
  });
});
