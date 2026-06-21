// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QuakePicker } from "../pages/QuakePicker";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

describe("QuakePicker", () => {
  test("タイトルが表示される", () => {
    const { container } = renderComponent(
      <QuakePicker onShake={() => {}} onBack={() => {}} />
    );
    expect(container.textContent).toContain("地震の強さをえらぶ");
  });

  test("3つのプリセットカードが表示される", () => {
    const { container } = renderComponent(
      <QuakePicker onShake={() => {}} onBack={() => {}} />
    );
    expect(container.textContent).toContain("弱い");
    expect(container.textContent).toContain("中くらい");
    expect(container.textContent).toContain("強い");
  });

  test("ゆらすボタンが無効状態で始まる", () => {
    const { container } = renderComponent(
      <QuakePicker onShake={() => {}} onBack={() => {}} />
    );
    const shakeButton = container.querySelector(".level0-shake-button") as HTMLButtonElement;
    expect(shakeButton.disabled).toBe(true);
  });

  test("プリセット選択でゆらすボタンが有効になる", () => {
    const { container } = renderComponent(
      <QuakePicker onShake={() => {}} onBack={() => {}} />
    );
    const mediumCard = container.querySelectorAll(".level0-preset-card")[1] as HTMLButtonElement;
    act(() => {
      mediumCard.click();
    });
    const shakeButton = container.querySelector(".level0-shake-button") as HTMLButtonElement;
    expect(shakeButton.disabled).toBe(false);
  });

  test("ゆらすボタンクリックで onShake が呼ばれる", () => {
    const onShake = vi.fn();
    const { container } = renderComponent(
      <QuakePicker onShake={onShake} onBack={() => {}} />
    );
    const mediumCard = container.querySelectorAll(".level0-preset-card")[1] as HTMLButtonElement;
    act(() => {
      mediumCard.click();
    });
    const shakeButton = container.querySelector(".level0-shake-button") as HTMLButtonElement;
    act(() => {
      shakeButton.click();
    });
    expect(onShake).toHaveBeenCalledWith("medium");
  });

  test("禁止用語が表示されない", () => {
    const { container } = renderComponent(
      <QuakePicker onShake={() => {}} onBack={() => {}} />
    );
    const FORBIDDEN = ["節点", "部材", "固有値", "時刻歴応答解析", "剛性", "応力", "支点条件"];
    for (const w of FORBIDDEN) {
      expect(container.textContent).not.toContain(w);
    }
  });
});
