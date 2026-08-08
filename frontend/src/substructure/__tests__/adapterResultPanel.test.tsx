// @vitest-environment jsdom
// Phase C1 (A-04) Adapter 結果パネル テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { AdapterResultPanel } from "../planning/AdapterResultPanel";
import { calculateTest } from "../design/testCalculationEngine";
import { mapSupportToAdapterInput } from "../design/adapterMapper";
import { generateCombo } from "../planning/samples/sampleGenerator";

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

function adapterResults() {
  return generateCombo("combo-standard").map((s) => {
    const mapped = mapSupportToAdapterInput(s);
    return calculateTest(mapped.value!);
  });
}

describe("AdapterResultPanel", () => {
  it("shows empty-state without results", () => {
    const { container } = render(<AdapterResultPanel results={[]} />);
    expect(container.querySelector('[data-testid="adapter-result-panel"]')).not.toBeNull();
    expect(container.textContent).toContain("Adapter 計算（TEST）を実行すると");
  });

  it("renders TEST summary and formal-design notice", () => {
    const { container } = render(<AdapterResultPanel results={adapterResults()} />);
    const summary = container.querySelector('[data-testid="adapter-summary"]')?.textContent ?? "";
    expect(summary).toContain("PASS 4");
    expect(container.querySelector('[data-testid="adapter-formal-notice"]')?.textContent).toContain(
      "正式な構造安全性の設計判定ではありません",
    );
  });

  it("shows engine label TEST and calculationId", () => {
    const { container } = render(<AdapterResultPanel results={adapterResults()} />);
    expect(container.querySelector('[data-testid="adapter-engine-label"]')?.textContent).toBe("TEST");
    expect(container.querySelector('[data-testid="adapter-calculation-id"]')?.textContent).toContain(
      "calc-",
    );
  });

  it("switches support on tab click", () => {
    const onSelectSupport = vi.fn();
    const { container } = render(
      <AdapterResultPanel results={adapterResults()} onSelectSupport={onSelectSupport} />,
    );
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="adapter-tab-A2"]')!.click();
    });
    expect(onSelectSupport).toHaveBeenCalledWith("A2");
  });

  it("renders error detail for an ERROR result", () => {
    const results = adapterResults().map((r) => ({ ...r, status: "ERROR" as const, errors: ["boom"] }));
    const { container } = render(<AdapterResultPanel results={results} />);
    expect(container.querySelector('[data-testid="adapter-errors"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="adapter-status-badge"]')?.textContent).toBe("ERROR");
  });

  it("renders the check table with TEST labels", () => {
    const { container } = render(<AdapterResultPanel results={adapterResults()} />);
    expect(container.querySelector('[data-testid="adapter-check-table"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="adapter-check-TEST-FOOTING-VOLUME"]')).not.toBeNull();
  });
});
