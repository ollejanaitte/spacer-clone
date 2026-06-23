// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ParameterPanel, getDefaultParameters } from "../components/ParameterPanel";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return { container, root };
}

describe("ParameterPanel", () => {
  test("renders the title", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("条件を変えて試す");
  });

  test("renders the description", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("スライダーを動かして");
  });

  test("renders the bridge-length slider", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("橋長:");
    expect(container.querySelector('input[type="range"]')).toBeTruthy();
  });

  test("renders the pier-height slider", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("橋脚高さ:");
  });

  test("renders the pier-count selector", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("橋脚本数:");
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("2");
    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("4");
  });

  test("renders the load-multiplier slider", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("荷重倍率:");
  });

  test("renders the reset-to-default button", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("初期値に戻す");
  });

  test("renders the calculate button", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("結果を計算");
  });

  test("calls onReset when the reset-to-default button is clicked", () => {
    const onReset = vi.fn();
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={onReset}
        onCalculate={() => {}}
      />
    );
    const buttons = container.querySelectorAll("button");
    const resetButton = Array.from(buttons).find(b => b.textContent?.includes("初期値に戻す"));
    resetButton?.click();
    expect(onReset).toHaveBeenCalled();
  });

  test("calls onCalculate when the calculate button is clicked", () => {
    const onCalculate = vi.fn();
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={onCalculate}
      />
    );
    const buttons = container.querySelectorAll("button");
    const calculateButton = Array.from(buttons).find(b => b.textContent?.includes("結果を計算"));
    calculateButton?.click();
    expect(onCalculate).toHaveBeenCalled();
  });

  test("renders the current values", () => {
    const { container } = renderComponent(
      <ParameterPanel
        parameters={getDefaultParameters()}
        onChange={() => {}}
        onReset={() => {}}
        onCalculate={() => {}}
      />
    );
    expect(container.textContent).toContain("50 m");
    expect(container.textContent).toContain("10 m");
    expect(container.textContent).toContain("2 本");
    expect(container.textContent).toContain("1.0 倍");
  });
});
