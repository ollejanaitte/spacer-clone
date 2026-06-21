// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Level0App } from "../Level0App";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

describe("Level0App", () => {
  test("初期状態でHomeが表示される", () => {
    const { container } = renderComponent(<Level0App />);
    expect(container.textContent).toContain("橋と建物の実験室");
  });

  test("3クリックで実行画面に到達する", () => {
    const { container } = renderComponent(<Level0App />);
    // 1クリック目：地震でゆらす
    const shakeCard = container.querySelector(".level0-card-main") as HTMLButtonElement;
    act(() => { shakeCard.click(); });
    // QuakePickerが表示される
    expect(container.textContent).toContain("地震の強さをえらぶ");
    // 2クリック目：中くらい
    const mediumCard = container.querySelectorAll(".level0-preset-card")[1] as HTMLButtonElement;
    act(() => { mediumCard.click(); });
    // 3クリック目：ゆらす
    const shakeButton = container.querySelector(".level0-shake-button") as HTMLButtonElement;
    act(() => { shakeButton.click(); });
    // QuakeRunが表示される
    expect(container.textContent).toContain("3...");
  });
});
