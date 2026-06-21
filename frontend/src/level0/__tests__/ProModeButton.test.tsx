// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ProModeButton } from "../components/ProModeButton";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return { container, root };
}

describe("ProModeButton", () => {
  test("ボタンが表示される", () => {
    const { container } = renderComponent(<ProModeButton onClick={() => {}} />);
    expect(container.textContent).toContain("プロモードで開く");
  });

  test("クリックでonClickが呼ばれる", () => {
    const onClick = vi.fn();
    const { container } = renderComponent(<ProModeButton onClick={onClick} />);
    const button = container.querySelector("button") as HTMLButtonElement;
    act(() => { button.click(); });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("classNameが適用される", () => {
    const { container } = renderComponent(<ProModeButton onClick={() => {}} className="custom" />);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.className).toContain("custom");
  });
});
