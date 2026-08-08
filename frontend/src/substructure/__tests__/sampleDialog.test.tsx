// @vitest-environment jsdom
// Phase C1 (M2-08) サンプル作成ダイアログ テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { SampleCreationDialog } from "../planning/samples/SampleCreationDialog";

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

function dialog(overrides: Partial<React.ComponentProps<typeof SampleCreationDialog>> = {}) {
  return render(
    <SampleCreationDialog
      onGenerate={vi.fn()}
      onGenerateCombo={vi.fn()}
      onGenerateFromLiner={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("SampleCreationDialog", () => {
  it("renders all 9 sample buttons + combos + LINER", () => {
    const { container } = dialog();
    expect(container.querySelector('[data-testid="sample-abutment_inverted_t"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-abutment_cantilever"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-pier_single"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-pier_wall"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-pier_portal"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-foundation_spread"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-foundation_bored"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-foundation_steel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="combo-combo-standard"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sample-from-liner"]')).not.toBeNull();
  });

  it("shows reference/sample notice", () => {
    const { container } = dialog();
    expect(container.textContent).toContain("設計標準値ではありません");
  });

  it("single sample button triggers generate", () => {
    const onGenerate = vi.fn();
    const { container } = dialog({ onGenerate });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="sample-pier_single"]')!;
    act(() => btn.click());
    expect(onGenerate).toHaveBeenCalled();
  });

  it("combo button triggers combo generate", () => {
    const onGenerateCombo = vi.fn();
    const { container } = dialog({ onGenerateCombo });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="combo-combo-standard"]')!;
    act(() => btn.click());
    expect(onGenerateCombo).toHaveBeenCalledWith("combo-standard");
  });

  it("LINER generate disabled without liner supports", () => {
    const { container } = dialog({ hasLinerSupports: false });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="sample-from-liner"]')!;
    expect(btn.disabled).toBe(true);
  });

  it("LINER generate enabled with liner supports", () => {
    const onGenerateFromLiner = vi.fn();
    const { container } = dialog({ hasLinerSupports: true, onGenerateFromLiner });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="sample-from-liner"]')!;
    expect(btn.disabled).toBe(false);
    act(() => btn.click());
    expect(onGenerateFromLiner).toHaveBeenCalled();
  });

  it("close button fires onClose", () => {
    const onClose = vi.fn();
    const { container } = dialog({ onClose });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="sample-close"]')!;
    act(() => btn.click());
    expect(onClose).toHaveBeenCalled();
  });

  it("supportId input is editable", () => {
    const { container } = dialog();
    const input = container.querySelector<HTMLInputElement>('[data-testid="sample-support-id"]')!;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "NEW1");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.value).toBe("NEW1");
  });
});
